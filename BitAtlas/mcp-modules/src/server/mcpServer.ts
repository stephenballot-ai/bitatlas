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

  private async searchFiles(params: any, authContext: any) {
    // Implementation placeholder - will be connected to actual search service
    throw new Error('Not implemented yet');
  }

  private async readFile(params: any, authContext: any) {
    // Implementation placeholder - will be connected to file service
    throw new Error('Not implemented yet');
  }

  private async createFile(params: any, authContext: any) {
    // Implementation placeholder - will be connected to file service
    throw new Error('Not implemented yet');
  }

  private async updateFile(params: any, authContext: any) {
    // Implementation placeholder - will be connected to file service
    throw new Error('Not implemented yet');
  }

  private async deleteFile(params: any, authContext: any) {
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
}