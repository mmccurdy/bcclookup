"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type LookupLogStatus =
  | "missing_address"
  | "no_location"
  | "no_district"
  | "success";

type LookupLogEntry = {
  ts: number;
  address: string;
  status: LookupLogStatus;
  location?: { x: number; y: number } | null;
  currentDistrictId?: string | null;
  futureDistrictId?: string | null;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusLabel(status: LookupLogStatus): string {
  switch (status) {
    case "success":
      return "Success";
    case "no_location":
      return "No coords";
    case "no_district":
      return "No district";
    case "missing_address":
      return "Missing address";
    default:
      return status;
  }
}

function statusClass(status: LookupLogStatus): string {
  switch (status) {
    case "success":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "no_location":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "no_district":
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    case "missing_address":
      return "bg-slate-500/20 text-slate-400 border-slate-500/40";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/40";
  }
}

export default function AdminLookupsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [limit, setLimit] = useState("100");
  const [items, setItems] = useState<LookupLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLookups = useCallback(async () => {
    if (!token) return;
    setError(null);
    setItems(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/lookups?limit=${encodeURIComponent(limit.trim() || "100")}`,
        { headers: { "x-admin-token": token } }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to load lookups.");
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [token, limit]);

  useEffect(() => {
    if (token) loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    loadLookups();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-50">Lookup logs</h1>
          <p className="mt-1 text-sm text-slate-400">
            View recent address lookups stored in Redis. Pass the admin token as{" "}
            <code className="text-slate-300">?token=…</code> or{" "}
            <code className="text-slate-300">x-admin-token</code> header.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-lg"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Limit
            </span>
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:ring-2 focus:ring-yellow-400 outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-yellow-400 px-4 py-2 text-slate-900 font-semibold hover:bg-yellow-300 focus:ring-2 focus:ring-yellow-300 outline-none disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load lookups"}
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/60 bg-red-950/50 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        {items && (
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-semibold text-slate-300 whitespace-nowrap">
                      Time
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-300">
                      Address
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-300 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-300 whitespace-nowrap">
                      Current
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-300 whitespace-nowrap">
                      Future
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No lookups recorded yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((row, i) => (
                      <tr
                        key={`${row.ts}-${i}`}
                        className="border-b border-slate-700/70 hover:bg-slate-800/50 even:bg-slate-900/50"
                      >
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {formatDate(row.ts)}
                        </td>
                        <td className="px-4 py-3 text-slate-200 max-w-xs truncate" title={row.address}>
                          {row.address || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${statusClass(
                              row.status
                            )}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {row.currentDistrictId ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {row.futureDistrictId ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {items.length > 0 && (
              <div className="border-t border-slate-700 px-4 py-2 text-xs text-slate-500">
                Showing {items.length} most recent lookup
                {items.length !== 1 ? "s" : ""}.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
