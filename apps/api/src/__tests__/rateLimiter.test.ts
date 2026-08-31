import { describe, it, expect } from 'vitest';
import { checkSlidingWindowRateLimit } from '../rateLimiter';

describe('Dynamic Webhook Ingest Rate Limiter', () => {
  it('should allow requests within threshold limit', async () => {
    const key = `test-limit-${Date.now()}`;
    const res = await checkSlidingWindowRateLimit(key, 5, 60);

    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
    expect(res.retryAfterSeconds).toBe(0);
  });

  it('should reject requests exceeding rate limit threshold with 429 Retry-After metadata', async () => {
    const key = `test-limit-exceed-${Date.now()}`;
    
    // Fill up quota of 3 requests
    for (let i = 0; i < 3; i++) {
      await checkSlidingWindowRateLimit(key, 3, 60);
    }

    // 4th request should be blocked
    const blockedRes = await checkSlidingWindowRateLimit(key, 3, 60);

    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);
  });
});
