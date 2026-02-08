/**
 * Auth Service - Email+Password and Wallet authentication.
 * Handles registration, login, JWT token generation and verification.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseManager } from '../database/DatabaseManager.js';

interface JwtPayload {
  playerId: string;
  authType: 'wallet' | 'email';
}

interface AuthResult {
  success: boolean;
  playerId?: string;
  token?: string;
  username?: string;
  error?: string;
}

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

export class AuthService {
  private db: DatabaseManager;
  private jwtSecret: string;

  constructor(db: DatabaseManager, jwtSecret: string) {
    this.db = db;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Register a new email user.
   */
  async register(email: string, password: string): Promise<AuthResult> {
    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Gecersiz email adresi' };
    }

    // Validate password length
    if (!password || password.length < 6) {
      return { success: false, error: 'Sifre en az 6 karakter olmali' };
    }

    // Check if email already exists
    const existing = this.db.getAuthByEmail(email);
    if (existing) {
      return { success: false, error: 'Bu email zaten kayitli' };
    }

    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const playerId = this.db.registerEmailUser(email, passwordHash);
      const token = this.generateToken(playerId, 'email');

      return { success: true, playerId, token };
    } catch (error) {
      console.error('[AuthService] Register error:', error);
      return { success: false, error: 'Kayit basarisiz' };
    }
  }

  /**
   * Login with email and password.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    if (!email || !password) {
      return { success: false, error: 'Email ve sifre gerekli' };
    }

    const auth = this.db.getAuthByEmail(email);
    if (!auth) {
      return { success: false, error: 'Email veya sifre hatali' };
    }

    try {
      const valid = await bcrypt.compare(password, auth.passwordHash);
      if (!valid) {
        return { success: false, error: 'Email veya sifre hatali' };
      }

      this.db.updateLastLogin(auth.playerId);
      const token = this.generateToken(auth.playerId, 'email');
      const player = this.db.getPlayer(auth.playerId);

      return {
        success: true,
        playerId: auth.playerId,
        token,
        username: player?.username || undefined,
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      return { success: false, error: 'Giris basarisiz' };
    }
  }

  /**
   * Generate a JWT for a wallet user. Creates auth record if missing.
   */
  generateWalletToken(publicKey: string): AuthResult {
    try {
      this.db.ensureWalletAuth(publicKey);
      this.db.updateLastLogin(publicKey);
      const token = this.generateToken(publicKey, 'wallet');
      const player = this.db.getPlayer(publicKey);

      return {
        success: true,
        playerId: publicKey,
        token,
        username: player?.username || undefined,
      };
    } catch (error) {
      console.error('[AuthService] Wallet token error:', error);
      return { success: false, error: 'Token olusturulamadi' };
    }
  }

  /**
   * Verify a JWT token. Returns payload or null.
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return payload;
    } catch {
      return null;
    }
  }

  private generateToken(playerId: string, authType: 'wallet' | 'email'): string {
    return jwt.sign({ playerId, authType } as JwtPayload, this.jwtSecret, {
      expiresIn: JWT_EXPIRY,
    });
  }
}
