import { NextRequest, NextResponse } from "next/server";
import { deleteLookupByIndex, getRecentLookups } from "@/lib/log";

function checkAuth(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const provided =
    request.headers.get("x-admin-token") ??
    request.nextUrl.searchParams.get("token");
  return Boolean(adminToken && provided && provided === adminToken);
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
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

export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const indexParam = request.nextUrl.searchParams.get("index");
  const index =
    indexParam !== null && indexParam !== "" && !Number.isNaN(Number(indexParam))
      ? Number(indexParam)
      : NaN;

  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json(
      { error: "Missing or invalid index (non-negative integer)." },
      { status: 400 }
    );
  }

  const removed = await deleteLookupByIndex(index);
  if (!removed) {
    return NextResponse.json(
      { error: "Index out of range or delete failed." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

