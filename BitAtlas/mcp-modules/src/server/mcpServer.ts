import { McpRequest, McpResponse, McpErrorCode } from '../types/mcpProtocol';

export class McpServer {
  private tools: Map<string, Function> = new Map();

  constructor() {
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

  private async searchFiles(_params: any, _authContext: any) {
    // Implementation placeholder - will be connected to actual search service
    throw new Error('Not implemented yet');
  }

  private async readFile(_params: any, _authContext: any) {
    // Implementation placeholder - will be connected to file service
    throw new Error('Not implemented yet');
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

  private async updateFile(_params: any, _authContext: any) {
    // Implementation placeholder - will be connected to file service
    throw new Error('Not implemented yet');
  }

  private async deleteFile(_params: any, _authContext: any) {
    // Implementation placeholder - will be connected to file service
    throw new Error('Not implemented yet');
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
}