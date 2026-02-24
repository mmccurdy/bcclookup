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
    <main className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
      <header className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          <p>Baltimore County</p>
          <p>Councilmanic District Lookup</p>
        </h1>
        <p className="mt-2 text-slate-600">
          Enter your address to see your current and future (2026) council
          district.
        </p>
      </header>

      <LookupForm
        onResult={setResult}
        onLoading={setLoading}
        loading={loading}
      />

      {result && <LookupResult result={result} />}

      <footer className="mt-16 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
        <p>
          Data from Baltimore County GIS. This tool is unofficial. Verify
          district with{" "}
          <a
            href="https://www.baltimorecountymd.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700"
          >
            Baltimore County
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
