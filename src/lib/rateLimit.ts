import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Extracts client IP address for rate-limiting purposes.
 *
 * `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip` are client-settable
 * headers and must never be trusted directly - an attacker can set any value
 * to always land in someone else's rate-limit bucket, or rotate values to
 * evade their own limit entirely. `x-vercel-forwarded-for` is instead set by
 * Vercel's edge network itself and cannot be overridden by the client, so it
 * is the only source trusted here. If it is absent (e.g. running outside
 * Vercel), every request collapses to one shared "unknown" bucket - safe
 * (fails toward more restrictive, shared limiting) rather than spoofable.
 */
export function getClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  return "unknown";
}

/**
 * Enforces in-memory sliding-window rate limit.
 *
 * @param key Unique identifier (e.g. `login:${ip}`)
 * @param limit Max allowed requests within window
 * @param windowSeconds Window length in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
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
    rateLimitMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
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
