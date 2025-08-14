/**
 * BitAtlas MCP Modules - Main Export File
 *
 * This module exports all shared MCP protocol types, interfaces, and schemas
 * for use across the BitAtlas monorepo.
 */
export * from './types/index.js';
export * from './schemas/index.js';
export * from './interfaces/index.js';
import type { MCPRequest, MCPResponse, MCPError, MCPNotification } from './types/index.js';
export declare const MCP_PROTOCOL_VERSION = "1.0.0";
export declare const MCP_NAMESPACE = "bitatlas";
export declare const MCP_ERROR_CODES: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly AUTHENTICATION_FAILED: -32001;
    readonly AUTHORIZATION_FAILED: -32002;
    readonly FILE_NOT_FOUND: -32003;
    readonly FILE_ACCESS_DENIED: -32004;
    readonly FILE_ALREADY_EXISTS: -32005;
    readonly SEARCH_FAILED: -32006;
    readonly CONNECTION_FAILED: -32007;
    readonly RATE_LIMIT_EXCEEDED: -32008;
    readonly QUOTA_EXCEEDED: -32009;
    readonly INVALID_FILE_TYPE: -32010;
};
export declare const MCP_METHODS: {
    readonly AUTH_LOGIN: "auth.login";
    readonly AUTH_LOGOUT: "auth.logout";
    readonly AUTH_REFRESH: "auth.refresh";
    readonly AUTH_VALIDATE: "auth.validate";
    readonly FILE_CREATE: "file.create";
    readonly FILE_READ: "file.read";
    readonly FILE_UPDATE: "file.update";
    readonly FILE_DELETE: "file.delete";
    readonly FILE_LIST: "file.list";
    readonly FILE_STAT: "file.stat";
    readonly FILE_EXISTS: "file.exists";
    readonly FILE_COPY: "file.copy";
    readonly FILE_MOVE: "file.move";
    readonly FILE_CHMOD: "file.chmod";
    readonly FILE_CHOWN: "file.chown";
    readonly DIR_CREATE: "directory.create";
    readonly DIR_LIST: "directory.list";
    readonly DIR_DELETE: "directory.delete";
    readonly SEARCH_QUERY: "search.query";
    readonly SEARCH_CONTENT: "search.content";
    readonly SEARCH_FILES: "search.files";
    readonly SEARCH_TAGS: "search.tags";
    readonly SEARCH_DATE: "search.date";
    readonly SEARCH_INDEX: "search.index";
    readonly SEARCH_REINDEX: "search.reindex";
    readonly SEARCH_STATUS: "search.status";
    readonly WS_CONNECT: "ws.connect";
    readonly WS_DISCONNECT: "ws.disconnect";
    readonly WS_PING: "ws.ping";
    readonly WS_PONG: "ws.pong";
    readonly WS_BROADCAST: "ws.broadcast";
    readonly SYSTEM_INFO: "system.info";
    readonly SYSTEM_HEALTH: "system.health";
    readonly SYSTEM_STATUS: "system.status";
};
export declare const MCP_NOTIFICATIONS: {
    readonly FILE_CREATED: "file.created";
    readonly FILE_MODIFIED: "file.modified";
    readonly FILE_DELETED: "file.deleted";
    readonly FILE_MOVED: "file.moved";
    readonly USER_CONNECTED: "user.connected";
    readonly USER_DISCONNECTED: "user.disconnected";
    readonly USER_ACTIVITY: "user.activity";
    readonly SYSTEM_MAINTENANCE: "system.maintenance";
    readonly SYSTEM_SHUTDOWN: "system.shutdown";
    readonly SYSTEM_ERROR: "system.error";
    readonly INDEX_UPDATED: "search.index.updated";
    readonly INDEX_CORRUPTED: "search.index.corrupted";
};
export declare function createMCPRequest(method: string, params?: Record<string, unknown>, id?: string): MCPRequest;
export declare function createMCPResponse<T = unknown>(id: string, result?: T, error?: MCPError): MCPResponse<T>;
export declare function createMCPError(code: number, message: string, data?: unknown): MCPError;
export declare function createMCPNotification(method: string, params?: Record<string, unknown>): MCPNotification;
export declare function generateRequestId(): string;
export declare function isMCPRequest(obj: unknown): obj is MCPRequest;
export declare function isMCPResponse(obj: unknown): obj is MCPResponse;
export declare function isMCPError(obj: unknown): obj is MCPError;
export declare function isMCPNotification(obj: unknown): obj is MCPNotification;
export type { MCPRequest, MCPResponse, MCPError, MCPNotification, AuthToken, AuthCredentials, OAuthCredentials, User, Permission, Session, FileMetadata, FilePermissions, FileContent, SearchQuery, SearchFilters, SearchSort, Pagination, SearchResult, SearchResultItem, SearchMatch, WSConnection, WSMessage, } from './types/index.js';
//# sourceMappingURL=index.d.ts.map