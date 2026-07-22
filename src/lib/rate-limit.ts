import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** District lookups are relatively expensive (geocode + GIS). */
const LOOKUP_LIMIT = parsePositiveInt(process.env.RATE_LIMIT_LOOKUP, 20);
/** Autocomplete fires often while typing; keep this higher. */
const SUGGEST_LIMIT = parsePositiveInt(process.env.RATE_LIMIT_SUGGEST, 60);

const lookupLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LOOKUP_LIMIT, "1 m"),
      prefix: "bcclookup:rl:lookup",
    })
  : null;

const suggestLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(SUGGEST_LIMIT, "1 m"),
      prefix: "bcclookup:rl:suggest",
    })
  : null;

async function check(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    // Fail open so Redis blips don't take the tool offline.
    console.error("[rate-limit] check failed, allowing request:", err);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

export function checkLookupRateLimit(ip: string): Promise<RateLimitResult> {
  return check(lookupLimiter, ip);
}

export function checkSuggestRateLimit(ip: string): Promise<RateLimitResult> {
  return check(suggestLimiter, ip);
}

export function rateLimitResponse(
  result: RateLimitResult,
  message = "Too many requests. Please try again shortly."
): NextResponse {
  const retryAfterSec =
    result.reset > 0
      ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
      : 60;

  return NextResponse.json(
    { success: false, error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  );
}
