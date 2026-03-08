/**
 * Mapbox Search Box API suggest – autocomplete for addresses/places.
 * Good locality data (e.g. Glen Arm). Used when MAPBOX_ACCESS_TOKEN is set.
 * https://docs.mapbox.com/api/search/search-box/
 */

const MAPBOX_SUGGEST_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";

// Baltimore County bbox: minLon,minLat,maxLon,maxLat (same as BALTIMORE_COUNTY_BBOX in geocode.ts)
const BALTIMORE_COUNTY_BBOX = "-76.78,39.15,-76.45,39.72";

function getAccessToken(): string | null {
  const t = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  return t || null;
}

/** Generate a UUID v4 for session_token (Mapbox uses it for session billing). */
function randomSessionToken(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type MapboxSuggestion = {
  name?: string;
  mapbox_id?: string;
  feature_type?: string;
  address?: string;
  full_address?: string;
  place_formatted?: string;
  context?: Record<string, unknown>;
};

type MapboxSuggestResponse = {
  suggestions?: MapboxSuggestion[];
  attribution?: string;
};

/**
 * Get address/place suggestions from Mapbox Search Box suggest API.
 * Restricted to US and Baltimore County bbox. Returns display strings only
 * (no coordinates; use /retrieve for that; our lookup flow geocodes the chosen address).
 * Returns [] if token is missing or request fails.
 */
export async function getMapboxSuggestions(
  query: string,
  maxResults: number = 8
): Promise<string[]> {
  const token = getAccessToken();
  if (!token) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    access_token: token,
    session_token: randomSessionToken(),
    language: "en",
    country: "US",
    bbox: BALTIMORE_COUNTY_BBOX,
    types: "address", // addresses only; exclude poi, place, category, etc.
    limit: String(Math.min(maxResults, 10)),
  });

  const res = await fetch(`${MAPBOX_SUGGEST_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);

  if (!res?.ok) return [];

  let data: MapboxSuggestResponse;
  try {
    data = (await res.json()) as MapboxSuggestResponse;
  } catch {
    return [];
  }

  const debugSuggest = process.env.DEBUG_SUGGEST === "1" || process.env.DEBUG_SUGGEST === "true";
  if (debugSuggest) {
    console.log("[suggest/mapbox] raw response:", JSON.stringify(data, null, 2));
  }

  const list = data.suggestions ?? [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const s of list) {
    const full = s.full_address?.trim();
    const addr = s.address?.trim();
    const place = s.place_formatted?.trim();
    const display =
      full || (addr && place ? `${addr}, ${place}` : addr || place) || s.name?.trim();
    if (!display) continue;
    const key = display.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }

  return out;
}
