import { redis } from "@/lib/redis";
import type { RequestMeta } from "@/lib/request-meta";

export type LookupLogStatus =
  | "missing_address"
  | "no_location"
  | "no_district"
  | "success"
  | "error"
  | "rate_limited";

export type LookupLogEntry = {
  ts: number;
  address: string;
  status: LookupLogStatus;
  location?: { x: number; y: number } | null;
  currentDistrictId?: string | null;
  futureDistrictId?: string | null;
  /** Client IP (best-effort from proxy headers). */
  ip?: string | null;
  /** User-Agent header. */
  ua?: string | null;
  /** Referer header, useful for spotting scripted callers. */
  referer?: string | null;
};

const LOOKUPS_KEY = "bcclookup:lookups";
const DELETE_SENTINEL = "\x00__bcclookup_deleted__";
/** Keep the Redis list bounded so bot floods don't grow storage forever. */
const MAX_LOG_ENTRIES = 2000;

export async function logLookup(
  entry: LookupLogEntry,
  meta?: RequestMeta
): Promise<void> {
  if (!redis) return;
  const payload: LookupLogEntry = meta
    ? {
        ...entry,
        ip: meta.ip,
        ua: meta.ua,
        referer: meta.referer,
      }
    : entry;
  try {
    const pipeline = redis.pipeline();
    pipeline.lpush(LOOKUPS_KEY, payload);
    pipeline.ltrim(LOOKUPS_KEY, 0, MAX_LOG_ENTRIES - 1);
    await pipeline.exec();
  } catch {
    // Logging is best-effort; ignore errors (e.g., Redis not configured).
  }
}

export async function getRecentLookups(
  limit: number = 100
): Promise<LookupLogEntry[]> {
  if (!redis) return [];
  try {
    const items = await redis.lrange<LookupLogEntry>(
      LOOKUPS_KEY,
      0,
      limit - 1
    );
    return items;
  } catch {
    return [];
  }
}

/**
 * Remove the lookup at the given list index (0 = most recent).
 * Returns true if a row was removed, false if Redis unavailable or index out of range.
 */
export async function deleteLookupByIndex(index: number): Promise<boolean> {
  if (!redis || index < 0) return false;
  try {
    const len = await redis.llen(LOOKUPS_KEY);
    if (index >= len) return false;
    await redis.lset(LOOKUPS_KEY, index, DELETE_SENTINEL);
    await redis.lrem(LOOKUPS_KEY, 1, DELETE_SENTINEL);
    return true;
  } catch {
    return false;
  }
}
