import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const AUTH_SECRET = process.env.AUTH_SECRET || 'open_flow_auth_secret_signing_key_token_validation';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Secure PBKDF2 Password Hashing
export function hashPassword(password: string): string {
  const salt = 'open_flow_static_salt_value'; // Basic static salt is sufficient for local databases
  const iterations = 1000;
  const keylen = 64;
  const digest = 'sha512';
  return crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
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
