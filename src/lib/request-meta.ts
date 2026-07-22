import { NextRequest } from "next/server";

export type RequestMeta = {
  ip: string;
  ua: string | null;
  referer: string | null;
};

/** Best-effort client identity from common proxy / CDN headers. */
export function getRequestMeta(request: NextRequest): RequestMeta {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded?.split(",")[0]?.trim() ||
    "unknown";

  return {
    ip,
    ua: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  };
}
