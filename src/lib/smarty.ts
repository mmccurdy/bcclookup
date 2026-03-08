/**
 * Smarty US Autocomplete Pro API – USPS address suggestions.
 * https://www.smarty.com/docs/cloud/us-autocomplete-pro-api
 * Requires SMARTY_AUTH_ID and SMARTY_AUTH_TOKEN in env.
 */

const SMARTY_BASE = "https://us-autocomplete-pro.api.smarty.com/lookup";

export type USPSSuggestion = {
  street_line: string;
  secondary?: string;
  city: string;
  state: string;
  zipcode: string;
};

function getAuth(): { authId: string; authToken: string } | null {
  const authId = process.env.SMARTY_AUTH_ID?.trim();
  const authToken = process.env.SMARTY_AUTH_TOKEN?.trim();
  if (!authId || !authToken) return null;
  return { authId, authToken };
}

/** Format a single suggestion as "street, city, state zip". */
export function formatUSPSAddress(s: USPSSuggestion): string {
  const street = [s.street_line, s.secondary].filter(Boolean).join(", ");
  const parts = [street, s.city, `${s.state} ${s.zipcode}`.trim()].filter(Boolean);
  return parts.join(", ");
}

/**
 * Get USPS address suggestions from Smarty. Restricts to Maryland (state_filter).
 * Returns empty array if credentials are missing or request fails.
 */
export async function getUSPSAddressSuggestions(
  prefix: string,
  maxResults: number = 8
): Promise<string[]> {
  const auth = getAuth();
  if (!auth) return [];

  const trimmed = prefix.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    search: trimmed,
    "auth-id": auth.authId,
    "auth-token": auth.authToken,
    max_results: String(maxResults),
    include_only_states: "MD",
  });

  const res = await fetch(`${SMARTY_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);

  if (!res?.ok) return [];

  const data = await res.json();

  const debugSuggest = process.env.DEBUG_SUGGEST === "1" || process.env.DEBUG_SUGGEST === "true";
  if (debugSuggest) {
    console.log("[suggest/smarty] raw response:", JSON.stringify(data, null, 2));
  }

  const suggestions = Array.isArray(data) ? data : data.suggestions ?? data.result ?? [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const s of suggestions) {
    const rec = s as Record<string, unknown>;
    const street_line = rec.street_line ?? rec.streetLine;
    const city = rec.city;
    const state = rec.state;
    const zipcode = rec.zipcode ?? rec.zip_code;
    if (typeof street_line !== "string" || !street_line.trim()) continue;

    const addr: USPSSuggestion = {
      street_line: String(street_line).trim(),
      secondary: typeof rec.secondary === "string" ? rec.secondary.trim() : undefined,
      city: typeof city === "string" ? city.trim() : "",
      state: typeof state === "string" ? state.trim() : "",
      zipcode: typeof zipcode === "string" ? zipcode.trim() : "",
    };
    const formatted = formatUSPSAddress(addr);
    const key = formatted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(formatted);
  }

  return out;
}
