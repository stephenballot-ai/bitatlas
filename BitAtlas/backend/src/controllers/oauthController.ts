import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';

interface OAuthClient {
  client_id: string;
  name: string;
  description: string;
  redirect_uris: string[];
  allowed_scopes: string[];
}

// Pre-defined OAuth clients (AI assistants)
const OAUTH_CLIENTS: Record<string, OAuthClient> = {
  'claude-ai-assistant': {
    client_id: 'claude-ai-assistant',
    name: 'Claude AI Assistant',
    description: 'Anthropic\'s AI assistant with file access capabilities',
    redirect_uris: [
      'http://localhost:3002/dashboard',
      'https://claude.ai/callback',
      'http://localhost:3001/oauth/callback'
    ],
    allowed_scopes: ['files:read', 'files:write', 'search', 'profile']
  },
  'openai-gpt': {
    client_id: 'openai-gpt',
    name: 'OpenAI GPT',
    description: 'OpenAI\'s GPT with custom actions',
    redirect_uris: ['https://api.openai.com/callback'],
    allowed_scopes: ['files:read', 'search']
  }
};

export class OAuthController {
  
  async authorize(req: Request, res: Response): Promise<void> {
    try {
      const { client_id, redirect_uri, scope, state, response_type } = req.query;

      // Validate required parameters
      if (!client_id || !redirect_uri || !response_type) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters'
        });
        return;
      }

      // Validate client
      const client = OAUTH_CLIENTS[client_id as string];
      if (!client) {
        res.status(400).json({
          error: 'invalid_client',
          error_description: 'Unknown client_id'
        });
        return;
      }

      // Validate redirect URI
      if (!client.redirect_uris.includes(redirect_uri as string)) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid redirect_uri'
        });
        return;
      }

      // Validate response type
      if (response_type !== 'code') {
        res.status(400).json({
          error: 'unsupported_response_type',
          error_description: 'Only authorization code flow is supported'
        });
        return;
      }

      // Parse and validate scopes
      const requestedScopes = scope ? (scope as string).split(' ') : [];
      const validScopes = requestedScopes.filter(s => client.allowed_scopes.includes(s));
      
      if (validScopes.length === 0) {
        validScopes.push('files:read'); // Default scope
      }

      // Render authorization page
      const authPageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize ${client.name} - BitAtlas</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 500px; 
            margin: 100px auto; 
            padding: 20px; 
            background-color: #f5f5f5;
        }
        .auth-card { 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }
        .client-name { 
            color: #1d70b8; 
            font-size: 24px; 
            margin-bottom: 10px; 
        }
        .permissions { 
            text-align: left; 
            margin: 20px 0; 
            padding: 15px; 
            background-color: #f8f9fa; 
            border-radius: 4px;
        }
        .permissions h4 { 
            margin-top: 0; 
            color: #333;
        }
        .permissions ul { 
            margin: 10px 0; 
            padding-left: 20px;
        }
        .permissions li { 
            margin: 5px 0; 
            color: #666;
        }
        .actions { 
            margin-top: 25px; 
        }
        .btn { 
            padding: 12px 25px; 
            margin: 5px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
        }
        .btn-approve { 
            background-color: #00703c; 
            color: white; 
        }
        .btn-deny { 
            background-color: #d4351c; 
            color: white; 
        }
        .security-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            text-align: left;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="auth-card">
        <h1 class="client-name">${client.name}</h1>
        <p>${client.description}</p>
        
        <div class="security-notice">
            <strong>🔒 Security Notice:</strong> This application is requesting access to your BitAtlas files. 
            Only approve if you trust this application and understand what data will be shared.
        </div>
        
        <div class="permissions">
            <h4>Requested Permissions:</h4>
            <ul>
                ${validScopes.map(scope => {
                  const descriptions: Record<string, string> = {
                    'files:read': 'Read your files and folders',
                    'files:write': 'Create and modify files',
                    'files:delete': 'Delete files',
                    'search': 'Search through your files',
                    'profile': 'Access basic profile information'
                  };
                  return `<li>${descriptions[scope] || scope}</li>`;
                }).join('')}
            </ul>
        </div>
        
        <form class="actions" method="POST" action="/oauth/authorize">
            <input type="hidden" name="client_id" value="${client_id}">
            <input type="hidden" name="redirect_uri" value="${redirect_uri}">
            <input type="hidden" name="scope" value="${validScopes.join(' ')}">
            <input type="hidden" name="state" value="${state || ''}">
            <input type="hidden" name="response_type" value="${response_type}">
            
            <button type="submit" name="action" value="approve" class="btn btn-approve">
                ✓ Authorize Access
            </button>
            <button type="submit" name="action" value="deny" class="btn btn-deny">
                ✗ Deny Access
            </button>
        </form>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
            You can revoke this access at any time from your BitAtlas dashboard.
        </p>
    </div>
</body>
</html>`;

      res.send(authPageHtml);
    } catch (error) {
      res.status(500).json({
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async handleAuthorization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { client_id, redirect_uri, scope, state, response_type, action } = req.body;

      if (action === 'deny') {
        const errorUrl = new URL(redirect_uri);
        errorUrl.searchParams.set('error', 'access_denied');
        errorUrl.searchParams.set('error_description', 'User denied authorization');
        if (state) errorUrl.searchParams.set('state', state);
        
        res.redirect(errorUrl.toString());
        return;
      }

      // Validate client again
      const client = OAUTH_CLIENTS[client_id];
      if (!client) {
        res.status(400).json({
          error: 'invalid_client'
        });
        return;
      }

      // Generate authorization code
      const authCode = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store authorization code
      await db.query(`
        INSERT INTO oauth_codes (code, user_id, client_id, redirect_uri, scope, expires_at, state)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [authCode, req.user.userId, client_id, redirect_uri, scope, expiresAt, state || null]);

      // Redirect back with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(500).json({
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async token(req: Request, res: Response): Promise<void> {
    try {
      const { grant_type, code, redirect_uri, client_id } = req.body;

      if (grant_type !== 'authorization_code') {
        res.status(400).json({
          error: 'unsupported_grant_type'
        });
        return;
      }

      // Validate and consume authorization code
      const codeResult = await db.query(`
        SELECT * FROM oauth_codes 
        WHERE code = $1 AND client_id = $2 AND redirect_uri = $3 
        AND expires_at > NOW() AND used_at IS NULL
      `, [code, client_id, redirect_uri]);

      if (codeResult.rows.length === 0) {
        res.status(400).json({
          error: 'invalid_grant'
        });
        return;
      }

      const authCode = codeResult.rows[0];

      // Mark code as used
      await db.query(`
        UPDATE oauth_codes SET used_at = NOW() WHERE code = $1
      `, [code]);

      // Generate access token
      const accessToken = jwt.sign(
        {
          userId: authCode.user_id,
          clientId: client_id,
          scopes: authCode.scope.split(' ')
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' } // Long-lived for AI assistants
      );

      // Store OAuth token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await db.query(`
        INSERT INTO oauth_tokens (user_id, client_id, access_token, scopes, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [authCode.user_id, client_id, accessToken, authCode.scope.split(' '), expiresAt]);

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
        scope: authCode.scope
      });
    } catch (error) {
      res.status(500).json({
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async listTokens(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT 
          client_id,
          access_token,
          array_to_string(scopes, ' ') as scope,
          created_at,
          expires_at,
          expires_at < NOW() as is_expired
        FROM oauth_tokens 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [req.user.userId]);

      res.json({
        tokens: result.rows
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch tokens',
        code: 'ERR_TOKEN_FETCH_FAILED'
      });
    }
  }

  async revokeToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const result = await db.query(`
        DELETE FROM oauth_tokens 
        WHERE access_token = $1 AND user_id = $2
        RETURNING access_token
      `, [token, req.user.userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'Token not found',
          code: 'ERR_TOKEN_NOT_FOUND'
        });
        return;
      }

      res.json({
        message: 'Token revoked successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to revoke token',
        code: 'ERR_TOKEN_REVOKE_FAILED'
      });
    }
  }
}