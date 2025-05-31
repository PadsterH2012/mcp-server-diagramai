import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { MCPServerConfig } from '../mcpServer.ts';

export interface DiagramMessage {
  type: string;
  diagram_uuid?: string;
  operation?: string;
  data?: any;
  agent_id?: string;
  request_id?: string;
  timestamp?: string;
}

export interface DiagramResponse {
  type: string;
  diagram_uuid?: string;
  changes?: any[];
  updated_by?: 'user' | 'agent';
  timestamp?: string;
  error?: string;
  request_id?: string;
  success?: boolean;
  result?: any;
}

export class DiagramWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: MCPServerConfig;
  private agentId: string;
  private isConnecting = false;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
    this.agentId = `mcp-agent-${Date.now()}`;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    this.isConnecting = true;
    let retries = 0;

    while (retries < (this.config.maxRetries || 3)) {
      try {
        await this.connectWebSocket();
        this.isConnecting = false;
        return;
      } catch (error) {
        retries++;
        if (retries >= (this.config.maxRetries || 3)) {
          this.isConnecting = false;
          throw error;
        }
        
        if (this.config.debug) {
          console.error(`🔄 WebSocket connection attempt ${retries} failed, retrying...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay || 1000));
      }
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.wsUrl}/ws/diagrams?agent_id=${this.agentId}`;
        
        if (this.config.debug) {
          console.error(`🔌 Connecting to DiagramAI WebSocket: ${wsUrl}`);
        }
        
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          if (this.config.debug) {
            console.error('✅ WebSocket connection established');
          }
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          if (this.config.debug) {
            console.error(`🔌 WebSocket connection closed: ${code} ${reason}`);
          }
          this.cleanup();
        });

        this.ws.on('error', (error) => {
          if (this.config.debug) {
            console.error('❌ WebSocket error:', error);
          }
          reject(error);
        });

        setTimeout(() => {
          if (this.isConnecting) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.config.requestTimeout || 30000);

      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
    
    if (this.config.debug) {
      console.error('🔌 WebSocket disconnected');
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: DiagramResponse = JSON.parse(data.toString());
      
      if (this.config.debug) {
        console.error(`📥 Received message: ${message.type}`);
      }
      
      if (message.request_id && this.pendingRequests.has(message.request_id)) {
        const pending = this.pendingRequests.get(message.request_id)!;
        this.pendingRequests.delete(message.request_id);
        clearTimeout(pending.timeout);
        
        if (message.type === 'error' || message.error) {
          pending.reject(new Error(message.error || 'Unknown error'));
        } else {
          pending.resolve(message);
        }
        return;
      }

      this.emit('message', message);

    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    }
  }

  private cleanup(): void {
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('WebSocket connection lost'));
    }
    this.pendingRequests.clear();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
