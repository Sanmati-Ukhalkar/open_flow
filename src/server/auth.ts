import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const AUTH_SECRET = process.env.AUTH_SECRET || 'open_flow_auth_secret_signing_key_token_validation';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  org?: {
    id: string;
    role: 'owner' | 'editor' | 'viewer';
  };
}

const LEGACY_STATIC_SALT = 'open_flow_static_salt_value';
const PBKDF2_ITERATIONS = 210000;
const KEYLEN = 64;
const DIGEST = 'sha512';

/**
 * Hashes a password using PBKDF2-HMAC-SHA512 with a dynamic per-user salt and 210,000 iterations.
 * Format: pbkdf2$sha512$210000$<salt_hex>$<hash_hex>
 */
export function hashPassword(password: string, providedSalt?: string): string {
  const saltHex = providedSalt || crypto.randomBytes(16).toString('hex');
  const hashBuffer = crypto.pbkdf2Sync(password, saltHex, PBKDF2_ITERATIONS, KEYLEN, DIGEST);
  return `pbkdf2$sha512$${PBKDF2_ITERATIONS}$${saltHex}$${hashBuffer.toString('hex')}`;
}

/**
 * Computes legacy hash for static-salted backward compatibility checking.
 */
export function computeLegacyHash(password: string): string {
  return crypto.pbkdf2Sync(password, LEGACY_STATIC_SALT, 1000, 64, 'sha512').toString('hex');
}

/**
 * Verifies a password against a stored hash using constant-time comparison.
 * Supports legacy static-salt hashes and flags `needsUpgrade: true` if an upgrade is required.
 */
export function verifyPassword(password: string, storedHash: string): { isValid: boolean; needsUpgrade: boolean } {
  if (!storedHash || typeof storedHash !== 'string') {
    return { isValid: false, needsUpgrade: false };
  }

  // Check if hash matches the new structured format: pbkdf2$sha512$iterations$salt$hash
  if (storedHash.startsWith('pbkdf2$sha512$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 5) {
      return { isValid: false, needsUpgrade: false };
    }
    const iterations = parseInt(parts[2], 10);
    const saltHex = parts[3];
    const targetHashHex = parts[4];

    if (isNaN(iterations) || !saltHex || !targetHashHex) {
      return { isValid: false, needsUpgrade: false };
    }

    const computedHashBuffer = crypto.pbkdf2Sync(password, saltHex, iterations, KEYLEN, DIGEST);
    const targetHashBuffer = Buffer.from(targetHashHex, 'hex');

    if (computedHashBuffer.length !== targetHashBuffer.length) {
      return { isValid: false, needsUpgrade: false };
    }

    const isValid = crypto.timingSafeEqual(computedHashBuffer, targetHashBuffer);
    return { isValid, needsUpgrade: false };
  }

  // Legacy fallback check (static salt, 1,000 iterations)
  const legacyHashHex = computeLegacyHash(password);
  const legacyHashBuffer = Buffer.from(legacyHashHex, 'hex');
  
  let targetBuffer: Buffer;
  try {
    targetBuffer = Buffer.from(storedHash, 'hex');
  } catch {
    return { isValid: false, needsUpgrade: false };
  }

  if (legacyHashBuffer.length !== targetBuffer.length) {
    return { isValid: false, needsUpgrade: false };
  }

  const isValid = crypto.timingSafeEqual(legacyHashBuffer, targetBuffer);
  return { isValid, needsUpgrade: isValid };
}

// Generate secure native signature session token
export function generateSessionToken(userId: string, email: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days duration
  const payload = `${userId}:${email}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

// Verify signed token
export function verifySessionToken(token: string): { id: string; email: string } | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    
    const [id, email, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    
    if (Date.now() > expiresAt) {
      return null; // Expired
    }
    
    const payload = `${id}:${email}:${expiresAtStr}`;
    const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
    
    if (signature !== expectedSignature) {
      return null; // Signature mismatch
    }
    
    return { id, email };
  } catch {
    return null;
  }
}

// Authentication Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Authentication token required.' } });
  }
  
  const user = verifySessionToken(token);
  if (!user) {
    return res.status(403).json({ success: false, error: { message: 'Invalid or expired session token.' } });
  }
  
  req.user = user;
  next();
}
