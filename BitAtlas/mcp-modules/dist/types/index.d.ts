/**
 * Core MCP Protocol Types for BitAtlas
 */
export interface MCPRequest {
    id: string;
    method: string;
    params?: Record<string, unknown>;
    timestamp: number;
}
export interface MCPResponse<T = unknown> {
    id: string;
    result?: T;
    error?: MCPError;
    timestamp: number;
}
export interface MCPError {
    code: number;
    message: string;
    data?: unknown;
}
export interface MCPNotification {
    method: string;
    params?: Record<string, unknown>;
    timestamp: number;
}
export interface AuthToken {
    token: string;
    expiresAt: number;
    refreshToken?: string;
    scope: string[];
}
export interface AuthCredentials {
    username?: string;
    email?: string;
    password?: string;
    apiKey?: string;
    oauth?: OAuthCredentials;
}
export interface OAuthCredentials {
    provider: 'github' | 'google' | 'microsoft';
    code: string;
    redirectUri: string;
}
export interface User {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: Permission[];
    createdAt: string;
    lastActiveAt: string;
}
export interface Permission {
    resource: string;
    actions: string[];
}
export interface Session {
    id: string;
    userId: string;
    token: AuthToken;
    metadata: Record<string, unknown>;
    createdAt: string;
    expiresAt: string;
}
export interface FileMetadata {
    path: string;
    name: string;
    size: number;
    type: 'file' | 'directory';
    mimeType?: string;
    permissions: FilePermissions;
    createdAt: string;
    modifiedAt: string;
    checksum?: string;
}
export interface FilePermissions {
    read: boolean;
    write: boolean;
    execute: boolean;
    owner: string;
    group: string;
}
export interface FileContent {
    metadata: FileMetadata;
    content: string | Buffer;
    encoding: 'utf8' | 'base64' | 'binary';
}
export interface SearchQuery {
    query: string;
    filters?: SearchFilters;
    sort?: SearchSort;
    pagination?: Pagination;
}
export interface SearchFilters {
    fileTypes?: string[];
    modifiedAfter?: string;
    modifiedBefore?: string;
    sizeMin?: number;
    sizeMax?: number;
    path?: string;
    tags?: string[];
}
export interface SearchSort {
    field: 'name' | 'size' | 'modifiedAt' | 'relevance';
    direction: 'asc' | 'desc';
}
export interface Pagination {
    page: number;
    limit: number;
    offset?: number;
}
export interface SearchResult {
    items: SearchResultItem[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
}
export interface SearchResultItem {
    id: string;
    path: string;
    name: string;
    type: 'file' | 'directory';
    relevance: number;
    matches: SearchMatch[];
    metadata: FileMetadata;
}
export interface SearchMatch {
    field: string;
    value: string;
    highlight: string;
    line?: number;
    column?: number;
}
export interface WSConnection {
    id: string;
    userId?: string;
    sessionId?: string;
    connected: boolean;
    lastPing: number;
    metadata: Record<string, unknown>;
}
export interface WSMessage {
    type: 'request' | 'response' | 'notification' | 'error';
    data: MCPRequest | MCPResponse | MCPNotification | MCPError;
    connectionId: string;
    timestamp: number;
}
//# sourceMappingURL=index.d.ts.map