import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { errorHandler } from '../middleware/errorHandler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: 'Email and password are required',
          code: 'ERR_MISSING_FIELDS'
        });
        return;
      }

      const user = await this.authService.createUser({ email, password });
      
      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: error.message,
            code: 'ERR_USER_EXISTS'
          });
        } else if (error.message.includes('Password must')) {
          res.status(400).json({
            error: error.message,
            code: 'ERR_WEAK_PASSWORD'
          });
        } else {
          res.status(500).json({
            error: 'Registration failed',
            code: 'ERR_REGISTRATION_FAILED'
          });
        }
      }
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: 'Email and password are required',
          code: 'ERR_MISSING_FIELDS'
        });
        return;
      }

      const tokens = await this.authService.authenticateUser({ email, password });
      
      res.json({
        message: 'Login successful',
        ...tokens
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid credentials')) {
          res.status(401).json({
            error: 'Invalid email or password',
            code: 'ERR_INVALID_CREDENTIALS'
          });
        } else if (error.message.includes('locked')) {
          res.status(423).json({
            error: error.message,
            code: 'ERR_ACCOUNT_LOCKED'
          });
        } else {
          res.status(500).json({
            error: 'Login failed',
            code: 'ERR_LOGIN_FAILED'
          });
        }
      }
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Refresh token is required',
          code: 'ERR_MISSING_REFRESH_TOKEN'
        });
        return;
      }

      const tokens = await this.authService.refreshTokens(refreshToken);
      
      res.json({
        message: 'Tokens refreshed successfully',
        ...tokens
      });
    } catch (error) {
      res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'ERR_INVALID_REFRESH_TOKEN'
      });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Refresh token is required',
          code: 'ERR_MISSING_REFRESH_TOKEN'
        });
        return;
      }

      await this.authService.revokeToken(refreshToken);
      
      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Logout failed',
        code: 'ERR_LOGOUT_FAILED'
      });
    }
  };

  profile = async (req: any, res: Response): Promise<void> => {
    try {
      const user = req.user; // Set by auth middleware
      
      res.json({
        user: {
          id: user.userId,
          email: user.email,
          scopes: user.scopes
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get profile',
        code: 'ERR_PROFILE_FAILED'
      });
    }
  };
}