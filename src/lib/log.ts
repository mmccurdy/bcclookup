import { Redis } from "@upstash/redis";

export type LookupLogStatus =
  | "missing_address"
  | "no_location"
  | "no_district"
  | "success"
  | "error";

export type LookupLogEntry = {
  ts: number;
  address: string;
  status: LookupLogStatus;
  location?: { x: number; y: number } | null;
  currentDistrictId?: string | null;
  futureDistrictId?: string | null;
};

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export async function logLookup(entry: LookupLogEntry): Promise<void> {
  if (!redis) return;
  try {
    await redis.lpush("bcclookup:lookups", entry);
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
      "bcclookup:lookups",
      0,
      limit - 1
    );
    return items;
  } catch {
    return [];
  }
}

const LOOKUPS_KEY = "bcclookup:lookups";
const DELETE_SENTINEL = "\x00__bcclookup_deleted__";

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


