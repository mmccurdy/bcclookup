import { NextRequest, NextResponse } from "next/server";
import {
  geocodeAddress,
  geocodeAddressCandidates,
  getCensusCountyAtPoint,
  isBaltimoreCityGeocode,
  type GeocodeResult,
} from "@/lib/geocode";
import { getCurrentDistrict, getFutureDistrict } from "@/lib/districts";
import { logLookup } from "@/lib/log";
import {
  checkLookupRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { getRequestMeta } from "@/lib/request-meta";

function pointKey(p: { x: number; y: number }): string {
  return `${p.x.toFixed(5)},${p.y.toFixed(5)}`;
}

const GENERIC_OUTSIDE_COUNTY_ERROR =
  "We couldn't determine a Baltimore County councilmanic district for this address. It may be outside Baltimore County or our data may be incomplete.";

const BALTIMORE_CITY_ERROR =
  "This address appears to be in Baltimore City, not Baltimore County. This tool only covers Baltimore County councilmanic districts.";

const BALTIMORE_CITY_HELP_LINK = {
  href: "https://www.baltimorecity.gov/boe/our-work/election-information",
  label: "Find more info about your local elections here.",
};

async function outsideCountyError(
  points: GeocodeResult[]
): Promise<{
  error: string;
  helpLink?: { href: string; label: string };
  countyGeoid?: string | null;
  countyName?: string | null;
}> {
  for (const p of points) {
    if (isBaltimoreCityGeocode(p)) {
      return {
        error: BALTIMORE_CITY_ERROR,
        helpLink: BALTIMORE_CITY_HELP_LINK,
        countyGeoid: p.countyGeoid,
        countyName: p.countyName,
      };
    }
  }
  const probe = points[0];
  if (probe) {
    const county = await getCensusCountyAtPoint(probe.x, probe.y);
    if (county && isBaltimoreCityGeocode(county)) {
      return {
        error: BALTIMORE_CITY_ERROR,
        helpLink: BALTIMORE_CITY_HELP_LINK,
        countyGeoid: county.countyGeoid,
        countyName: county.countyName,
      };
    }
    if (county) {
      return {
        error: GENERIC_OUTSIDE_COUNTY_ERROR,
        countyGeoid: county.countyGeoid,
        countyName: county.countyName,
      };
    }
  }
  return { error: GENERIC_OUTSIDE_COUNTY_ERROR };
}

export async function GET(request: NextRequest) {
  const meta = getRequestMeta(request);
  const address = request.nextUrl.searchParams.get("address");
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const debugLookup =
    process.env.DEBUG_LOOKUP === "1" || process.env.DEBUG_LOOKUP === "true";

  const rate = await checkLookupRateLimit(meta.ip);
  if (!rate.success) {
    console.warn(
      `[lookup] rate_limited ip=${meta.ip} ua=${meta.ua ?? ""} address=${address ?? ""}`
    );
    await logLookup(
      {
        ts: Date.now(),
        address: address?.trim() ?? "",
        status: "rate_limited",
        location: null,
        currentDistrictId: null,
        futureDistrictId: null,
      },
      meta
    );
    return rateLimitResponse(rate);
  }

  if (!address || typeof address !== "string" || !address.trim()) {
    if (debug || debugLookup) {
      console.log("[lookup] missing or empty address:", address);
    }
    await logLookup(
      {
        ts: Date.now(),
        address: address ?? "",
        status: "missing_address",
        location: null,
        currentDistrictId: null,
        futureDistrictId: null,
      },
      meta
    );
    return NextResponse.json(
      { success: false, error: "Missing or empty address." },
      { status: 400 }
    );
  }

  const trimmed = address.trim();

  try {
    const first = await geocodeAddress(trimmed);
    if (!first) {
      if (debug || debugLookup) {
        console.log("[lookup] no_location from geocodeAddress for:", trimmed);
      }
      await logLookup(
        {
          ts: Date.now(),
          address: trimmed,
          status: "no_location",
          location: null,
          currentDistrictId: null,
          futureDistrictId: null,
        },
        meta
      );
      const body: {
        success: false;
        error: string;
        _debug?: Record<string, unknown>;
      } = {
        success: false,
        error:
          "We couldn't determine a Baltimore County councilmanic district for this address. It may be outside Baltimore County or our data may be incomplete.",
      };
      if (debug) {
        body._debug = { stage: "geocode", address: trimmed };
      }
      return NextResponse.json(body, { status: 200 });
    }

    // Try the primary geocode, then alternate providers if this point misses
    // both district layers (common for large campuses where OSM ≠ Census).
    const triedKeys = new Set<string>();
    const triedResults: GeocodeResult[] = [];
    const queue: GeocodeResult[] = [first];
    let location: GeocodeResult | null = null;
    let currentDistrict = null as Awaited<ReturnType<typeof getCurrentDistrict>>;
    let futureDistrict = null as Awaited<ReturnType<typeof getFutureDistrict>>;
    let loadedAlternates = false;

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      const key = pointKey(candidate);
      if (triedKeys.has(key)) continue;
      triedKeys.add(key);
      triedResults.push(candidate);

      const [current, future] = await Promise.all([
        getCurrentDistrict(candidate.x, candidate.y),
        getFutureDistrict(candidate.x, candidate.y),
      ]);

      if (current != null || future != null) {
        location = candidate;
        currentDistrict = current;
        futureDistrict = future;
        break;
      }

      if (!loadedAlternates) {
        loadedAlternates = true;
        const alternates = await geocodeAddressCandidates(trimmed);
        for (const alt of alternates) {
          if (!triedKeys.has(pointKey(alt))) queue.push(alt);
        }
        if (debug || debugLookup) {
          console.log(
            "[lookup] primary geocode missed districts; trying",
            alternates.length,
            "candidates"
          );
        }
      }
    }

    if (!location) {
      if (debug || debugLookup) {
        console.log("[lookup] no_district for any geocode candidate:", {
          tried: [...triedKeys],
        });
      }
      const outside = await outsideCountyError(triedResults);
      await logLookup(
        {
          ts: Date.now(),
          address: trimmed,
          status: "no_district",
          location: { x: first.x, y: first.y },
          currentDistrictId: null,
          futureDistrictId: null,
        },
        meta
      );
      const body: {
        success: false;
        error: string;
        helpLink?: { href: string; label: string };
        _debug?: Record<string, unknown>;
      } = {
        success: false,
        error: outside.error,
        ...(outside.helpLink ? { helpLink: outside.helpLink } : {}),
      };
      if (debug) {
        body._debug = {
          stage: "district_lookup",
          location: { x: first.x, y: first.y },
          triedCandidates: [...triedKeys],
          countyGeoid: outside.countyGeoid ?? null,
          countyName: outside.countyName ?? null,
        };
      }
      return NextResponse.json(body, { status: 200 });
    }

    await logLookup(
      {
        ts: Date.now(),
        address: trimmed,
        status: "success",
        location: { x: location.x, y: location.y },
        currentDistrictId: currentDistrict?.districtId ?? null,
        futureDistrictId: futureDistrict?.districtId ?? null,
      },
      meta
    );

    // Use the geocoder’s normalized address (e.g. Census “Glen Arm”) so the result shows the correct locality, not the suggestion’s “Towson”.
    const displayAddress = location.address?.trim() ?? trimmed;

    const body: {
      success: true;
      address: string;
      location: { x: number; y: number };
      currentDistrict?: unknown;
      futureDistrict?: unknown;
      _debug?: Record<string, unknown>;
    } = {
      success: true,
      address: displayAddress,
      location: { x: location.x, y: location.y },
      currentDistrict: currentDistrict ?? undefined,
      futureDistrict: futureDistrict ?? undefined,
    };
    if (debug) {
      body._debug = {
        stage: "success",
        location: { x: location.x, y: location.y },
        currentDistrictId: currentDistrict?.districtId ?? null,
        futureDistrictId: futureDistrict?.districtId ?? null,
        triedCandidates: [...triedKeys],
      };
    }
    if (debug || debugLookup) {
      console.log(
        "[lookup] success:",
        body._debug ?? {
          location: { x: location.x, y: location.y },
          currentDistrictId: currentDistrict?.districtId ?? null,
          futureDistrictId: futureDistrict?.districtId ?? null,
        }
      );
    }
    return NextResponse.json(body);
  } catch (err) {
    console.error("[lookup] unhandled error for address:", trimmed, err);
    await logLookup(
      {
        ts: Date.now(),
        address: trimmed,
        status: "error",
        location: null,
        currentDistrictId: null,
        futureDistrictId: null,
      },
      meta
    );
    const body: {
      success: false;
      error: string;
      _debug?: Record<string, unknown>;
    } = {
      success: false,
      error:
        "Something went wrong while looking up this address. Please try again in a moment.",
    };
    if (debug) {
      body._debug = { stage: "exception" };
    }
    return NextResponse.json(body, { status: 500 });
  }
}
