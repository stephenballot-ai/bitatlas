import { McpErrorCode } from '../types/mcpProtocol';
export class McpServer {
    tools = new Map();
    constructor() {
        this.registerTools();
    }
    registerTools() {
        this.tools.set('searchFiles', this.searchFiles.bind(this));
        this.tools.set('readFile', this.readFile.bind(this));
        this.tools.set('createFile', this.createFile.bind(this));
        this.tools.set('updateFile', this.updateFile.bind(this));
        this.tools.set('deleteFile', this.deleteFile.bind(this));
    }
    async handleRequest(request, authContext) {
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
        }
        catch (error) {
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
    async searchFiles(_params, _authContext) {
        // Implementation placeholder - will be connected to actual search service
        throw new Error('Not implemented yet');
    }
    async readFile(_params, _authContext) {
        // Implementation placeholder - will be connected to file service
        throw new Error('Not implemented yet');
    }
    async createFile(_params, _authContext) {
        // Implementation placeholder - will be connected to file service
        throw new Error('Not implemented yet');
    }
    async updateFile(_params, _authContext) {
        // Implementation placeholder - will be connected to file service
        throw new Error('Not implemented yet');
    }
    async deleteFile(_params, _authContext) {
        // Implementation placeholder - will be connected to file service
        throw new Error('Not implemented yet');
    }
    async validateScopes(method, userScopes) {
        const requiredScopes = {
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
//# sourceMappingURL=mcpServer.js.map