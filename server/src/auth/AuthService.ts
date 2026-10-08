/**
 * Auth Service - Email+Password and Wallet authentication.
 * Handles registration, login, JWT token generation and verification.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createPublicKey, randomBytes, verify as cryptoVerify } from 'crypto';
import { PublicKey } from '@solana/web3.js';
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
export const WALLET_CHALLENGE_TTL_MS = 5 * 60 * 1000;

// DER prefix of an Ed25519 SubjectPublicKeyInfo; the raw 32-byte key follows.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export interface WalletChallenge {
  publicKey: string;
  message: string;
  expiresAt: number;
}

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
   * Create a one-time sign-in challenge for a wallet. The client must sign
   * `message` with the wallet key; the server never trusts a bare public key.
   */
  createWalletChallenge(publicKey: string): WalletChallenge | null {
    if (!AuthService.isValidPublicKey(publicKey)) return null;
    const nonce = randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const message =
      `Batak Tournament sign-in\n` +
      `Wallet: ${publicKey}\n` +
      `Nonce: ${nonce}\n` +
      `Issued: ${issuedAt}`;
    return { publicKey, message, expiresAt: Date.now() + WALLET_CHALLENGE_TTL_MS };
  }

  /**
   * Check an Ed25519 signature (base64) over the challenge message.
   */
  verifyWalletSignature(challenge: WalletChallenge, publicKey: string, signatureB64: string): boolean {
    try {
      if (challenge.publicKey !== publicKey) return false;
      if (Date.now() > challenge.expiresAt) return false;
      const signature = Buffer.from(signatureB64, 'base64');
      if (signature.length !== 64) return false;
      const raw = AuthService.decodePublicKey(publicKey);
      if (!raw) return false;
      const key = createPublicKey({
        key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
        format: 'der',
        type: 'spki',
      });
      return cryptoVerify(null, Buffer.from(challenge.message, 'utf8'), key, signature);
    } catch {
      return false;
    }
  }

  /**
   * Decode a wallet address to its 32 raw bytes. Browser wallets give base58;
   * Solana Mobile Wallet Adapter gives base64 (44 chars ending in '='). Both are
   * accepted and the player id stays exactly as the client presented it.
   */
  static decodePublicKey(publicKey: unknown): Buffer | null {
    if (typeof publicKey !== 'string') return null;
    try {
      if (/^[A-Za-z0-9+/]{43}=$/.test(publicKey)) {
        const raw = Buffer.from(publicKey, 'base64');
        return raw.length === 32 ? raw : null;
      }
      if (publicKey.length < 32 || publicKey.length > 44) return null;
      const raw = Buffer.from(new PublicKey(publicKey).toBytes());
      return raw.length === 32 ? raw : null;
    } catch {
      return null;
    }
  }

  static isValidPublicKey(publicKey: unknown): publicKey is string {
    return AuthService.decodePublicKey(publicKey) !== null;
  }

  /**
   * Generate a JWT for a wallet user. Creates auth record if missing.
   * Call only after verifyWalletSignature() succeeded.
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
