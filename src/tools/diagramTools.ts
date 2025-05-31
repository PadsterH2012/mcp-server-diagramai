import { Tool } from '@modelcontextprotocol/sdk/types.ts';
import { DiagramWebSocketClient } from '../websocket/client.ts';
import { AuthService } from '../auth/authService.ts';
import { z } from 'zod';

// Zod schemas for tool validation
const CreateDiagramSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum(['reactflow', 'mermaid']).default('reactflow'),
  template: z.string().optional(),
  initialNodes: z.array(z.any()).optional(),
  initialEdges: z.array(z.any()).optional(),
});

const AddNodeSchema = z.object({
  diagram_uuid: z.string().uuid(),
  node_data: z.object({
    type: z.string(),
    label: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    style: z.object({}).optional(),
    data: z.object({}).optional(),
  }),
});

const UpdateNodeSchema = z.object({
  diagram_uuid: z.string().uuid(),
  node_id: z.string(),
  updates: z.object({
    label: z.string().optional(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    style: z.object({}).optional(),
    data: z.object({}).optional(),
  }),
});

const DeleteNodeSchema = z.object({
  diagram_uuid: z.string().uuid(),
  node_id: z.string(),
});

const AddEdgeSchema = z.object({
  diagram_uuid: z.string().uuid(),
  edge_data: z.object({
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
    type: z.string().optional(),
    style: z.object({}).optional(),
  }),
});

const DeleteEdgeSchema = z.object({
  diagram_uuid: z.string().uuid(),
  edge_id: z.string(),
});

const ReadDiagramSchema = z.object({
  diagram_uuid: z.string().uuid(),
  include_metadata: z.boolean().default(false),
});

const ListDiagramsSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  filter: z.object({
    format: z.enum(['reactflow', 'mermaid']).optional(),
    agent_accessible: z.boolean().optional(),
  }).optional(),
});

export class DiagramTools {
  private wsClient: DiagramWebSocketClient;
  private authService: AuthService;
  private tools: Tool[] = [];

  constructor(wsClient: DiagramWebSocketClient, authService: AuthService, config: MCPServerConfig) {
    this.wsClient = wsClient;
    this.authService = authService;
    this.initializeTools();
  }

  async initialize(): Promise<void> {
    console.error('🔧 Initializing diagram tools...');
    // Tools are already initialized in constructor
    console.error(`✅ ${this.tools.length} diagram tools ready`);
  }

  private initializeTools(): void {
    this.tools = [
      {
        name: 'create_diagram',
        description: 'Create a new diagram with specified title, format, and optional initial content',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the diagram' },
            description: { type: 'string', description: 'Optional description' },
            format: { type: 'string', enum: ['reactflow', 'mermaid'], description: 'Diagram format' },
            template: { type: 'string', description: 'Optional template name' },
            initialNodes: { type: 'array', description: 'Initial nodes for the diagram' },
            initialEdges: { type: 'array', description: 'Initial edges for the diagram' },
          },
          required: ['title'],
        },
      },
      {
        name: 'read_diagram',
        description: 'Read the complete content of a diagram by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            diagram_uuid: { type: 'string', format: 'uuid', description: 'UUID of the diagram to read' },
            include_metadata: { type: 'boolean', description: 'Include diagram metadata' },
          },
          required: ['diagram_uuid'],
        },
      },
      {
        name: 'list_diagrams',
        description: 'List diagrams with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, description: 'Number of diagrams to return' },
            offset: { type: 'number', minimum: 0, description: 'Offset for pagination' },
            filter: {
              type: 'object',
              properties: {
                format: { type: 'string', enum: ['reactflow', 'mermaid'] },
                agent_accessible: { type: 'boolean' },
              },
            },
          },
        },
      },
      {
        name: 'add_node',
        description: 'Add a new node to an existing diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram_uuid: { type: 'string', format: 'uuid', description: 'UUID of the diagram' },
            node_data: {
              type: 'object',
              properties: {
                type: { type: 'string', description: 'Type of node (e.g., process, decision, start, end)' },
                label: { type: 'string', description: 'Label text for the node' },
                position: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                  required: ['x', 'y'],
                },
                style: { type: 'object', description: 'Optional styling' },
                data: { type: 'object', description: 'Additional node data' },
              },
              required: ['type', 'label', 'position'],
            },
          },
          required: ['diagram_uuid', 'node_data'],
        },
      },
      {
        name: 'update_node',
        description: 'Update properties of an existing node',
        inputSchema: {
          type: 'object',
          properties: {
            diagram_uuid: { type: 'string', format: 'uuid' },
            node_id: { type: 'string', description: 'ID of the node to update' },
            updates: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                position: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' } },
                },
                style: { type: 'object' },
                data: { type: 'object' },
              },
            },
          },
          required: ['diagram_uuid', 'node_id', 'updates'],
        },
      },
      {
        name: 'delete_node',
        description: 'Delete a node from a diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram_uuid: { type: 'string', format: 'uuid' },
            node_id: { type: 'string', description: 'ID of the node to delete' },
          },
          required: ['diagram_uuid', 'node_id'],
        },
      },
      {
        name: 'add_edge',
        description: 'Add a connection between two nodes',
        inputSchema: {
          type: 'object',
          properties: {
            diagram_uuid: { type: 'string', format: 'uuid' },
            edge_data: {
              type: 'object',
              properties: {
                source: { type: 'string', description: 'Source node ID' },
                target: { type: 'string', description: 'Target node ID' },
                label: { type: 'string', description: 'Optional edge label' },
                type: { type: 'string', description: 'Edge type (e.g., smoothstep, straight)' },
                style: { type: 'object', description: 'Optional styling' },
              },
              required: ['source', 'target'],
            },
          },
          required: ['diagram_uuid', 'edge_data'],
        },
      },
      {
        name: 'delete_edge',
        description: 'Delete an edge from a diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram_uuid: { type: 'string', format: 'uuid' },
            edge_id: { type: 'string', description: 'ID of the edge to delete' },
          },
          required: ['diagram_uuid', 'edge_id'],
        },
      },
    ];
  }

  async getAvailableTools(): Promise<Tool[]> {
    return this.tools;
  }

  getToolCount(): number {
    return this.tools.length;
  }

  async executeTool(name: string, args: any): Promise<any> {
    const startTime = Date.now();
    
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    // Check rate limiting
    if (!this.authService.checkRateLimit(name)) {
      throw new Error('Rate limit exceeded');
    }

    try {
      let result: any;
      
      switch (name) {
        case 'create_diagram':
          result = await this.createDiagram(CreateDiagramSchema.parse(args));
          break;
        case 'read_diagram':
          result = await this.readDiagram(ReadDiagramSchema.parse(args));
          break;
        case 'list_diagrams':
          result = await this.listDiagrams(ListDiagramsSchema.parse(args));
          break;
        case 'add_node':
          result = await this.addNode(AddNodeSchema.parse(args));
          break;
        case 'update_node':
          result = await this.updateNode(UpdateNodeSchema.parse(args));
          break;
        case 'delete_node':
          result = await this.deleteNode(DeleteNodeSchema.parse(args));
          break;
        case 'add_edge':
          result = await this.addEdge(AddEdgeSchema.parse(args));
          break;
        case 'delete_edge':
          result = await this.deleteEdge(DeleteEdgeSchema.parse(args));
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      const duration = Date.now() - startTime;
      
      // Log the operation
      await this.authService.logOperation(
        name,
        args.diagram_uuid || 'new',
        args,
        result,
        true,
        duration
      );

      return {
        success: true,
        result,
        tool: name,
        duration,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log the failed operation
      await this.authService.logOperation(
        name,
        args.diagram_uuid || 'unknown',
        args,
        null,
        false,
        duration
      );

      throw error;
    }
  }

  private async createDiagram(args: z.infer<typeof CreateDiagramSchema>): Promise<any> {
    if (!this.authService.checkPermission('canCreateDiagrams')) {
      throw new Error('Permission denied: cannot create diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'create_diagram',
      data: args,
    });

    return response.result;
  }

  private async readDiagram(args: z.infer<typeof ReadDiagramSchema>): Promise<any> {
    if (!this.authService.checkPermission('canReadDiagrams')) {
      throw new Error('Permission denied: cannot read diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'read_diagram',
      data: args,
    });

    return response.result;
  }

  private async listDiagrams(args: z.infer<typeof ListDiagramsSchema>): Promise<any> {
    if (!this.authService.checkPermission('canListDiagrams')) {
      throw new Error('Permission denied: cannot list diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'list_diagrams',
      data: args,
    });

    return response.result;
  }

  private async addNode(args: z.infer<typeof AddNodeSchema>): Promise<any> {
    if (!this.authService.checkPermission('canEditDiagrams')) {
      throw new Error('Permission denied: cannot edit diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'add_node',
      diagram_uuid: args.diagram_uuid,
      data: args.node_data,
    });

    return response.result;
  }

  private async updateNode(args: z.infer<typeof UpdateNodeSchema>): Promise<any> {
    if (!this.authService.checkPermission('canEditDiagrams')) {
      throw new Error('Permission denied: cannot edit diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'update_node',
      diagram_uuid: args.diagram_uuid,
      data: { node_id: args.node_id, updates: args.updates },
    });

    return response.result;
  }

  private async deleteNode(args: z.infer<typeof DeleteNodeSchema>): Promise<any> {
    if (!this.authService.checkPermission('canEditDiagrams')) {
      throw new Error('Permission denied: cannot edit diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'delete_node',
      diagram_uuid: args.diagram_uuid,
      data: { node_id: args.node_id },
    });

    return response.result;
  }

  private async addEdge(args: z.infer<typeof AddEdgeSchema>): Promise<any> {
    if (!this.authService.checkPermission('canEditDiagrams')) {
      throw new Error('Permission denied: cannot edit diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'add_edge',
      diagram_uuid: args.diagram_uuid,
      data: args.edge_data,
    });

    return response.result;
  }

  private async deleteEdge(args: z.infer<typeof DeleteEdgeSchema>): Promise<any> {
    if (!this.authService.checkPermission('canEditDiagrams')) {
      throw new Error('Permission denied: cannot edit diagrams');
    }

    const response = await this.wsClient.sendMessage({
      type: 'agent_operation',
      operation: 'delete_edge',
      diagram_uuid: args.diagram_uuid,
      data: { edge_id: args.edge_id },
    });

    return response.result;
  }
}
