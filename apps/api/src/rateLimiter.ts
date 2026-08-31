import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
let redisClient: Redis | null = null;

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    lazyConnect: true
  });
  redisClient.connect().catch(() => {
    redisClient = null;
  });
} catch {
  redisClient = null;
}

const memoryRateLimits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks sliding window rate limit for a given key (e.g. deploymentId or webhookId).
 * Uses Redis sorted set (ZSET) if available, with in-memory fallback.
 */
export async function checkSlidingWindowRateLimit(
  key: string,
  limitPerMinute: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const clearBefore = now - windowMs;

  if (redisClient && redisClient.status === 'ready') {
    try {
      const redisKey = `ratelimit:${key}`;
      const pipeline = redisClient.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, clearBefore);
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      pipeline.zcard(redisKey);
      pipeline.expire(redisKey, windowSeconds);

      const results = await pipeline.exec();
      const currentCount = (results?.[2]?.[1] as number) || 1;

      if (currentCount > limitPerMinute) {
        return {
          allowed: false,
          limit: limitPerMinute,
          remaining: 0,
          retryAfterSeconds: windowSeconds
        };
      }

      return {
        allowed: true,
        limit: limitPerMinute,
        remaining: Math.max(0, limitPerMinute - currentCount),
        retryAfterSeconds: 0
      };
    } catch {
      // Fallback to in-memory rate limiter if Redis command fails
    }
  }

  // In-memory sliding window fallback
  const timestamps = memoryRateLimits.get(key) || [];
  const activeTimestamps = timestamps.filter((t) => t > clearBefore);

  if (activeTimestamps.length >= limitPerMinute) {
    const oldestInWindow = activeTimestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return {
      allowed: false,
      limit: limitPerMinute,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter)
    };
  }

  activeTimestamps.push(now);
  memoryRateLimits.set(key, activeTimestamps);

  return {
    allowed: true,
    limit: limitPerMinute,
    remaining: limitPerMinute - activeTimestamps.length,
    retryAfterSeconds: 0
  };
}
