import { McpRequest, McpResponse } from '../types/mcpProtocol';
export declare class McpServer {
    private tools;
    constructor();
    private registerTools;
    handleRequest(request: McpRequest, authContext: any): Promise<McpResponse>;
    private searchFiles;
    private readFile;
    private createFile;
    private updateFile;
    private deleteFile;
    private validateScopes;
}
//# sourceMappingURL=mcpServer.d.ts.map