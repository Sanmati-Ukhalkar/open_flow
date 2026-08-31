import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../crypto';

describe('Crypto AES-256 Encryption & ENCRYPTION_KEY validation', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-suite-secure-encryption-key-32bytes!';
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('should encrypt and decrypt a sensitive credential payload accurately', () => {
    const secret = 'sk-proj-super-secret-openai-api-key-12345';
    const encrypted = encrypt(secret);

    expect(encrypted).toContain(':');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should throw an error on encrypt when ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test-secret')).toThrow(
      /ENCRYPTION_KEY environment variable is missing/
    );
  });

  it('should throw an error on decrypt when ENCRYPTION_KEY is missing', () => {
    const encrypted = encrypt('test-secret');
    delete process.env.ENCRYPTION_KEY;
    expect(() => decrypt(encrypted)).toThrow(
      /ENCRYPTION_KEY environment variable is missing/
    );
  });
});
