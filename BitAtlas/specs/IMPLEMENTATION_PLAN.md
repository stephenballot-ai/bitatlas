# BitAtlas Implementation Plan - Dual Experience Platform

## Overview

BitAtlas provides two distinct user experiences:
1. **🌐 Standalone Website (bitatlas.com)** - Traditional cloud storage interface
2. **🔌 MCP Integration Experience** - OAuth-secured API for AI assistant integration

---

## Phase 1: Foundation (Weeks 1-3)

### 1.1 Core Infrastructure

**Database Setup**
```sql
-- PostgreSQL schemas
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  account_locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  last_login_attempt TIMESTAMP
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  storage_provider VARCHAR(50),
  storage_key TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  search_vector tsvector
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP NULL
);

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  scopes TEXT[],
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- New tables for trust features
CREATE TABLE mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  secret_key VARCHAR(255),
  backup_codes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ip_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  download_url TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_type VARCHAR(50),
  change_details TEXT,
  storage_key TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Redis Configuration**
```bash
# Session management & rate limiting
redis-server /etc/redis/redis.conf
# Configure for EU data residency
```

### 1.2 MCP Protocol Foundation

**Core MCP Types**
```typescript
// /mcp-modules/src/types/mcpProtocol.ts
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

export enum McpErrorCode {
  UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  NOT_FOUND = 'ERR_NOT_FOUND',
  INVALID_REQUEST = 'ERR_INVALID_REQUEST',
  INTERNAL_ERROR = 'ERR_INTERNAL_ERROR',
  RATE_LIMITED = 'ERR_RATE_LIMITED'
}
```

**Authentication Service**
```typescript
// /backend/src/services/authService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  async hashPassword(password: string): Promise<{hash: string, salt: string}> {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateJWT(userId: string, scopes?: string[]): string {
    return jwt.sign(
      { userId, scopes: scopes || [] },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### 1.3 Backend API Structure

**File Controller**
```typescript
// /backend/src/controllers/fileController.ts
import { McpOrchestrator } from '../services/mcpOrchestrator';

export class FileController {
  constructor(private mcpOrchestrator: McpOrchestrator) {}

  async createFile(req: Request, res: Response) {
    try {
      const result = await this.mcpOrchestrator.call('file.create', {
        userId: req.user.id,
        name: req.body.name,
        content: req.file?.buffer || req.body.content
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async readFile(req: Request, res: Response) {
    const result = await this.mcpOrchestrator.call('file.read', {
      userId: req.user.id,
      fileId: req.params.id
    });
    res.json(result);
  }

  async updateFile(req: Request, res: Response) {
    const result = await this.mcpOrchestrator.call('file.update', {
      userId: req.user.id,
      fileId: req.params.id,
      updates: req.body
    });
    res.json(result);
  }

  async deleteFile(req: Request, res: Response) {
    const result = await this.mcpOrchestrator.call('file.delete', {
      userId: req.user.id,
      fileId: req.params.id
    });
    res.json(result);
  }
}
```

---

## Phase 2: Web Experience (Weeks 4-6)

### 2.1 Trust UX Implementation

**Security Status Bar Component**
```tsx
// /frontend/src/components/security/SecurityStatusBar.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSecurityStatus } from '../../hooks/useSecurityStatus';

export const SecurityStatusBar: React.FC = () => {
  const { user } = useAuth();
  const { mfaEnabled, dataLocation } = useSecurityStatus();

  return (
    <div className="security-status-bar">
      <span className="status-item">Logged in</span>
      <span className="separator">•</span>
      <span className={`status-item ${mfaEnabled ? 'secure' : 'warning'}`}>
        TOTP {mfaEnabled ? 'on' : 'off'}
      </span>
      <span className="separator">•</span>
      <span className="status-item">
        Data in 🇪🇺 ({dataLocation.provider}, {dataLocation.region})
      </span>
      <button 
        className="security-link"
        onClick={() => window.location.href = '/account/security'}
        aria-label="Open security settings"
      >
        Security Panel
      </button>
    </div>
  );
};
```

**Updated Security Panel with GOV.UK Tabs**
```tsx
// /frontend/src/components/security/SecurityPanel.tsx
import React, { useState } from 'react';
import { 
  Heading, 
  Tabs,
  GridRow,
  GridCol
} from 'govuk-react';
import { GovUKWrapper } from '../govuk/GovUKWrapper';
import { MfaSettings } from './MfaSettings';
import { ActiveSessions } from './ActiveSessions';
import { SecurityAuditLog } from './SecurityAuditLog';
import { IpAllowlist } from './IpAllowlist';

export const SecurityPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      label: 'Two-factor authentication',
      panel: <MfaSettings />
    },
    {
      label: 'Active sessions',
      panel: <ActiveSessions />
    },
    {
      label: 'Security events',
      panel: <SecurityAuditLog />
    },
    {
      label: 'IP allowlist',
      panel: <IpAllowlist />
    }
  ];

  return (
    <GovUKWrapper serviceName="BitAtlas">
      <GridRow>
        <GridCol setWidth="full">
          <Heading size="LARGE">Security settings</Heading>
          <p className="govuk-body-l">
            Manage your account security and review security activity.
          </p>
        </GridCol>
      </GridRow>

      <GridRow>
        <GridCol setWidth="full">
          <Tabs
            items={tabs}
            onChange={setActiveTab}
          />
        </GridCol>
      </GridRow>
    </GovUKWrapper>
  );
};
```

**Security Status Panel Component**
```tsx
// /frontend/src/components/security/SecurityStatusPanel.tsx
import React from 'react';
import { 
  SummaryList,
  InsetText,
  Tag,
  Link
} from 'govuk-react';
import { useSecurityStatus } from '../../hooks/useSecurityStatus';

export const SecurityStatusPanel: React.FC = () => {
  const { mfaEnabled, dataLocation, activeSessions, loading } = useSecurityStatus();

  if (loading) {
    return <InsetText>Loading security status...</InsetText>;
  }

  return (
    <div className="bitatlas-security-status">
      <SummaryList
        items={[
          {
            key: 'Authentication status',
            value: (
              <div className="govuk-!-display-flex govuk-!-align-items-center">
                <span className="govuk-!-margin-right-2">Signed in</span>
                {mfaEnabled ? (
                  <Tag className="govuk-tag--green">Two-factor authentication enabled</Tag>
                ) : (
                  <Tag className="govuk-tag--red">Two-factor authentication disabled</Tag>
                )}
              </div>
            ),
            actions: [
              {
                href: '/account/security',
                text: 'Manage security',
                visuallyHiddenText: 'authentication settings'
              }
            ]
          },
          {
            key: 'Data location',
            value: (
              <div className="govuk-!-display-flex govuk-!-align-items-center">
                <span className="govuk-!-margin-right-2">🇪🇺 European Union</span>
                <Tag className="govuk-tag--blue">
                  {dataLocation.provider}, {dataLocation.region}
                </Tag>
              </div>
            ),
            actions: [
              {
                href: '/transparency',
                text: 'View transparency report',
                visuallyHiddenText: 'about data location'
              }
            ]
          },
          {
            key: 'Active sessions',
            value: `${activeSessions} active session${activeSessions !== 1 ? 's' : ''}`,
            actions: [
              {
                href: '/account/security',
                text: 'Manage sessions',
                visuallyHiddenText: 'and devices'
              }
            ]
          }
        ]}
      />
    </div>
  );
};
```

**Updated MFA Settings with GOV.UK Components**
```tsx
// /frontend/src/components/security/MfaSettings.tsx
import React, { useState, useEffect } from 'react';
import { 
  Heading,
  Button,
  InsetText,
  SummaryList,
  Details,
  WarningText,
  Panel
} from 'govuk-react';
import { GovUKInput } from '../forms/GovUKInput';

interface MfaStatus {
  enabled: boolean;
  backupCodes: string[];
  qrCodeUrl?: string;
}

export const MfaSettings: React.FC = () => {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>({ enabled: false, backupCodes: [] });
  const [verificationCode, setVerificationCode] = useState('');
  const [isEnabling, setIsEnabling] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // ... existing logic for loadMfaStatus, enableMfa, disableMfa, generateNewBackupCodes

  if (mfaStatus.enabled) {
    return (
      <div className="mfa-settings">
        <Panel title="Two-factor authentication is enabled" className="govuk-panel--confirmation">
          Your account has an extra layer of security.
        </Panel>

        <SummaryList
          items={[
            {
              key: 'Status',
              value: (
                <div className="govuk-!-display-flex govuk-!-align-items-center">
                  <span className="govuk-!-margin-right-2">✓ Enabled</span>
                </div>
              )
            },
            {
              key: 'Backup codes',
              value: `${mfaStatus.backupCodes.length} codes available`,
              actions: [
                {
                  href: '#',
                  text: 'Generate new codes',
                  onClick: (e) => {
                    e.preventDefault();
                    generateNewBackupCodes();
                  }
                }
              ]
            }
          ]}
        />

        <div className="govuk-button-group">
          <Button 
            buttonColour="secondary"
            onClick={generateNewBackupCodes}
          >
            Generate new backup codes
          </Button>
          
          <Button 
            buttonColour="warning"
            onClick={disableMfa}
          >
            Disable two-factor authentication
          </Button>
        </div>

        <WarningText>
          Disabling two-factor authentication will make your account less secure.
        </WarningText>

        {showBackupCodes && (
          <Details summary="Your backup codes">
            <WarningText>
              Save these backup codes in a secure location. Each code can only be used once.
            </WarningText>
            <div className="backup-codes govuk-!-margin-bottom-4">
              {mfaStatus.backupCodes.map((code, index) => (
                <div key={index} className="govuk-!-margin-bottom-1">
                  <code className="govuk-!-font-family-monospace">{code}</code>
                </div>
              ))}
            </div>
            <Button 
              buttonColour="secondary"
              onClick={() => setShowBackupCodes(false)}
            >
              Close
            </Button>
          </Details>
        )}
      </div>
    );
  }

  return (
    <div className="mfa-settings">
      <WarningText>
        Two-factor authentication is not enabled. Your account is less secure.
      </WarningText>

      <InsetText>
        Add an extra layer of security to your account by enabling two-factor authentication 
        using an authenticator app.
      </InsetText>

      {!isEnabling ? (
        <Button onClick={() => setIsEnabling(true)}>
          Enable two-factor authentication
        </Button>
      ) : (
        <div className="mfa-setup">
          <Heading size="MEDIUM">Set up two-factor authentication</Heading>
          
          <p className="govuk-body">
            Scan this QR code with your authenticator app (such as Google Authenticator or Authy):
          </p>
          
          {mfaStatus.qrCodeUrl && (
            <div className="govuk-!-margin-bottom-4">
              <img 
                src={mfaStatus.qrCodeUrl} 
                alt="QR code for setting up two-factor authentication"
                className="qr-code"
              />
            </div>
          )}

          <GovUKInput
            id="verification-code"
            label="Verification code"
            value={verificationCode}
            onChange={setVerificationCode}
            hint="Enter the 6-digit code from your authenticator app"
            required
          />

          <div className="govuk-button-group">
            <Button onClick={enableMfa} disabled={verificationCode.length !== 6}>
              Verify and enable
            </Button>
            <Button 
              buttonColour="secondary"
              onClick={() => setIsEnabling(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Data & Privacy Center**
```tsx
// /frontend/src/components/privacy/DataPrivacyCenter.tsx
import React, { useState } from 'react';
import { useGdpr } from '../../hooks/useGdpr';

export const DataPrivacyCenter: React.FC = () => {
  const { requestDataExport, deleteAccount, exportStatus } = useGdpr();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteFlow, setShowDeleteFlow] = useState(false);

  const handleDataExport = async () => {
    await requestDataExport();
    // Show success message with async job info
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      return;
    }
    await deleteAccount();
  };

  return (
    <div className="data-privacy-center">
      <h1>Data & Privacy</h1>
      
      <section aria-labelledby="data-export-heading">
        <h2 id="data-export-heading">Data Export</h2>
        <p>Download all your data in a portable format.</p>
        <button 
          onClick={handleDataExport}
          disabled={exportStatus === 'processing'}
          aria-describedby="export-description"
        >
          {exportStatus === 'processing' ? 'Processing...' : 'Request Data Export'}
        </button>
        <p id="export-description" className="help-text">
          You'll receive an email with a download link when ready (usually within 24 hours).
        </p>
      </section>

      <section aria-labelledby="delete-account-heading">
        <h2 id="delete-account-heading">Delete Account</h2>
        <p className="warning-text">
          This will permanently delete all your files, settings, and account data. 
          This action cannot be undone.
        </p>
        
        {!showDeleteFlow ? (
          <button 
            className="danger-button"
            onClick={() => setShowDeleteFlow(true)}
          >
            Delete Account
          </button>
        ) : (
          <div className="delete-flow">
            <label htmlFor="delete-confirmation">
              Type "DELETE MY ACCOUNT" to confirm:
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              aria-describedby="delete-help"
            />
            <p id="delete-help" className="help-text">
              This will delete all files, revoke all sessions, and close your account.
            </p>
            <div className="button-group">
              <button 
                className="danger-button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE MY ACCOUNT'}
              >
                Permanently Delete Account
              </button>
              <button onClick={() => setShowDeleteFlow(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="data-location-heading">
        <h2 id="data-location-heading">Data Location & Residency</h2>
        <div className="data-location-info">
          <p><strong>Primary Storage:</strong> Hetzner (Nuremberg, Germany)</p>
          <p><strong>Backup Storage:</strong> OVH (Gravelines, France)</p>
          <p><strong>Database:</strong> Hetzner (Nuremberg, Germany)</p>
          <p><strong>Redundancy:</strong> 3x replication within EU</p>
        </div>
      </section>
    </div>
  );
};
```

**Share Permissions Preview**
```tsx
// /frontend/src/components/sharing/SharePermissionPreview.tsx
import React from 'react';

interface SharePermissionPreviewProps {
  shareType: 'view' | 'edit' | 'comment';
  expiresIn?: string;
  isPublic: boolean;
}

export const SharePermissionPreview: React.FC<SharePermissionPreviewProps> = ({
  shareType,
  expiresIn,
  isPublic
}) => {
  const getPermissionText = () => {
    const access = shareType === 'view' ? 'view only' : 
                  shareType === 'edit' ? 'edit and download' : 'comment only';
    
    const audience = isPublic ? 'People with link' : 'Specific people';
    const expiry = expiresIn ? ` Expires ${expiresIn}.` : ' Never expires.';
    
    return `${audience} can ${access}.${expiry}`;
  };

  return (
    <div className="share-permission-preview" role="status" aria-live="polite">
      <span className="permission-icon" aria-hidden="true">🔗</span>
      <span className="permission-text">{getPermissionText()}</span>
    </div>
  );
};
```

**Error Message Component**
```tsx
// /frontend/src/components/common/ErrorMessage.tsx
import React from 'react';

interface ErrorMessageProps {
  title: string;
  description: string;
  action?: string;
  referenceCode: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  description,
  action,
  referenceCode
}) => {
  return (
    <div className="error-message" role="alert">
      <h2 className="error-title">{title}</h2>
      <p className="error-description">{description}</p>
      {action && <p className="error-action"><strong>What to do:</strong> {action}</p>}
      <p className="error-reference">
        <strong>Reference:</strong> <code>{referenceCode}</code>
      </p>
    </div>
  );
};
```

**File Change History**
```tsx
// /frontend/src/components/files/FileChangeHistory.tsx
import React from 'react';
import { useFileHistory } from '../../hooks/useFileHistory';

interface FileChangeHistoryProps {
  fileId: string;
}

export const FileChangeHistory: React.FC<FileChangeHistoryProps> = ({ fileId }) => {
  const { history, loading } = useFileHistory(fileId);

  if (loading) {
    return <div aria-live="polite">Loading change history...</div>;
  }

  return (
    <div className="file-change-history">
      <h3>Change History</h3>
      <ul role="log" aria-label="File change history">
        {history.map((change, index) => (
          <li key={index} className="history-entry">
            <time dateTime={change.timestamp}>
              {new Date(change.timestamp).toLocaleString()}
            </time>
            <span className="change-user">{change.user.name}</span>
            <span className="change-action">{change.action}</span>
            {change.details && (
              <details>
                <summary>Show details</summary>
                <p>{change.details}</p>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### 2.2 Accessibility Implementation (WCAG 2.2 AA)

**Accessibility Configuration**
```typescript
// /frontend/src/utils/accessibility.ts
export const AccessibilityConfig = {
  // Color contrast ratios
  contrast: {
    text: '4.5:1',      // WCAG AA for normal text
    largeText: '3:1',   // WCAG AA for large text (18pt+)
    uiElements: '3:1'   // WCAG AA for UI components
  },
  
  // Touch target sizes
  touchTargets: {
    minimum: 44,        // 44px minimum for interactive elements
    preferred: 48       // 48px preferred size
  },
  
  // Animation preferences
  motion: {
    respectsReducedMotion: true,
    defaultDuration: 200,       // milliseconds
    reducedDuration: 0          // no animation if user prefers reduced motion
  }
};

// Hook for reduced motion preference
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
```

**Accessible Form Components**
```tsx
// /frontend/src/components/forms/AccessibleInput.tsx
import React from 'react';

interface AccessibleInputProps {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  id,
  label,
  type = 'text',
  required = false,
  error,
  hint,
  value,
  onChange
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ');

  return (
    <div className="input-group">
      <label htmlFor={id} className="input-label">
        {label}
        {required && <span aria-label="required"> *</span>}
      </label>
      
      {hint && (
        <p id={hintId} className="input-hint">{hint}</p>
      )}
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? 'true' : 'false'}
        className={`input ${error ? 'input-error' : ''}`}
      />
      
      {error && (
        <p id={errorId} className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

**Session Timeout Warning**
```tsx
// /frontend/src/components/session/SessionTimeoutWarning.tsx
import React, { useState, useEffect } from 'react';

interface SessionTimeoutWarningProps {
  timeRemaining: number; // seconds
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  timeRemaining,
  onExtend,
  onLogout
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const minutes = Math.floor(timeRemaining / 60);

  useEffect(() => {
    // Show warning when 5 minutes remain
    if (timeRemaining <= 300 && timeRemaining > 0) {
      setIsVisible(true);
    }
  }, [timeRemaining]);

  if (!isVisible) return null;

  return (
    <div 
      className="session-timeout-warning"
      role="alertdialog"
      aria-labelledby="timeout-title"
      aria-describedby="timeout-message"
    >
      <h2 id="timeout-title">Session Expiring Soon</h2>
      <p id="timeout-message">
        Your session will expire in {minutes} minute{minutes !== 1 ? 's' : ''}. 
        Do you want to extend your session?
      </p>
      <div className="button-group">
        <button 
          onClick={onExtend}
          className="primary-button"
          autoFocus
        >
          Extend Session
        </button>
        <button onClick={onLogout} className="secondary-button">
          Logout Now
        </button>
      </div>
    </div>
  );
};
```

**Live Region for Upload Status**
```tsx
// /frontend/src/components/upload/UploadStatus.tsx
import React from 'react';

interface UploadStatusProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export const UploadStatus: React.FC<UploadStatusProps> = ({
  fileName,
  progress,
  status,
  error
}) => {
  const getStatusMessage = () => {
    switch (status) {
      case 'uploading':
        return `Uploading ${fileName}: ${progress}% complete`;
      case 'completed':
        return `Upload finished: ${fileName}`;
      case 'error':
        return `Upload failed: ${fileName}. ${error}`;
      default:
        return '';
    }
  };

  return (
    <div className="upload-status">
      <div 
        aria-live="polite" 
        aria-label="Upload status"
        className="sr-only"
      >
        {getStatusMessage()}
      </div>
      
      <div className="upload-visual" aria-hidden="true">
        <span className="file-name">{fileName}</span>
        {status === 'uploading' && (
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {status === 'completed' && <span className="success-icon">✓</span>}
        {status === 'error' && <span className="error-icon">✗</span>}
      </div>
    </div>
  );
};
```

### 2.3 React Frontend Structure

**File Explorer Component**
```tsx
// /frontend/src/components/files/FileExplorer.tsx
import React, { useState, useEffect } from 'react';
import { useFiles } from '../../hooks/useFiles';

export const FileExplorer: React.FC = () => {
  const { files, loading, uploadFile, createFolder, deleteFile } = useFiles();
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  return (
    <div className="file-explorer">
      <div className="toolbar">
        <button onClick={() => createFolder('New Folder')}>
          Create Folder
        </button>
        <input
          type="file"
          multiple
          onChange={(e) => {
            Array.from(e.target.files || []).forEach(uploadFile);
          }}
        />
      </div>
      
      <div className="file-grid">
        {files.map(file => (
          <FileItem
            key={file.id}
            file={file}
            selected={selectedFiles.includes(file.id)}
            onSelect={(id) => setSelectedFiles(prev => 
              prev.includes(id) 
                ? prev.filter(f => f !== id)
                : [...prev, id]
            )}
            onDelete={() => deleteFile(file.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

**Custom Hooks**
```typescript
// /frontend/src/hooks/useFiles.ts
import { useState, useEffect } from 'react';
import { fileService } from '../services/fileService';

export const useFiles = (path = '/') => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await fileService.listFiles(path);
      setFiles(result.data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    
    await fileService.uploadFile(formData);
    loadFiles(); // Refresh file list
  };

  const createFolder = async (name: string) => {
    await fileService.createFolder({ name, path });
    loadFiles();
  };

  const deleteFile = async (fileId: string) => {
    await fileService.deleteFile(fileId);
    loadFiles();
  };

  useEffect(() => {
    loadFiles();
  }, [path]);

  return { files, loading, uploadFile, createFolder, deleteFile };
};
```

### 2.2 Authentication System & Hooks

**Authentication Hook**
```typescript
// /frontend/src/hooks/useAuth.ts
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Validate token and get user info
      validateToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('accessToken');
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const { user: userData, accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const { user: userData, accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

**Security Status Hook**
```typescript
// /frontend/src/hooks/useSecurityStatus.ts
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface SecurityStatus {
  mfaEnabled: boolean;
  dataLocation: {
    provider: string;
    region: string;
  };
  activeSessions: number;
  lastSecurityEvent?: {
    type: string;
    timestamp: string;
  };
}

export const useSecurityStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SecurityStatus>({
    mfaEnabled: false,
    dataLocation: { provider: 'Hetzner', region: 'Nuremberg' },
    activeSessions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSecurityStatus();
    }
  }, [user]);

  const loadSecurityStatus = async () => {
    try {
      const response = await fetch('/api/v1/security/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load security status:', error);
    } finally {
      setLoading(false);
    }
  };

  return { ...status, loading, refresh: loadSecurityStatus };
};
```

**GDPR Hook**
```typescript
// /frontend/src/hooks/useGdpr.ts
import { useState, useCallback } from 'react';

interface DataExportStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
}

export const useGdpr = () => {
  const [exportStatus, setExportStatus] = useState<DataExportStatus>({ status: 'idle' });
  const [isDeleting, setIsDeleting] = useState(false);

  const requestDataExport = useCallback(async () => {
    setExportStatus({ status: 'processing' });
    
    try {
      const response = await fetch('/api/v1/gdpr/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      const data = await response.json();
      setExportStatus({
        status: 'completed',
        downloadUrl: data.downloadUrl,
        expiresAt: data.expiresAt
      });

      // Show success notification
      showNotification('Data export requested. You\'ll receive an email when ready.', 'success');
    } catch (error) {
      setExportStatus({ status: 'failed' });
      showNotification('Failed to request data export. Please try again.', 'error');
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/v1/gdpr/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Account deletion failed');
      }

      // Log out user and redirect to home
      localStorage.removeItem('accessToken');
      window.location.href = '/?deleted=true';
    } catch (error) {
      showNotification('Failed to delete account. Please contact support.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    exportStatus: exportStatus.status,
    requestDataExport,
    deleteAccount,
    isDeleting
  };
};

const showNotification = (message: string, type: 'success' | 'error') => {
  // Implementation depends on notification system
  console.log(`${type}: ${message}`);
};
```

**File History Hook**
```typescript
// /frontend/src/hooks/useFileHistory.ts
import { useState, useEffect } from 'react';

interface FileChange {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  action: 'created' | 'modified' | 'renamed' | 'moved' | 'deleted' | 'restored';
  details?: string;
  versionNumber?: number;
}

export const useFileHistory = (fileId: string) => {
  const [history, setHistory] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fileId) {
      loadFileHistory();
    }
  }, [fileId]);

  const loadFileHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/files/${fileId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to load file history:', error);
    } finally {
      setLoading(false);
    }
  };

  return { history, loading, refresh: loadFileHistory };
};
```

**GOV.UK Form Components**
```tsx
// /frontend/src/components/forms/GovUKInput.tsx
import React from 'react';
import { Input, Label, Hint, ErrorMessage } from 'govuk-react';

interface GovUKInputProps {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

export const GovUKInput: React.FC<GovUKInputProps> = ({
  id,
  label,
  type = 'text',
  required = false,
  error,
  hint,
  value,
  onChange
}) => {
  return (
    <div className="govuk-form-group">
      <Label htmlFor={id}>
        {label}
        {required && <span className="govuk-visually-hidden"> (required)</span>}
      </Label>
      
      {hint && <Hint>{hint}</Hint>}
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        required={required}
      />
    </div>
  );
};
```

**Updated Login Form with GOV.UK Components**
```tsx
// /frontend/src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { GovUKInput } from '../forms/GovUKInput';
import { 
  Button, 
  Heading, 
  ErrorSummary,
  Panel,
  Link
} from 'govuk-react';
import { GovUKWrapper } from '../govuk/GovUKWrapper';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = 'Enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Enter your password';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrors({ 
        submit: err instanceof Error ? err.message : 'Check your email and password are correct' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GovUKWrapper serviceName="BitAtlas">
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-two-thirds">
          <Heading size="LARGE">Sign in to your BitAtlas account</Heading>
          
          {(errors.submit || Object.keys(errors).length > 0) && (
            <ErrorSummary
              title="There is a problem"
              errors={Object.entries(errors).map(([key, message]) => ({
                targetName: key,
                text: message
              }))}
            />
          )}

          <form onSubmit={handleSubmit} noValidate>
            <GovUKInput
              id="email"
              label="Email address"
              type="email"
              required
              value={email}
              onChange={setEmail}
              error={errors.email}
              hint="We'll only use this to sign you in"
            />

            <GovUKInput
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={setPassword}
              error={errors.password}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="govuk-!-margin-top-6"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="govuk-body govuk-!-margin-top-6">
            <Link href="/register">Create an account</Link> if you do not have one already.
          </p>
        </div>
      </div>
    </GovUKWrapper>
  );
};
```

```tsx
// /frontend/src/components/auth/RegisterForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AccessibleInput } from '../forms/AccessibleInput';
import { ErrorMessage } from '../common/ErrorMessage';

export const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register(formData.email, formData.password, formData.name);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <h1>Create Your BitAtlas Account</h1>
      
      {errors.submit && (
        <ErrorMessage
          title="Registration Failed"
          description={errors.submit}
          action="Please correct the errors and try again."
          referenceCode={`REG_${Date.now()}`}
        />
      )}

      <AccessibleInput
        id="name"
        label="Full Name"
        required
        value={formData.name}
        onChange={(value) => updateField('name', value)}
        error={errors.name}
      />

      <AccessibleInput
        id="email"
        label="Email Address"
        type="email"
        required
        value={formData.email}
        onChange={(value) => updateField('email', value)}
        error={errors.email}
        hint="This will be your login username"
      />

      <AccessibleInput
        id="password"
        label="Password"
        type="password"
        required
        value={formData.password}
        onChange={(value) => updateField('password', value)}
        error={errors.password}
        hint="Minimum 8 characters"
      />

      <AccessibleInput
        id="confirmPassword"
        label="Confirm Password"
        type="password"
        required
        value={formData.confirmPassword}
        onChange={(value) => updateField('confirmPassword', value)}
        error={errors.confirmPassword}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="primary-button"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>

      <p className="help-text">
        Already have an account? <a href="/login">Sign in here</a>
      </p>
    </form>
  );
};
```

### 2.3 Security Panel Child Components

**MFA Settings Component**
```tsx
// /frontend/src/components/security/MfaSettings.tsx
import React, { useState, useEffect } from 'react';
import { AccessibleInput } from '../forms/AccessibleInput';

interface MfaStatus {
  enabled: boolean;
  backupCodes: string[];
  qrCodeUrl?: string;
}

export const MfaSettings: React.FC = () => {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>({ enabled: false, backupCodes: [] });
  const [verificationCode, setVerificationCode] = useState('');
  const [isEnabling, setIsEnabling] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    loadMfaStatus();
  }, []);

  const loadMfaStatus = async () => {
    try {
      const response = await fetch('/api/v1/security/mfa', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setMfaStatus(data);
    } catch (error) {
      console.error('Failed to load MFA status:', error);
    }
  };

  const enableMfa = async () => {
    setIsEnabling(true);
    try {
      const response = await fetch('/api/v1/security/mfa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });

      if (response.ok) {
        const data = await response.json();
        setMfaStatus({ enabled: true, backupCodes: data.backupCodes });
        setShowBackupCodes(true);
      }
    } catch (error) {
      console.error('Failed to enable MFA:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const disableMfa = async () => {
    try {
      await fetch('/api/v1/security/mfa/disable', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setMfaStatus({ enabled: false, backupCodes: [] });
    } catch (error) {
      console.error('Failed to disable MFA:', error);
    }
  };

  const generateNewBackupCodes = async () => {
    try {
      const response = await fetch('/api/v1/security/mfa/backup-codes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setMfaStatus(prev => ({ ...prev, backupCodes: data.backupCodes }));
      setShowBackupCodes(true);
    } catch (error) {
      console.error('Failed to generate backup codes:', error);
    }
  };

  if (mfaStatus.enabled) {
    return (
      <div className="mfa-settings">
        <h3>Two-Factor Authentication</h3>
        <div className="status-indicator enabled">
          <span className="status-icon" aria-hidden="true">✓</span>
          <span>Two-factor authentication is enabled</span>
        </div>

        <div className="actions">
          <button 
            onClick={generateNewBackupCodes}
            className="secondary-button"
          >
            Generate New Backup Codes
          </button>
          
          <button 
            onClick={disableMfa}
            className="danger-button"
            aria-describedby="disable-mfa-warning"
          >
            Disable 2FA
          </button>
          <p id="disable-mfa-warning" className="warning-text">
            Disabling 2FA will make your account less secure
          </p>
        </div>

        {showBackupCodes && (
          <div className="backup-codes" role="region" aria-labelledby="backup-codes-title">
            <h4 id="backup-codes-title">Backup Codes</h4>
            <p>Save these backup codes in a secure location. Each can only be used once.</p>
            <ul className="backup-code-list">
              {mfaStatus.backupCodes.map((code, index) => (
                <li key={index} className="backup-code">
                  <code>{code}</code>
                </li>
              ))}
            </ul>
            <button onClick={() => setShowBackupCodes(false)}>Close</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mfa-settings">
      <h3>Two-Factor Authentication</h3>
      <div className="status-indicator disabled">
        <span className="status-icon" aria-hidden="true">⚠</span>
        <span>Two-factor authentication is disabled</span>
      </div>

      <p>Add an extra layer of security to your account by enabling two-factor authentication.</p>

      {!isEnabling ? (
        <button 
          onClick={() => setIsEnabling(true)}
          className="primary-button"
        >
          Enable 2FA
        </button>
      ) : (
        <div className="mfa-setup">
          <h4>Set up Two-Factor Authentication</h4>
          <p>Scan this QR code with your authenticator app:</p>
          
          {mfaStatus.qrCodeUrl && (
            <img 
              src={mfaStatus.qrCodeUrl} 
              alt="QR code for setting up two-factor authentication"
              className="qr-code"
            />
          )}

          <AccessibleInput
            id="verification-code"
            label="Verification Code"
            value={verificationCode}
            onChange={setVerificationCode}
            hint="Enter the 6-digit code from your authenticator app"
            required
          />

          <div className="button-group">
            <button 
              onClick={enableMfa}
              className="primary-button"
              disabled={verificationCode.length !== 6}
            >
              Verify and Enable
            </button>
            <button 
              onClick={() => setIsEnabling(false)}
              className="secondary-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Active Sessions Component**
```tsx
// /frontend/src/components/security/ActiveSessions.tsx
import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
  };
  ipAddress: string;
  location?: {
    city: string;
    country: string;
  };
  lastActivity: string;
  isCurrent: boolean;
}

export const ActiveSessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    loadActiveSessions();
  }, []);

  const loadActiveSessions = async () => {
    try {
      const response = await fetch('/api/v1/security/sessions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await fetch(`/api/v1/security/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to revoke session:', error);
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      await fetch('/api/v1/security/sessions/revoke-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setSessions(prev => prev.filter(s => s.isCurrent));
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
    }
  };

  if (loading) {
    return <div aria-live="polite">Loading active sessions...</div>;
  }

  return (
    <div className="active-sessions">
      <h3>Active Sessions</h3>
      <p>These are the devices currently signed in to your account.</p>

      <button 
        onClick={revokeAllOtherSessions}
        className="danger-button"
        disabled={sessions.filter(s => !s.isCurrent).length === 0}
      >
        Sign Out All Other Sessions
      </button>

      <ul className="sessions-list" role="list">
        {sessions.map((session) => (
          <li key={session.id} className={`session-item ${session.isCurrent ? 'current' : ''}`}>
            <div className="session-info">
              <div className="device-info">
                <strong>{session.deviceInfo.browser} on {session.deviceInfo.os}</strong>
                {session.isCurrent && <span className="current-badge">Current Session</span>}
              </div>
              
              <div className="session-details">
                <p>IP: {session.ipAddress}</p>
                {session.location && (
                  <p>Location: {session.location.city}, {session.location.country}</p>
                )}
                <p>Last active: {new Date(session.lastActivity).toLocaleString()}</p>
              </div>
            </div>

            {!session.isCurrent && (
              <button
                onClick={() => revokeSession(session.id)}
                className="danger-button small"
                disabled={revoking === session.id}
                aria-label={`Sign out ${session.deviceInfo.browser} session`}
              >
                {revoking === session.id ? 'Signing Out...' : 'Sign Out'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {sessions.length === 0 && (
        <p>No active sessions found.</p>
      )}
    </div>
  );
};
```

**Security Audit Log Component**
```tsx
// /frontend/src/components/security/SecurityAuditLog.tsx
import React, { useState, useEffect } from 'react';

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'mfa_enabled' | 'mfa_disabled' | 'file_access' | 'suspicious_activity';
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export const SecurityAuditLog: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  const loadSecurityEvents = async () => {
    try {
      const response = await fetch('/api/v1/security/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.severity === filter;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      default: return '🔵';
    }
  };

  if (loading) {
    return <div aria-live="polite">Loading security events...</div>;
  }

  return (
    <div className="security-audit-log">
      <h3>Security Events</h3>
      <p>Recent security-related activities on your account (last 20 events).</p>

      <div className="filter-controls">
        <label htmlFor="event-filter">Filter by severity:</label>
        <select 
          id="event-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Events</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      <ul className="events-list" role="log" aria-label="Security events">
        {filteredEvents.map((event) => (
          <li key={event.id} className={`event-item severity-${event.severity}`}>
            <div className="event-icon" aria-hidden="true">
              {getSeverityIcon(event.severity)}
            </div>
            
            <div className="event-content">
              <div className="event-description">
                <strong>{event.description}</strong>
              </div>
              
              <div className="event-details">
                <time dateTime={event.timestamp}>
                  {new Date(event.timestamp).toLocaleString()}
                </time>
                <span className="separator">•</span>
                <span>IP: {event.ipAddress}</span>
                {event.userAgent && (
                  <>
                    <span className="separator">•</span>
                    <span className="user-agent" title={event.userAgent}>
                      {event.userAgent.split(' ')[0]}
                    </span>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {filteredEvents.length === 0 && (
        <p>No security events found for the selected filter.</p>
      )}
    </div>
  );
};
```

**IP Allowlist Component**
```tsx
// /frontend/src/components/security/IpAllowlist.tsx
import React, { useState, useEffect } from 'react';
import { AccessibleInput } from '../forms/AccessibleInput';

interface IpRule {
  id: string;
  ipAddress: string;
  description: string;
  createdAt: string;
}

export const IpAllowlist: React.FC = () => {
  const [rules, setRules] = useState<IpRule[]>([]);
  const [newIp, setNewIp] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadIpAllowlist();
  }, []);

  const loadIpAllowlist = async () => {
    try {
      const response = await fetch('/api/v1/security/ip-allowlist', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setRules(data.rules || []);
      setEnabled(data.enabled || false);
    } catch (error) {
      console.error('Failed to load IP allowlist:', error);
    }
  };

  const toggleAllowlist = async () => {
    try {
      await fetch('/api/v1/security/ip-allowlist/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !enabled })
      });
      setEnabled(!enabled);
    } catch (error) {
      console.error('Failed to toggle IP allowlist:', error);
    }
  };

  const addIpRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const response = await fetch('/api/v1/security/ip-allowlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ipAddress: newIp,
          description: newDescription
        })
      });

      if (response.ok) {
        const newRule = await response.json();
        setRules(prev => [...prev, newRule]);
        setNewIp('');
        setNewDescription('');
      }
    } catch (error) {
      console.error('Failed to add IP rule:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const removeIpRule = async (ruleId: string) => {
    try {
      await fetch(`/api/v1/security/ip-allowlist/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
    } catch (error) {
      console.error('Failed to remove IP rule:', error);
    }
  };

  return (
    <div className="ip-allowlist">
      <h3>IP Address Allowlist</h3>
      <p>Restrict account access to specific IP addresses for enhanced security.</p>

      <div className="allowlist-toggle">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggleAllowlist}
            aria-describedby="allowlist-description"
          />
          <span className="toggle-slider"></span>
          <span>Enable IP Allowlist</span>
        </label>
        <p id="allowlist-description" className="help-text">
          {enabled 
            ? 'Only listed IP addresses can access your account'
            : 'All IP addresses can access your account'
          }
        </p>
      </div>

      {enabled && (
        <>
          <form onSubmit={addIpRule} className="add-ip-form">
            <h4>Add IP Address</h4>
            
            <AccessibleInput
              id="ip-address"
              label="IP Address"
              value={newIp}
              onChange={setNewIp}
              hint="Enter IP address (e.g., 192.168.1.1 or 192.168.1.0/24)"
              required
            />

            <AccessibleInput
              id="ip-description"
              label="Description"
              value={newDescription}
              onChange={setNewDescription}
              hint="Optional description for this IP address"
            />

            <button
              type="submit"
              disabled={isAdding || !newIp}
              className="primary-button"
            >
              {isAdding ? 'Adding...' : 'Add IP Address'}
            </button>
          </form>

          <div className="ip-rules-list">
            <h4>Allowed IP Addresses</h4>
            {rules.length === 0 ? (
              <p>No IP addresses in allowlist. Add at least one to enable restrictions.</p>
            ) : (
              <ul role="list">
                {rules.map((rule) => (
                  <li key={rule.id} className="ip-rule-item">
                    <div className="rule-info">
                      <strong>{rule.ipAddress}</strong>
                      {rule.description && <p>{rule.description}</p>}
                      <small>Added: {new Date(rule.createdAt).toLocaleDateString()}</small>
                    </div>
                    
                    <button
                      onClick={() => removeIpRule(rule.id)}
                      className="danger-button small"
                      aria-label={`Remove IP address ${rule.ipAddress}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
```

### 2.4 GOV.UK Design System Integration

**Package Installation**
```bash
npm install govuk-frontend govuk-react styled-components
npm install --save-dev sass
```

**SCSS Setup with GOV.UK**
```scss
// /frontend/src/styles/main.scss
// Import GOV.UK Frontend styles
@import "govuk-frontend/govuk/all";

// GOV.UK Design Tokens (Override defaults for BitAtlas branding)
$govuk-global-styles: true;

// Custom BitAtlas overrides while maintaining GOV.UK patterns
:root {
  // Keep GOV.UK color tokens but add BitAtlas-specific ones
  --bitatlas-brand-blue: #1d70b8;
  --bitatlas-data-location: #00703c;
  --bitatlas-security-warning: #d4351c;
  --bitatlas-mfa-enabled: #00703c;
}

// Override GOV.UK service name styling for BitAtlas
.govuk-header__service-name {
  font-weight: 700;
  
  &::after {
    content: " - Secure EU Cloud Storage";
    font-weight: 400;
    color: $govuk-text-colour;
  }
}

// BitAtlas-specific component styling using GOV.UK patterns
.bitatlas-security-status {
  @extend .govuk-body-s;
  background-color: $govuk-colour-light-grey;
  padding: govuk-spacing(2);
  border-left: 4px solid var(--bitatlas-data-location);
  
  .status-secure {
    color: var(--bitatlas-mfa-enabled);
    font-weight: 600;
  }
  
  .status-warning {
    color: var(--bitatlas-security-warning);
    font-weight: 600;
  }
}

.bitatlas-file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: govuk-spacing(4);
  margin-top: govuk-spacing(4);
}

.bitatlas-file-item {
  @extend .govuk-summary-card;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  &.selected {
    border-left: 4px solid $govuk-colour-blue;
    background-color: $govuk-colour-light-blue;
  }
}

// Upload dropzone using GOV.UK file upload styling
.bitatlas-upload-dropzone {
  @extend .govuk-file-upload;
  min-height: 200px;
  border: 2px dashed $govuk-border-colour;
  border-radius: 0; // GOV.UK doesn't use border-radius
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  
  &.drag-active {
    border-color: $govuk-colour-blue;
    background-color: $govuk-colour-light-blue;
  }
}

// Search results using GOV.UK lists
.bitatlas-search-results {
  @extend .govuk-list;
  border: 1px solid $govuk-border-colour;
  background: $govuk-colour-white;
  max-height: 400px;
  overflow-y: auto;
  
  li {
    border-bottom: 1px solid $govuk-border-colour;
    margin: 0;
    
    &:last-child {
      border-bottom: none;
    }
  }
}

// Notification system using GOV.UK notification banner
.bitatlas-notification {
  @extend .govuk-notification-banner;
  position: fixed;
  top: govuk-spacing(4);
  right: govuk-spacing(4);
  width: 400px;
  z-index: 9999;
  
  &.success {
    @extend .govuk-notification-banner--success;
  }
}

// Mobile responsive using GOV.UK grid
@include govuk-media-query($from: tablet) {
  .bitatlas-file-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@include govuk-media-query($from: desktop) {
  .bitatlas-file-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: govuk-spacing(6);
  }
}
```

**GOV.UK React Components Setup**
```tsx
// /frontend/src/components/govuk/GovUKWrapper.tsx
import React from 'react';
import { 
  Header,
  Footer,
  SkipLink,
  Main,
  Page
} from 'govuk-react';

interface GovUKWrapperProps {
  children: React.ReactNode;
  serviceName?: string;
}

export const GovUKWrapper: React.FC<GovUKWrapperProps> = ({ 
  children, 
  serviceName = "BitAtlas" 
}) => {
  return (
    <Page>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      <Header
        serviceName={serviceName}
        serviceUrl="/dashboard"
        homepageUrl="https://gov.uk"
      />
      
      <Main id="main-content">
        {children}
      </Main>
      
      <Footer
        meta={{
          items: [
            { href: '/transparency', text: 'Transparency' },
            { href: '/account/privacy', text: 'Privacy' },
            { href: '/account/security', text: 'Security' }
          ],
          licence: (
            <>
              All content is available under the{' '}
              <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">
                Open Government Licence v3.0
              </a>
            </>
          )
        }}
      />
    </Page>
  );
};
```

---

## Phase 3: MCP Integration Experience (Weeks 7-9)

### 3.1 OAuth Implementation

**OAuth Controller**
```typescript
// /backend/src/controllers/oauthController.ts
export class OAuthController {
  async authorize(req: Request, res: Response) {
    const { client_id, redirect_uri, scope, state } = req.query;
    
    // Validate client and redirect URI
    const client = await this.validateClient(client_id as string);
    if (!client) {
      return res.status(400).json({ error: 'invalid_client' });
    }

    // Generate authorization code
    const authCode = crypto.randomBytes(32).toString('hex');
    await this.storeAuthorizationCode(authCode, {
      userId: req.user.id,
      clientId: client_id,
      scopes: (scope as string).split(' '),
      redirectUri: redirect_uri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state}`;
    res.redirect(redirectUrl);
  }

  async token(req: Request, res: Response) {
    const { grant_type, code, client_id, client_secret } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    // Validate authorization code
    const authData = await this.validateAuthorizationCode(code);
    if (!authData) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate access token
    const accessToken = jwt.sign(
      { 
        userId: authData.userId,
        clientId: client_id,
        scopes: authData.scopes
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');

    await this.storeOAuthToken({
      userId: authData.userId,
      clientId: client_id,
      accessToken,
      refreshToken,
      scopes: authData.scopes,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authData.scopes.join(' ')
    });
  }
}
```

### 3.2 MCP Server Implementation

**MCP Server**
```typescript
// /mcp-modules/src/server/mcpServer.ts
import { McpRequest, McpResponse, McpErrorCode } from '../types/mcpProtocol';

export class McpServer {
  private tools: Map<string, Function> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools() {
    this.tools.set('searchFiles', this.searchFiles.bind(this));
    this.tools.set('readFile', this.readFile.bind(this));
    this.tools.set('createFile', this.createFile.bind(this));
    this.tools.set('updateFile', this.updateFile.bind(this));
    this.tools.set('deleteFile', this.deleteFile.bind(this));
  }

  async handleRequest(request: McpRequest, authContext: any): Promise<McpResponse> {
    try {
      // Validate OAuth scopes
      await this.validateScopes(request.method, authContext.scopes);

      const tool = this.tools.get(request.method);
      if (!tool) {
        return {
          version: request.version,
          id: request.id,
          error: {
            code: McpErrorCode.INVALID_REQUEST,
            message: `Unknown method: ${request.method}`
          }
        };
      }

      const result = await tool(request.params, authContext);
      
      return {
        version: request.version,
        id: request.id,
        result
      };

    } catch (error) {
      return {
        version: request.version,
        id: request.id,
        error: {
          code: McpErrorCode.INTERNAL_ERROR,
          message: error.message
        }
      };
    }
  }

  private async searchFiles(params: any, authContext: any) {
    const { query, fileType, limit = 20 } = params;
    
    // Call database search with user context
    const files = await this.fileService.search({
      userId: authContext.userId,
      query,
      fileType,
      limit
    });

    return {
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
        mimeType: f.mime_type,
        createdAt: f.created_at
      }))
    };
  }

  private async readFile(params: any, authContext: any) {
    const { fileId } = params;
    
    const file = await this.fileService.getFile({
      id: fileId,
      userId: authContext.userId
    });

    if (!file) {
      throw new Error('File not found');
    }

    const content = await this.storageService.getFileContent(file.storage_key);
    
    return {
      id: file.id,
      name: file.name,
      content: content.toString(),
      mimeType: file.mime_type
    };
  }

  private async createFile(params: any, authContext: any) {
    const { name, content, path = '/' } = params;
    
    const file = await this.fileService.createFile({
      userId: authContext.userId,
      name,
      content,
      path
    });

    return {
      id: file.id,
      name: file.name,
      path: file.path,
      createdAt: file.created_at
    };
  }

  private async validateScopes(method: string, userScopes: string[]) {
    const requiredScopes = {
      'searchFiles': ['files:read'],
      'readFile': ['files:read'],
      'createFile': ['files:write'],
      'updateFile': ['files:write'],
      'deleteFile': ['files:delete']
    };

    const required = requiredScopes[method] || [];
    const hasPermission = required.every(scope => userScopes.includes(scope));

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }
  }
}
```

### 3.3 MCP Tools Definition

**Tool Definitions for AI Assistants**
```json
{
  "tools": [
    {
      "name": "searchFiles",
      "description": "Search through the user's files by name, content, or metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query (can include file names, content, or metadata)"
          },
          "fileType": {
            "type": "string",
            "description": "Filter by file type (e.g., 'image', 'document', 'code')",
            "enum": ["image", "document", "code", "audio", "video", "archive"]
          },
          "limit": {
            "type": "number",
            "description": "Maximum number of results to return",
            "default": 20,
            "maximum": 100
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "readFile",
      "description": "Read the content of a specific file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string",
            "description": "The unique identifier of the file to read"
          }
        },
        "required": ["fileId"]
      }
    },
    {
      "name": "createFile",
      "description": "Create a new file with specified content",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the file to create"
          },
          "content": {
            "type": "string",
            "description": "Content of the file"
          },
          "path": {
            "type": "string",
            "description": "Directory path where to create the file",
            "default": "/"
          }
        },
        "required": ["name", "content"]
      }
    },
    {
      "name": "updateFile",
      "description": "Update an existing file's content or metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string",
            "description": "The unique identifier of the file to update"
          },
          "content": {
            "type": "string",
            "description": "New content for the file"
          },
          "name": {
            "type": "string",
            "description": "New name for the file"
          }
        },
        "required": ["fileId"]
      }
    },
    {
      "name": "deleteFile",
      "description": "Delete a file (soft delete with recovery option)",
      "inputSchema": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string",
            "description": "The unique identifier of the file to delete"
          }
        },
        "required": ["fileId"]
      }
    }
  ]
}
```

### 2.5 Transparency Page (Static Content)

**Transparency Information**
```markdown
<!-- /frontend/public/transparency.md -->
# Transparency Report - BitAtlas

## Data Storage Providers

### Primary Storage
- **Provider**: Hetzner Online GmbH
- **Location**: Nuremberg, Germany 🇩🇪
- **Certification**: ISO 27001, SOC 2 Type II
- **Data Residency**: All user files remain within EU borders

### Secondary Storage  
- **Provider**: OVH SAS
- **Location**: Gravelines, France 🇫🇷
- **Certification**: ISO 27001, HDS (Hébergeur de Données de Santé)
- **Purpose**: Backup and redundancy

### Database & Application
- **Provider**: Hetzner Online GmbH
- **Location**: Nuremberg, Germany 🇩🇪
- **Encryption**: AES-256 at rest, TLS 1.3 in transit

## Data Retention

- **Active Files**: Retained indefinitely while account is active
- **Deleted Files**: 30-day recovery period, then permanently deleted
- **Account Deletion**: All data permanently deleted within 30 days
- **Logs**: Security logs retained for 90 days
- **Backups**: Encrypted backups retained for 1 year

## Incident Response Process

1. **Detection**: Automated monitoring + manual verification
2. **Assessment**: Security team assessment within 2 hours
3. **Containment**: Immediate isolation of affected systems
4. **Investigation**: Full forensic analysis
5. **Notification**: Users notified within 72 hours if personal data affected
6. **Recovery**: Systems restored with enhanced security measures
7. **Review**: Post-incident analysis and documentation

## Data Protection Compliance

- **GDPR**: Full compliance with EU General Data Protection Regulation
- **DPA**: Data Processing Agreements available for business customers
- **Privacy by Design**: Built-in privacy protections at system level
- **Data Portability**: Full data export in standard formats
- **Right to Erasure**: Complete data deletion within 30 days

## Contact Information

- **Data Protection Officer**: privacy@bitatlas.com
- **Security Team**: security@bitatlas.com
- **Incident Reports**: incidents@bitatlas.com

*Last updated: [Current Date]*
*Next review: [Quarterly]*
```

### 2.5 Backend Controllers for Trust Features

**Authentication Controller**
```typescript
// /backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { SecurityEventService } from '../services/securityEventService';

export class AuthController {
  constructor(
    private authService: AuthService,
    private securityEventService: SecurityEventService
  ) {}

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      
      const user = await this.authService.createUser({
        email,
        password,
        name
      });

      const tokens = await this.authService.generateTokens(user.id);
      
      await this.securityEventService.logEvent({
        userId: user.id,
        type: 'user_registered',
        description: 'New user account created',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const user = await this.authService.validateCredentials(email, password);
      if (!user) {
        await this.securityEventService.logEvent({
          userId: null,
          type: 'failed_login',
          description: `Failed login attempt for ${email}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          severity: 'warning'
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const tokens = await this.authService.generateTokens(user.id);
      
      await this.securityEventService.logEvent({
        userId: user.id,
        type: 'login',
        description: 'User logged in successfully',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async me(req: Request, res: Response) {
    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      createdAt: req.user.created_at
    });
  }

  async logout(req: Request, res: Response) {
    try {
      const sessionId = req.session?.id;
      if (sessionId) {
        await this.authService.revokeSession(sessionId);
      }

      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'logout',
        description: 'User logged out',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

**Security Controller**
```typescript
// /backend/src/controllers/securityController.ts
import { Request, Response } from 'express';
import { MfaService } from '../services/mfaService';
import { SessionService } from '../services/sessionService';
import { SecurityEventService } from '../services/securityEventService';
import { IpAllowlistService } from '../services/ipAllowlistService';

export class SecurityController {
  constructor(
    private mfaService: MfaService,
    private sessionService: SessionService,
    private securityEventService: SecurityEventService,
    private ipAllowlistService: IpAllowlistService
  ) {}

  async getSecurityStatus(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      
      const [mfaStatus, activeSessions, lastEvent] = await Promise.all([
        this.mfaService.getUserMfaStatus(userId),
        this.sessionService.getActiveSessionCount(userId),
        this.securityEventService.getLastEvent(userId)
      ]);

      res.json({
        mfaEnabled: mfaStatus.enabled,
        dataLocation: {
          provider: 'Hetzner',
          region: 'Nuremberg'
        },
        activeSessions,
        lastSecurityEvent: lastEvent
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // MFA endpoints
  async getMfaStatus(req: Request, res: Response) {
    try {
      const status = await this.mfaService.getUserMfaStatus(req.user.id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async enableMfa(req: Request, res: Response) {
    try {
      const { code } = req.body;
      const result = await this.mfaService.enableMfa(req.user.id, code);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'mfa_enabled',
        description: 'Two-factor authentication enabled',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async disableMfa(req: Request, res: Response) {
    try {
      await this.mfaService.disableMfa(req.user.id);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'mfa_disabled',
        description: 'Two-factor authentication disabled',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warning'
      });

      res.json({ message: 'MFA disabled successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateBackupCodes(req: Request, res: Response) {
    try {
      const backupCodes = await this.mfaService.generateBackupCodes(req.user.id);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'backup_codes_generated',
        description: 'New MFA backup codes generated',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({ backupCodes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Session management
  async getActiveSessions(req: Request, res: Response) {
    try {
      const sessions = await this.sessionService.getUserSessions(req.user.id);
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async revokeSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      await this.sessionService.revokeSession(sessionId, req.user.id);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'session_revoked',
        description: `Session ${sessionId} manually revoked`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({ message: 'Session revoked successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async revokeAllSessions(req: Request, res: Response) {
    try {
      const count = await this.sessionService.revokeAllUserSessions(req.user.id, req.session.id);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'all_sessions_revoked',
        description: `${count} sessions revoked`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({ message: `${count} sessions revoked successfully` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Security events
  async getSecurityEvents(req: Request, res: Response) {
    try {
      const events = await this.securityEventService.getUserEvents(req.user.id, 20);
      res.json({ events });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // IP Allowlist
  async getIpAllowlist(req: Request, res: Response) {
    try {
      const allowlist = await this.ipAllowlistService.getUserAllowlist(req.user.id);
      res.json(allowlist);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async toggleIpAllowlist(req: Request, res: Response) {
    try {
      const { enabled } = req.body;
      await this.ipAllowlistService.toggleAllowlist(req.user.id, enabled);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'ip_allowlist_toggled',
        description: `IP allowlist ${enabled ? 'enabled' : 'disabled'}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({ message: `IP allowlist ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async addIpRule(req: Request, res: Response) {
    try {
      const { ipAddress, description } = req.body;
      const rule = await this.ipAllowlistService.addIpRule(req.user.id, ipAddress, description);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'ip_rule_added',
        description: `IP address ${ipAddress} added to allowlist`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeIpRule(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const rule = await this.ipAllowlistService.removeIpRule(ruleId, req.user.id);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'ip_rule_removed',
        description: `IP address ${rule.ipAddress} removed from allowlist`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({ message: 'IP rule removed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

**GDPR Controller**
```typescript
// /backend/src/controllers/gdprController.ts
import { Request, Response } from 'express';
import { GdprService } from '../services/gdprService';
import { SecurityEventService } from '../services/securityEventService';

export class GdprController {
  constructor(
    private gdprService: GdprService,
    private securityEventService: SecurityEventService
  ) {}

  async exportUserData(req: Request, res: Response) {
    try {
      const exportJob = await this.gdprService.requestDataExport(req.user.id);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'data_export_requested',
        description: 'User requested data export',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        message: 'Data export initiated',
        exportId: exportJob.id,
        estimatedCompletion: exportJob.estimatedCompletion
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteAccount(req: Request, res: Response) {
    try {
      await this.gdprService.initiateAccountDeletion(req.user.id);
      
      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'account_deletion_initiated',
        description: 'User initiated account deletion',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'critical'
      });

      res.json({
        message: 'Account deletion initiated. All data will be permanently deleted within 30 days.',
        deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDataExportStatus(req: Request, res: Response) {
    try {
      const { exportId } = req.params;
      const status = await this.gdprService.getExportStatus(exportId, req.user.id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async downloadDataExport(req: Request, res: Response) {
    try {
      const { exportId } = req.params;
      const exportData = await this.gdprService.getExportData(exportId, req.user.id);
      
      if (!exportData) {
        return res.status(404).json({ error: 'Export not found or expired' });
      }

      await this.securityEventService.logEvent({
        userId: req.user.id,
        type: 'data_export_downloaded',
        description: `Data export ${exportId} downloaded`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="bitatlas-data-${req.user.id}.zip"`);
      res.send(exportData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

**File History Controller**
```typescript
// /backend/src/controllers/fileHistoryController.ts
import { Request, Response } from 'express';
import { FileVersionService } from '../services/fileVersionService';

export class FileHistoryController {
  constructor(private fileVersionService: FileVersionService) {}

  async getFileHistory(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      
      // Verify user owns the file
      const hasAccess = await this.fileVersionService.verifyFileAccess(fileId, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const history = await this.fileVersionService.getFileHistory(fileId);
      res.json({ history });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFileVersion(req: Request, res: Response) {
    try {
      const { fileId, versionId } = req.params;
      
      const hasAccess = await this.fileVersionService.verifyFileAccess(fileId, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const version = await this.fileVersionService.getFileVersion(versionId);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }

      res.json(version);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async restoreFileVersion(req: Request, res: Response) {
    try {
      const { fileId, versionId } = req.params;
      
      const hasAccess = await this.fileVersionService.verifyFileAccess(fileId, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const restoredFile = await this.fileVersionService.restoreVersion(fileId, versionId, req.user.id);
      res.json({
        message: 'File restored successfully',
        file: restoredFile
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

### 2.6 Core File Components

**File Item Component**
```tsx
// /frontend/src/components/files/FileItem.tsx
import React, { useState } from 'react';
import { FileChangeHistory } from './FileChangeHistory';
import { SharePermissionPreview } from '../sharing/SharePermissionPreview';

interface File {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType?: string;
  modifiedAt: string;
  createdBy: string;
  isShared: boolean;
  shareSettings?: {
    type: 'view' | 'edit' | 'comment';
    expiresIn?: string;
    isPublic: boolean;
  };
}

interface FileItemProps {
  file: File;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
  onShare?: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  selected,
  onSelect,
  onDelete,
  onRename,
  onShare
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.type === 'folder') return '📁';
    if (file.mimeType?.startsWith('image/')) return '🖼️';
    if (file.mimeType?.startsWith('video/')) return '🎬';
    if (file.mimeType?.startsWith('audio/')) return '🎵';
    if (file.mimeType?.includes('pdf')) return '📄';
    if (file.mimeType?.includes('text')) return '📝';
    return '📄';
  };

  const handleRename = () => {
    if (onRename && newName !== file.name) {
      onRename(newName);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selected) {
        setShowMenu(!showMenu);
      } else {
        onSelect(file.id);
      }
    } else if (e.key === 'Delete' && selected) {
      onDelete();
    } else if (e.key === 'F2' && selected) {
      setIsRenaming(true);
    }
  };

  return (
    <div 
      className={`file-item ${selected ? 'selected' : ''} ${file.type}`}
      onClick={() => onSelect(file.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="gridcell"
      aria-selected={selected}
      aria-label={`${file.type} ${file.name}`}
    >
      <div className="file-icon" aria-hidden="true">
        {getFileIcon()}
      </div>

      <div className="file-info">
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setNewName(file.name);
                setIsRenaming(false);
              }
            }}
            autoFocus
            className="rename-input"
          />
        ) : (
          <h3 className="file-name">{file.name}</h3>
        )}

        <div className="file-details">
          {file.type === 'file' && (
            <span className="file-size">{formatFileSize(file.size)}</span>
          )}
          <span className="file-date">
            Modified {new Date(file.modifiedAt).toLocaleDateString()}
          </span>
        </div>

        {file.isShared && file.shareSettings && (
          <SharePermissionPreview
            shareType={file.shareSettings.type}
            expiresIn={file.shareSettings.expiresIn}
            isPublic={file.shareSettings.isPublic}
          />
        )}
      </div>

      <div className="file-actions">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="menu-button"
          aria-label={`More actions for ${file.name}`}
          aria-expanded={showMenu}
        >
          ⋮
        </button>

        {showMenu && (
          <div className="context-menu" role="menu">
            <button 
              role="menuitem"
              onClick={() => {
                setIsRenaming(true);
                setShowMenu(false);
              }}
            >
              Rename
            </button>
            
            {onShare && (
              <button 
                role="menuitem"
                onClick={() => {
                  onShare();
                  setShowMenu(false);
                }}
              >
                Share
              </button>
            )}
            
            <button 
              role="menuitem"
              onClick={() => {
                setShowHistory(true);
                setShowMenu(false);
              }}
            >
              View History
            </button>
            
            <button 
              role="menuitem"
              onClick={() => {
                onDelete();
                setShowMenu(false);
              }}
              className="danger-action"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="history-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change History: {file.name}</h3>
              <button 
                onClick={() => setShowHistory(false)}
                aria-label="Close history"
              >
                ×
              </button>
            </div>
            <FileChangeHistory fileId={file.id} />
          </div>
        </div>
      )}
    </div>
  );
};
```

### 2.7 App Routing and State Management

**React Router Configuration**
```tsx
// /frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Template, Header, Footer, Main, PhaseBanner, GridRow, GridCol } from 'govuk-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NotificationProvider } from './contexts/NotificationContext';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Dashboard } from './pages/Dashboard';
import { SecurityPanel } from './components/security/SecurityPanel';
import { DataPrivacyCenter } from './components/privacy/DataPrivacyCenter';
import { TransparencyPage } from './pages/TransparencyPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import './styles/accessibility.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const PageLayout: React.FC<{ children: React.ReactNode; serviceName?: string }> = ({ 
  children, 
  serviceName = "BitAtlas" 
}) => {
  return (
    <Template
      header={
        <Header 
          serviceName={serviceName}
          serviceUrl="/"
          homepageUrl="https://www.gov.uk/"
        />
      }
      beforeMain={
        <PhaseBanner level="beta">
          This is a new service – your <a href="/feedback">feedback</a> will help us to improve it.
        </PhaseBanner>
      }
      footer={
        <Footer 
          meta={{
            items: [
              { children: 'Privacy Policy', href: '/privacy' },
              { children: 'Transparency Report', href: '/transparency' },
              { children: 'Accessibility Statement', href: '/accessibility' },
              { children: 'Terms of Service', href: '/terms' }
            ]
          }}
        />
      }
    >
      <Main>
        <GridRow>
          <GridCol setWidth="full">
            {children}
          </GridCol>
        </GridRow>
      </Main>
    </Template>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="app" lang="en">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={
                  <PublicRoute>
                    <PageLayout serviceName="BitAtlas - Sign In">
                      <LoginForm />
                    </PageLayout>
                  </PublicRoute>
                } />
                
                <Route path="/register" element={
                  <PublicRoute>
                    <PageLayout serviceName="BitAtlas - Create Account">
                      <RegisterForm />
                    </PageLayout>
                  </PublicRoute>
                } />
                
                <Route path="/transparency" element={
                  <PageLayout serviceName="BitAtlas - Transparency">
                    <TransparencyPage />
                  </PageLayout>
                } />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <PageLayout>
                      <Dashboard />
                    </PageLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/account/security" element={
                  <ProtectedRoute>
                    <PageLayout serviceName="BitAtlas - Security">
                      <SecurityPanel />
                    </PageLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/account/privacy" element={
                  <ProtectedRoute>
                    <PageLayout serviceName="BitAtlas - Privacy">
                      <DataPrivacyCenter />
                    </PageLayout>
                  </ProtectedRoute>
                } />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
```

**Updated Dashboard with GOV.UK Components**
```tsx
// /frontend/src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { 
  Heading, 
  Button, 
  GridRow, 
  GridCol,
  Panel,
  InsetText,
  Link
} from 'govuk-react';
import { GovUKWrapper } from '../components/govuk/GovUKWrapper';
import { SecurityStatusPanel } from '../components/security/SecurityStatusPanel';
import { FileExplorer } from '../components/files/FileExplorer';
import { SearchBar } from '../components/search/SearchBar';
import { UploadDropzone } from '../components/upload/UploadDropzone';
import { SessionTimeoutWarning } from '../components/session/SessionTimeoutWarning';
import { useAuth } from '../hooks/useAuth';
import { useSessionTimeout } from '../hooks/useSessionTimeout';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { timeRemaining, extendSession } = useSessionTimeout();
  const [currentPath, setCurrentPath] = useState('/');

  return (
    <GovUKWrapper serviceName="BitAtlas">
      <GridRow>
        <GridCol setWidth="full">
          <div className="govuk-!-display-flex govuk-!-justify-content-space-between govuk-!-align-items-center">
            <Heading size="LARGE">Your files</Heading>
            <div className="user-actions">
              <span className="govuk-body">Signed in as {user?.name}</span>
              <Button 
                buttonColour="secondary" 
                onClick={logout}
                className="govuk-!-margin-left-3"
              >
                Sign out
              </Button>
            </div>
          </div>
        </GridCol>
      </GridRow>

      <GridRow>
        <GridCol setWidth="full">
          <SecurityStatusPanel />
        </GridCol>
      </GridRow>

      <GridRow>
        <GridCol setWidth="two-thirds">
          <SearchBar onSearch={(query) => console.log('Search:', query)} />
        </GridCol>
        <GridCol setWidth="one-third">
          <UploadDropzone currentPath={currentPath} />
        </GridCol>
      </GridRow>

      <GridRow>
        <GridCol setWidth="full">
          <FileExplorer
            currentPath={currentPath}
            onPathChange={setCurrentPath}
          />
        </GridCol>
      </GridRow>

      {timeRemaining <= 300 && timeRemaining > 0 && (
        <SessionTimeoutWarning
          timeRemaining={timeRemaining}
          onExtend={extendSession}
          onLogout={logout}
        />
      )}
    </GovUKWrapper>
  );
};
```

**Updated FileExplorer with GOV.UK Cards**
```tsx
// /frontend/src/components/files/FileExplorer.tsx
import React, { useState, useEffect } from 'react';
import { 
  Heading,
  Button,
  GridRow,
  GridCol,
  Card,
  LoadingBox
} from 'govuk-react';
import { FileItem } from './FileItem';
import { useFiles } from '../../hooks/useFiles';

interface FileExplorerProps {
  currentPath: string;
  onPathChange: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  currentPath,
  onPathChange
}) => {
  const { files, loading, uploadFile, createFolder, deleteFile } = useFiles(currentPath);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  if (loading) {
    return <LoadingBox>Loading your files...</LoadingBox>;
  }

  return (
    <div className="file-explorer">
      <div className="govuk-!-display-flex govuk-!-justify-content-space-between govuk-!-align-items-center govuk-!-margin-bottom-4">
        <Heading size="MEDIUM">
          Files in {currentPath === '/' ? 'Home' : currentPath}
        </Heading>
        
        <div className="file-actions">
          <Button 
            buttonColour="secondary"
            onClick={() => createFolder('New Folder')}
            className="govuk-!-margin-right-2"
          >
            Create folder
          </Button>
        </div>
      </div>

      <div className="bitatlas-file-grid">
        {files.length === 0 ? (
          <Card className="govuk-!-padding-6">
            <div className="govuk-!-text-align-centre">
              <Heading size="MEDIUM">No files yet</Heading>
              <p className="govuk-body">
                Upload files using the dropzone above or drag files directly here.
              </p>
            </div>
          </Card>
        ) : (
          files.map(file => (
            <FileItem
              key={file.id}
              file={file}
              selected={selectedFiles.includes(file.id)}
              onSelect={(id) => setSelectedFiles(prev => 
                prev.includes(id) 
                  ? prev.filter(f => f !== id)
                  : [...prev, id]
              )}
              onDelete={() => deleteFile(file.id)}
              onRename={(newName) => {
                // Handle rename
                console.log(`Rename ${file.id} to ${newName}`);
              }}
              onShare={() => {
                // Handle share
                console.log(`Share ${file.id}`);
              }}
            />
          ))
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="govuk-!-margin-top-4">
          <Card className="govuk-!-padding-4">
            <p className="govuk-body-s">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </p>
            <div className="bulk-actions">
              <Button 
                buttonColour="warning"
                onClick={() => {
                  selectedFiles.forEach(deleteFile);
                  setSelectedFiles([]);
                }}
                className="govuk-!-margin-right-2"
              >
                Delete selected
              </Button>
              <Button 
                buttonColour="secondary"
                onClick={() => setSelectedFiles([])}
              >
                Clear selection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
```

**Updated FileItem with GOV.UK Card Pattern**
```tsx
// /frontend/src/components/files/FileItem.tsx
import React, { useState } from 'react';
import { 
  Card,
  Heading,
  Button,
  Details,
  Link
} from 'govuk-react';
import { FileChangeHistory } from './FileChangeHistory';
import { SharePermissionPreview } from '../sharing/SharePermissionPreview';

interface File {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType?: string;
  modifiedAt: string;
  createdBy: string;
  isShared: boolean;
  shareSettings?: {
    type: 'view' | 'edit' | 'comment';
    expiresIn?: string;
    isPublic: boolean;
  };
}

interface FileItemProps {
  file: File;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
  onShare?: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  selected,
  onSelect,
  onDelete,
  onRename,
  onShare
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.type === 'folder') return '📁';
    if (file.mimeType?.startsWith('image/')) return '🖼️';
    if (file.mimeType?.startsWith('video/')) return '🎬';
    if (file.mimeType?.startsWith('audio/')) return '🎵';
    if (file.mimeType?.includes('pdf')) return '📄';
    if (file.mimeType?.includes('text')) return '📝';
    return '📄';
  };

  const handleRename = () => {
    if (onRename && newName !== file.name) {
      onRename(newName);
    }
    setIsRenaming(false);
  };

  return (
    <Card 
      className={`bitatlas-file-item ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(file.id)}
    >
      <div className="govuk-!-display-flex govuk-!-align-items-start">
        <div className="file-icon govuk-!-margin-right-3" aria-hidden="true">
          <span style={{ fontSize: '2rem' }}>{getFileIcon()}</span>
        </div>

        <div className="file-content govuk-!-flex-grow-1">
          {isRenaming ? (
            <div className="rename-form">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setNewName(file.name);
                    setIsRenaming(false);
                  }
                }}
                className="govuk-input govuk-input--width-20"
                autoFocus
              />
            </div>
          ) : (
            <Heading size="SMALL" className="govuk-!-margin-bottom-1">
              {file.name}
            </Heading>
          )}

          <div className="file-meta govuk-body-s govuk-text-colour-secondary">
            {file.type === 'file' && (
              <span>{formatFileSize(file.size)} • </span>
            )}
            <span>Modified {new Date(file.modifiedAt).toLocaleDateString()}</span>
          </div>

          {file.isShared && file.shareSettings && (
            <div className="govuk-!-margin-top-2">
              <SharePermissionPreview
                shareType={file.shareSettings.type}
                expiresIn={file.shareSettings.expiresIn}
                isPublic={file.shareSettings.isPublic}
              />
            </div>
          )}
        </div>

        <Details 
          summary="Actions"
          className="file-actions govuk-!-margin-left-3"
        >
          <div className="action-buttons">
            <Button 
              buttonColour="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="govuk-!-margin-bottom-2"
            >
              Rename
            </Button>
            
            {onShare && (
              <Button 
                buttonColour="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="govuk-!-margin-bottom-2"
              >
                Share
              </Button>
            )}
            
            <Button 
              buttonColour="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(true);
              }}
              className="govuk-!-margin-bottom-2"
            >
              View history
            </Button>
            
            <Button 
              buttonColour="warning"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              Delete
            </Button>
          </div>
        </Details>
      </div>

      {showHistory && (
        <div className="govuk-!-margin-top-4 govuk-!-padding-top-4 govuk-!-border-top-1">
          <div className="govuk-!-display-flex govuk-!-justify-content-space-between govuk-!-align-items-center">
            <Heading size="SMALL">Change History: {file.name}</Heading>
            <Button 
              buttonColour="secondary"
              onClick={() => setShowHistory(false)}
            >
              Close
            </Button>
          </div>
          <FileChangeHistory fileId={file.id} />
        </div>
      )}
    </Card>
  );
};
```

### 2.8 File Upload/Download Components

**Updated Upload Dropzone with GOV.UK File Upload**
```tsx
// /frontend/src/components/upload/UploadDropzone.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileUpload,
  Heading,
  InsetText,
  ProgressBar,
  Tag,
  Button,
  SummaryList
} from 'govuk-react';
import { UploadProgress } from './UploadProgress';
import { fileService } from '../../services/fileService';
import { useNotification } from '../../hooks/useNotification';

interface UploadDropzoneProps {
  currentPath: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  currentPath,
  onUploadComplete
}) => {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const { showNotification } = useNotification();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36),
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Upload files one by one
    for (const upload of newUploads) {
      try {
        await uploadFile(upload);
      } catch (error) {
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error', error: error.message }
            : u
        ));
      }
    }

    onUploadComplete?.();
  }, [currentPath, onUploadComplete]);

  const uploadFile = async (upload: UploadFile) => {
    const formData = new FormData();
    formData.append('file', upload.file);
    formData.append('path', currentPath);

    try {
      const response = await fileService.uploadFileWithProgress(
        formData,
        (progress) => {
          setUploads(prev => prev.map(u => 
            u.id === upload.id ? { ...u, progress } : u
          ));
        }
      );

      setUploads(prev => prev.map(u => 
        u.id === upload.id 
          ? { ...u, status: 'completed', progress: 100 }
          : u
      ));

      showNotification(`${upload.file.name} uploaded successfully`, 'success');
    } catch (error) {
      throw new Error(`Failed to upload ${upload.file.name}: ${error.message}`);
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      '*/*': [] // Accept all file types
    }
  });

  return (
    <div className="upload-dropzone-container">
      <Heading size="MEDIUM">Upload files</Heading>
      
      <InsetText>
        You can upload multiple files at once. Maximum file size is 100MB per file.
      </InsetText>

      <div
        {...getRootProps()}
        className={`bitatlas-upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload files by clicking or dragging"
      >
        <input {...getInputProps()} />
        <div className="govuk-!-text-align-centre govuk-!-padding-6">
          {isDragActive ? (
            <>
              <p className="govuk-body-l govuk-!-font-weight-bold">Drop files here</p>
              <p className="govuk-body">Release to upload your files</p>
            </>
          ) : (
            <>
              <p className="govuk-body-l govuk-!-font-weight-bold">
                Drag and drop files here, or click to select files
              </p>
              <p className="govuk-body govuk-text-colour-secondary">
                You can select multiple files
              </p>
            </>
          )}
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="govuk-!-margin-top-6">
          <Heading size="SMALL">Upload progress</Heading>
          <SummaryList
            items={uploads.map(upload => ({
              key: upload.file.name,
              value: (
                <div className="upload-status">
                  <div className="govuk-!-margin-bottom-2">
                    {upload.status === 'uploading' && (
                      <>
                        <Tag className="govuk-tag--blue">Uploading</Tag>
                        <div className="govuk-!-margin-top-2">
                          <ProgressBar value={upload.progress} max={100} />
                          <p className="govuk-body-s">{upload.progress}% complete</p>
                        </div>
                      </>
                    )}
                    {upload.status === 'completed' && (
                      <Tag className="govuk-tag--green">✓ Completed</Tag>
                    )}
                    {upload.status === 'error' && (
                      <>
                        <Tag className="govuk-tag--red">✗ Failed</Tag>
                        {upload.error && (
                          <p className="govuk-error-message govuk-!-margin-top-1">
                            {upload.error}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ),
              actions: upload.status !== 'uploading' ? [
                {
                  href: '#',
                  text: 'Remove',
                  onClick: (e) => {
                    e.preventDefault();
                    removeUpload(upload.id);
                  }
                }
              ] : []
            }))}
          />
          
          <Button 
            buttonColour="secondary"
            onClick={() => setUploads([])}
            className="govuk-!-margin-top-4"
          >
            Clear completed uploads
          </Button>
        </div>
      )}
    </div>
  );
};
```

**Updated Search Bar with GOV.UK Input**
```tsx
// /frontend/src/components/search/SearchBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Input,
  Button,
  Heading
} from 'govuk-react';
import { SearchResults } from './SearchResults';
import { useDebounce } from '../../hooks/useDebounce';
import { fileService } from '../../services/fileService';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fileService.searchFiles(searchQuery, {
        limit: 10
      });
      setResults(response.files || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setShowResults(false);
    }
  };

  return (
    <div className="search-container" ref={searchRef}>
      <Heading size="MEDIUM">Search your files</Heading>
      
      <form onSubmit={handleSubmit} className="govuk-!-margin-bottom-4">
        <div className="govuk-!-display-flex">
          <div className="govuk-!-flex-grow-1 govuk-!-margin-right-2">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename or content..."
              aria-label="Search files"
              className="govuk-!-margin-bottom-0"
            />
          </div>
          <Button
            type="submit"
            disabled={!query.trim()}
            className="govuk-!-margin-bottom-0"
          >
            Search
          </Button>
        </div>
        <p className="govuk-hint govuk-!-margin-top-2">
          Type at least 2 characters to see instant results
        </p>
      </form>

      {showResults && (
        <SearchResults
          results={results}
          isLoading={isLoading}
          query={debouncedQuery}
          onResultClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
};
```

**Upload Progress Component**
```tsx
// /frontend/src/components/upload/UploadProgress.tsx
import React from 'react';
import { UploadStatus } from './UploadStatus';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  onRemove: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  fileName,
  progress,
  status,
  error,
  onRemove
}) => {
  return (
    <div className="upload-progress-item">
      <UploadStatus
        fileName={fileName}
        progress={progress}
        status={status}
        error={error}
      />
      
      <div className="progress-actions">
        {status === 'completed' || status === 'error' ? (
          <button 
            onClick={onRemove}
            className="remove-button"
            aria-label={`Remove ${fileName} from upload list`}
          >
            ×
          </button>
        ) : (
          <button 
            onClick={onRemove}
            className="cancel-button"
            aria-label={`Cancel upload of ${fileName}`}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
```

**Enhanced File Service with Progress**
```typescript
// /frontend/src/services/fileService.ts (Enhanced)
class FileService {
  private baseURL = '/api/v1';

  async uploadFileWithProgress(
    formData: FormData,
    onProgress: (progress: number) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.open('POST', `${this.baseURL}/files`);
      
      const token = localStorage.getItem('accessToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  async downloadFile(fileId: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/files/${fileId}/download`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to download ${fileName}: ${error.message}`);
    }
  }

  async getFilePreview(fileId: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/files/${fileId}/preview`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to get file preview');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // ... existing methods
}

export const fileService = new FileService();
```

### 2.9 Search Functionality

**Search Bar Component**
```tsx
// /frontend/src/components/search/SearchBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { SearchResults } from './SearchResults';
import { useDebounce } from '../../hooks/useDebounce';
import { fileService } from '../../services/fileService';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fileService.searchFiles(searchQuery, {
        limit: 10
      });
      setResults(response.files || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setShowResults(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length === 0) {
      setShowResults(false);
    }
  };

  return (
    <div className="search-container" ref={searchRef}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <input
            type="search"
            value={query}
            onChange={handleInputChange}
            placeholder="Search files..."
            className="search-input"
            aria-label="Search files"
            aria-describedby="search-help"
            autoComplete="off"
          />
          <button
            type="submit"
            className="search-button"
            aria-label="Perform search"
            disabled={!query.trim()}
          >
            🔍
          </button>
        </div>
        <p id="search-help" className="sr-only">
          Type to search files by name or content
        </p>
      </form>

      {showResults && (
        <SearchResults
          results={results}
          isLoading={isLoading}
          query={debouncedQuery}
          onResultClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
};
```

**Search Results Component**
```tsx
// /frontend/src/components/search/SearchResults.tsx
import React from 'react';

interface SearchResult {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  modifiedAt: string;
  snippet?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onResultClick: (result: SearchResult) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  query,
  onResultClick
}) => {
  const getFileIcon = (result: SearchResult) => {
    if (result.type === 'folder') return '📁';
    if (result.mimeType?.startsWith('image/')) return '🖼️';
    if (result.mimeType?.startsWith('video/')) return '🎬';
    if (result.mimeType?.startsWith('audio/')) return '🎵';
    if (result.mimeType?.includes('pdf')) return '📄';
    return '📝';
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : part
    );
  };

  if (isLoading) {
    return (
      <div className="search-results loading" role="status" aria-live="polite">
        <div className="search-loading">
          <span>Searching...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results" role="listbox" aria-label="Search results">
      {results.length === 0 ? (
        <div className="no-results">
          <p>No files found for "{query}"</p>
        </div>
      ) : (
        <>
          <div className="results-header">
            <p>{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>
          </div>
          
          <ul className="results-list">
            {results.map((result) => (
              <li key={result.id} className="search-result-item">
                <button
                  className="result-button"
                  onClick={() => onResultClick(result)}
                  role="option"
                  aria-describedby={`result-${result.id}-details`}
                >
                  <div className="result-icon" aria-hidden="true">
                    {getFileIcon(result)}
                  </div>
                  
                  <div className="result-content">
                    <div className="result-name">
                      {highlightMatch(result.name, query)}
                    </div>
                    
                    <div className="result-path">
                      {result.path}
                    </div>
                    
                    {result.snippet && (
                      <div className="result-snippet">
                        {highlightMatch(result.snippet, query)}
                      </div>
                    )}
                    
                    <div id={`result-${result.id}-details`} className="result-meta">
                      <span>{result.type}</span>
                      {result.size && (
                        <span> • {(result.size / 1024).toFixed(1)} KB</span>
                      )}
                      <span> • {new Date(result.modifiedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
```

### 2.10 Notification System

**Notification Context and Provider**
```tsx
// /frontend/src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationBanner } from 'govuk-react';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type: Notification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((
    message: string,
    type: Notification['type'],
    duration = 5000
  ) => {
    const id = Math.random().toString(36);
    const notification: Notification = { id, message, type, duration };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      removeNotification
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  const getNotificationProps = (type: string) => {
    switch (type) {
      case 'success':
        return { success: true };
      case 'error':
        return { important: true };
      case 'warning':
        return { important: true };
      default:
        return {};
    }
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: '1rem', 
        right: '1rem', 
        zIndex: 1000,
        maxWidth: '400px'
      }}
      aria-live="polite" 
      aria-label="Notifications"
    >
      {notifications.map(notification => (
        <NotificationBanner
          key={notification.id}
          title={notification.type === 'success' ? 'Success' : 
                 notification.type === 'error' ? 'Error' : 
                 notification.type === 'warning' ? 'Warning' : 'Information'}
          {...getNotificationProps(notification.type)}
          style={{ marginBottom: '1rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                marginLeft: '1rem'
              }}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </NotificationBanner>
      ))}
    </div>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
```

### 2.11 Error Boundary and Loading States

**Error Boundary Component**
```tsx
// /frontend/src/components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  GridRow, 
  GridCol, 
  ErrorText, 
  Heading, 
  Paragraph, 
  Button,
  Details,
  InsetText
} from 'govuk-react';

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // sendErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <GridRow>
          <GridCol setWidth="two-thirds">
            <ErrorText>
              <Heading size="LARGE">Something went wrong</Heading>
              <Paragraph>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Paragraph>
              <InsetText>
                Try refreshing the page or contact support if the problem persists.
                <br />
                Reference code: ERR_{Date.now()}
              </InsetText>
            </ErrorText>
            
            <Button onClick={this.handleRetry} buttonColour="#00703c" style={{ marginRight: '1rem' }}>
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} buttonColour="#505a5f">
              Refresh Page
            </Button>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Details summary="Error Details (Development)" style={{ marginTop: '2rem' }}>
                <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {this.state.error?.stack}
                </pre>
                <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </Details>
            )}
          </GridCol>
        </GridRow>
      );
    }

    return this.props.children;
  }
}
```

**Loading Spinner Component**
```tsx
// /frontend/src/components/common/LoadingSpinner.tsx
import React from 'react';
import { LoadingBox, InsetText } from 'govuk-react';
import { useReducedMotion } from '../../utils/accessibility';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Loading...',
  overlay = false
}) => {
  const prefersReducedMotion = useReducedMotion();

  const loadingElement = (
    <LoadingBox 
      loading={true}
      title={message}
      timeoutTime={30000}
    >
      <div style={{ minHeight: '200px' }} />
    </LoadingBox>
  );

  if (overlay) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        role="status" 
        aria-live="polite"
      >
        <div style={{ textAlign: 'center' }}>
          <InsetText>{message}</InsetText>
        </div>
      </div>
    );
  }

  return loadingElement;
};
```

### 2.12 Mobile Responsive Design

**Mobile Responsive CSS**
```css
/* /frontend/src/styles/responsive.css */

/* Mobile First Approach */
.dashboard {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.dashboard-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--background-primary);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.security-status-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* File Explorer Mobile */
.file-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  padding: 1rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  transition: all 0.2s ease;
}

.file-item:hover,
.file-item:focus {
  background: var(--background-secondary);
  border-color: var(--accent-primary);
}

.file-item.selected {
  background: var(--accent-primary);
  color: white;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  word-break: break-word;
}

.file-details {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

/* Context Menu Mobile */
.context-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
}

.context-menu button {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
}

.context-menu button:hover {
  background: var(--background-secondary);
}

/* Upload Dropzone Mobile */
.upload-dropzone {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.upload-dropzone:hover,
.upload-dropzone.drag-active {
  border-color: var(--accent-primary);
  background: var(--background-secondary);
}

/* Search Mobile */
.search-container {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 3rem 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

/* Notification Mobile */
.notification-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  left: 1rem;
  z-index: 9999;
  pointer-events: none;
}

.notification {
  pointer-events: auto;
  margin-bottom: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification-success { background: var(--success); color: white; }
.notification-error { background: var(--error); color: white; }
.notification-warning { background: var(--warning); color: white; }
.notification-info { background: var(--accent-primary); color: white; }

/* Tablet Styles */
@media (min-width: 768px) {
  .header-content {
    flex-wrap: nowrap;
  }
  
  .file-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    padding: 1.5rem;
  }
  
  .security-status-bar {
    font-size: 1rem;
  }
  
  .notification-container {
    left: auto;
    width: 400px;
  }
}

/* Desktop Styles */
@media (min-width: 1024px) {
  .dashboard {
    flex-direction: row;
  }
  
  .dashboard-header {
    position: static;
  }
  
  .file-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
    padding: 2rem;
  }
  
  .file-item {
    flex-direction: column;
    text-align: center;
    aspect-ratio: 1;
  }
  
  .file-icon {
    font-size: 2rem;
  }
}

/* High DPI Displays */
@media (min-resolution: 2dppx) {
  .file-icon {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
}

/* Print Styles */
@media print {
  .dashboard-header,
  .toolbar,
  .file-actions,
  .notification-container {
    display: none;
  }
  
  .file-grid {
    display: block;
  }
  
  .file-item {
    break-inside: avoid;
    border: 1px solid #000;
    margin-bottom: 1rem;
  }
}
```

---

## Phase 4: Advanced Features (Weeks 10-12)

### 4.1 European Cloud Storage Integration

**Storage Orchestrator**
```typescript
// /mcp-modules/src/storage/storageOrchestrator.ts
import { OvhStorage } from './providers/ovhStorage';
import { ScalewayStorage } from './providers/scalewayStorage';
import { HetznerStorage } from './providers/hetznerStorage';

export class StorageOrchestrator {
  private providers: Map<string, any> = new Map();

  constructor() {
    this.providers.set('ovh', new OvhStorage());
    this.providers.set('scaleway', new ScalewayStorage());
    this.providers.set('hetzner', new HetznerStorage());
  }

  async uploadFile(file: Buffer, options: {
    provider: string;
    key: string;
    metadata?: any;
  }) {
    const provider = this.providers.get(options.provider);
    if (!provider) {
      throw new Error(`Unknown storage provider: ${options.provider}`);
    }

    // Encrypt file before upload
    const encryptedFile = await this.encryptFile(file);
    
    return provider.upload(encryptedFile, {
      key: options.key,
      metadata: options.metadata,
      encryption: 'AES-256-GCM'
    });
  }

  async getFile(provider: string, key: string) {
    const storageProvider = this.providers.get(provider);
    const encryptedFile = await storageProvider.download(key);
    
    // Decrypt file after download
    return this.decryptFile(encryptedFile);
  }

  private async encryptFile(file: Buffer): Promise<Buffer> {
    // Implement AES-256-GCM encryption
    // Use European-generated encryption keys
    return file; // Placeholder
  }

  private async decryptFile(encryptedFile: Buffer): Promise<Buffer> {
    // Implement AES-256-GCM decryption
    return encryptedFile; // Placeholder
  }
}
```

### 4.2 GDPR Compliance Module

**GDPR Service**
```typescript
// /mcp-modules/src/gdpr/gdprService.ts
export class GdprService {
  async exportUserData(userId: string): Promise<any> {
    const userData = await this.collectUserData(userId);
    
    return {
      exportDate: new Date().toISOString(),
      userId,
      profile: userData.profile,
      files: userData.files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        createdAt: f.created_at,
        // Exclude storage keys and internal metadata
      })),
      sessions: userData.sessions.map(s => ({
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

    // 2. Delete database records
    await this.db.transaction(async (trx) => {
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
}
```

---

## Deployment Configuration

### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bitatlas
      POSTGRES_USER: bitatlas
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://bitatlas:password@postgres:5432/bitatlas
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-jwt-secret-here
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

### Production Deployment (Hetzner)
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bitatlas-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bitatlas-backend
  template:
    metadata:
      labels:
        app: bitatlas-backend
    spec:
      containers:
      - name: backend
        image: bitatlas/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bitatlas-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: bitatlas-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Success Metrics & Monitoring

### Key Performance Indicators
```typescript
// Metrics to track
export const KPIs = {
  webExperience: {
    uploadSpeed: 'avg_upload_speed_mbps',
    searchLatency: 'search_response_time_ms',
    userEngagement: 'daily_active_users',
    featureAdoption: 'feature_usage_rate'
  },
  mcpExperience: {
    oauthConversion: 'oauth_completion_rate',
    apiSuccessRate: 'api_request_success_rate',
    aiIntegrationUsage: 'mcp_calls_per_day',
    scopeUtilization: 'permission_scope_usage'
  },
  infrastructure: {
    uptime: 'service_availability',
    dataResidency: 'eu_data_compliance',
    security: 'security_incidents_count',
    performance: 'p95_response_time_ms'
  }
};
```

### Monitoring Dashboard
```typescript
// Prometheus metrics collection
export const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  }),
  
  mcpCallsTotal: new Counter({
    name: 'mcp_calls_total',
    help: 'Total number of MCP calls',
    labelNames: ['method', 'client_id', 'status']
  }),

  fileOperationsTotal: new Counter({
    name: 'file_operations_total',
    help: 'Total file operations',
    labelNames: ['operation', 'user_id', 'status']
  }),

  activeUsers: new Gauge({
    name: 'active_users',
    help: 'Number of currently active users'
  })
};
```

---

## Phase 3: MCP Integration & Production Readiness (Weeks 7-10)

### 3.1 MCP Integration Implementation

**OAuth 2.0 with PKCE Implementation**
```typescript
// /backend/src/controllers/oauth/OAuthController.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuthClient, AuthorizationCode, OAuthScope } from '../models/OAuth';

interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export class OAuthController {
  // Step 1: AI assistant requests authorization
  async authorize(req: Request, res: Response) {
    const {
      client_id,
      response_type,
      scope,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state
    } = req.query;

    // Validate OAuth client (AI assistant)
    const client = await OAuthClient.findOne({ 
      clientId: client_id as string,
      isActive: true 
    });

    if (!client) {
      return res.status(400).json({ error: 'invalid_client' });
    }

    // Validate PKCE parameters
    if (!code_challenge || code_challenge_method !== 'S256') {
      return res.status(400).json({ error: 'invalid_request' });
    }

    // Validate scopes
    const requestedScopes = (scope as string).split(' ');
    const validScopes = ['read', 'search', 'files:read', 'files:search', 'profile'];
    
    if (!requestedScopes.every(s => validScopes.includes(s))) {
      return res.status(400).json({ error: 'invalid_scope' });
    }

    // Store authorization request
    const authCode = crypto.randomBytes(32).toString('hex');
    await AuthorizationCode.create({
      code: authCode,
      clientId: client_id,
      userId: null, // Will be set after user consent
      scope: requestedScopes,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      redirectUri: redirect_uri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      state: state as string
    });

    // Redirect to user consent page
    const consentUrl = `/oauth/consent?code=${authCode}&client_name=${encodeURIComponent(client.name)}`;
    res.redirect(consentUrl);
  }

  // Step 2: User grants consent
  async consent(req: Request, res: Response) {
    const { code, grant } = req.body;
    const userId = req.user?.id; // From authenticated session

    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const authCode = await AuthorizationCode.findOne({ 
      code,
      expiresAt: { $gt: new Date() }
    });

    if (!authCode) {
      return res.status(400).json({ error: 'invalid_code' });
    }

    if (grant === 'deny') {
      await authCode.deleteOne();
      return res.redirect(`${authCode.redirectUri}?error=access_denied&state=${authCode.state}`);
    }

    // Update auth code with user consent
    authCode.userId = userId;
    authCode.isConsentGranted = true;
    await authCode.save();

    // Redirect back to AI assistant
    const redirectUrl = `${authCode.redirectUri}?code=${code}&state=${authCode.state}`;
    res.redirect(redirectUrl);
  }

  // Step 3: AI assistant exchanges code for tokens
  async token(req: Request, res: Response) {
    const {
      grant_type,
      code,
      code_verifier,
      client_id,
      redirect_uri
    } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    const authCode = await AuthorizationCode.findOne({
      code,
      clientId: client_id,
      redirectUri: redirect_uri,
      isConsentGranted: true,
      expiresAt: { $gt: new Date() }
    });

    if (!authCode) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Verify PKCE
    const challengeFromVerifier = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    if (challengeFromVerifier !== authCode.codeChallenge) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate access token
    const accessToken = jwt.sign(
      {
        sub: authCode.userId,
        client_id: authCode.clientId,
        scope: authCode.scope,
        type: 'mcp_access'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        sub: authCode.userId,
        client_id: authCode.clientId,
        scope: authCode.scope,
        type: 'mcp_refresh'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Clean up authorization code
    await authCode.deleteOne();

    // Log the authorization event
    await this.logMCPEvent(authCode.userId, 'token_granted', {
      clientId: authCode.clientId,
      scope: authCode.scope
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authCode.scope.join(' ')
    });
  }

  // Refresh token endpoint
  async refresh(req: Request, res: Response) {
    const { refresh_token, grant_type } = req.body;

    if (grant_type !== 'refresh_token') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    try {
      const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET!) as any;
      
      if (decoded.type !== 'mcp_refresh') {
        throw new Error('Invalid token type');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          sub: decoded.sub,
          client_id: decoded.client_id,
          scope: decoded.scope,
          type: 'mcp_access'
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600
      });

    } catch (error) {
      res.status(400).json({ error: 'invalid_grant' });
    }
  }

  private async logMCPEvent(userId: string, event: string, metadata: any) {
    // Implementation for audit logging
    console.log(`MCP Event: ${event}`, { userId, metadata });
  }
}
```

**OAuth Models**
```typescript
// /backend/src/models/OAuth.ts
import mongoose from 'mongoose';

const oauthClientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  redirectUris: [{ type: String, required: true }],
  allowedScopes: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const authorizationCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  userId: { type: String },
  scope: [{ type: String }],
  codeChallenge: { type: String, required: true },
  codeChallengeMethod: { type: String, required: true },
  redirectUri: { type: String, required: true },
  state: { type: String },
  isConsentGranted: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const mcpSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  clientId: { type: String, required: true },
  accessToken: { type: String, required: true },
  scope: [{ type: String }],
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export const OAuthClient = mongoose.model('OAuthClient', oauthClientSchema);
export const AuthorizationCode = mongoose.model('AuthorizationCode', authorizationCodeSchema);
export const MCPSession = mongoose.model('MCPSession', mcpSessionSchema);
```

**User Consent Page**
```tsx
// /frontend/src/pages/OAuthConsent.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  GridRow, 
  GridCol, 
  Heading, 
  Paragraph, 
  Button, 
  SummaryList,
  WarningText,
  InsetText
} from 'govuk-react';

interface ConsentData {
  clientName: string;
  scopes: string[];
  permissions: { [key: string]: string };
}

export const OAuthConsent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);

  const code = searchParams.get('code');
  const clientName = searchParams.get('client_name') || 'AI Assistant';

  const scopeDescriptions = {
    'read': 'View your basic profile information',
    'search': 'Search through your files and folders',
    'files:read': 'Read and download your files',
    'files:search': 'Advanced file content search capabilities'
  };

  useEffect(() => {
    fetchConsentDetails();
  }, [code]);

  const fetchConsentDetails = async () => {
    try {
      const response = await fetch(`/api/oauth/consent-details?code=${code}`);
      const data = await response.json();
      setConsentData(data);
    } catch (error) {
      console.error('Failed to fetch consent details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsent = async (grant: boolean) => {
    try {
      await fetch('/api/oauth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          grant: grant ? 'allow' : 'deny' 
        })
      });
      // Redirect will be handled by the server
    } catch (error) {
      console.error('Consent submission failed:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <GridRow>
      <GridCol setWidth="two-thirds">
        <Heading size="LARGE">
          Authorize {clientName}
        </Heading>
        
        <WarningText>
          An AI assistant is requesting access to your BitAtlas account
        </WarningText>

        <Paragraph>
          <strong>{clientName}</strong> would like to:
        </Paragraph>

        <SummaryList>
          {Object.entries(scopeDescriptions).map(([scope, description]) => (
            <SummaryList.Row key={scope}>
              <SummaryList.Key>{scope}</SummaryList.Key>
              <SummaryList.Value>{description}</SummaryList.Value>
            </SummaryList.Row>
          ))}
        </SummaryList>

        <InsetText>
          This will allow the AI assistant to access your files and perform searches 
          on your behalf. You can revoke this access at any time in your account settings.
        </InsetText>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <Button 
            onClick={() => handleConsent(true)}
            buttonColour="#00703c"
          >
            Allow Access
          </Button>
          <Button 
            onClick={() => handleConsent(false)}
            buttonColour="#d4351c"
          >
            Deny Access
          </Button>
        </div>
      </GridCol>
    </GridRow>
  );
};
```

**MCP Server Implementation**
```typescript
// /backend/src/controllers/mcp/MCPController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { File } from '../models/File';
import { MCPSession } from '../models/OAuth';
import { SearchService } from '../services/SearchService';

interface MCPRequest extends Request {
  mcpToken?: {
    userId: string;
    clientId: string;
    scope: string[];
  };
}

export class MCPController {
  // Middleware to validate MCP access tokens
  static validateMCPToken = async (req: MCPRequest, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (decoded.type !== 'mcp_access') {
        throw new Error('Invalid token type');
      }

      // Update session activity
      await MCPSession.updateOne(
        { userId: decoded.sub, clientId: decoded.client_id },
        { lastActivity: new Date() }
      );

      req.mcpToken = {
        userId: decoded.sub,
        clientId: decoded.client_id,
        scope: decoded.scope
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  // Search user files
  async searchFiles(req: MCPRequest, res: Response) {
    const { query, type, limit = 20, offset = 0 } = req.query;
    const { userId, scope } = req.mcpToken!;

    // Check if search scope is granted
    if (!scope.includes('search') && !scope.includes('files:search')) {
      return res.status(403).json({ error: 'Insufficient permissions for search' });
    }

    try {
      const searchResults = await SearchService.searchFiles({
        userId,
        query: query as string,
        type: type as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      // Filter results based on scope
      const filteredResults = await this.filterResultsByScope(searchResults, scope);

      // Log search activity
      await this.logMCPActivity(userId, req.mcpToken!.clientId, 'file_search', {
        query,
        resultCount: filteredResults.length
      });

      res.json({
        results: filteredResults,
        total: searchResults.total,
        query: query
      });

    } catch (error) {
      console.error('MCP search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  // Get file metadata
  async getFile(req: MCPRequest, res: Response) {
    const { fileId } = req.params;
    const { userId, scope } = req.mcpToken!;

    // Check read permissions
    if (!scope.includes('read') && !scope.includes('files:read')) {
      return res.status(403).json({ error: 'Insufficient permissions to read files' });
    }

    try {
      const file = await File.findOne({ 
        _id: fileId, 
        userId,
        deletedAt: null 
      });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Log file access
      await this.logMCPActivity(userId, req.mcpToken!.clientId, 'file_access', {
        fileId,
        fileName: file.name
      });

      res.json({
        id: file._id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        metadata: file.metadata
      });

    } catch (error) {
      console.error('MCP file access error:', error);
      res.status(500).json({ error: 'File access failed' });
    }
  }

  // Download file content
  async downloadFile(req: MCPRequest, res: Response) {
    const { fileId } = req.params;
    const { userId, scope } = req.mcpToken!;

    // Check download permissions
    if (!scope.includes('files:read')) {
      return res.status(403).json({ error: 'Insufficient permissions to download files' });
    }

    try {
      const file = await File.findOne({ 
        _id: fileId, 
        userId,
        deletedAt: null 
      });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Get file from storage
      const fileStream = await this.getFileFromStorage(file.storageKey);
      
      // Log download activity
      await this.logMCPActivity(userId, req.mcpToken!.clientId, 'file_download', {
        fileId,
        fileName: file.name,
        size: file.size
      });

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.setHeader('Content-Length', file.size.toString());

      fileStream.pipe(res);

    } catch (error) {
      console.error('MCP download error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  }

  // List user's root directories/files
  async listFiles(req: MCPRequest, res: Response) {
    const { path = '/', limit = 50, offset = 0 } = req.query;
    const { userId, scope } = req.mcpToken!;

    // Check read permissions
    if (!scope.includes('read') && !scope.includes('files:read')) {
      return res.status(403).json({ error: 'Insufficient permissions to list files' });
    }

    try {
      const files = await File.find({
        userId,
        path: path as string,
        deletedAt: null
      })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string))
      .sort({ createdAt: -1 });

      const total = await File.countDocuments({
        userId,
        path: path as string,
        deletedAt: null
      });

      // Log listing activity
      await this.logMCPActivity(userId, req.mcpToken!.clientId, 'file_list', {
        path,
        fileCount: files.length
      });

      res.json({
        files: files.map(file => ({
          id: file._id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          isDirectory: file.mimeType === 'application/x-directory',
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
        })),
        total,
        path
      });

    } catch (error) {
      console.error('MCP list error:', error);
      res.status(500).json({ error: 'Listing failed' });
    }
  }

  // Get user profile information
  async getProfile(req: MCPRequest, res: Response) {
    const { userId, scope } = req.mcpToken!;

    // Check profile permissions
    if (!scope.includes('read') && !scope.includes('profile')) {
      return res.status(403).json({ error: 'Insufficient permissions to read profile' });
    }

    try {
      // Get basic user info (no sensitive data)
      const user = await User.findById(userId).select('email createdAt');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get storage statistics
      const stats = await this.getUserStorageStats(userId);

      // Log profile access
      await this.logMCPActivity(userId, req.mcpToken!.clientId, 'profile_access', {});

      res.json({
        id: userId,
        email: user.email,
        memberSince: user.createdAt,
        storage: stats
      });

    } catch (error) {
      console.error('MCP profile error:', error);
      res.status(500).json({ error: 'Profile access failed' });
    }
  }

  private async filterResultsByScope(results: any[], scope: string[]) {
    // Filter results based on granted permissions
    if (scope.includes('files:read')) {
      return results; // Full access
    }
    
    // Limited access - only metadata
    return results.map(result => ({
      id: result.id,
      name: result.name,
      type: result.type,
      size: result.size,
      path: result.path,
      createdAt: result.createdAt
    }));
  }

  private async getFileFromStorage(storageKey: string) {
    // Implementation depends on storage provider (S3, local, etc.)
    // This is a placeholder
    throw new Error('Storage implementation needed');
  }

  private async getUserStorageStats(userId: string) {
    const stats = await File.aggregate([
      { $match: { userId, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    return stats[0] || { totalFiles: 0, totalSize: 0 };
  }

  private async logMCPActivity(userId: string, clientId: string, action: string, metadata: any) {
    // Log MCP activity for audit purposes
    console.log(`MCP Activity: ${action}`, { 
      userId, 
      clientId, 
      metadata, 
      timestamp: new Date() 
    });
  }
}
```

**MCP Routes Configuration**
```typescript
// /backend/src/routes/mcp.ts
import express from 'express';
import { MCPController } from '../controllers/mcp/MCPController';
import { rateLimitMCP } from '../middleware/rateLimiting';

const router = express.Router();
const mcpController = new MCPController();

// Apply MCP token validation to all routes
router.use(MCPController.validateMCPToken);

// Apply rate limiting specific to MCP endpoints
router.use(rateLimitMCP);

// MCP API endpoints
router.get('/search', mcpController.searchFiles.bind(mcpController));
router.get('/files', mcpController.listFiles.bind(mcpController));
router.get('/files/:fileId', mcpController.getFile.bind(mcpController));
router.get('/files/:fileId/download', mcpController.downloadFile.bind(mcpController));
router.get('/profile', mcpController.getProfile.bind(mcpController));

export { router as mcpRoutes };
```

**Enhanced Search Service for MCP**
```typescript
// /backend/src/services/SearchService.ts
import { File } from '../models/File';

interface SearchOptions {
  userId: string;
  query: string;
  type?: string;
  limit: number;
  offset: number;
}

export class SearchService {
  static async searchFiles(options: SearchOptions) {
    const { userId, query, type, limit, offset } = options;

    // Build search pipeline
    const pipeline: any[] = [
      {
        $match: {
          userId,
          deletedAt: null,
          $text: { $search: query }
        }
      },
      {
        $addFields: {
          score: { $meta: 'textScore' }
        }
      },
      {
        $sort: { score: { $meta: 'textScore' } }
      }
    ];

    // Add type filter if specified
    if (type) {
      pipeline[0].$match.mimeType = new RegExp(type, 'i');
    }

    // Get total count
    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await File.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    // Add pagination
    pipeline.push(
      { $skip: offset },
      { $limit: limit }
    );

    // Execute search
    const results = await File.aggregate(pipeline);

    return {
      results: results.map(file => ({
        id: file._id,
        name: file.name,
        path: file.path,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        score: file.score,
        snippet: this.generateSnippet(file, query)
      })),
      total
    };
  }

  private static generateSnippet(file: any, query: string): string {
    // Generate search snippet highlighting the query terms
    // This is a simplified implementation
    const content = file.content || file.name;
    const queryWords = query.toLowerCase().split(' ');
    
    let snippet = content.substring(0, 200);
    queryWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      snippet = snippet.replace(regex, '<mark>$1</mark>');
    });
    
    return snippet;
  }
}
```

**AI Assistant Session Monitoring**
```typescript
// /backend/src/services/MCPMonitoringService.ts
import { MCPSession } from '../models/OAuth';
import { EventEmitter } from 'events';

interface MCPActivity {
  userId: string;
  clientId: string;
  action: string;
  metadata: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class MCPMonitoringService extends EventEmitter {
  private static instance: MCPMonitoringService;
  private activityBuffer: MCPActivity[] = [];
  private suspiciousActivities: Map<string, number> = new Map();

  static getInstance(): MCPMonitoringService {
    if (!this.instance) {
      this.instance = new MCPMonitoringService();
    }
    return this.instance;
  }

  // Log MCP activity with security analysis
  async logActivity(activity: MCPActivity) {
    this.activityBuffer.push(activity);
    
    // Analyze for suspicious patterns
    await this.analyzeSuspiciousActivity(activity);
    
    // Emit event for real-time monitoring
    this.emit('mcpActivity', activity);
    
    // Persist to database
    await this.persistActivity(activity);
    
    // Clean old buffer entries
    if (this.activityBuffer.length > 1000) {
      this.activityBuffer = this.activityBuffer.slice(-500);
    }
  }

  // Analyze for suspicious patterns
  private async analyzeSuspiciousActivity(activity: MCPActivity) {
    const key = `${activity.userId}-${activity.clientId}`;
    const now = Date.now();
    
    // Rate limiting analysis
    const recentActivities = this.activityBuffer.filter(a => 
      a.userId === activity.userId && 
      a.clientId === activity.clientId &&
      (now - a.timestamp.getTime()) < 60000 // Last minute
    );

    // Flag suspicious activity patterns
    if (recentActivities.length > 100) {
      await this.flagSuspiciousActivity(activity, 'high_frequency', {
        activityCount: recentActivities.length,
        timeWindow: '1 minute'
      });
    }

    // Detect unusual file access patterns
    if (activity.action === 'file_download') {
      const downloadCount = recentActivities.filter(a => a.action === 'file_download').length;
      if (downloadCount > 20) {
        await this.flagSuspiciousActivity(activity, 'bulk_download', {
          downloadCount
        });
      }
    }

    // Detect search enumeration attempts
    if (activity.action === 'file_search') {
      const searchCount = recentActivities.filter(a => a.action === 'file_search').length;
      if (searchCount > 50) {
        await this.flagSuspiciousActivity(activity, 'search_enumeration', {
          searchCount
        });
      }
    }
  }

  // Flag and handle suspicious activity
  private async flagSuspiciousActivity(
    activity: MCPActivity, 
    type: string, 
    details: any
  ) {
    const suspiciousEvent = {
      ...activity,
      suspiciousType: type,
      details,
      severity: this.calculateSeverity(type)
    };

    // Log to security monitoring system
    console.error('Suspicious MCP Activity Detected:', suspiciousEvent);

    // Update suspicious activity counter
    const key = `${activity.userId}-${activity.clientId}`;
    const count = this.suspiciousActivities.get(key) || 0;
    this.suspiciousActivities.set(key, count + 1);

    // Emit security alert
    this.emit('securityAlert', suspiciousEvent);

    // Auto-suspend session if threshold exceeded
    if (count >= 5) {
      await this.suspendMCPSession(activity.userId, activity.clientId, type);
    }
  }

  // Calculate severity score
  private calculateSeverity(type: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap = {
      'high_frequency': 'medium',
      'bulk_download': 'high',
      'search_enumeration': 'high',
      'unauthorized_access': 'critical'
    };
    return severityMap[type] || 'low';
  }

  // Suspend MCP session
  async suspendMCPSession(userId: string, clientId: string, reason: string) {
    await MCPSession.updateMany(
      { userId, clientId },
      { 
        isActive: false,
        suspendedAt: new Date(),
        suspensionReason: reason
      }
    );

    // Notify user of suspension
    this.emit('sessionSuspended', { userId, clientId, reason });
    
    console.warn(`MCP Session suspended: ${userId}-${clientId} (${reason})`);
  }

  // Get active sessions for monitoring dashboard
  async getActiveSessions() {
    const sessions = await MCPSession.find({ isActive: true })
      .populate('userId', 'email')
      .populate('clientId', 'name')
      .sort({ lastActivity: -1 });

    return sessions.map(session => ({
      id: session._id,
      user: session.userId,
      client: session.clientId,
      scope: session.scope,
      lastActivity: session.lastActivity,
      duration: Date.now() - session.createdAt.getTime(),
      activityCount: this.getSessionActivityCount(session.userId, session.clientId)
    }));
  }

  // Get session activity count
  private getSessionActivityCount(userId: string, clientId: string): number {
    return this.activityBuffer.filter(a => 
      a.userId === userId && a.clientId === clientId
    ).length;
  }

  // Get security metrics
  async getSecurityMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      activeSessions: await MCPSession.countDocuments({ isActive: true }),
      suspendedSessions: await MCPSession.countDocuments({ isActive: false }),
      hourlyActivity: this.activityBuffer.filter(a => a.timestamp >= oneHourAgo).length,
      dailyActivity: this.activityBuffer.filter(a => a.timestamp >= oneDayAgo).length,
      suspiciousActivities: this.suspiciousActivities.size,
      topClients: await this.getTopClientsByActivity(),
      recentAlerts: await this.getRecentSecurityAlerts()
    };
  }

  // Get top clients by activity
  private async getTopClientsByActivity() {
    const clientActivity = new Map<string, number>();
    
    this.activityBuffer.forEach(activity => {
      const count = clientActivity.get(activity.clientId) || 0;
      clientActivity.set(activity.clientId, count + 1);
    });

    return Array.from(clientActivity.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([clientId, count]) => ({ clientId, activityCount: count }));
  }

  // Get recent security alerts
  private async getRecentSecurityAlerts() {
    // This would typically come from a security alerts collection
    // For now, return recent suspicious activities
    return Array.from(this.suspiciousActivities.entries())
      .map(([key, count]) => {
        const [userId, clientId] = key.split('-');
        return { userId, clientId, alertCount: count };
      })
      .slice(0, 5);
  }

  // Persist activity to database
  private async persistActivity(activity: MCPActivity) {
    // Implementation would persist to a dedicated monitoring collection
    // This is a placeholder for the actual implementation
    console.log('Persisting MCP activity:', activity);
  }
}
```

**Session Monitoring Dashboard Component**
```tsx
// /frontend/src/components/admin/MCPMonitoringDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  GridRow,
  GridCol,
  Heading,
  Table,
  Tag,
  Card,
  SummaryList,
  Button
} from 'govuk-react';

interface MCPSession {
  id: string;
  user: { email: string };
  client: { name: string };
  scope: string[];
  lastActivity: string;
  duration: number;
  activityCount: number;
}

interface SecurityMetrics {
  activeSessions: number;
  suspendedSessions: number;
  hourlyActivity: number;
  dailyActivity: number;
  suspiciousActivities: number;
  topClients: Array<{ clientId: string; activityCount: number }>;
  recentAlerts: Array<{ userId: string; clientId: string; alertCount: number }>;
}

export const MCPMonitoringDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<MCPSession[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [sessionsResponse, metricsResponse] = await Promise.all([
        fetch('/api/admin/mcp/sessions'),
        fetch('/api/admin/mcp/metrics')
      ]);

      const sessionsData = await sessionsResponse.json();
      const metricsData = await metricsResponse.json();

      setSessions(sessionsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to fetch MCP monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const suspendSession = async (sessionId: string) => {
    try {
      await fetch(`/api/admin/mcp/sessions/${sessionId}/suspend`, {
        method: 'POST'
      });
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to suspend session:', error);
    }
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <div>Loading MCP monitoring dashboard...</div>;
  }

  return (
    <div>
      <Heading size="LARGE">MCP Session Monitoring</Heading>

      {/* Security Metrics Overview */}
      <GridRow>
        <GridCol setWidth="one-quarter">
          <Card>
            <Heading size="MEDIUM">{metrics?.activeSessions}</Heading>
            <p>Active Sessions</p>
          </Card>
        </GridCol>
        <GridCol setWidth="one-quarter">
          <Card>
            <Heading size="MEDIUM">{metrics?.hourlyActivity}</Heading>
            <p>Hourly Activity</p>
          </Card>
        </GridCol>
        <GridCol setWidth="one-quarter">
          <Card>
            <Heading size="MEDIUM">{metrics?.suspiciousActivities}</Heading>
            <p>Suspicious Activities</p>
          </Card>
        </GridCol>
        <GridCol setWidth="one-quarter">
          <Card>
            <Heading size="MEDIUM">{metrics?.suspendedSessions}</Heading>
            <p>Suspended Sessions</p>
          </Card>
        </GridCol>
      </GridRow>

      {/* Active Sessions Table */}
      <GridRow>
        <GridCol setWidth="full">
          <Heading size="MEDIUM">Active MCP Sessions</Heading>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.CellHeader>User</Table.CellHeader>
                <Table.CellHeader>AI Assistant</Table.CellHeader>
                <Table.CellHeader>Permissions</Table.CellHeader>
                <Table.CellHeader>Duration</Table.CellHeader>
                <Table.CellHeader>Activity</Table.CellHeader>
                <Table.CellHeader>Actions</Table.CellHeader>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {sessions.map(session => (
                <Table.Row key={session.id}>
                  <Table.Cell>{session.user.email}</Table.Cell>
                  <Table.Cell>{session.client.name}</Table.Cell>
                  <Table.Cell>
                    {session.scope.map(scope => (
                      <Tag key={scope} tint="blue">{scope}</Tag>
                    ))}
                  </Table.Cell>
                  <Table.Cell>{formatDuration(session.duration)}</Table.Cell>
                  <Table.Cell>{session.activityCount} actions</Table.Cell>
                  <Table.Cell>
                    <Button 
                      onClick={() => suspendSession(session.id)}
                      buttonColour="#d4351c"
                      size="small"
                    >
                      Suspend
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </GridCol>
      </GridRow>

      {/* Recent Security Alerts */}
      {metrics?.recentAlerts && metrics.recentAlerts.length > 0 && (
        <GridRow>
          <GridCol setWidth="half">
            <Heading size="MEDIUM">Recent Security Alerts</Heading>
            <SummaryList>
              {metrics.recentAlerts.map((alert, index) => (
                <SummaryList.Row key={index}>
                  <SummaryList.Key>User {alert.userId}</SummaryList.Key>
                  <SummaryList.Value>
                    <Tag tint="red">{alert.alertCount} alerts</Tag>
                  </SummaryList.Value>
                </SummaryList.Row>
              ))}
            </SummaryList>
          </GridCol>
          <GridCol setWidth="half">
            <Heading size="MEDIUM">Top Active Clients</Heading>
            <SummaryList>
              {metrics.topClients.map((client, index) => (
                <SummaryList.Row key={index}>
                  <SummaryList.Key>{client.clientId}</SummaryList.Key>
                  <SummaryList.Value>{client.activityCount} actions</SummaryList.Value>
                </SummaryList.Row>
              ))}
            </SummaryList>
          </GridCol>
        </GridRow>
      )}
    </div>
  );
};
```

### 3.2 Advanced Security Features

**Threat Detection and File Scanning**
```typescript
// /backend/src/services/SecurityScanningService.ts
import crypto from 'crypto';
import { File } from '../models/File';

interface ScanResult {
  fileId: string;
  isSafe: boolean;
  threats: string[];
  scanDate: Date;
  scanEngine: string;
}

export class SecurityScanningService {
  // Scan uploaded file for security threats
  static async scanFile(fileId: string, fileBuffer: Buffer): Promise<ScanResult> {
    const file = await File.findById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const threats: string[] = [];

    // 1. Malware signature detection
    const malwareThreats = await this.detectMalware(fileBuffer);
    threats.push(...malwareThreats);

    // 2. File type validation
    const typeThreats = await this.validateFileType(file, fileBuffer);
    threats.push(...typeThreats);

    // 3. Content analysis for sensitive data
    const dataThreats = await this.detectSensitiveData(fileBuffer);
    threats.push(...dataThreats);

    // 4. File size and structure validation
    const structureThreats = await this.validateFileStructure(file, fileBuffer);
    threats.push(...structureThreats);

    const scanResult: ScanResult = {
      fileId,
      isSafe: threats.length === 0,
      threats,
      scanDate: new Date(),
      scanEngine: 'BitAtlas Security Scanner v1.0'
    };

    // Store scan result
    await this.storeScanResult(scanResult);

    return scanResult;
  }

  // Detect malware signatures
  private static async detectMalware(fileBuffer: Buffer): Promise<string[]> {
    const threats: string[] = [];
    
    // Simple malware signature detection
    const malwareSignatures = [
      { name: 'EICAR Test String', pattern: /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/ },
      { name: 'Suspicious PowerShell', pattern: /powershell.*-encodedcommand/i },
      { name: 'SQL Injection Pattern', pattern: /(union|select|insert|delete|update).*from/i }
    ];

    const fileContent = fileBuffer.toString('utf8');
    
    for (const signature of malwareSignatures) {
      if (signature.pattern.test(fileContent)) {
        threats.push(`Malware detected: ${signature.name}`);
      }
    }

    return threats;
  }

  // Validate file type matches content
  private static async validateFileType(file: any, fileBuffer: Buffer): Promise<string[]> {
    const threats: string[] = [];
    
    // Check file magic numbers
    const magicNumbers = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'application/zip': [0x50, 0x4B, 0x03, 0x04]
    };

    if (file.mimeType && magicNumbers[file.mimeType]) {
      const expectedMagic = magicNumbers[file.mimeType];
      const actualMagic = Array.from(fileBuffer.slice(0, expectedMagic.length));
      
      if (!this.arraysEqual(expectedMagic, actualMagic)) {
        threats.push(`File type mismatch: ${file.mimeType} header doesn't match content`);
      }
    }

    return threats;
  }

  // Detect sensitive data patterns
  private static async detectSensitiveData(fileBuffer: Buffer): Promise<string[]> {
    const threats: string[] = [];
    const fileContent = fileBuffer.toString('utf8');

    // Patterns for sensitive data
    const sensitivePatterns = [
      { name: 'Credit Card Number', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/ },
      { name: 'Social Security Number', pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
      { name: 'API Key Pattern', pattern: /(?:api[_-]?key|access[_-]?token)["\s:=]+[a-zA-Z0-9]{20,}/i },
      { name: 'Private Key', pattern: /-----BEGIN.*PRIVATE KEY-----/ }
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.pattern.test(fileContent)) {
        threats.push(`Sensitive data detected: ${pattern.name}`);
      }
    }

    return threats;
  }

  // Validate file structure
  private static async validateFileStructure(file: any, fileBuffer: Buffer): Promise<string[]> {
    const threats: string[] = [];

    // Check for ZIP bombs (nested compression)
    if (file.mimeType?.includes('zip') || file.mimeType?.includes('compressed')) {
      const compressionRatio = fileBuffer.length / file.size;
      if (compressionRatio > 0.001) { // Highly compressed
        threats.push('Potential ZIP bomb detected (high compression ratio)');
      }
    }

    // Check for suspicious file size
    if (file.size > 500 * 1024 * 1024) { // 500MB
      threats.push('File size exceeds security limit (500MB)');
    }

    return threats;
  }

  // Helper function to compare arrays
  private static arraysEqual(a: number[], b: number[]): boolean {
    return Array.isArray(a) && Array.isArray(b) && 
           a.length === b.length && 
           a.every((val, index) => val === b[index]);
  }

  // Store scan result in database
  private static async storeScanResult(scanResult: ScanResult): Promise<void> {
    // Implementation would store in a security scans collection
    console.log('Security scan result:', scanResult);
  }
}
```

### 3.3 Performance & Scalability

**Caching Layer Implementation**
```typescript
// /backend/src/services/CacheService.ts
import Redis from 'ioredis';
import { performance } from 'perf_hooks';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

export class CacheService {
  private static instance: CacheService;
  private redis: Redis;
  private localCache: Map<string, { data: any; expiry: number }> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Clean local cache every 5 minutes
    setInterval(() => this.cleanLocalCache(), 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  // Multi-level caching: Local memory -> Redis -> Database
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(key, options.prefix);
    const startTime = performance.now();

    try {
      // Level 1: Local memory cache (fastest)
      const localResult = this.getFromLocalCache<T>(fullKey);
      if (localResult !== null) {
        this.logCacheHit('local', key, performance.now() - startTime);
        return localResult;
      }

      // Level 2: Redis cache
      const redisResult = await this.getFromRedis<T>(fullKey);
      if (redisResult !== null) {
        // Store in local cache for faster future access
        this.setInLocalCache(fullKey, redisResult, 60); // 1 minute local cache
        this.logCacheHit('redis', key, performance.now() - startTime);
        return redisResult;
      }

      this.logCacheMiss(key, performance.now() - startTime);
      return null;

    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.prefix);
    const ttl = options.ttl || 3600; // Default 1 hour

    try {
      // Set in both caches
      await this.setInRedis(fullKey, value, ttl);
      this.setInLocalCache(fullKey, value, Math.min(ttl, 300)); // Max 5 minutes local

    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string, options: CacheOptions = {}): Promise<void> {
    const fullPattern = this.buildKey(pattern, options.prefix);
    
    try {
      // Clear from local cache
      for (const key of this.localCache.keys()) {
        if (key.includes(pattern)) {
          this.localCache.delete(key);
        }
      }

      // Clear from Redis
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Cached database query wrapper
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const result = await queryFn();
    await this.set(key, result, options);
    return result;
  }

  private getFromLocalCache<T>(key: string): T | null {
    const cached = this.localCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.localCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setInLocalCache<T>(key: string, value: T, ttlSeconds: number): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.localCache.set(key, { data: value, expiry });
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch {
      return cached as any;
    }
  }

  private async setInRedis<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.setex(key, ttlSeconds, serialized);
  }

  private buildKey(key: string, prefix?: string): string {
    const basePrefix = process.env.CACHE_PREFIX || 'bitatlas';
    return prefix ? `${basePrefix}:${prefix}:${key}` : `${basePrefix}:${key}`;
  }

  private cleanLocalCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.localCache.entries()) {
      if (now > cached.expiry) {
        this.localCache.delete(key);
      }
    }
  }

  private logCacheHit(source: string, key: string, duration: number): void {
    console.log(`Cache HIT [${source}]: ${key} (${duration.toFixed(2)}ms)`);
  }

  private logCacheMiss(key: string, duration: number): void {
    console.log(`Cache MISS: ${key} (${duration.toFixed(2)}ms)`);
  }
}
```

**Database Query Optimization**
```typescript
// /backend/src/services/OptimizedFileService.ts
import { File } from '../models/File';
import { CacheService } from './CacheService';
import { performance } from 'perf_hooks';

export class OptimizedFileService {
  private cache = CacheService.getInstance();

  // Optimized file listing with pagination and caching
  async listFiles(userId: string, options: {
    path?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      path = '/',
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const cacheKey = `files:list:${userId}:${path}:${limit}:${offset}:${sortBy}:${sortOrder}`;
    
    return this.cache.cachedQuery(
      cacheKey,
      async () => {
        const startTime = performance.now();

        // Optimized aggregation pipeline
        const pipeline = [
          {
            $match: {
              userId,
              path,
              deletedAt: null
            }
          },
          {
            $addFields: {
              isDirectory: { $eq: ['$mimeType', 'application/x-directory'] }
            }
          },
          {
            $sort: { 
              isDirectory: -1, // Directories first
              [sortBy]: sortOrder === 'desc' ? -1 : 1 
            }
          },
          {
            $facet: {
              files: [
                { $skip: offset },
                { $limit: limit },
                {
                  $project: {
                    name: 1,
                    size: 1,
                    mimeType: 1,
                    isDirectory: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    metadata: 1
                  }
                }
              ],
              totalCount: [{ $count: 'count' }]
            }
          }
        ];

        const result = await File.aggregate(pipeline);
        const files = result[0]?.files || [];
        const total = result[0]?.totalCount[0]?.count || 0;

        const duration = performance.now() - startTime;
        console.log(`File listing query: ${duration.toFixed(2)}ms`);

        return { files, total, pagination: { limit, offset, total } };
      },
      { ttl: 300 } // 5 minutes cache
    );
  }

  // Optimized search with full-text indexing
  async searchFiles(userId: string, query: string, options: {
    type?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { type, limit = 20, offset = 0 } = options;
    const cacheKey = `search:${userId}:${query}:${type}:${limit}:${offset}`;

    return this.cache.cachedQuery(
      cacheKey,
      async () => {
        const startTime = performance.now();

        const pipeline: any[] = [
          {
            $match: {
              userId,
              deletedAt: null,
              $text: { $search: query }
            }
          },
          {
            $addFields: {
              score: { $meta: 'textScore' },
              relevance: {
                $add: [
                  { $meta: 'textScore' },
                  {
                    $cond: [
                      { $regexMatch: { input: '$name', regex: query, options: 'i' } },
                      5, // Boost name matches
                      0
                    ]
                  }
                ]
              }
            }
          }
        ];

        // Add type filter
        if (type) {
          pipeline[0].$match.mimeType = new RegExp(type, 'i');
        }

        // Sort by relevance and add pagination
        pipeline.push(
          { $sort: { relevance: -1 } },
          {
            $facet: {
              results: [
                { $skip: offset },
                { $limit: limit },
                {
                  $project: {
                    name: 1,
                    path: 1,
                    size: 1,
                    mimeType: 1,
                    createdAt: 1,
                    score: 1,
                    relevance: 1
                  }
                }
              ],
              totalCount: [{ $count: 'count' }]
            }
          }
        );

        const result = await File.aggregate(pipeline);
        const results = result[0]?.results || [];
        const total = result[0]?.totalCount[0]?.count || 0;

        const duration = performance.now() - startTime;
        console.log(`Search query: ${duration.toFixed(2)}ms`);

        return { results, total, query };
      },
      { ttl: 180 } // 3 minutes cache for search results
    );
  }

  // Bulk operations with optimized queries
  async bulkUpdateMetadata(fileIds: string[], metadata: any): Promise<void> {
    const startTime = performance.now();

    await File.updateMany(
      { _id: { $in: fileIds } },
      { 
        $set: { 
          metadata: { $mergeObjects: ['$metadata', metadata] },
          updatedAt: new Date()
        }
      }
    );

    // Invalidate related caches
    await this.invalidateUserCaches(fileIds);

    const duration = performance.now() - startTime;
    console.log(`Bulk metadata update: ${duration.toFixed(2)}ms`);
  }

  private async invalidateUserCaches(fileIds: string[]): Promise<void> {
    // Get unique user IDs from files
    const files = await File.find({ _id: { $in: fileIds } }).select('userId path');
    const userIds = [...new Set(files.map(f => f.userId))];

    // Invalidate caches for each user
    for (const userId of userIds) {
      await this.cache.invalidate(`files:list:${userId}:*`);
      await this.cache.invalidate(`search:${userId}:*`);
    }
  }
}
```

**Rate Limiting and Performance Monitoring**
```typescript
// /backend/src/middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// General API rate limiting
export const apiRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// MCP-specific rate limiting (more restrictive)
export const rateLimitMCP = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:mcp:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per MCP client
  message: {
    error: 'MCP rate limit exceeded',
    retryAfter: '1 minute'
  },
  keyGenerator: (req) => {
    // Rate limit per MCP client + user combination
    return `${req.mcpToken?.clientId}-${req.mcpToken?.userId}`;
  }
});

// File upload rate limiting
export const uploadRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:upload:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    error: 'Upload rate limit exceeded',
    retryAfter: '1 minute'
  }
});

// Performance monitoring middleware
export const performanceMonitor = (req: any, res: any, next: any) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request detected:', logData);
    }
    
    // Send metrics to monitoring system
    if (process.env.NODE_ENV === 'production') {
      // sendMetricsToMonitoring(logData);
    }
  });
  
  next();
};
```

### 3.4 Production Deployment

**Kubernetes Infrastructure on Hetzner Cloud**
```yaml
# /k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bitatlas
---
# /k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bitatlas-config
  namespace: bitatlas
data:
  NODE_ENV: "production"
  API_BASE_URL: "https://api.bitatlas.com"
  FRONTEND_URL: "https://bitatlas.com"
  REDIS_HOST: "bitatlas-redis-service"
  REDIS_PORT: "6379"
  MONGODB_HOST: "bitatlas-mongo-service"
  MONGODB_PORT: "27017"
  CACHE_PREFIX: "bitatlas"
---
# /k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitatlas-secrets
  namespace: bitatlas
type: Opaque
data:
  # Base64 encoded secrets
  JWT_SECRET: <base64-encoded-jwt-secret>
  DATABASE_URL: <base64-encoded-mongodb-url>
  REDIS_PASSWORD: <base64-encoded-redis-password>
  S3_ACCESS_KEY: <base64-encoded-s3-key>
  S3_SECRET_KEY: <base64-encoded-s3-secret>
```

**Backend Deployment**
```yaml
# /k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bitatlas-backend
  namespace: bitatlas
  labels:
    app: bitatlas-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: bitatlas-backend
  template:
    metadata:
      labels:
        app: bitatlas-backend
    spec:
      containers:
      - name: backend
        image: bitatlas/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        envFrom:
        - configMapRef:
            name: bitatlas-config
        - secretRef:
            name: bitatlas-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: file-storage
          mountPath: /app/uploads
      volumes:
      - name: file-storage
        persistentVolumeClaim:
          claimName: bitatlas-file-storage
---
apiVersion: v1
kind: Service
metadata:
  name: bitatlas-backend-service
  namespace: bitatlas
spec:
  selector:
    app: bitatlas-backend
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: bitatlas-file-storage
  namespace: bitatlas
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: hcloud-volumes
```

**Frontend Deployment**
```yaml
# /k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bitatlas-frontend
  namespace: bitatlas
  labels:
    app: bitatlas-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bitatlas-frontend
  template:
    metadata:
      labels:
        app: bitatlas-frontend
    spec:
      containers:
      - name: frontend
        image: bitatlas/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: bitatlas-frontend-service
  namespace: bitatlas
spec:
  selector:
    app: bitatlas-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

**Redis and MongoDB Services**
```yaml
# /k8s/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bitatlas-redis
  namespace: bitatlas
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bitatlas-redis
  template:
    metadata:
      labels:
        app: bitatlas-redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-storage
---
apiVersion: v1
kind: Service
metadata:
  name: bitatlas-redis-service
  namespace: bitatlas
spec:
  selector:
    app: bitatlas-redis
  ports:
  - port: 6379
    targetPort: 6379
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-storage
  namespace: bitatlas
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: hcloud-volumes
```

**Ingress and SSL Configuration**
```yaml
# /k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bitatlas-ingress
  namespace: bitatlas
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "500m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - bitatlas.com
    - api.bitatlas.com
    secretName: bitatlas-tls
  rules:
  - host: bitatlas.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bitatlas-frontend-service
            port:
              number: 80
  - host: api.bitatlas.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bitatlas-backend-service
            port:
              number: 80
```

**CI/CD Pipeline**
```yaml
# /.github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd backend && npm ci
        cd ../frontend && npm ci
    
    - name: Run backend tests
      run: cd backend && npm run test:ci
    
    - name: Run frontend tests
      run: cd frontend && npm run test:ci
    
    - name: Run security audit
      run: |
        cd backend && npm audit --audit-level high
        cd ../frontend && npm audit --audit-level high
    
    - name: Run TypeScript checks
      run: |
        cd backend && npm run type-check
        cd ../frontend && npm run type-check
    
    - name: Run lint
      run: |
        cd backend && npm run lint
        cd ../frontend && npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ secrets.DOCKER_REGISTRY }}
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push backend image
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: |
          ${{ secrets.DOCKER_REGISTRY }}/bitatlas/backend:latest
          ${{ secrets.DOCKER_REGISTRY }}/bitatlas/backend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Build and push frontend image
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        push: true
        tags: |
          ${{ secrets.DOCKER_REGISTRY }}/bitatlas/frontend:latest
          ${{ secrets.DOCKER_REGISTRY }}/bitatlas/frontend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/namespace.yaml
          k8s/configmap.yaml
          k8s/secrets.yaml
          k8s/backend-deployment.yaml
          k8s/frontend-deployment.yaml
          k8s/redis-deployment.yaml
          k8s/ingress.yaml
        images: |
          bitatlas/backend:${{ github.sha }}
          bitatlas/frontend:${{ github.sha }}
        kubeconfig: ${{ secrets.KUBE_CONFIG }}
```

**Monitoring with Prometheus and Grafana**
```yaml
# /k8s/monitoring/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: bitatlas
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "/etc/prometheus/alerts.yml"
    
    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093
    
    scrape_configs:
      - job_name: 'bitatlas-backend'
        static_configs:
          - targets: ['bitatlas-backend-service:80']
        metrics_path: /metrics
        scrape_interval: 30s
      
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
  
  alerts.yml: |
    groups:
    - name: bitatlas-alerts
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for {{ $labels.instance }}"
      
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
      
      - alert: MCPSessionSuspended
        expr: increase(mcp_sessions_suspended_total[5m]) > 0
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "MCP session suspended due to suspicious activity"
          description: "{{ $value }} MCP sessions suspended in the last 5 minutes"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: bitatlas
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: data
          mountPath: /prometheus
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus'
          - '--web.console.libraries=/etc/prometheus/console_libraries'
          - '--web.console.templates=/etc/prometheus/consoles'
          - '--storage.tsdb.retention.time=15d'
          - '--web.enable-lifecycle'
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: data
        persistentVolumeClaim:
          claimName: prometheus-storage
```

**Backup and Disaster Recovery**
```bash
#!/bin/bash
# /scripts/backup.sh

# BitAtlas Backup Script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
S3_BUCKET="bitatlas-backups"

echo "Starting backup at $(date)"

# 1. Database backup
echo "Backing up MongoDB..."
mongodump --host=$MONGODB_HOST --port=$MONGODB_PORT \
  --out="$BACKUP_DIR/mongodb_$DATE" \
  --gzip

# 2. Redis backup
echo "Backing up Redis..."
redis-cli --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# 3. File storage backup (if using local storage)
echo "Backing up file storage..."
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /app/uploads/

# 4. Configuration backup
echo "Backing up Kubernetes configs..."
kubectl get all -n bitatlas -o yaml > "$BACKUP_DIR/k8s_config_$DATE.yaml"

# 5. Upload to S3
echo "Uploading to S3..."
aws s3 sync "$BACKUP_DIR/" "s3://$S3_BUCKET/$(date +%Y/%m/%d)/" \
  --exclude "*" --include "*$DATE*"

# 6. Cleanup old local backups (keep last 7 days)
find "$BACKUP_DIR" -name "*" -type f -mtime +7 -delete

# 7. Test backup integrity
echo "Testing backup integrity..."
mongorestore --host=localhost --port=27017 \
  --dir="$BACKUP_DIR/mongodb_$DATE" \
  --dryRun

echo "Backup completed at $(date)"
```

**Production Health Checks**
```typescript
// /backend/src/routes/health.ts
import express from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL);

// Basic health check
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check Redis connection
    const redisStatus = await redis.ping() === 'PONG' ? 'connected' : 'disconnected';
    
    // Check disk space
    const diskUsage = await checkDiskUsage();
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        diskUsage: diskUsage,
        memoryUsage: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        }
      }
    };
    
    // Determine overall health status
    if (dbStatus === 'disconnected' || redisStatus === 'disconnected') {
      health.status = 'unhealthy';
      return res.status(503).json(health);
    }
    
    if (diskUsage.usagePercent > 90 || memoryUsage.heapUsed > 1024 * 1024 * 1024) {
      health.status = 'degraded';
      return res.status(200).json(health);
    }
    
    res.json(health);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    // More thorough checks for readiness
    await mongoose.connection.db.admin().ping();
    await redis.ping();
    
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

async function checkDiskUsage() {
  const fs = require('fs').promises;
  const stats = await fs.statfs('/');
  
  return {
    total: `${Math.round(stats.bavail * stats.bsize / 1024 / 1024 / 1024)}GB`,
    used: `${Math.round((stats.blocks - stats.bavail) * stats.bsize / 1024 / 1024 / 1024)}GB`,
    usagePercent: Math.round(((stats.blocks - stats.bavail) / stats.blocks) * 100)
  };
}

export { router as healthRoutes };
```

---

## Testing Strategy

### Test Structure
```bash
# Test organization
tests/
├── unit/
│   ├── services/
│   ├── controllers/
│   └── mcp-modules/
├── integration/
│   ├── api/
│   ├── oauth/
│   └── mcp/
├── e2e/
│   ├── web-interface/
│   └── mcp-integration/
└── performance/
    ├── load-testing/
    └── security/
```

### Key Test Cases
```typescript
// Critical test scenarios
describe('MCP Integration', () => {
  test('OAuth flow completes successfully', async () => {
    // Test complete OAuth authorization flow
  });

  test('AI assistant can search user files', async () => {
    // Test MCP search functionality
  });

  test('File permissions are enforced', async () => {
    // Test scope-based access control
  });
});

describe('GDPR Compliance', () => {
  test('User data export is complete', async () => {
    // Verify all user data is included in export
  });

  test('Data deletion removes all traces', async () => {
    // Verify complete data deletion
  });
});
```

---

This implementation plan provides a complete roadmap for building BitAtlas with both web and MCP experiences while maintaining European data sovereignty and GDPR compliance.