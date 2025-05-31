#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DiagramAIMCPServer } from './mcpServer.js';

/**
 * Main entry point for the DiagramAI MCP Server
 * 
 * Environment Variables:
 * - DIAGRAMAI_API_URL: DiagramAI instance URL (required)
 * - DIAGRAMAI_API_KEY: API key for authentication (required)
 * - DIAGRAMAI_WS_URL: WebSocket URL (optional, defaults to API URL)
 * - DEBUG: Enable debug logging (optional, default: false)
 * - REQUEST_TIMEOUT: Request timeout in ms (optional, default: 30000)
 */
async function main() {
  console.error('🚀 Starting DiagramAI MCP Server...');

  // Validate required environment variables
  const apiUrl = process.env.DIAGRAMAI_API_URL;
  const apiKey = process.env.DIAGRAMAI_API_KEY;

  if (!apiUrl) {
    console.error('❌ DIAGRAMAI_API_URL environment variable is required');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('❌ DIAGRAMAI_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!apiKey.startsWith('da_')) {
    console.error('❌ Invalid API key format. API key should start with "da_"');
    process.exit(1);
  }

  try {
    // Create the MCP server instance with configuration
    const server = new DiagramAIMCPServer({
      apiUrl,
      apiKey,
      wsUrl: process.env.DIAGRAMAI_WS_URL,
      debug: process.env.DEBUG === 'true',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.RETRY_DELAY || '1000')
    });

    // Initialize the server
    await server.initialize();

    // Create transport and start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('✅ DiagramAI MCP Server is running');
    console.error(`📡 Connected to DiagramAI at ${apiUrl}`);
    console.error('🔗 Listening for MCP requests via stdio');

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.error(`🛑 Received ${signal}, shutting down DiagramAI MCP Server...`);
      try {
        await server.close();
        console.error('✅ Server shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start DiagramAI MCP Server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server (ES module entry point check)
const isMainModule = import.meta.url === new URL(process.argv[1] || '', 'file:').href;
if (isMainModule) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
