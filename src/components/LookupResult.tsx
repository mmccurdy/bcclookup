"use client";

import type { LookupResponse, LookupError } from "@/app/page";

type Props = { result: LookupResponse | LookupError };

const STREET_SUFFIXES: Record<string, string> = {
  RD: "Rd", ST: "St", CT: "Ct", DR: "Dr", LN: "Ln", WAY: "Way",
  AVE: "Ave", BLVD: "Blvd", HWY: "Hwy", PL: "Pl", CIR: "Cir", TRL: "Trl",
};

function formatAddressForDisplay(addr: string): string {
  const parts = addr.split(",").map((p) => p.trim());
  return parts
    .map((part) => {
      if (/^[A-Z]{2}$/i.test(part) || /^\d{5}(-\d{4})?$/.test(part)) return part.toUpperCase();
      return part
        .split(/\s+/)
        .map((word) => {
          const upper = word.toUpperCase();
          if (STREET_SUFFIXES[upper]) return STREET_SUFFIXES[upper];
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
    })
    .join(", ");
}

export function LookupResult({ result }: Props) {
  if (!result.success) {
    return (
      <div className="mt-8 rounded-xl border border-red-500/60 bg-red-950/70 px-4 py-3 text-sm text-red-100 shadow-md shadow-black/40">
        <p className="font-medium">We hit a snag.</p>
        <p className="mt-1 text-red-100/90">{result.error}</p>
      </div>
    );
  }

  const { address, currentDistrict, futureDistrict } = result;
  const displayAddress = formatAddressForDisplay(address);

  return (
    <div className="mt-8 space-y-6">
      <p className="text-slate-200 text-sm">
        Results for <strong>{displayAddress}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 py-4 shadow-lg shadow-black/40">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-yellow-400 via-red-600 to-black" />
          <h2 className="pl-3 text-xs font-semibold text-slate-300 uppercase tracking-[0.18em]">
            Current district
          </h2>
          {currentDistrict ? (
            <p className="mt-3 pl-3 text-2xl font-semibold text-slate-50">
              District <span className="text-yellow-300">{currentDistrict.districtId}</span>
            </p>
          ) : (
            <p className="mt-3 pl-3 text-sm text-slate-400">
              Could not determine current district.
            </p>
          )}
        </section>

        <section className="relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 py-4 shadow-lg shadow-black/40">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-yellow-400 via-red-600 to-black" />
          <h2 className="pl-3 text-xs font-semibold text-slate-300 uppercase tracking-[0.18em]">
            Future district (2026)
          </h2>
          {futureDistrict ? (
            <>
              <p className="mt-3 pl-3 text-2xl font-semibold text-slate-50">
                District <span className="text-yellow-300">{futureDistrict.districtId}</span>
              </p>
              {String(futureDistrict.districtId) === "7" && (
                <p className="mt-3 pl-3 text-xs sm:text-sm text-yellow-200">
                  <a
                    href="https://cariforcouncil.org/?utm_source=bcclookup&utm_medium=referral&utm_campaign=voter_outreach_2026"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline decoration-yellow-300 underline-offset-2 hover:text-yellow-100"
                  >
                    Cari for Council
                  </a>
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 pl-3 text-sm text-slate-400">
              Could not determine future district.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
