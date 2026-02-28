/**
 * Geoapify Address Autocomplete API – free tier 3,000 credits/day.
 * https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
 * Set GEOAPIFY_API_KEY in env (get one at https://www.geoapify.com/).
 */

const GEOAPIFY_AUTOCOMPLETE = "https://api.geoapify.com/v1/geocode/autocomplete";

// Baltimore County bbox (matches BALTIMORE_COUNTY_BBOX in geocode.ts). Geoapify rect: minLon,minLat,maxLon,maxLat
const BALTIMORE_COUNTY_RECT = "rect:-76.78,39.15,-76.45,39.72";

function getApiKey(): string | null {
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  return key || null;
}

/**
 * Get address suggestions from Geoapify. Restricted to Baltimore County bbox (and US).
 * Returns empty array if API key is missing or request fails.
 */
export async function getGeoapifySuggestions(
  prefix: string,
  maxResults: number = 8
): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const trimmed = prefix.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    text: trimmed,
    format: "json",
    apiKey,
    filter: `${BALTIMORE_COUNTY_RECT}|countrycode:us`,
    limit: String(Math.min(maxResults, 20)),
  });

  const res = await fetch(`${GEOAPIFY_AUTOCOMPLETE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);

  if (!res?.ok) return [];

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return [];
  }
  // API can return error body with 200 in some cases
  if (data.statusCode && data.statusCode !== 200) return [];
  if (data.error === "Unauthorized" || data.message === "Invalid apiKey") return [];

  // format=json returns "results" (flat objects); format=geojson/default returns "features" (GeoJSON)
  const rawList =
    (data.results as Array<Record<string, unknown>>) ??
    (data.features as Array<Record<string, unknown>>) ??
    [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of rawList) {
    const props = (item.properties ?? item) as Record<string, unknown>;
    const formatted =
      (props.formatted as string) ??
      (props.formatted_address as string) ??
      (props.address_line1 as string) ??
      (props.name as string);
    if (typeof formatted === "string" && formatted.trim()) {
      const key = formatted.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(formatted.trim());
      }
      continue;
    }
    const line1 = props.address_line1 as string | undefined;
    const city = props.city as string | undefined;
    const state = (props.state_code ?? props.state) as string | undefined;
    const postcode = props.postcode as string | undefined;
    if (line1 && typeof line1 === "string" && line1.trim()) {
      const parts = [line1.trim(), city, [state, postcode].filter(Boolean).join(" ")].filter(
        Boolean
      );
      const built = parts.join(", ");
      const key = built.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(built);
      }
    }
  }

  return out;
}
