import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashPassword, verifyPassword, computeLegacyHash, generateSessionToken, verifySessionToken } from '../auth';

describe('Auth Password Hashing & Security (Issue #10)', () => {
  it('should generate a structured hash with dynamic salt and 210,000 iterations', () => {
    const password = 'SuperSecurePassword123!';
    const hash = hashPassword(password);

    expect(hash).toMatch(/^pbkdf2\$sha512\$210000\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  });

  it('should generate unique hashes for identical passwords due to dynamic salt', () => {
    const password = 'SamePassword123!';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    expect(hash1).not.toEqual(hash2);
  });

  it('should successfully verify valid password against dynamic salt hash', () => {
    const password = 'MySecretPassword#2026';
    const hash = hashPassword(password);

    const result = verifyPassword(password, hash);
    expect(result.isValid).toBe(true);
    expect(result.needsUpgrade).toBe(false);
  });

  it('should reject invalid password against dynamic salt hash', () => {
    const password = 'CorrectPassword';
    const wrongPassword = 'WrongPassword';
    const hash = hashPassword(password);

    const result = verifyPassword(wrongPassword, hash);
    expect(result.isValid).toBe(false);
    expect(result.needsUpgrade).toBe(false);
  });

  it('should verify legacy static-salted hashes and flag needsUpgrade', () => {
    const password = 'LegacyUserPassword99';
    const legacyHash = computeLegacyHash(password);

    const result = verifyPassword(password, legacyHash);
    expect(result.isValid).toBe(true);
    expect(result.needsUpgrade).toBe(true);
  });

  it('should reject wrong password for legacy hash', () => {
    const password = 'LegacyUserPassword99';
    const wrongPassword = 'IncorrectLegacyPassword';
    const legacyHash = computeLegacyHash(password);

    const result = verifyPassword(wrongPassword, legacyHash);
    expect(result.isValid).toBe(false);
    expect(result.needsUpgrade).toBe(false);
  });

  it('should safely handle empty or malformed hashes', () => {
    expect(verifyPassword('password', '').isValid).toBe(false);
    expect(verifyPassword('password', 'invalid_hash_string').isValid).toBe(false);
    expect(verifyPassword('password', 'pbkdf2$sha512$invalid$salt$hash').isValid).toBe(false);
  });

  describe('JWT_SECRET Session Token Signing', () => {
    const originalSecret = process.env.JWT_SECRET;

    beforeEach(() => {
      process.env.JWT_SECRET = 'test-suite-secure-jwt-secret-key-123';
    });

    afterEach(() => {
      process.env.JWT_SECRET = originalSecret;
    });

    it('should generate and verify session tokens using JWT_SECRET', () => {
      const token = generateSessionToken('usr-1', 'user@example.com');
      expect(typeof token).toBe('string');

      const verified = verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe('usr-1');
      expect(verified?.email).toBe('user@example.com');
    });

    it('should throw an error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateSessionToken('usr-1', 'user@example.com')).toThrow(
        /JWT_SECRET environment variable is missing/
      );
    });
  });
});
