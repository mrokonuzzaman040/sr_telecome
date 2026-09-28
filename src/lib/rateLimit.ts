import { NextRequest } from "next/server";
import Redis from "ioredis";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory fallback for when Redis is unavailable
const rateLimitMap = new Map<string, RateLimitRecord>();

// Redis client (initialized lazily)
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 2) return null; // Don't retry after 2 attempts
        return Math.min(times * 50, 2000);
      },
      connectTimeout: 2000,
      lazyConnect: true,
    });
    
    // Handle Redis errors gracefully
    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection error, falling back to in-memory:', err.message);
      redisClient = null;
    });
    
    return redisClient;
  } catch (err) {
    console.warn('[Redis] Failed to initialize Redis, falling back to in-memory:', err);
    return null;
  }
}

/**
 * Extracts client IP address for rate-limiting purposes.
 */
export function getClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  return "unknown";
}

/**
 * Redis-based rate limiter with in-memory fallback
 * 
 * @param key Unique identifier (e.g. `login:${ip}`)
 * @param limit Max allowed requests within window
 * @param windowSeconds Window length in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;
  
  // Try Redis first
  const redis = getRedisClient();
  if (redis) {
    try {
      const redisKey = `ratelimit:${key}`;
      
      // Use Redis INCR for atomic operations
      const pipeline = redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, windowSeconds);
      const results = await pipeline.exec();
      
      if (results && results[0] && results[0][1] !== null) {
        const count = results[0][1] as number;
        
        if (count > limit) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
          };
        }
        
        return {
          allowed: true,
          remaining: limit - count,
          retryAfterSeconds: 0,
        };
      }
    } catch (err) {
      console.warn('[Redis] Rate limit check failed, falling back to in-memory:', err);
      // Fall through to in-memory implementation
    }
  }
  
  // In-memory fallback (as before)
  const record = rateLimitMap.get(key);

  // Periodic pruning if map gets large
  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetAt < now) {
        rateLimitMap.delete(k);
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    retryAfterSeconds: 0,
  };
}
