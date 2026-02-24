import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";
import { getCurrentDistrict, getFutureDistrict } from "@/lib/districts";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || typeof address !== "string" || !address.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing or empty address." },
      { status: 400 }
    );
  }

  const location = await geocodeAddress(address.trim());
  if (!location) {
    return NextResponse.json(
      { success: false, error: "We couldn't find coordinates for this address. Try a full USPS-style address (street, city, state ZIP)." },
      { status: 200 }
    );
  }

  const [currentDistrict, futureDistrict] = await Promise.all([
    getCurrentDistrict(location.x, location.y),
    getFutureDistrict(location.x, location.y),
  ]);

  const hasAnyDistrict = currentDistrict != null || futureDistrict != null;
  if (!hasAnyDistrict) {
    return NextResponse.json({
      success: false,
      error: "This address doesn't fall within a Baltimore County councilmanic district. It may be outside the county.",
    }, { status: 200 });
  }

  return NextResponse.json({
    success: true,
    address: address.trim(),
    location: { x: location.x, y: location.y },
    currentDistrict: currentDistrict ?? undefined,
    futureDistrict: futureDistrict ?? undefined,
  });
}
