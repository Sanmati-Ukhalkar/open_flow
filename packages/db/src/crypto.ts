import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Generate a 32-byte key from process.env.ENCRYPTION_KEY using SHA-256
const getSecretKey = () => {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY environment variable is missing. A secure encryption key is required to encrypt/decrypt credentials.');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
};

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const ivString = parts.shift();
  const encryptedText = parts.join(':');
  
  if (!ivString || !encryptedText) {
    throw new Error('Malformed encrypted payload format.');
  }

  const iv = Buffer.from(ivString, 'hex');
  const key = getSecretKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
