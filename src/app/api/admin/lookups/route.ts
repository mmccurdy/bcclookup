import { NextRequest, NextResponse } from "next/server";
import { getRecentLookups } from "@/lib/log";

export async function GET(request: NextRequest) {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const provided =
    request.headers.get("x-admin-token") ??
    request.nextUrl.searchParams.get("token");

  if (!adminToken || !provided || provided !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit =
    limitParam && !Number.isNaN(Number(limitParam))
      ? Math.min(Math.max(Number(limitParam), 1), 500)
      : 100;

  const items = await getRecentLookups(limit);
  return NextResponse.json({ items });
}

