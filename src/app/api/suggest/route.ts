import { NextRequest, NextResponse } from "next/server";
import { getCensusAddressSuggestion } from "@/lib/geocode";
import { getMapboxSuggestions } from "@/lib/mapbox";
import { getPhotonSuggestions } from "@/lib/photon";
import { getUSPSAddressSuggestions } from "@/lib/smarty";

/** Strip redundant US country suffix from address strings (all suggestions are US). */
function stripCountrySuffix(s: string): string {
  return s
    .replace(/,?\s*United States of America\s*$/i, "")
    .replace(/,?\s*United States\s*$/i, "")
    .replace(/,?\s*USA\s*$/i, "")
    .replace(/,?\s*US\s*$/i, "")
    .trim()
    .replace(/,+\s*$/, "")
    .trim();
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? request.nextUrl.searchParams.get("address");
  const debug = request.nextUrl.searchParams.get("debug") === "1";

  if (!q || typeof q !== "string") {
    return NextResponse.json({ suggestions: [] });
  }

  const trimmed = q.trim();
  const debugSuggest = process.env.DEBUG_SUGGEST === "1" || process.env.DEBUG_SUGGEST === "true";
  if (debugSuggest) console.log("[suggest] DEBUG_SUGGEST is on, q=", JSON.stringify(trimmed));

  // Census first when input looks complete: returns canonical address (correct CDP e.g. Glen Arm)
  let suggestions = await getCensusAddressSuggestion(trimmed);
  let provider: "census" | "mapbox" | "photon" | "smarty" = "census";

  if (suggestions.length === 0 && process.env.MAPBOX_ACCESS_TOKEN?.trim()) {
    if (debug || debugSuggest) console.log("[suggest] trying Mapbox");
    suggestions = await getMapboxSuggestions(trimmed, 8);
    provider = "mapbox";
  }
  if (suggestions.length === 0) {
    if (debug || debugSuggest) console.log("[suggest] trying Photon");
    suggestions = await getPhotonSuggestions(trimmed, 8);
    provider = "photon";
  }
  if (suggestions.length === 0) {
    if (debug || debugSuggest) console.log("[suggest] trying Smarty");
    suggestions = await getUSPSAddressSuggestions(trimmed, 8);
    provider = "smarty";
  }

  if (debug || debugSuggest) {
    console.log(`[suggest] q="${trimmed}" provider=${provider} resultCount=${suggestions.length}`);
  }

  const normalized = suggestions.map(stripCountrySuffix);

  const body: { suggestions: string[]; _debug?: { provider: string; resultCount: number } } = {
    suggestions: normalized,
  };
  if (debug) body._debug = { provider, resultCount: suggestions.length };

  return NextResponse.json(body);
}
