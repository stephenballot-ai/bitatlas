// Simple console logger for demo mode
const logger = {
  info: (message: string, context?: any) => {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  },
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }
};

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  details?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  outcome: 'success' | 'failure' | 'blocked';
  latencyMs?: number;
  errorCode?: string;
  gdprRelevant?: boolean;
  dataResidency?: string;
}

export class AuditService {

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      dataResidency: 'EU',
      gdprRelevant: this.isGdprRelevant(entry.action),
      ...entry,
    };

    try {
      // Enhanced structured JSON logging for audit compliance
      logger.info('BitAtlas Audit Event', {
        // Core audit fields
        type: 'audit_log',
        audit_id: auditEntry.id,
        request_id: auditEntry.requestId,
        timestamp: auditEntry.timestamp.toISOString(),
        
        // User context
        user_id: auditEntry.userId,
        session_id: auditEntry.sessionId,
        ip_address: auditEntry.ipAddress,
        
        // Operation details
        action: auditEntry.action,
        resource: auditEntry.resource,
        outcome: auditEntry.outcome,
        latency_ms: auditEntry.latencyMs,
        error_code: auditEntry.errorCode,
        
        // Compliance fields
        gdpr_relevant: auditEntry.gdprRelevant,
        data_residency: auditEntry.dataResidency,
        
        // Additional context
        details: auditEntry.details
      });

      // Store critical events for compliance
      if (auditEntry.gdprRelevant || auditEntry.outcome === 'blocked') {
        logger.warn('Compliance-Critical Audit Event', {
          audit_id: auditEntry.id,
          action: auditEntry.action,
          outcome: auditEntry.outcome,
          gdpr_relevant: auditEntry.gdprRelevant
        });
      }

      // TODO: Store in audit_logs table in database
      // await db('audit_logs').insert(auditEntry);

    } catch (error) {
      logger.error('Failed to log audit event', {
        error: error.message,
        action: entry.action,
        user_id: entry.userId,
      });
      throw error;
    }
  }

  /**
   * Get audit trail for a specific user
   */
  async getUserAuditTrail(userId: string): Promise<AuditLogEntry[]> {
    try {
      // TODO: Implement actual database query
      // return await db('audit_logs')
      //   .where('user_id', userId)
      //   .orderBy('timestamp', 'desc')
      //   .limit(1000);

      // Mock implementation for now
      return [
        {
          id: 'audit_example_1',
          userId,
          action: 'USER_LOGIN',
          timestamp: new Date(),
          details: { loginMethod: 'oauth' }
        },
        {
          id: 'audit_example_2',
          userId,
          action: 'FILE_UPLOADED',
          resource: 'document.pdf',
          timestamp: new Date(),
          details: { fileSize: 1024000 }
        },
      ];
    } catch (error) {
      logger.error('Failed to retrieve audit trail', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get audit statistics for monitoring
   */
  async getAuditStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    try {
      // TODO: Implement actual statistics query
      // This would return aggregated audit statistics
      return {
        totalEvents: 0,
        topActions: [],
        timeframe,
      };
    } catch (error) {
      logger.error('Failed to retrieve audit statistics', {
        error: error.message,
        timeframe,
      });
      throw error;
    }
  }

  /**
   * Determine if an action is GDPR-relevant
   */
  private isGdprRelevant(action: string): boolean {
    const gdprActions = [
      'USER_LOGIN',
      'USER_LOGOUT', 
      'USER_REGISTER',
      'USER_DELETE',
      'FILE_UPLOAD',
      'FILE_DOWNLOAD',
      'FILE_DELETE',
      'PERSONAL_DATA_ACCESS',
      'PERSONAL_DATA_EXPORT',
      'PERSONAL_DATA_DELETION',
      'CONSENT_GIVEN',
      'CONSENT_WITHDRAWN',
      'DATA_BREACH_DETECTED',
      'EU_POLICY_VIOLATION'
    ];
    
    return gdprActions.includes(action);
  }

  /**
   * Audit middleware for request logging
   */
  auditMiddleware() {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add request ID to request object
      req.requestId = requestId;

      // Log request initiation
      if (this.shouldAuditRequest(req)) {
        await this.log({
          userId: req.user?.id || 'anonymous',
          action: `REQUEST_${req.method}`,
          resource: req.path,
          outcome: 'success',
          requestId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          sessionId: req.session?.id,
          details: {
            method: req.method,
            path: req.path,
            query: req.query
          }
        });
      }

      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function(body: any) {
        const latencyMs = Date.now() - startTime;
        
        // Log response for audit-worthy requests
        if (req.shouldAudit) {
          const outcome = res.statusCode >= 400 ? 'failure' : 'success';
          const errorCode = res.statusCode >= 400 ? `HTTP_${res.statusCode}` : undefined;
          
          // Don't await this - fire and forget for performance
          req.auditService?.log({
            userId: req.user?.id || 'anonymous',
            action: `RESPONSE_${req.method}`,
            resource: req.path,
            outcome,
            requestId,
            latencyMs,
            errorCode,
            ipAddress: req.ip,
            sessionId: req.session?.id,
            details: {
              status: res.statusCode,
              latency_ms: latencyMs
            }
          });
        }

        return originalJson.call(this, body);
      };

      req.auditService = this;
      req.shouldAudit = this.shouldAuditRequest(req);
      
      next();
    };
  }

  /**
   * Determine if a request should be audited
   */
  private shouldAuditRequest(req: any): boolean {
    const auditPaths = [
      '/api/auth/',
      '/api/files/',
      '/api/mcp/',
      '/oauth/',
      '/eu-compliance'
    ];
    
    return auditPaths.some(path => req.path.startsWith(path));
  }
}