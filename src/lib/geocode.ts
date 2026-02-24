/**
 * Address → coordinates for district lookup. We try several geocoders; the district
 * layers are the source of truth for whether the point is in a councilmanic district.
 */

const GEOCODER_URL =
  process.env.BC_GEOCODER_URL ||
  "https://bcgis.baltimorecountymd.gov/arcgis/rest/services/Geocoders/AddressPointGeocoder/GeocodeServer";

const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/geographies/address";

const NOMINATIM_LOOKUP_URL =
  process.env.NOMINATIM_LOOKUP_URL || "https://nominatim.openstreetmap.org/search";

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || "BaltimoreCountyDistrictLookup/1.0";

const BALTIMORE_COUNTY_BBOX = {
  xmin: -76.78,
  ymin: 39.15,
  xmax: -76.45,
  ymax: 39.72,
};

function inBaltimoreCountyBbox(lon: number, lat: number): boolean {
  return (
    lon >= BALTIMORE_COUNTY_BBOX.xmin &&
    lon <= BALTIMORE_COUNTY_BBOX.xmax &&
    lat >= BALTIMORE_COUNTY_BBOX.ymin &&
    lat <= BALTIMORE_COUNTY_BBOX.ymax
  );
}

export type GeocodeResult = {
  x: number;
  y: number;
  wkid?: number;
  address?: string;
};

function normalizeSpaces(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function hasRegion(address: string): boolean {
  const t = address.trim();
  if (/\d{5}(-\d{4})?(\s|$)/.test(t)) return true;
  if (/,/.test(t)) return true;
  if (/\b(MD|Maryland)\b/i.test(t)) return true;
  return false;
}

function addressVariants(address: string): string[] {
  const n = normalizeSpaces(address);
  if (!n) return [];
  const out = [n];
  if (!hasRegion(n)) {
    out.push(`${n}, Baltimore County, MD`);
    out.push(`${n}, MD`);
  }
  return out;
}

async function geocodeBC(singleLine: string, outSR: number): Promise<GeocodeResult | null> {
  const url = `${GEOCODER_URL}/findAddressCandidates?SingleLine=${encodeURIComponent(singleLine)}&f=json&outSR=${outSR}`;
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  const c = data.candidates?.[0];
  if (!c?.location) return null;
  return {
    x: c.location.x,
    y: c.location.y,
    wkid: c.location.spatialReference?.wkid,
    address: c.address,
  };
}

/** Census geocoder – accepts any US result; district layers decide if we're in the county. */
async function geocodeCensus(address: string, outSR: number = 4326): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    address: normalizeSpaces(address),
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });
  const res = await fetch(`${CENSUS_GEOCODER_URL}?${params.toString()}`).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  const match = data.result?.addressMatches?.[0];
  const coords = match?.coordinates;
  if (!coords) return null;
  const lon = coords.x ?? coords.longitude;
  const lat = coords.y ?? coords.latitude;
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  return { x: lon, y: lat, wkid: 4326, address: match.matchedAddress };
}

/** Nominatim (OSM) fallback – only accept if inside Baltimore County bbox. */
async function geocodeNominatim(address: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: normalizeSpaces(address),
    format: "json",
    limit: "1",
  });
  const res = await fetch(`${NOMINATIM_LOOKUP_URL}?${params.toString()}`, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.lat || !first?.lon) return null;
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!inBaltimoreCountyBbox(lon, lat)) return null;
  return { x: lon, y: lat, wkid: 4326, address: first.display_name };
}

/**
 * Geocode an address using Census, then BC, then Nominatim. Returns WGS84 (x=lon, y=lat).
 * We accept the first result; the district layers are the source of truth for councilmanic district.
 */
export async function geocodeAddress(
  address: string,
  options?: { outSR?: number }
): Promise<GeocodeResult | null> {
  const outSR = options?.outSR ?? 4326;
  const normalized = normalizeSpaces(address);
  const variants = addressVariants(address);

  for (const v of variants) {
    const r = await geocodeCensus(v, outSR);
    if (r) return r;
  }
  for (const v of variants) {
    const r = await geocodeBC(v, outSR);
    if (r) return r;
  }
  for (const v of variants) {
    const r = await geocodeNominatim(v);
    if (r) return r;
  }
  const r = await geocodeCensus(normalized, outSR);
  if (r) return r;
  return await geocodeNominatim(normalized);
}
