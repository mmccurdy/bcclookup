/**
 * Photon geocoder (Komoot) – free, no API key. OSM-based.
 * https://photon.komoot.io/  https://github.com/komoot/photon
 * Use as a free alternative to try before Smarty; data quality may vary (OSM).
 */

const PHOTON_API = "https://photon.komoot.io/api";

// Baltimore County bbox: minLon,minLat,maxLon,maxLat
const BALTIMORE_COUNTY_BBOX = "-76.78,39.15,-76.45,39.72";

/**
 * Get address suggestions from Photon. Restricted to Baltimore County bbox.
 * Returns empty array on failure. No API key required.
 */
export async function getPhotonSuggestions(
  prefix: string,
  maxResults: number = 8
): Promise<string[]> {
  const trimmed = prefix.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(Math.min(maxResults, 10)),
    bbox: BALTIMORE_COUNTY_BBOX,
    lang: "en",
  });

  const res = await fetch(`${PHOTON_API}/?${params.toString()}`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);

  if (!res?.ok) return [];

  let data: { features?: Array<{ properties?: Record<string, unknown> }> };
  try {
    data = await res.json();
  } catch {
    return [];
  }

  const features = data?.features ?? [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const f of features) {
    const p = f.properties ?? {};
    const name = p.name as string | undefined;
    const street = p.street as string | undefined;
    const housenumber = p.housenumber as string | undefined;
    const city = p.city as string | undefined;
    const state = p.state as string | undefined;
    const postcode = p.postcode as string | undefined;
    const country = p.country as string | undefined;

    // Prefer US only (Photon is global)
    if (country && country.toUpperCase() !== "UNITED STATES" && country.toUpperCase() !== "USA") {
      continue;
    }

    let line1 = "";
    if (typeof housenumber === "string" && typeof street === "string") {
      line1 = `${housenumber} ${street}`.trim();
    } else if (typeof street === "string") {
      line1 = street.trim();
    } else if (typeof name === "string") {
      line1 = name.trim();
    }
    if (!line1) continue;

    const locality = typeof city === "string" ? city.trim() : "";
    const stateZip = [state, postcode].filter(Boolean).join(" ").trim();
    const formatted = [line1, locality, stateZip].filter(Boolean).join(", ");
    const key = formatted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(formatted);
  }

  return out;
}
