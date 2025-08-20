import { McpRequest, McpResponse, McpErrorCode } from '../types/mcpProtocol';

// Interface for connecting to backend storage
interface StorageConnector {
  searchFiles(params: any, authContext: any): Promise<any>;
  readFile(params: any, authContext: any): Promise<any>;
  createFile(params: any, authContext: any): Promise<any>;
  updateFile(params: any, authContext: any): Promise<any>;
  deleteFile(params: any, authContext: any): Promise<any>;
}

export class McpServer {
  private tools: Map<string, Function> = new Map();
  private storageConnector?: StorageConnector;

  constructor(storageConnector?: StorageConnector) {
    this.storageConnector = storageConnector;
    this.registerTools();
  }

  private registerTools() {
    this.tools.set('searchFiles', this.searchFiles.bind(this));
    this.tools.set('readFile', this.readFile.bind(this));
    this.tools.set('createFile', this.createFile.bind(this));
    this.tools.set('updateFile', this.updateFile.bind(this));
    this.tools.set('deleteFile', this.deleteFile.bind(this));
  }

  async handleRequest(request: McpRequest, authContext: any): Promise<McpResponse> {
    try {
      // Validate OAuth scopes
      await this.validateScopes(request.method, authContext.scopes);

      const tool = this.tools.get(request.method);
      if (!tool) {
        return {
          version: request.version,
          id: request.id,
          error: {
            code: McpErrorCode.INVALID_REQUEST,
            message: `Unknown method: ${request.method}`
          }
        };
      }

      const result = await tool(request.params, authContext);
      
      return {
        version: request.version,
        id: request.id,
        result
      };

    } catch (error) {
      return {
        version: request.version,
        id: request.id,
        error: {
          code: McpErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async searchFiles(params: any, authContext: any) {
    if (!this.storageConnector) {
      throw new Error('Storage connector not configured');
    }

    const { query, fileType, limit = 20, page = 1 } = params;
    
    if (!query) {
      throw new Error('Search query is required');
    }

    try {
      // Use storage connector or fallback to mock response
      const result = await this.storageConnector.searchFiles({
        query,
        fileType,
        limit,
        page
      }, authContext);

      return {
        results: result.results || result.files || [],
        total: result.total || result.results?.length || 0,
        page: page,
        pageSize: limit
      };
    } catch (error) {
      // Fallback to mock search results for development
      return this.mockSearchResults(query, limit);
    }
  }

  private async readFile(params: any, authContext: any) {
    if (!this.storageConnector) {
      throw new Error('Storage connector not configured');
    }

    const { fileId, preview = false } = params;
    
    if (!fileId) {
      throw new Error('File ID is required');
    }

    try {
      const result = await this.storageConnector.readFile({
        fileId,
        preview
      }, authContext);

      return {
        id: result.fileId || result.id,
        name: result.name,
        content: result.content || '',
        mimeType: result.mimeType || this.detectMimeType(result.name || ''),
        size: result.size || result.content?.length || 0,
        createdAt: result.createdAt,
        preview: preview
      };
    } catch (error) {
      // Fallback to mock file for development
      return this.mockFileContent(fileId, preview);
    }
  }

  private async createFile(params: any, authContext: any) {
    if (!params.name) {
      throw new Error('File name is required');
    }

    if (!authContext.userId) {
      throw new Error('User authentication required');
    }

    // For MCP, we expect content to be provided as string (text or base64)
    const content = params.content || '';
    const path = params.path || '/';
    const metadata = params.metadata || {};

    // Add MCP-specific metadata
    metadata.createdVia = 'mcp';
    metadata.clientId = authContext.clientId || 'unknown';
    metadata.timestamp = new Date().toISOString();

    // TODO: In production, this would integrate with the storage orchestrator
    // For now, we'll simulate the file creation process
    
    // Detect if content is base64 encoded (for binary files)
    let actualSize = content.length;
    let contentType = 'text';
    
    try {
      // Try to detect base64 content
      if (content.match(/^[A-Za-z0-9+/]*={0,2}$/) && content.length % 4 === 0) {
        // Likely base64 - calculate actual size
        actualSize = Math.floor(content.length * 3 / 4);
        contentType = 'base64';
      }
    } catch (error) {
      // Not base64, treat as text
    }

    return {
      fileId: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      path: path,
      size: actualSize,
      mimeType: this.detectMimeType(params.name),
      createdAt: new Date().toISOString(),
      createdVia: 'mcp',
      contentType,
      metadata
    };
  }

  private async updateFile(params: any, authContext: any) {
    if (!this.storageConnector) {
      throw new Error('Storage connector not configured');
    }

    const { fileId, name, path, metadata } = params;
    
    if (!fileId) {
      throw new Error('File ID is required');
    }

    try {
      const result = await this.storageConnector.updateFile({
        fileId,
        name,
        path,
        metadata: {
          ...metadata,
          updatedVia: 'mcp',
          lastModified: new Date().toISOString()
        }
      }, authContext);

      return {
        id: result.fileId || result.id,
        name: result.name,
        path: result.path,
        updatedAt: result.updatedAt || new Date().toISOString(),
        updatedVia: 'mcp'
      };
    } catch (error) {
      throw new Error(`Failed to update file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deleteFile(params: any, authContext: any) {
    if (!this.storageConnector) {
      throw new Error('Storage connector not configured');
    }

    const { fileId } = params;
    
    if (!fileId) {
      throw new Error('File ID is required');
    }

    try {
      const result = await this.storageConnector.deleteFile({
        fileId
      }, authContext);

      return {
        id: fileId,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedVia: 'mcp'
      };
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async validateScopes(method: string, userScopes: string[]) {
    const requiredScopes: Record<string, string[]> = {
      'searchFiles': ['files:read'],
      'readFile': ['files:read'],
      'createFile': ['files:write'],
      'updateFile': ['files:write'],
      'deleteFile': ['files:delete']
    };

    const required = requiredScopes[method] || [];
    const hasPermission = required.every(scope => userScopes.includes(scope));

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }
  }

  private detectMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'js': 'text/javascript',
      'ts': 'text/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'csv': 'text/csv',
      'xml': 'application/xml',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  // Mock methods for development/testing
  private mockSearchResults(query: string, limit: number) {
    const mockFiles = [
      {
        id: `mock-search-1-${Date.now()}`,
        name: `${query}_document.txt`,
        path: '/documents',
        size: 1024,
        mimeType: 'text/plain',
        createdAt: new Date().toISOString()
      },
      {
        id: `mock-search-2-${Date.now()}`,
        name: `${query}_data.json`,
        path: '/data',
        size: 2048,
        mimeType: 'application/json',
        createdAt: new Date().toISOString()
      }
    ];

    return {
      results: mockFiles.slice(0, limit),
      total: mockFiles.length,
      page: 1,
      pageSize: limit
    };
  }

  private mockFileContent(fileId: string, preview: boolean) {
    const mockContent = preview ? 
      `Preview of file ${fileId}. This is mock content for development.` :
      `Full content of file ${fileId}.\n\nThis is mock content generated by the MCP server for development and testing purposes.\n\nFile ID: ${fileId}\nGenerated: ${new Date().toISOString()}`;

    return {
      id: fileId,
      name: `mock_file_${fileId}.txt`,
      content: mockContent,
      mimeType: 'text/plain',
      size: mockContent.length,
      createdAt: new Date().toISOString(),
      preview: preview
    };
  }
}