import { NextRequest, NextResponse } from "next/server";
import { getGeoapifySuggestions } from "@/lib/geoapify";
import { getUSPSAddressSuggestions } from "@/lib/smarty";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? request.nextUrl.searchParams.get("address");
  if (!q || typeof q !== "string") {
    return NextResponse.json({ suggestions: [] });
  }

  const trimmed = q.trim();
  let suggestions = await getGeoapifySuggestions(trimmed, 8);
  if (suggestions.length === 0) {
    suggestions = await getUSPSAddressSuggestions(trimmed, 8);
  }
  return NextResponse.json({ suggestions });
}
