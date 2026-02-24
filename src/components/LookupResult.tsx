"use client";

import type { LookupResponse, LookupError } from "@/app/page";

type Props = { result: LookupResponse | LookupError };

export function LookupResult({ result }: Props) {
  if (!result.success) {
    return (
      <div className="mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <p>{result.error}</p>
      </div>
    );
  }

  const { address, currentDistrict, futureDistrict } = result;

  return (
    <div className="mt-8 space-y-6">
      <p className="text-slate-600">
        Results for <strong>{address}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Current district
          </h2>
          {currentDistrict ? (
            <p className="mt-2 text-xl font-semibold text-slate-800">
              District {currentDistrict.districtId}
            </p>
          ) : (
            <p className="mt-2 text-slate-500">Could not determine district.</p>
          )}
        </section>

        <section className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Future district (2026)
          </h2>
          {futureDistrict ? (
            <p className="mt-2 text-xl font-semibold text-slate-800">
              District {futureDistrict.districtId}
            </p>
          ) : (
            <p className="mt-2 text-slate-500">Could not determine district.</p>
          )}
        </section>
      </div>
    </div>
  );
}
