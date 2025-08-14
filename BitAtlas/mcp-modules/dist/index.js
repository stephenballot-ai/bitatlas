/**
 * BitAtlas MCP Modules - Main Export File
 *
 * This module exports all shared MCP protocol types, interfaces, and schemas
 * for use across the BitAtlas monorepo.
 */
// Export all types
export * from './types/index.js';
// Export all schemas
export * from './schemas/index.js';
// Export all interfaces
export * from './interfaces/index.js';
// Export commonly used constants
export const MCP_PROTOCOL_VERSION = '1.0.0';
export const MCP_NAMESPACE = 'bitatlas';
// Error codes following JSON-RPC 2.0 specification
export const MCP_ERROR_CODES = {
    // Standard JSON-RPC errors
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    // BitAtlas specific errors
    AUTHENTICATION_FAILED: -32001,
    AUTHORIZATION_FAILED: -32002,
    FILE_NOT_FOUND: -32003,
    FILE_ACCESS_DENIED: -32004,
    FILE_ALREADY_EXISTS: -32005,
    SEARCH_FAILED: -32006,
    CONNECTION_FAILED: -32007,
    RATE_LIMIT_EXCEEDED: -32008,
    QUOTA_EXCEEDED: -32009,
    INVALID_FILE_TYPE: -32010,
};
// Method names for MCP protocol
export const MCP_METHODS = {
    // Authentication methods
    AUTH_LOGIN: 'auth.login',
    AUTH_LOGOUT: 'auth.logout',
    AUTH_REFRESH: 'auth.refresh',
    AUTH_VALIDATE: 'auth.validate',
    // File operation methods
    FILE_CREATE: 'file.create',
    FILE_READ: 'file.read',
    FILE_UPDATE: 'file.update',
    FILE_DELETE: 'file.delete',
    FILE_LIST: 'file.list',
    FILE_STAT: 'file.stat',
    FILE_EXISTS: 'file.exists',
    FILE_COPY: 'file.copy',
    FILE_MOVE: 'file.move',
    FILE_CHMOD: 'file.chmod',
    FILE_CHOWN: 'file.chown',
    // Directory methods
    DIR_CREATE: 'directory.create',
    DIR_LIST: 'directory.list',
    DIR_DELETE: 'directory.delete',
    // Search methods
    SEARCH_QUERY: 'search.query',
    SEARCH_CONTENT: 'search.content',
    SEARCH_FILES: 'search.files',
    SEARCH_TAGS: 'search.tags',
    SEARCH_DATE: 'search.date',
    SEARCH_INDEX: 'search.index',
    SEARCH_REINDEX: 'search.reindex',
    SEARCH_STATUS: 'search.status',
    // WebSocket methods
    WS_CONNECT: 'ws.connect',
    WS_DISCONNECT: 'ws.disconnect',
    WS_PING: 'ws.ping',
    WS_PONG: 'ws.pong',
    WS_BROADCAST: 'ws.broadcast',
    // System methods
    SYSTEM_INFO: 'system.info',
    SYSTEM_HEALTH: 'system.health',
    SYSTEM_STATUS: 'system.status',
};
// Notification methods (one-way messages)
export const MCP_NOTIFICATIONS = {
    // File system notifications
    FILE_CREATED: 'file.created',
    FILE_MODIFIED: 'file.modified',
    FILE_DELETED: 'file.deleted',
    FILE_MOVED: 'file.moved',
    // User notifications
    USER_CONNECTED: 'user.connected',
    USER_DISCONNECTED: 'user.disconnected',
    USER_ACTIVITY: 'user.activity',
    // System notifications
    SYSTEM_MAINTENANCE: 'system.maintenance',
    SYSTEM_SHUTDOWN: 'system.shutdown',
    SYSTEM_ERROR: 'system.error',
    // Search notifications
    INDEX_UPDATED: 'search.index.updated',
    INDEX_CORRUPTED: 'search.index.corrupted',
};
// Utility function to create MCP requests
export function createMCPRequest(method, params, id) {
    return {
        id: id || generateRequestId(),
        method,
        params,
        timestamp: Date.now(),
    };
}
// Utility function to create MCP responses
export function createMCPResponse(id, result, error) {
    return {
        id,
        result,
        error,
        timestamp: Date.now(),
    };
}
// Utility function to create MCP errors
export function createMCPError(code, message, data) {
    return {
        code,
        message,
        data,
    };
}
// Utility function to create notifications
export function createMCPNotification(method, params) {
    return {
        method,
        params,
        timestamp: Date.now(),
    };
}
// Utility function to generate unique request IDs
export function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
// Type guards
export function isMCPRequest(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'method' in obj &&
        'timestamp' in obj);
}
export function isMCPResponse(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'timestamp' in obj &&
        ('result' in obj || 'error' in obj));
}
export function isMCPError(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'code' in obj &&
        'message' in obj);
}
export function isMCPNotification(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'method' in obj &&
        'timestamp' in obj &&
        !('id' in obj));
}
//# sourceMappingURL=index.js.map