# mcp-server-diagramai

An MCP server implementation for DiagramAI integration, enabling AI agents to create, read, edit, and delete diagrams in real-time.

[![npm version](https://badge.fury.io/js/mcp-server-diagramai.svg)](https://badge.fury.io/js/mcp-server-diagramai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

### Resources
- Expose diagram list and project structure
- Real-time diagram state access
- Project-based organization

### Tools
- **create_diagram**: Create new diagrams with specified content
- **get_diagram**: Retrieve diagram by ID
- **update_diagram**: Modify existing diagrams
- **delete_diagram**: Remove diagrams
- **add_node**: Add nodes to diagrams
- **add_edge**: Add connections between nodes
- **list_diagrams**: Get all accessible diagrams
- **get_diagram_status**: Check diagram state and metadata

## Installation

### From npm (Recommended)
```bash
npm install -g mcp-server-diagramai
```

### From source
```bash
git clone https://github.com/PadsterH2012/mcp-server-diagramai.git
cd mcp-server-diagramai
npm install
npm run build
```

## Usage with Claude Desktop

### Configuration File

Paths to Claude Desktop config file:
- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Published Package Configuration
```json
{
  "mcpServers": {
    "diagramai": {
      "command": "npx",
      "args": [
        "mcp-server-diagramai",
        "--api-url", "${DIAGRAMAI_API_URL}",
        "--api-key", "${DIAGRAMAI_API_KEY}"
      ]
    }
  }
}
```

### Development Configuration
```json
{
  "mcpServers": {
    "diagramai": {
      "command": "/PATH/TO/node",
      "args": [
        "/PATH/TO/mcp-server-diagramai/dist/index.js"
      ],
      "env": {
        "DIAGRAMAI_API_URL": "http://localhost:3000",
        "DIAGRAMAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Environment Variables

Create a `.env` file or set environment variables:

```env
# DiagramAI API Configuration
DIAGRAMAI_API_URL=http://localhost:3000
DIAGRAMAI_API_KEY=your-api-key-here

# Optional: WebSocket URL (if different from API URL)
DIAGRAMAI_WS_URL=ws://localhost:3000

# Optional: Request timeout (milliseconds)
REQUEST_TIMEOUT=30000

# Optional: Enable debug logging
DEBUG=false
```

## API Key Setup

1. **Access DiagramAI Settings**: Navigate to your DiagramAI instance settings
2. **Generate API Key**: Create a new API key with appropriate permissions
3. **Configure MCP**: Add the API key to your Claude Desktop configuration

### Required Permissions
- `diagrams:create` - Create new diagrams
- `diagrams:read` - Read diagram content
- `diagrams:update` - Modify diagrams
- `diagrams:delete` - Delete diagrams
- `projects:read` - Access project information

## Available Tools

### Diagram Management
```typescript
// Create a new diagram
create_diagram({
  title: "My Flowchart",
  type: "reactflow", // or "mermaid"
  content: {...}, // Diagram content
  projectId?: "project-uuid"
})

// Get diagram by ID
get_diagram({
  diagramId: "diagram-uuid"
})

// Update existing diagram
update_diagram({
  diagramId: "diagram-uuid",
  title?: "New Title",
  content?: {...}
})

// Delete diagram
delete_diagram({
  diagramId: "diagram-uuid"
})

// List all diagrams
list_diagrams({
  projectId?: "project-uuid",
  limit?: 10
})
```

### Node and Edge Operations
```typescript
// Add node to diagram
add_node({
  diagramId: "diagram-uuid",
  node: {
    id: "node-1",
    type: "process",
    position: { x: 100, y: 100 },
    data: { label: "Process Step" }
  }
})

// Add edge between nodes
add_edge({
  diagramId: "diagram-uuid",
  edge: {
    id: "edge-1",
    source: "node-1",
    target: "node-2"
  }
})
```

## Development

### Building
```bash
npm run build
```

### Running in Development
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify DiagramAI is running and accessible
- Check API URL and port configuration
- Ensure API key is valid and has required permissions

**Authentication Errors**
- Verify API key format (should start with `da_`)
- Check API key permissions in DiagramAI settings
- Ensure API key hasn't expired

**Tool Execution Errors**
- Check diagram ID format (should be valid UUID)
- Verify user has access to the specified diagram
- Check network connectivity to DiagramAI instance

### Debug Mode
Enable debug logging by setting `DEBUG=true` in your environment variables.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- [GitHub Issues](https://github.com/PadsterH2012/mcp-server-diagramai/issues)
- [DiagramAI Documentation](https://github.com/PadsterH2012/DiagramAI)
- [Model Context Protocol](https://modelcontextprotocol.io/)
