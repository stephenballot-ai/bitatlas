export interface McpRequest {
    version: string;
    id: string;
    method: string;
    params: Record<string, any>;
}
export interface McpResponse {
    version: string;
    id: string;
    result?: any;
    error?: McpError;
}
export interface McpError {
    code: string;
    message: string;
    details?: Record<string, any>;
}
export declare enum McpErrorCode {
    UNAUTHORIZED = "ERR_UNAUTHORIZED",
    NOT_FOUND = "ERR_NOT_FOUND",
    INVALID_REQUEST = "ERR_INVALID_REQUEST",
    INTERNAL_ERROR = "ERR_INTERNAL_ERROR",
    RATE_LIMITED = "ERR_RATE_LIMITED",
    FILE_TOO_LARGE = "ERR_FILE_TOO_LARGE",
    STORAGE_FULL = "ERR_STORAGE_FULL",
    INSUFFICIENT_PERMISSIONS = "ERR_INSUFFICIENT_PERMISSIONS"
}
export interface FileMetadata {
    id: string;
    name: string;
    path: string;
    size: number;
    mimeType: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
}
export interface CreateFileRequest extends McpRequest {
    method: 'createFile';
    params: {
        name: string;
        content?: string;
        path?: string;
        folderId?: string;
        metadata?: Record<string, any>;
    };
}
export interface CreateFileResponse extends McpResponse {
    result: {
        fileId: string;
        uploadUrl?: string;
    };
}
export interface ReadFileRequest extends McpRequest {
    method: 'readFile';
    params: {
        fileId: string;
        preview?: boolean;
    };
}
export interface ReadFileResponse extends McpResponse {
    result: {
        id: string;
        name: string;
        content: string;
        mimeType: string;
        size: number;
    };
}
export interface SearchFilesRequest extends McpRequest {
    method: 'searchFiles';
    params: {
        query: string;
        filters?: Record<string, any>;
        page?: number;
        pageSize?: number;
    };
}
export interface SearchFilesResponse extends McpResponse {
    result: {
        results: FileMetadata[];
        total: number;
        page: number;
        pageSize: number;
    };
}
//# sourceMappingURL=mcpProtocol.d.ts.map