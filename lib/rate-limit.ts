/**
 * Rate Limiting Middleware
 *
 * Implements sliding window rate limiting with IP and user-based tracking.
 * Uses in-memory storage - for production scale, replace with Redis.
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
  /** Optional: Different limit for authenticated users */
  authenticatedLimit?: number;
  /** Optional: Custom key generator */
  keyGenerator?: (req: NextRequest) => string;
}

// In-memory store for rate limiting (per-process)
// In production with multiple instances, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Extract client IP from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, nginx)
 */
export function getClientIP(req: NextRequest): string {
  // Vercel/other platforms
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP (original client)
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }

  // Cloudflare
  const cfConnecting = req.headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting;

  // Real IP header (nginx)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback
  return "unknown";
}

/**
 * Check rate limit and return result
 */
function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpiredEntries();

  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    // Rate limited
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment count
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Create rate limit response headers
 */
function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  headers.set("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
  return headers;
}

/**
 * Rate limit middleware factory
 *
 * @example
 * const limiter = rateLimit({ limit: 10, windowSec: 60 });
 *
 * export async function POST(req: NextRequest) {
 *   const rateLimitResult = await limiter(req);
 *   if (rateLimitResult) return rateLimitResult;
 *   // ... rest of handler
 * }
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    limit,
    windowSec,
    authenticatedLimit,
    keyGenerator,
  } = config;

  return async function rateLimitMiddleware(
    req: NextRequest,
    userId?: string | null
  ): Promise<NextResponse | null> {
    // Generate rate limit key
    const ip = getClientIP(req);
    const baseKey = keyGenerator ? keyGenerator(req) : `${req.nextUrl.pathname}:${ip}`;

    // If user is authenticated and we have a different limit for them
    const effectiveLimit = userId && authenticatedLimit ? authenticatedLimit : limit;
    const key = userId ? `user:${userId}:${baseKey}` : `ip:${baseKey}`;

    const result = checkRateLimit(key, effectiveLimit, windowSec);
    const headers = createRateLimitHeaders(effectiveLimit, result.remaining, result.resetAt);

    if (!result.allowed) {
      const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Return null to indicate the request is allowed
    // Headers will be added by the caller if needed
    return null;
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** Standard API endpoint: 30 req/min per IP */
  standard: rateLimit({ limit: 30, windowSec: 60 }),

  /** Strict endpoint (auth, sensitive): 10 req/min per IP */
  strict: rateLimit({ limit: 10, windowSec: 60 }),

  /** AI/expensive operations: 5 req/min per IP */
  expensive: rateLimit({ limit: 5, windowSec: 60, authenticatedLimit: 10 }),

  /** Lookup operations: 20 req/min per IP */
  lookup: rateLimit({ limit: 20, windowSec: 60 }),

  /** Admin operations: 60 req/min per user */
  admin: rateLimit({ limit: 60, windowSec: 60 }),
};

/**
 * Add rate limit headers to an existing response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetAt: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  return response;
}
