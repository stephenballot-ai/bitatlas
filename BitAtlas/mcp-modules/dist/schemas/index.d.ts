/**
 * Zod Schemas for MCP Protocol Validation
 */
import { z } from 'zod';
export declare const MCPRequestSchema: z.ZodObject<{
    id: z.ZodString;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    method: string;
    timestamp: number;
    params?: Record<string, unknown> | undefined;
}, {
    id: string;
    method: string;
    timestamp: number;
    params?: Record<string, unknown> | undefined;
}>;
export declare const MCPErrorSchema: z.ZodObject<{
    code: z.ZodNumber;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    code: number;
    message: string;
    data?: unknown;
}, {
    code: number;
    message: string;
    data?: unknown;
}>;
export declare const MCPResponseSchema: z.ZodObject<{
    id: z.ZodString;
    result: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: number;
        message: string;
        data?: unknown;
    }, {
        code: number;
        message: string;
        data?: unknown;
    }>>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    } | undefined;
}, {
    id: string;
    timestamp: number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    } | undefined;
}>;
export declare const MCPNotificationSchema: z.ZodObject<{
    method: z.ZodString;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    method: string;
    timestamp: number;
    params?: Record<string, unknown> | undefined;
}, {
    method: string;
    timestamp: number;
    params?: Record<string, unknown> | undefined;
}>;
export declare const AuthTokenSchema: z.ZodObject<{
    token: z.ZodString;
    expiresAt: z.ZodNumber;
    refreshToken: z.ZodOptional<z.ZodString>;
    scope: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    token: string;
    expiresAt: number;
    scope: string[];
    refreshToken?: string | undefined;
}, {
    token: string;
    expiresAt: number;
    scope: string[];
    refreshToken?: string | undefined;
}>;
export declare const OAuthCredentialsSchema: z.ZodObject<{
    provider: z.ZodEnum<["github", "google", "microsoft"]>;
    code: z.ZodString;
    redirectUri: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    provider: "github" | "google" | "microsoft";
    redirectUri: string;
}, {
    code: string;
    provider: "github" | "google" | "microsoft";
    redirectUri: string;
}>;
export declare const AuthCredentialsSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    oauth: z.ZodOptional<z.ZodObject<{
        provider: z.ZodEnum<["github", "google", "microsoft"]>;
        code: z.ZodString;
        redirectUri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        provider: "github" | "google" | "microsoft";
        redirectUri: string;
    }, {
        code: string;
        provider: "github" | "google" | "microsoft";
        redirectUri: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    email?: string | undefined;
    password?: string | undefined;
    apiKey?: string | undefined;
    oauth?: {
        code: string;
        provider: "github" | "google" | "microsoft";
        redirectUri: string;
    } | undefined;
}, {
    username?: string | undefined;
    email?: string | undefined;
    password?: string | undefined;
    apiKey?: string | undefined;
    oauth?: {
        code: string;
        provider: "github" | "google" | "microsoft";
        redirectUri: string;
    } | undefined;
}>;
export declare const PermissionSchema: z.ZodObject<{
    resource: z.ZodString;
    actions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    resource: string;
    actions: string[];
}, {
    resource: string;
    actions: string[];
}>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    roles: z.ZodArray<z.ZodString, "many">;
    permissions: z.ZodArray<z.ZodObject<{
        resource: z.ZodString;
        actions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        resource: string;
        actions: string[];
    }, {
        resource: string;
        actions: string[];
    }>, "many">;
    createdAt: z.ZodString;
    lastActiveAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: {
        resource: string;
        actions: string[];
    }[];
    createdAt: string;
    lastActiveAt: string;
}, {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: {
        resource: string;
        actions: string[];
    }[];
    createdAt: string;
    lastActiveAt: string;
}>;
export declare const SessionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    token: z.ZodObject<{
        token: z.ZodString;
        expiresAt: z.ZodNumber;
        refreshToken: z.ZodOptional<z.ZodString>;
        scope: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        token: string;
        expiresAt: number;
        scope: string[];
        refreshToken?: string | undefined;
    }, {
        token: string;
        expiresAt: number;
        scope: string[];
        refreshToken?: string | undefined;
    }>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    token: {
        token: string;
        expiresAt: number;
        scope: string[];
        refreshToken?: string | undefined;
    };
    expiresAt: string;
    createdAt: string;
    metadata: Record<string, unknown>;
}, {
    id: string;
    userId: string;
    token: {
        token: string;
        expiresAt: number;
        scope: string[];
        refreshToken?: string | undefined;
    };
    expiresAt: string;
    createdAt: string;
    metadata: Record<string, unknown>;
}>;
export declare const FilePermissionsSchema: z.ZodObject<{
    read: z.ZodBoolean;
    write: z.ZodBoolean;
    execute: z.ZodBoolean;
    owner: z.ZodString;
    group: z.ZodString;
}, "strip", z.ZodTypeAny, {
    read: boolean;
    write: boolean;
    execute: boolean;
    owner: string;
    group: string;
}, {
    read: boolean;
    write: boolean;
    execute: boolean;
    owner: string;
    group: string;
}>;
export declare const FileMetadataSchema: z.ZodObject<{
    path: z.ZodString;
    name: z.ZodString;
    size: z.ZodNumber;
    type: z.ZodEnum<["file", "directory"]>;
    mimeType: z.ZodOptional<z.ZodString>;
    permissions: z.ZodObject<{
        read: z.ZodBoolean;
        write: z.ZodBoolean;
        execute: z.ZodBoolean;
        owner: z.ZodString;
        group: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    }, {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    }>;
    createdAt: z.ZodString;
    modifiedAt: z.ZodString;
    checksum: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    size: number;
    modifiedAt: string;
    path: string;
    type: "file" | "directory";
    permissions: {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    };
    createdAt: string;
    mimeType?: string | undefined;
    checksum?: string | undefined;
}, {
    name: string;
    size: number;
    modifiedAt: string;
    path: string;
    type: "file" | "directory";
    permissions: {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    };
    createdAt: string;
    mimeType?: string | undefined;
    checksum?: string | undefined;
}>;
export declare const FileContentSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        path: z.ZodString;
        name: z.ZodString;
        size: z.ZodNumber;
        type: z.ZodEnum<["file", "directory"]>;
        mimeType: z.ZodOptional<z.ZodString>;
        permissions: z.ZodObject<{
            read: z.ZodBoolean;
            write: z.ZodBoolean;
            execute: z.ZodBoolean;
            owner: z.ZodString;
            group: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        }, {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        }>;
        createdAt: z.ZodString;
        modifiedAt: z.ZodString;
        checksum: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    }, {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    }>;
    content: z.ZodUnion<[z.ZodString, z.ZodType<Buffer<ArrayBufferLike>, z.ZodTypeDef, Buffer<ArrayBufferLike>>]>;
    encoding: z.ZodEnum<["utf8", "base64", "binary"]>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    };
    content: string | Buffer<ArrayBufferLike>;
    encoding: "utf8" | "base64" | "binary";
}, {
    metadata: {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    };
    content: string | Buffer<ArrayBufferLike>;
    encoding: "utf8" | "base64" | "binary";
}>;
export declare const FileCreateRequestSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
    encoding: z.ZodDefault<z.ZodEnum<["utf8", "base64"]>>;
    permissions: z.ZodOptional<z.ZodObject<{
        read: z.ZodBoolean;
        write: z.ZodBoolean;
        execute: z.ZodBoolean;
        owner: z.ZodString;
        group: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    }, {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    }>>;
    overwrite: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    path: string;
    content: string;
    encoding: "utf8" | "base64";
    overwrite: boolean;
    permissions?: {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    } | undefined;
}, {
    path: string;
    content: string;
    permissions?: {
        read: boolean;
        write: boolean;
        execute: boolean;
        owner: string;
        group: string;
    } | undefined;
    encoding?: "utf8" | "base64" | undefined;
    overwrite?: boolean | undefined;
}>;
export declare const FileReadRequestSchema: z.ZodObject<{
    path: z.ZodString;
    encoding: z.ZodDefault<z.ZodEnum<["utf8", "base64", "binary"]>>;
    offset: z.ZodOptional<z.ZodNumber>;
    length: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    encoding: "utf8" | "base64" | "binary";
    length?: number | undefined;
    offset?: number | undefined;
}, {
    path: string;
    length?: number | undefined;
    encoding?: "utf8" | "base64" | "binary" | undefined;
    offset?: number | undefined;
}>;
export declare const FileUpdateRequestSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
    encoding: z.ZodDefault<z.ZodEnum<["utf8", "base64"]>>;
    createIfNotExists: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    path: string;
    content: string;
    encoding: "utf8" | "base64";
    createIfNotExists: boolean;
}, {
    path: string;
    content: string;
    encoding?: "utf8" | "base64" | undefined;
    createIfNotExists?: boolean | undefined;
}>;
export declare const FileDeleteRequestSchema: z.ZodObject<{
    path: z.ZodString;
    recursive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    path: string;
    recursive: boolean;
}, {
    path: string;
    recursive?: boolean | undefined;
}>;
export declare const FileListRequestSchema: z.ZodObject<{
    path: z.ZodString;
    recursive: z.ZodDefault<z.ZodBoolean>;
    includeHidden: z.ZodDefault<z.ZodBoolean>;
    filters: z.ZodOptional<z.ZodObject<{
        extension: z.ZodOptional<z.ZodString>;
        sizeMin: z.ZodOptional<z.ZodNumber>;
        sizeMax: z.ZodOptional<z.ZodNumber>;
        modifiedAfter: z.ZodOptional<z.ZodString>;
        modifiedBefore: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        extension?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
    }, {
        extension?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    recursive: boolean;
    includeHidden: boolean;
    filters?: {
        extension?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
    } | undefined;
}, {
    path: string;
    recursive?: boolean | undefined;
    includeHidden?: boolean | undefined;
    filters?: {
        extension?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
    } | undefined;
}>;
export declare const SearchFiltersSchema: z.ZodObject<{
    fileTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    modifiedAfter: z.ZodOptional<z.ZodString>;
    modifiedBefore: z.ZodOptional<z.ZodString>;
    sizeMin: z.ZodOptional<z.ZodNumber>;
    sizeMax: z.ZodOptional<z.ZodNumber>;
    path: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    path?: string | undefined;
    sizeMin?: number | undefined;
    sizeMax?: number | undefined;
    modifiedAfter?: string | undefined;
    modifiedBefore?: string | undefined;
    fileTypes?: string[] | undefined;
    tags?: string[] | undefined;
}, {
    path?: string | undefined;
    sizeMin?: number | undefined;
    sizeMax?: number | undefined;
    modifiedAfter?: string | undefined;
    modifiedBefore?: string | undefined;
    fileTypes?: string[] | undefined;
    tags?: string[] | undefined;
}>;
export declare const SearchSortSchema: z.ZodObject<{
    field: z.ZodEnum<["name", "size", "modifiedAt", "relevance"]>;
    direction: z.ZodEnum<["asc", "desc"]>;
}, "strip", z.ZodTypeAny, {
    field: "name" | "size" | "modifiedAt" | "relevance";
    direction: "asc" | "desc";
}, {
    field: "name" | "size" | "modifiedAt" | "relevance";
    direction: "asc" | "desc";
}>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    offset?: number | undefined;
}, {
    page: number;
    limit: number;
    offset?: number | undefined;
}>;
export declare const SearchQuerySchema: z.ZodObject<{
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodObject<{
        fileTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        modifiedAfter: z.ZodOptional<z.ZodString>;
        modifiedBefore: z.ZodOptional<z.ZodString>;
        sizeMin: z.ZodOptional<z.ZodNumber>;
        sizeMax: z.ZodOptional<z.ZodNumber>;
        path: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        path?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
        fileTypes?: string[] | undefined;
        tags?: string[] | undefined;
    }, {
        path?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
        fileTypes?: string[] | undefined;
        tags?: string[] | undefined;
    }>>;
    sort: z.ZodOptional<z.ZodObject<{
        field: z.ZodEnum<["name", "size", "modifiedAt", "relevance"]>;
        direction: z.ZodEnum<["asc", "desc"]>;
    }, "strip", z.ZodTypeAny, {
        field: "name" | "size" | "modifiedAt" | "relevance";
        direction: "asc" | "desc";
    }, {
        field: "name" | "size" | "modifiedAt" | "relevance";
        direction: "asc" | "desc";
    }>>;
    pagination: z.ZodOptional<z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        offset?: number | undefined;
    }, {
        page: number;
        limit: number;
        offset?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    sort?: {
        field: "name" | "size" | "modifiedAt" | "relevance";
        direction: "asc" | "desc";
    } | undefined;
    filters?: {
        path?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
        fileTypes?: string[] | undefined;
        tags?: string[] | undefined;
    } | undefined;
    pagination?: {
        page: number;
        limit: number;
        offset?: number | undefined;
    } | undefined;
}, {
    query: string;
    sort?: {
        field: "name" | "size" | "modifiedAt" | "relevance";
        direction: "asc" | "desc";
    } | undefined;
    filters?: {
        path?: string | undefined;
        sizeMin?: number | undefined;
        sizeMax?: number | undefined;
        modifiedAfter?: string | undefined;
        modifiedBefore?: string | undefined;
        fileTypes?: string[] | undefined;
        tags?: string[] | undefined;
    } | undefined;
    pagination?: {
        page: number;
        limit: number;
        offset?: number | undefined;
    } | undefined;
}>;
export declare const SearchMatchSchema: z.ZodObject<{
    field: z.ZodString;
    value: z.ZodString;
    highlight: z.ZodString;
    line: z.ZodOptional<z.ZodNumber>;
    column: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: string;
    field: string;
    highlight: string;
    line?: number | undefined;
    column?: number | undefined;
}, {
    value: string;
    field: string;
    highlight: string;
    line?: number | undefined;
    column?: number | undefined;
}>;
export declare const SearchResultItemSchema: z.ZodObject<{
    id: z.ZodString;
    path: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["file", "directory"]>;
    relevance: z.ZodNumber;
    matches: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        value: z.ZodString;
        highlight: z.ZodString;
        line: z.ZodOptional<z.ZodNumber>;
        column: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        field: string;
        highlight: string;
        line?: number | undefined;
        column?: number | undefined;
    }, {
        value: string;
        field: string;
        highlight: string;
        line?: number | undefined;
        column?: number | undefined;
    }>, "many">;
    metadata: z.ZodObject<{
        path: z.ZodString;
        name: z.ZodString;
        size: z.ZodNumber;
        type: z.ZodEnum<["file", "directory"]>;
        mimeType: z.ZodOptional<z.ZodString>;
        permissions: z.ZodObject<{
            read: z.ZodBoolean;
            write: z.ZodBoolean;
            execute: z.ZodBoolean;
            owner: z.ZodString;
            group: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        }, {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        }>;
        createdAt: z.ZodString;
        modifiedAt: z.ZodString;
        checksum: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    }, {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    relevance: number;
    path: string;
    type: "file" | "directory";
    metadata: {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    };
    matches: {
        value: string;
        field: string;
        highlight: string;
        line?: number | undefined;
        column?: number | undefined;
    }[];
}, {
    id: string;
    name: string;
    relevance: number;
    path: string;
    type: "file" | "directory";
    metadata: {
        name: string;
        size: number;
        modifiedAt: string;
        path: string;
        type: "file" | "directory";
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            owner: string;
            group: string;
        };
        createdAt: string;
        mimeType?: string | undefined;
        checksum?: string | undefined;
    };
    matches: {
        value: string;
        field: string;
        highlight: string;
        line?: number | undefined;
        column?: number | undefined;
    }[];
}>;
export declare const SearchResultSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        path: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["file", "directory"]>;
        relevance: z.ZodNumber;
        matches: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            value: z.ZodString;
            highlight: z.ZodString;
            line: z.ZodOptional<z.ZodNumber>;
            column: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            value: string;
            field: string;
            highlight: string;
            line?: number | undefined;
            column?: number | undefined;
        }, {
            value: string;
            field: string;
            highlight: string;
            line?: number | undefined;
            column?: number | undefined;
        }>, "many">;
        metadata: z.ZodObject<{
            path: z.ZodString;
            name: z.ZodString;
            size: z.ZodNumber;
            type: z.ZodEnum<["file", "directory"]>;
            mimeType: z.ZodOptional<z.ZodString>;
            permissions: z.ZodObject<{
                read: z.ZodBoolean;
                write: z.ZodBoolean;
                execute: z.ZodBoolean;
                owner: z.ZodString;
                group: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            }, {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            }>;
            createdAt: z.ZodString;
            modifiedAt: z.ZodString;
            checksum: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            size: number;
            modifiedAt: string;
            path: string;
            type: "file" | "directory";
            permissions: {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            };
            createdAt: string;
            mimeType?: string | undefined;
            checksum?: string | undefined;
        }, {
            name: string;
            size: number;
            modifiedAt: string;
            path: string;
            type: "file" | "directory";
            permissions: {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            };
            createdAt: string;
            mimeType?: string | undefined;
            checksum?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        relevance: number;
        path: string;
        type: "file" | "directory";
        metadata: {
            name: string;
            size: number;
            modifiedAt: string;
            path: string;
            type: "file" | "directory";
            permissions: {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            };
            createdAt: string;
            mimeType?: string | undefined;
            checksum?: string | undefined;
        };
        matches: {
            value: string;
            field: string;
            highlight: string;
            line?: number | undefined;
            column?: number | undefined;
        }[];
    }, {
        id: string;
        name: string;
        relevance: number;
        path: string;
        type: "file" | "directory";
        metadata: {
            name: string;
            size: number;
            modifiedAt: string;
            path: string;
            type: "file" | "directory";
            permissions: {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            };
            createdAt: string;
            mimeType?: string | undefined;
            checksum?: string | undefined;
        };
        matches: {
            value: string;
            field: string;
            highlight: string;
            line?: number | undefined;
            column?: number | undefined;
        }[];
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    totalPages: z.ZodNumber;
    hasMore: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    page: number;
    items: {
        id: string;
        name: string;
        relevance: number;
        path: string;
        type: "file" | "directory";
        metadata: {
            name: string;
            size: number;
            modifiedAt: string;
            path: string;
            type: "file" | "directory";
            permissions: {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            };
            createdAt: string;
            mimeType?: string | undefined;
            checksum?: string | undefined;
        };
        matches: {
            value: string;
            field: string;
            highlight: string;
            line?: number | undefined;
            column?: number | undefined;
        }[];
    }[];
    total: number;
    totalPages: number;
    hasMore: boolean;
}, {
    page: number;
    items: {
        id: string;
        name: string;
        relevance: number;
        path: string;
        type: "file" | "directory";
        metadata: {
            name: string;
            size: number;
            modifiedAt: string;
            path: string;
            type: "file" | "directory";
            permissions: {
                read: boolean;
                write: boolean;
                execute: boolean;
                owner: string;
                group: string;
            };
            createdAt: string;
            mimeType?: string | undefined;
            checksum?: string | undefined;
        };
        matches: {
            value: string;
            field: string;
            highlight: string;
            line?: number | undefined;
            column?: number | undefined;
        }[];
    }[];
    total: number;
    totalPages: number;
    hasMore: boolean;
}>;
export declare const WSConnectionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    connected: z.ZodBoolean;
    lastPing: z.ZodNumber;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    metadata: Record<string, unknown>;
    connected: boolean;
    lastPing: number;
    userId?: string | undefined;
    sessionId?: string | undefined;
}, {
    id: string;
    metadata: Record<string, unknown>;
    connected: boolean;
    lastPing: number;
    userId?: string | undefined;
    sessionId?: string | undefined;
}>;
export declare const WSMessageSchema: z.ZodObject<{
    type: z.ZodEnum<["request", "response", "notification", "error"]>;
    data: z.ZodUnion<[z.ZodObject<{
        id: z.ZodString;
        method: z.ZodString;
        params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    }, {
        id: string;
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        result: z.ZodOptional<z.ZodUnknown>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodNumber;
            message: z.ZodString;
            data: z.ZodOptional<z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            code: number;
            message: string;
            data?: unknown;
        }, {
            code: number;
            message: string;
            data?: unknown;
        }>>;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        timestamp: number;
        result?: unknown;
        error?: {
            code: number;
            message: string;
            data?: unknown;
        } | undefined;
    }, {
        id: string;
        timestamp: number;
        result?: unknown;
        error?: {
            code: number;
            message: string;
            data?: unknown;
        } | undefined;
    }>, z.ZodObject<{
        method: z.ZodString;
        params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    }, {
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    }>, z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: number;
        message: string;
        data?: unknown;
    }, {
        code: number;
        message: string;
        data?: unknown;
    }>]>;
    connectionId: z.ZodString;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "error" | "request" | "response" | "notification";
    data: {
        id: string;
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    } | {
        code: number;
        message: string;
        data?: unknown;
    } | {
        id: string;
        timestamp: number;
        result?: unknown;
        error?: {
            code: number;
            message: string;
            data?: unknown;
        } | undefined;
    } | {
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    };
    connectionId: string;
}, {
    timestamp: number;
    type: "error" | "request" | "response" | "notification";
    data: {
        id: string;
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    } | {
        code: number;
        message: string;
        data?: unknown;
    } | {
        id: string;
        timestamp: number;
        result?: unknown;
        error?: {
            code: number;
            message: string;
            data?: unknown;
        } | undefined;
    } | {
        method: string;
        timestamp: number;
        params?: Record<string, unknown> | undefined;
    };
    connectionId: string;
}>;
export declare const AuthLoginRequestSchema: z.ZodObject<{
    credentials: z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        oauth: z.ZodOptional<z.ZodObject<{
            provider: z.ZodEnum<["github", "google", "microsoft"]>;
            code: z.ZodString;
            redirectUri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            code: string;
            provider: "github" | "google" | "microsoft";
            redirectUri: string;
        }, {
            code: string;
            provider: "github" | "google" | "microsoft";
            redirectUri: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        username?: string | undefined;
        email?: string | undefined;
        password?: string | undefined;
        apiKey?: string | undefined;
        oauth?: {
            code: string;
            provider: "github" | "google" | "microsoft";
            redirectUri: string;
        } | undefined;
    }, {
        username?: string | undefined;
        email?: string | undefined;
        password?: string | undefined;
        apiKey?: string | undefined;
        oauth?: {
            code: string;
            provider: "github" | "google" | "microsoft";
            redirectUri: string;
        } | undefined;
    }>;
    rememberMe: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    credentials: {
        username?: string | undefined;
        email?: string | undefined;
        password?: string | undefined;
        apiKey?: string | undefined;
        oauth?: {
            code: string;
            provider: "github" | "google" | "microsoft";
            redirectUri: string;
        } | undefined;
    };
    rememberMe: boolean;
}, {
    credentials: {
        username?: string | undefined;
        email?: string | undefined;
        password?: string | undefined;
        apiKey?: string | undefined;
        oauth?: {
            code: string;
            provider: "github" | "google" | "microsoft";
            redirectUri: string;
        } | undefined;
    };
    rememberMe?: boolean | undefined;
}>;
export declare const AuthLogoutRequestSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const AuthRefreshRequestSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type MCPRequest = z.infer<typeof MCPRequestSchema>;
export type MCPResponse = z.infer<typeof MCPResponseSchema>;
export type MCPError = z.infer<typeof MCPErrorSchema>;
export type MCPNotification = z.infer<typeof MCPNotificationSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;
export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type WSConnection = z.infer<typeof WSConnectionSchema>;
export type WSMessage = z.infer<typeof WSMessageSchema>;
//# sourceMappingURL=index.d.ts.map