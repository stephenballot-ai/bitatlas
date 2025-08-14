/**
 * Zod Schemas for MCP Protocol Validation
 */
import { z } from 'zod';
// Base MCP schemas
export const MCPRequestSchema = z.object({
    id: z.string(),
    method: z.string(),
    params: z.record(z.unknown()).optional(),
    timestamp: z.number(),
});
export const MCPErrorSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
});
export const MCPResponseSchema = z.object({
    id: z.string(),
    result: z.unknown().optional(),
    error: MCPErrorSchema.optional(),
    timestamp: z.number(),
});
export const MCPNotificationSchema = z.object({
    method: z.string(),
    params: z.record(z.unknown()).optional(),
    timestamp: z.number(),
});
// Authentication schemas
export const AuthTokenSchema = z.object({
    token: z.string(),
    expiresAt: z.number(),
    refreshToken: z.string().optional(),
    scope: z.array(z.string()),
});
export const OAuthCredentialsSchema = z.object({
    provider: z.enum(['github', 'google', 'microsoft']),
    code: z.string(),
    redirectUri: z.string(),
});
export const AuthCredentialsSchema = z.object({
    username: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    oauth: OAuthCredentialsSchema.optional(),
});
// User schemas
export const PermissionSchema = z.object({
    resource: z.string(),
    actions: z.array(z.string()),
});
export const UserSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    roles: z.array(z.string()),
    permissions: z.array(PermissionSchema),
    createdAt: z.string(),
    lastActiveAt: z.string(),
});
export const SessionSchema = z.object({
    id: z.string(),
    userId: z.string(),
    token: AuthTokenSchema,
    metadata: z.record(z.unknown()),
    createdAt: z.string(),
    expiresAt: z.string(),
});
// File operation schemas
export const FilePermissionsSchema = z.object({
    read: z.boolean(),
    write: z.boolean(),
    execute: z.boolean(),
    owner: z.string(),
    group: z.string(),
});
export const FileMetadataSchema = z.object({
    path: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.enum(['file', 'directory']),
    mimeType: z.string().optional(),
    permissions: FilePermissionsSchema,
    createdAt: z.string(),
    modifiedAt: z.string(),
    checksum: z.string().optional(),
});
export const FileContentSchema = z.object({
    metadata: FileMetadataSchema,
    content: z.union([z.string(), z.instanceof(Buffer)]),
    encoding: z.enum(['utf8', 'base64', 'binary']),
});
// File operation request schemas
export const FileCreateRequestSchema = z.object({
    path: z.string(),
    content: z.string(),
    encoding: z.enum(['utf8', 'base64']).default('utf8'),
    permissions: FilePermissionsSchema.optional(),
    overwrite: z.boolean().default(false),
});
export const FileReadRequestSchema = z.object({
    path: z.string(),
    encoding: z.enum(['utf8', 'base64', 'binary']).default('utf8'),
    offset: z.number().optional(),
    length: z.number().optional(),
});
export const FileUpdateRequestSchema = z.object({
    path: z.string(),
    content: z.string(),
    encoding: z.enum(['utf8', 'base64']).default('utf8'),
    createIfNotExists: z.boolean().default(false),
});
export const FileDeleteRequestSchema = z.object({
    path: z.string(),
    recursive: z.boolean().default(false),
});
export const FileListRequestSchema = z.object({
    path: z.string(),
    recursive: z.boolean().default(false),
    includeHidden: z.boolean().default(false),
    filters: z.object({
        extension: z.string().optional(),
        sizeMin: z.number().optional(),
        sizeMax: z.number().optional(),
        modifiedAfter: z.string().optional(),
        modifiedBefore: z.string().optional(),
    }).optional(),
});
// Search schemas
export const SearchFiltersSchema = z.object({
    fileTypes: z.array(z.string()).optional(),
    modifiedAfter: z.string().optional(),
    modifiedBefore: z.string().optional(),
    sizeMin: z.number().optional(),
    sizeMax: z.number().optional(),
    path: z.string().optional(),
    tags: z.array(z.string()).optional(),
});
export const SearchSortSchema = z.object({
    field: z.enum(['name', 'size', 'modifiedAt', 'relevance']),
    direction: z.enum(['asc', 'desc']),
});
export const PaginationSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(1000),
    offset: z.number().optional(),
});
export const SearchQuerySchema = z.object({
    query: z.string(),
    filters: SearchFiltersSchema.optional(),
    sort: SearchSortSchema.optional(),
    pagination: PaginationSchema.optional(),
});
export const SearchMatchSchema = z.object({
    field: z.string(),
    value: z.string(),
    highlight: z.string(),
    line: z.number().optional(),
    column: z.number().optional(),
});
export const SearchResultItemSchema = z.object({
    id: z.string(),
    path: z.string(),
    name: z.string(),
    type: z.enum(['file', 'directory']),
    relevance: z.number(),
    matches: z.array(SearchMatchSchema),
    metadata: FileMetadataSchema,
});
export const SearchResultSchema = z.object({
    items: z.array(SearchResultItemSchema),
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
});
// WebSocket schemas
export const WSConnectionSchema = z.object({
    id: z.string(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    connected: z.boolean(),
    lastPing: z.number(),
    metadata: z.record(z.unknown()),
});
export const WSMessageSchema = z.object({
    type: z.enum(['request', 'response', 'notification', 'error']),
    data: z.union([MCPRequestSchema, MCPResponseSchema, MCPNotificationSchema, MCPErrorSchema]),
    connectionId: z.string(),
    timestamp: z.number(),
});
// Method-specific request schemas
export const AuthLoginRequestSchema = z.object({
    credentials: AuthCredentialsSchema,
    rememberMe: z.boolean().default(false),
});
export const AuthLogoutRequestSchema = z.object({
    token: z.string(),
});
export const AuthRefreshRequestSchema = z.object({
    refreshToken: z.string(),
});
//# sourceMappingURL=index.js.map