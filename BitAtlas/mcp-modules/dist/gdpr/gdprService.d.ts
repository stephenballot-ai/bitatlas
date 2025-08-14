export interface UserDataExport {
    exportDate: string;
    userId: string;
    profile: any;
    files: any[];
    sessions: any[];
    auditLog: any[];
}
export declare class GdprService {
    private fileService;
    private storageOrchestrator;
    private auditService;
    private db;
    constructor(fileService: any, // Will be injected
    storageOrchestrator: any, // Will be injected
    auditService: any, // Will be injected
    db: any);
    exportUserData(userId: string): Promise<UserDataExport>;
    deleteUserData(userId: string): Promise<void>;
    generateAuditTrail(userId: string): Promise<any>;
    verifyDataDeletion(userId: string): Promise<boolean>;
    private collectUserData;
}
//# sourceMappingURL=gdprService.d.ts.map