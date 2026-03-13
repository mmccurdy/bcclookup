/**
 * Mapbox Search Box API suggest – autocomplete for addresses/places.
 * Good locality data (e.g. Glen Arm). Used when MAPBOX_ACCESS_TOKEN is set.
 * https://docs.mapbox.com/api/search/search-box/
 */

const MAPBOX_SUGGEST_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";
const MAPBOX_FORWARD_URL = "https://api.mapbox.com/search/searchbox/v1/forward";

// Baltimore County approximate center (lon,lat). Used as Mapbox proximity bias.
// Roughly between Towson and the geographic center of the county.
const BALTIMORE_COUNTY_PROXIMITY = "-76.60,39.45";

// Loose Mid-Atlantic bbox to avoid far-away states while still including all of Maryland
// and nearby edges (minLon,minLat,maxLon,maxLat).
const MIDATLANTIC_BBOX = "-80.0,37.5,-74.0,40.5";

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

type MapboxForwardFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    full_address?: string;
    address?: string;
    place_formatted?: string;
  };
};

type MapboxForwardResponse = {
  features?: MapboxForwardFeature[];
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
    // Use a loose regional bbox so we don't get suggestions from distant
    // states, plus proximity bias around Baltimore County. Restrict to
    // address-type features so we don't show pure roads/places.
    proximity: BALTIMORE_COUNTY_PROXIMITY,
    bbox: MIDATLANTIC_BBOX,
    types: "address",
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
    // Prefer full/house-numbered addresses; ignore pure place/POI names.
    const candidate = full || (addr && place ? `${addr}, ${place}` : addr || place);
    const display = candidate && /\d/.test(candidate) ? candidate : undefined;
    if (!display) continue;
    const key = display.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }

  return out;
}

/**
 * Mapbox forward geocoding for a full address string. Returns WGS84 lon/lat
 * and the normalized full address when successful. We keep the same regional
 * bbox and proximity bias used for suggestions.
 */
export async function geocodeWithMapbox(
  query: string
): Promise<{ x: number; y: number; address?: string } | null> {
  const token = getAccessToken();
  if (!token) return null;

  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    access_token: token,
    language: "en",
    country: "US",
    proximity: BALTIMORE_COUNTY_PROXIMITY,
    bbox: MIDATLANTIC_BBOX,
    limit: "1",
  });

  const res = await fetch(`${MAPBOX_FORWARD_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);
  if (!res?.ok) return null;

  let data: MapboxForwardResponse;
  try {
    data = (await res.json()) as MapboxForwardResponse;
  } catch {
    return null;
  }

  const feature = data.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [x, y] = coords;
  if (typeof x !== "number" || typeof y !== "number") return null;

  const props = feature.properties ?? {};
  const full = props.full_address?.trim();
  const addr = props.address?.trim();
  const place = props.place_formatted?.trim();
  const candidate = full || (addr && place ? `${addr}, ${place}` : addr || place);

  return { x, y, address: candidate || undefined };
}
