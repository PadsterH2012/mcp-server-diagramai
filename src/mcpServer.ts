import { Server } from '@modelcontextprotocol/sdk/server/index.ts';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.ts';
import { DiagramWebSocketClient } from './websocket/client.ts';
import { DiagramTools } from './tools/diagramTools.ts';
import { AuthService } from './auth/authService.ts';

export interface MCPServerConfig {
  apiUrl: string;
  apiKey: string;
  wsUrl?: string;
  debug?: boolean;
  requestTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class DiagramAIMCPServer extends Server {
  private wsClient: DiagramWebSocketClient;
  private diagramTools: DiagramTools;
  private authService: AuthService;
  private config: MCPServerConfig;
  private isInitialized = false;

  constructor(config: MCPServerConfig) {
    super(
      {
        name: 'mcp-server-diagramai',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = {
      ...config,
      wsUrl: config.wsUrl || config.apiUrl.replace(/^http/, 'ws'),
      debug: config.debug || false,
      requestTimeout: config.requestTimeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    // Initialize services with configuration
    this.authService = new AuthService(this.config);
    this.wsClient = new DiagramWebSocketClient(this.config);
    this.diagramTools = new DiagramTools(this.wsClient, this.authService, this.config);

    this.setupHandlers();
    
    if (this.config.debug) {
      console.error('🐛 Debug mode enabled');
      console.error('⚙️ Configuration:', {
        apiUrl: this.config.apiUrl,
        wsUrl: this.config.wsUrl,
        requestTimeout: this.config.requestTimeout,
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.error('🔧 Initializing DiagramAI MCP Server...');

    try {
      // Initialize authentication service
      await this.authService.initialize();
      console.error('✅ Authentication service initialized');

      // Test API connection
      const isConnected = await this.authService.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to DiagramAI API');
      }
      console.error('✅ API connection verified');

      // Initialize WebSocket connection to DiagramAI
      await this.wsClient.connect();
      console.error('✅ WebSocket connection established');

      // Initialize diagram tools
      await this.diagramTools.initialize();
      console.error('✅ Diagram tools initialized');

      this.isInitialized = true;
      console.error('🎉 DiagramAI MCP Server initialization complete');

    } catch (error) {
      console.error('❌ Failed to initialize MCP Server:', error);
      throw error;
    }
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.isInitialized) {
        throw new Error('Server not initialized');
      }
      
      const tools = await this.diagramTools.getAvailableTools();
      
      if (this.config.debug) {
        console.error(`📋 Listed ${tools.length} available tools`);
      }
      
      return { tools };
    });

    // Handle tool execution
    this.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.isInitialized) {
        throw new Error('Server not initialized');
      }

      const { name, arguments: args } = request.params;
      
      try {
        if (this.config.debug) {
          console.error(`🔧 Executing tool: ${name}`, args);
        } else {
          console.error(`🔧 Executing tool: ${name}`);
        }
        
        const result = await this.diagramTools.executeTool(name, args || {});
        
        if (this.config.debug) {
          console.error(`✅ Tool execution successful: ${name}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`❌ Tool execution failed: ${name}`, error);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                tool: name,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async close(): Promise<void> {
    console.error('🛑 Closing DiagramAI MCP Server...');
    
    try {
      if (this.wsClient) {
        await this.wsClient.disconnect();
        console.error('✅ WebSocket connection closed');
      }

      if (this.authService) {
        await this.authService.close();
        console.error('✅ Authentication service closed');
      }

      this.isInitialized = false;
      console.error('✅ DiagramAI MCP Server closed successfully');
    } catch (error) {
      console.error('❌ Error during server shutdown:', error);
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      return (
        this.isInitialized &&
        this.wsClient.isConnected() &&
        this.authService.isReady()
      );
    } catch {
      return false;
    }
  }

  // Get server statistics
  getStats(): any {
    return {
      initialized: this.isInitialized,
      websocketConnected: this.wsClient.isConnected(),
      authServiceReady: this.authService.isReady(),
      availableTools: this.diagramTools.getToolCount(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      config: {
        apiUrl: this.config.apiUrl,
        wsUrl: this.config.wsUrl,
        debug: this.config.debug,
        requestTimeout: this.config.requestTimeout,
      },
    };
  }

  // Get configuration (without sensitive data)
  getConfig(): Omit<MCPServerConfig, 'apiKey'> {
    return {
      apiUrl: this.config.apiUrl,
      wsUrl: this.config.wsUrl,
      debug: this.config.debug,
      requestTimeout: this.config.requestTimeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
    };
  }
}
