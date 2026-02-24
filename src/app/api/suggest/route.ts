import { NextRequest, NextResponse } from "next/server";
import { getUSPSAddressSuggestions } from "@/lib/smarty";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? request.nextUrl.searchParams.get("address");
  if (!q || typeof q !== "string") {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await getUSPSAddressSuggestions(q.trim(), 8);
  return NextResponse.json({ suggestions });
}
