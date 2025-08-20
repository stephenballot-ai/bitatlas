import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
          error: 'Authentication required',
          code: 'ERR_UNAUTHORIZED'
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      const payload = await this.authService.validateJWT(token);
      req.user = payload;
      
      next();
    } catch (error) {
      res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'ERR_UNAUTHORIZED'
      });
    }
  };

  requireScopes = (requiredScopes: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Authentication required',
          code: 'ERR_UNAUTHORIZED'
        });
        return;
      }

      const userScopes = req.user.scopes || [];
      const hasRequiredScopes = requiredScopes.every(scope => userScopes.includes(scope));

      if (!hasRequiredScopes) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'ERR_INSUFFICIENT_PERMISSIONS',
          required: requiredScopes,
          provided: userScopes
        });
        return;
      }

      next();
    };
  };

  optional = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = await this.authService.validateJWT(token);
        req.user = payload;
      }
      
      next();
    } catch (error) {
      // For optional auth, continue even if token is invalid
      next();
    }
  };
}

export const authMiddleware = new AuthMiddleware();