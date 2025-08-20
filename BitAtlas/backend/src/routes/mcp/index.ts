import { Router } from 'express';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { McpOrchestrator } from '../../services/mcpOrchestrator';
import { authMiddleware } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';

const router = Router();
const mcpOrchestrator = new McpOrchestrator();

// Apply OAuth-style authentication for MCP endpoints
router.use(authMiddleware.authenticate);

// Apply stricter rate limiting for MCP endpoints
const mcpRateLimit = rateLimiter.oauthLimiter(60 * 60 * 1000, 100); // 100 requests per hour

// MCP protocol endpoint - handles all MCP requests
router.post('/call', mcpRateLimit, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { method, params, id } = req.body;

    if (!method) {
      res.status(400).json({
        id: id || null,
        error: {
          code: 'ERR_INVALID_REQUEST',
          message: 'Method is required'
        }
      });
      return;
    }

    const result = await mcpOrchestrator.call(method, params, {
      userId: req.user.userId,
      scopes: req.user.scopes
    });

    res.json({
      id: id || null,
      result,
      version: '1.0'
    });
  } catch (error) {
    const errorResponse = {
      id: req.body.id || null,
      error: {
        code: 'ERR_INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      version: '1.0'
    };

    res.status(500).json(errorResponse);
  }
});

// MCP tools discovery endpoint - returns available tools for AI assistants
router.get('/tools', mcpRateLimit, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userScopes = req.user.scopes || [];
    
    const tools = [
      {
        name: 'searchFiles',
        description: 'Search through the user\'s files by name, content, or metadata',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (can include file names, content, or metadata)'
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
              default: 1,
              minimum: 1
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page',
              default: 20,
              maximum: 100
            }
          },
          required: ['query']
        },
        enabled: userScopes.includes('files:read')
      },
      {
        name: 'readFile',
        description: 'Read the content of a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: 'The unique identifier of the file to read'
            },
            preview: {
              type: 'boolean',
              description: 'Whether to return a preview of the content',
              default: false
            }
          },
          required: ['fileId']
        },
        enabled: userScopes.includes('files:read')
      },
      {
        name: 'createFile',
        description: 'Create a new file with specified content. Supports both text and binary files (via base64 encoding).',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the file to create (including extension)'
            },
            content: {
              type: 'string',
              description: 'File content as string. For text files: plain text. For binary files: base64-encoded content.'
            },
            path: {
              type: 'string',
              description: 'Directory path where to create the file',
              default: '/'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the file',
              properties: {
                encoding: {
                  type: 'string',
                  description: 'Content encoding: "text" or "base64"',
                  enum: ['text', 'base64'],
                  default: 'text'
                },
                description: {
                  type: 'string',
                  description: 'File description'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File tags for organization'
                }
              }
            }
          },
          required: ['name'],
          examples: [
            {
              name: 'example.txt',
              content: 'Hello, World!',
              path: '/documents',
              metadata: { encoding: 'text', description: 'Simple text file' }
            },
            {
              name: 'data.json',
              content: '{"key": "value", "number": 42}',
              metadata: { encoding: 'text', tags: ['json', 'data'] }
            }
          ]
        },
        enabled: userScopes.includes('files:write')
      },
      {
        name: 'updateFile',
        description: 'Update an existing file\'s content or metadata',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: 'The unique identifier of the file to update'
            },
            name: {
              type: 'string',
              description: 'New name for the file'
            },
            path: {
              type: 'string',
              description: 'New path for the file'
            },
            metadata: {
              type: 'object',
              description: 'Updated metadata for the file'
            }
          },
          required: ['fileId']
        },
        enabled: userScopes.includes('files:write')
      },
      {
        name: 'deleteFile',
        description: 'Delete a file (soft delete with recovery option)',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: 'The unique identifier of the file to delete'
            }
          },
          required: ['fileId']
        },
        enabled: userScopes.includes('files:delete')
      },
      {
        name: 'listFiles',
        description: 'List files in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to list files from',
              default: '/'
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
              default: 1,
              minimum: 1
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page',
              default: 20,
              maximum: 100
            }
          }
        },
        enabled: userScopes.includes('files:read')
      }
    ];

    // Filter tools based on user permissions
    const availableTools = tools.filter(tool => tool.enabled);

    res.json({
      tools: availableTools.map(({ enabled, ...tool }) => tool),
      version: '1.0',
      userScopes
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get tools',
      code: 'ERR_TOOLS_FAILED'
    });
  }
});

// Health check for MCP service
router.get('/health', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({
    status: 'ok',
    version: '1.0',
    user: req.user.userId,
    timestamp: new Date().toISOString()
  });
});

export { router as mcpRoutes };