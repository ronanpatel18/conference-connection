/**
 * Rate Limiting Middleware
 *
 * Uses Upstash Redis for production (serverless-compatible).
 * Falls back to in-memory store for local development when
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set.
 */

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

// ---------------------------------------------------------------------------
// Client IP extraction
// ---------------------------------------------------------------------------

export function getClientIP(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const cfConnecting = req.headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting;
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (production)
// ---------------------------------------------------------------------------

let upstashLimiterCache: Map<string, ReturnType<typeof createUpstashLimiter>> | null = null;

function getUpstashRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Dynamic import avoidance: require at module level is fine since
  // the packages are installed as dependencies.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  return new Redis({ url, token });
}

function createUpstashLimiter(config: RateLimitConfig) {
  const redis = getUpstashRedis();
  if (!redis) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Ratelimit } = require("@upstash/ratelimit") as typeof import("@upstash/ratelimit");

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSec} s`),
    analytics: true,
    prefix: "rl",
  });
}

function getOrCreateUpstashLimiter(name: string, config: RateLimitConfig) {
  if (!upstashLimiterCache) upstashLimiterCache = new Map();
  if (!upstashLimiterCache.has(name)) {
    upstashLimiterCache.set(name, createUpstashLimiter(config));
  }
  return upstashLimiterCache.get(name);
}

// ---------------------------------------------------------------------------
// In-memory fallback rate limiter (development only)
// ---------------------------------------------------------------------------

interface InMemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, InMemoryEntry>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) memoryStore.delete(key);
  }
}

function checkInMemory(
  key: string,
  limit: number,
  windowSec: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpired();
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Unified rate limit factory
// ---------------------------------------------------------------------------

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

function buildBlockedResponse(limit: number, remaining: number, resetAt: number) {
  const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
  const headers = createRateLimitHeaders(limit, remaining, resetAt);
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests",
      message: `Rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
      retryAfter: retryAfterSec,
    },
    { status: 429, headers }
  );
}

export function rateLimit(name: string, config: RateLimitConfig) {
  const { limit, windowSec } = config;

  return async function rateLimitMiddleware(
    req: NextRequest
  ): Promise<NextResponse | null> {
    const ip = getClientIP(req);
    const key = `${name}:${ip}`;

    // Try Upstash first
    const upstash = getOrCreateUpstashLimiter(name, config);
    if (upstash) {
      const { success, remaining, reset } = await upstash.limit(key);
      if (!success) {
        return buildBlockedResponse(limit, remaining, reset);
      }
      return null;
    }

    // Fallback to in-memory
    const result = checkInMemory(key, limit, windowSec);
    if (!result.allowed) {
      return buildBlockedResponse(limit, result.remaining, result.resetAt);
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

export const rateLimiters = {
  /** Standard API endpoint: 30 req/min */
  standard: rateLimit("standard", { limit: 30, windowSec: 60 }),

  /** Strict endpoint (auth, sensitive): 10 req/min */
  strict: rateLimit("strict", { limit: 10, windowSec: 60 }),

  /** AI/expensive operations: 5 req/min */
  expensive: rateLimit("expensive", { limit: 5, windowSec: 60 }),

  /** Lookup operations: 20 req/min */
  lookup: rateLimit("lookup", { limit: 20, windowSec: 60 }),

  /** Admin operations: 60 req/min */
  admin: rateLimit("admin", { limit: 60, windowSec: 60 }),
};
