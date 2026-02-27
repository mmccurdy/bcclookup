import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";
import { getCurrentDistrict, getFutureDistrict } from "@/lib/districts";
import { logLookup } from "@/lib/log";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || typeof address !== "string" || !address.trim()) {
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

  const location = await geocodeAddress(address.trim());
  if (!location) {
    await logLookup({
      ts: Date.now(),
      address: address.trim(),
      status: "no_location",
      location: null,
      currentDistrictId: null,
      futureDistrictId: null,
    });
    return NextResponse.json(
      {
        success: false,
        error:
          "We couldn't determine a Baltimore County councilmanic district for this address. It may be outside Baltimore County or our data may be incomplete.",
      },
      { status: 200 }
    );
  }

  const [currentDistrict, futureDistrict] = await Promise.all([
    getCurrentDistrict(location.x, location.y),
    getFutureDistrict(location.x, location.y),
  ]);

  const hasAnyDistrict = currentDistrict != null || futureDistrict != null;
  if (!hasAnyDistrict) {
    await logLookup({
      ts: Date.now(),
      address: address.trim(),
      status: "no_district",
      location: { x: location.x, y: location.y },
      currentDistrictId: null,
      futureDistrictId: null,
    });
    return NextResponse.json(
      {
        success: false,
        error:
          "We couldn't determine a Baltimore County councilmanic district for this address. It may be outside Baltimore County or our data may be incomplete.",
      },
      { status: 200 }
    );
  }

  await logLookup({
    ts: Date.now(),
    address: address.trim(),
    status: "success",
    location: { x: location.x, y: location.y },
    currentDistrictId: currentDistrict?.districtId ?? null,
    futureDistrictId: futureDistrict?.districtId ?? null,
  });

  return NextResponse.json({
    success: true,
    address: address.trim(),
    location: { x: location.x, y: location.y },
    currentDistrict: currentDistrict ?? undefined,
    futureDistrict: futureDistrict ?? undefined,
  });
}
