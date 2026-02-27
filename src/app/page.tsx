"use client";

import { useState } from "react";
import { LookupForm } from "@/components/LookupForm";
import { LookupResult } from "@/components/LookupResult";

export type LookupResponse = {
  success: true;
  address: string;
  location?: { x: number; y: number };
  currentDistrict?: {
    districtId: string;
    name?: string;
    representative?: string;
    [key: string]: unknown;
  };
  futureDistrict?: {
    districtId: string;
    name?: string;
    [key: string]: unknown;
  };
};

export type LookupError = {
  success: false;
  error: string;
};

export default function Home() {
  const [result, setResult] = useState<LookupResponse | LookupError | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <section className="relative rounded-2xl border border-slate-700/70 bg-slate-900/70 shadow-2xl shadow-black/50 px-5 py-8 sm:px-8 sm:py-10 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-yellow-400 via-red-600 to-black" />

        <header className="text-center mb-8 sm:mb-10">

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 leading-tight">
            <span>Baltimore County</span>
            <span className="block sm:inline sm:ml-2">
              Councilmanic District Lookup
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Enter your address to see your current and future (2026)<br /> Baltimore
            County Council district.
          </p>
        </header>

        <LookupForm
          onResult={setResult}
          onLoading={setLoading}
          loading={loading}
        />

        {result && <LookupResult result={result} />}

        <footer className="mt-10 pt-4 border-t border-slate-700 text-center text-xs sm:text-sm text-slate-400">
          <p>
            This is an unofficial tool based on Baltimore County GIS data.
          </p> 
          <p>You can verify your 2026
            district with the{" "}
            <a
              href="https://voterservices.elections.maryland.gov/VoterSearch"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-yellow-400/70 underline-offset-2 hover:text-slate-200"
            >
              Maryland State Board of Elections
            </a>
            .
          </p>
        </footer>
      </section>
    </main>
  );
}
