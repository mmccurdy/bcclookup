import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";
import { getCurrentDistrict, getFutureDistrict } from "@/lib/districts";
import { logLookup } from "@/lib/log";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const debugLookup = process.env.DEBUG_LOOKUP === "1" || process.env.DEBUG_LOOKUP === "true";

  if (!address || typeof address !== "string" || !address.trim()) {
    if (debug || debugLookup) {
      console.log("[lookup] missing or empty address:", address);
    }
    await logLookup({
      ts: Date.now(),
      address: address ?? "",
      status: "missing_address",
      location: null,
      currentDistrictId: null,
      futureDistrictId: null,
    });
    return NextResponse.json(
      { success: false, error: "Missing or empty address." },
      { status: 400 }
    );
  }

  const trimmed = address.trim();

  try {
    const location = await geocodeAddress(trimmed);
    if (!location) {
      if (debug || debugLookup) {
        console.log("[lookup] no_location from geocodeAddress for:", trimmed);
      }
      await logLookup({
        ts: Date.now(),
        address: trimmed,
        status: "no_location",
        location: null,
        currentDistrictId: null,
        futureDistrictId: null,
      });
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

    const [currentDistrict, futureDistrict] = await Promise.all([
      getCurrentDistrict(location.x, location.y),
      getFutureDistrict(location.x, location.y),
    ]);

    const hasAnyDistrict = currentDistrict != null || futureDistrict != null;
    if (!hasAnyDistrict) {
      if (debug || debugLookup) {
        console.log("[lookup] no_district for coords:", {
          x: location.x,
          y: location.y,
        });
      }
      await logLookup({
        ts: Date.now(),
        address: trimmed,
        status: "no_district",
        location: { x: location.x, y: location.y },
        currentDistrictId: null,
        futureDistrictId: null,
      });
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
        body._debug = {
          stage: "district_lookup",
          location: { x: location.x, y: location.y },
        };
      }
      return NextResponse.json(body, { status: 200 });
    }

    await logLookup({
      ts: Date.now(),
      address: trimmed,
      status: "success",
      location: { x: location.x, y: location.y },
      currentDistrictId: currentDistrict?.districtId ?? null,
      futureDistrictId: futureDistrict?.districtId ?? null,
    });

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
      };
    }
    if (debug || debugLookup) {
      console.log("[lookup] success:", body._debug ?? {
        location: { x: location.x, y: location.y },
        currentDistrictId: currentDistrict?.districtId ?? null,
        futureDistrictId: futureDistrict?.districtId ?? null,
      });
    }
    return NextResponse.json(body);
  } catch (err) {
    console.error("[lookup] unhandled error for address:", trimmed, err);
    await logLookup({
      ts: Date.now(),
      address: trimmed,
      status: "no_location",
      location: null,
      currentDistrictId: null,
      futureDistrictId: null,
    });
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
