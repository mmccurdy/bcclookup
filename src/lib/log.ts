import { Redis } from "@upstash/redis";

export type LookupLogStatus =
  | "missing_address"
  | "no_location"
  | "no_district"
  | "success";

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


