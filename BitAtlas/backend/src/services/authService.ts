import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../database/connection';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: Date;
  updated_at: Date;
  account_locked: boolean;
  failed_login_attempts: number;
  last_login_attempt: Date | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  scopes: string[];
  iat?: number;
  exp?: number;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: string;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

    if (this.JWT_SECRET === 'your-super-secret-key' && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Validate password strength
    this.validatePasswordStrength(userData.password);

    // Hash password with unique salt
    const { hash, salt } = await this.hashPassword(userData.password);

    // Insert new user
    const result = await db.query(`
      INSERT INTO users (email, password_hash, salt)
      VALUES ($1, $2, $3)
      RETURNING id, email, created_at, updated_at, account_locked, failed_login_attempts, last_login_attempt
    `, [userData.email, hash, salt]);

    return result.rows[0];
  }

  async authenticateUser(loginData: LoginRequest): Promise<AuthTokens> {
    const user = await this.findUserByEmail(loginData.email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.account_locked || this.isAccountLocked(user)) {
      throw new Error('Account is temporarily locked due to too many failed login attempts');
    }

    // Validate password
    const isPasswordValid = await this.validatePassword(loginData.password, user.password_hash);
    
    if (!isPasswordValid) {
      await this.recordFailedLoginAttempt(user.id);
      throw new Error('Invalid credentials');
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);

    // Generate tokens
    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const session = await db.query(`
      SELECT s.*, u.id as user_id, u.email 
      FROM sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.refresh_token = $1 AND s.expires_at > NOW()
    `, [refreshToken]);

    if (session.rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = session.rows[0];

    // Generate new tokens
    const tokens = await this.generateTokens({
      id: user.user_id,
      email: user.email
    });

    // Update session with new refresh token
    await db.query(`
      UPDATE sessions 
      SET refresh_token = $1, expires_at = $2, updated_at = NOW()
      WHERE id = $3
    `, [tokens.refreshToken, new Date(Date.now() + this.parseTimeToMs(this.REFRESH_TOKEN_EXPIRES_IN)), user.id]);

    return tokens;
  }

  async revokeToken(refreshToken: string): Promise<void> {
    await db.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
  }

  async validateJWT(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  private async hashPassword(password: string): Promise<{hash: string, salt: string}> {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  }

  private async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('Password must contain at least one uppercase letter, lowercase letter, number, and special character');
    }
  }

  private async generateTokens(user: { id: string; email: string }): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      scopes: ['files:read', 'files:write', 'files:delete'] // Default scopes
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    } as SignOptions);

    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.parseTimeToMs(this.REFRESH_TOKEN_EXPIRES_IN));

    // Store refresh token in database
    await db.query(`
      INSERT INTO sessions (user_id, refresh_token, expires_at, device_info)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET 
        refresh_token = $2,
        expires_at = $3,
        updated_at = NOW()
    `, [user.id, refreshToken, expiresAt, { userAgent: 'Unknown' }]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseTimeToMs(this.JWT_EXPIRES_IN) / 1000
    };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  private async recordFailedLoginAttempt(userId: string): Promise<void> {
    const result = await db.query(`
      UPDATE users 
      SET 
        failed_login_attempts = failed_login_attempts + 1,
        last_login_attempt = NOW(),
        account_locked = CASE 
          WHEN failed_login_attempts + 1 >= $1 THEN true 
          ELSE account_locked 
        END
      WHERE id = $2
      RETURNING failed_login_attempts
    `, [this.MAX_LOGIN_ATTEMPTS, userId]);
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await db.query(`
      UPDATE users 
      SET 
        failed_login_attempts = 0,
        account_locked = false,
        last_login_attempt = NOW()
      WHERE id = $1
    `, [userId]);
  }

  private isAccountLocked(user: User): boolean {
    if (!user.account_locked) return false;
    
    if (!user.last_login_attempt) return true;
    
    const lockoutExpiry = new Date(user.last_login_attempt.getTime() + this.LOCKOUT_TIME_MS);
    return new Date() < lockoutExpiry;
  }

  private parseTimeToMs(timeString: string): number {
    const value = parseInt(timeString.slice(0, -1));
    const unit = timeString.slice(-1);
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid time unit: ${unit}`);
    }
  }
}