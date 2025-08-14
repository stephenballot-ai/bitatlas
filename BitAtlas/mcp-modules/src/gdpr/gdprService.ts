export interface UserDataExport {
  exportDate: string;
  userId: string;
  profile: any;
  files: any[];
  sessions: any[];
  auditLog: any[];
}

export class GdprService {
  constructor(
    private fileService: any, // Will be injected
    private storageOrchestrator: any, // Will be injected
    private auditService: any, // Will be injected
    private db: any // Will be injected
  ) {}

  async exportUserData(userId: string): Promise<UserDataExport> {
    const userData = await this.collectUserData(userId);
    
    return {
      exportDate: new Date().toISOString(),
      userId,
      profile: userData.profile,
      files: userData.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        createdAt: f.created_at,
        // Exclude storage keys and internal metadata for privacy
      })),
      sessions: userData.sessions.map((s: any) => ({
        deviceInfo: s.device_info,
        createdAt: s.created_at,
        lastUsed: s.last_used
      })),
      auditLog: userData.auditLog
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // 1. Delete all files from storage providers
    const userFiles = await this.fileService.getUserFiles(userId);
    for (const file of userFiles) {
      await this.storageOrchestrator.deleteFile(file.storage_provider, file.storage_key);
    }

    // 2. Delete database records in correct order (respecting foreign keys)
    await this.db.transaction(async (trx: any) => {
      await trx('oauth_tokens').where('user_id', userId).del();
      await trx('sessions').where('user_id', userId).del();
      await trx('files').where('user_id', userId).del();
      await trx('users').where('id', userId).del();
    });

    // 3. Log deletion for compliance
    await this.auditService.log({
      action: 'USER_DATA_DELETED',
      userId,
      timestamp: new Date(),
      details: 'Complete user data deletion per GDPR request'
    });
  }

  async generateAuditTrail(userId: string): Promise<any> {
    return this.auditService.getUserAuditTrail(userId);
  }

  async verifyDataDeletion(userId: string): Promise<boolean> {
    // Verify that all user data has been completely removed
    const checks = await Promise.all([
      this.db('users').where('id', userId).first(),
      this.db('files').where('user_id', userId).first(),
      this.db('sessions').where('user_id', userId).first(),
      this.db('oauth_tokens').where('user_id', userId).first()
    ]);

    // All checks should return undefined/null if deletion was successful
    return checks.every(result => !result);
  }

  private async collectUserData(userId: string): Promise<any> {
    const [profile, files, sessions, auditLog] = await Promise.all([
      this.db('users').where('id', userId).first(),
      this.db('files').where('user_id', userId).select('*'),
      this.db('sessions').where('user_id', userId).select('*'),
      this.auditService.getUserAuditTrail(userId)
    ]);

    return { profile, files, sessions, auditLog };
  }
}