import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { prisma } from './prisma';
import { User } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private jwtRefreshExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Hash a password using Argon2
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate JWT tokens for a user
   */
  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });

    const refreshPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
    });

    // Store refresh token in database
    await this.storeRefreshToken(user.id, refreshToken);

    // Calculate expiration time
    const decoded = jwt.decode(accessToken) as JWTPayload;
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const decoded = jwt.decode(token) as JWTPayload;
    const expiresAt = new Date((decoded.exp || 0) * 1000);

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
        deviceInfo: {
          type: 'refresh_token',
          created: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string, type: 'access' | 'refresh' = 'access'): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = await this.verifyToken(refreshToken, 'refresh');

      // Check if refresh token exists in database and is active
      const session = await prisma.session.findFirst({
        where: {
          token: refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session || !session.user) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      return this.generateTokens(session.user);
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeToken(token: string): Promise<void> {
    await prisma.session.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  /**
   * Get user by credentials
   */
  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  /**
   * Create a new user with hashed password
   */
  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);

    return prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
      },
    });
  }
}

// Export singleton instance
export const authService = new AuthService();