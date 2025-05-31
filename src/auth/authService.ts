import type { MCPServerConfig } from '../mcpServer.ts';

export class AuthService {
  private config: MCPServerConfig;
  private ready = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey.startsWith('da_')) {
      throw new Error('Invalid API key format. API key should start with "da_"');
    }
    
    this.ready = true;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.requestTimeout || 30000),
      });

      return response.ok;
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ API connection test failed:', error);
      }
      return false;
    }
  }

  getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.requestTimeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  isReady(): boolean {
    return this.ready;
  }

  async close(): Promise<void> {
    this.ready = false;
  }
}
