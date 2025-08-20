import express from 'express';
import { authenticateToken } from '../../middleware/auth';
import { getLogger } from '../../services/logger';
import { GdprService } from '../../../mcp-modules/src/gdpr/gdprService';
import { FileService } from '../../services/fileService';
import { AuditService } from '../../services/auditService';
import { db } from '../../database/connection';

const router = express.Router();
const logger = getLogger();

// Initialize GDPR service with proper dependencies
const fileService = new FileService();
const auditService = new AuditService();
const gdprService = new GdprService(fileService, null, auditService, db);

/**
 * Export user data (GDPR Article 20 - Right to data portability)
 */
router.get('/export', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;
    
    logger.info('GDPR data export requested', { userId, requestId: req.id });
    
    const exportData = await gdprService.exportUserData(userId);
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bitatlas-data-export-${userId}-${Date.now()}.json"`);
    
    const duration = Date.now() - startTime;
    logger.info('GDPR data export completed', { 
      userId, 
      requestId: req.id, 
      duration,
      exportSize: JSON.stringify(exportData).length 
    });
    
    res.json(exportData);
    
  } catch (error) {
    logger.logError(error, {
      operation: 'gdpr_export',
      userId: req.user.id,
      requestId: req.id,
    });
    
    res.status(500).json({
      error: 'Failed to export user data',
      code: 'ERR_EXPORT_FAILED'
    });
  }
});

/**
 * Delete user data (GDPR Article 17 - Right to erasure)
 */
router.delete('/delete-account', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;
    
    // Security confirmation required
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE_MY_ACCOUNT_PERMANENTLY') {
      return res.status(400).json({
        error: 'Account deletion requires explicit confirmation',
        code: 'ERR_CONFIRMATION_REQUIRED',
        requiredConfirmation: 'DELETE_MY_ACCOUNT_PERMANENTLY'
      });
    }
    
    logger.logSecurity('Account deletion requested', { userId, requestId: req.id });
    
    // Perform the deletion
    await gdprService.deleteUserData(userId);
    
    // Verify deletion was successful
    const verificationResult = await gdprService.verifyDataDeletion(userId);
    
    if (!verificationResult) {
      logger.error('Data deletion verification failed', { userId, requestId: req.id });
      return res.status(500).json({
        error: 'Data deletion could not be verified',
        code: 'ERR_DELETION_VERIFICATION_FAILED'
      });
    }
    
    const duration = Date.now() - startTime;
    logger.logSecurity('Account deletion completed', { 
      userId, 
      requestId: req.id, 
      duration,
      verified: verificationResult 
    });
    
    res.json({
      message: 'Account and all associated data have been permanently deleted',
      deletedAt: new Date().toISOString(),
      verified: verificationResult
    });
    
  } catch (error) {
    logger.logError(error, {
      operation: 'gdpr_deletion',
      userId: req.user.id,
      requestId: req.id,
    });
    
    res.status(500).json({
      error: 'Failed to delete user data',
      code: 'ERR_DELETION_FAILED'
    });
  }
});

/**
 * Get user's audit trail (GDPR transparency)
 */
router.get('/audit-trail', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info('Audit trail requested', { userId, requestId: req.id });
    
    const auditTrail = await gdprService.generateAuditTrail(userId);
    
    res.json({
      userId,
      generatedAt: new Date().toISOString(),
      auditTrail
    });
    
  } catch (error) {
    logger.logError(error, {
      operation: 'gdpr_audit_trail',
      userId: req.user.id,
      requestId: req.id,
    });
    
    res.status(500).json({
      error: 'Failed to generate audit trail',
      code: 'ERR_AUDIT_TRAIL_FAILED'
    });
  }
});

/**
 * Get GDPR compliance information
 */
router.get('/info', (req, res) => {
  res.json({
    gdprCompliance: {
      dataController: 'BitAtlas',
      contactEmail: 'privacy@bitatlas.com',
      rights: [
        'Right to access (Article 15)',
        'Right to rectification (Article 16)',
        'Right to erasure (Article 17)',
        'Right to restrict processing (Article 18)',
        'Right to data portability (Article 20)',
        'Right to object (Article 21)'
      ],
      dataRetention: {
        userProfiles: '7 years after account deletion',
        auditLogs: '7 years for compliance',
        fileMetadata: 'Deleted with account',
        sessions: '90 days'
      },
      legalBasis: 'Consent and legitimate interest',
      lastUpdated: '2024-01-01'
    }
  });
});

export { router as gdprRoutes };