import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const provided =
    request.headers.get("x-admin-token") ??
    request.nextUrl.searchParams.get("token");

  if (!adminToken || !provided || provided !== adminToken) {
    return new NextResponse(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/"] };
