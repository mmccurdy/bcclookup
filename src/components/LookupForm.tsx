"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export type LookupResponse = {
  success: true;
  address: string;
  location?: { x: number; y: number };
  currentDistrict?: { districtId: string; name?: string; representative?: string; [key: string]: unknown };
  futureDistrict?: { districtId: string; name?: string; [key: string]: unknown };
};

export type LookupError = {
  success: false;
  error: string;
};

type Props = {
  onResult: (result: LookupResponse | LookupError | null) => void;
  onLoading: (loading: boolean) => void;
  loading: boolean;
};

const SUGGEST_DEBOUNCE_MS = 300;
const MIN_LENGTH_FOR_SUGGEST = 2;

export function LookupForm({ onResult, onLoading, loading }: Props) {
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const skipNextSuggestRef = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced fetch suggestions
  useEffect(() => {
    if (skipNextSuggestRef.current) {
      skipNextSuggestRef.current = false;
      return;
    }
    if (address.length < MIN_LENGTH_FOR_SUGGEST) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSuggestLoading(true);
      fetch(`/api/suggest?q=${encodeURIComponent(address)}`)
        .then((r) => r.json())
        .then((data: { suggestions?: string[] }) => {
          const list = data.suggestions ?? [];
          setSuggestions(list);
          setSuggestOpen(list.length > 0);
          setHighlightedIndex(-1);
        })
        .catch(() => setSuggestions([]))
        .finally(() => {
          setSuggestLoading(false);
          debounceRef.current = null;
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [address]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
        setSuggestions([]);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelectSuggestion(s: string) {
    skipNextSuggestRef.current = true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setAddress(s);
    setSuggestions([]);
    setSuggestOpen(false);
    setHighlightedIndex(-1);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    const n = suggestions.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, n - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSuggestOpen(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  }

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const option = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
    option?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = (e.currentTarget.elements.namedItem("address") as HTMLInputElement)?.value?.trim();
    const value = raw ?? address.trim();
    if (!value) {
      onResult({ success: false, error: "Please enter an address." });
      return;
    }

    onLoading(true);
    onResult(null);

    try {
      const res = await fetch(`/api/lookup?address=${encodeURIComponent(value)}`);
      const data = await res.json();
      onResult(data);
    } catch {
      onResult({ success: false, error: "Network error. Please try again." });
    } finally {
      onLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div ref={wrapperRef} className="relative overflow-visible">
        <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
          Street address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Start typing your address"
          className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/80 text-slate-50 placeholder:text-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
          disabled={loading}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={suggestOpen}
          aria-controls="address-suggestions"
        />
        {suggestLoading && (
          <span className="absolute right-3 top-[2.6rem] text-slate-400 text-sm" aria-hidden>
            …
          </span>
        )}
        {suggestions.length > 0 && (
          <ul
            ref={listRef}
            id="address-suggestions"
            role="listbox"
            aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
            className="absolute z-50 w-full mt-1 py-1 bg-white border-2 border-slate-300 rounded-lg shadow-xl max-h-60 overflow-auto"
          >
            {suggestions.map((s, i) => (
              <li
                key={`${s}-${i}`}
                id={`suggestion-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === highlightedIndex}
                tabIndex={-1}
                className={`px-4 py-2.5 cursor-pointer outline-none ${
                  i === highlightedIndex ? "bg-slate-100 text-slate-900" : "text-slate-800 hover:bg-slate-100"
                }`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(s);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectSuggestion(s);
                  }
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-xs text-slate-500">
          Choose a USPS address from the list. Results are limited to Maryland.
        </p>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Looking up…" : "Find my district"}
      </button>
    </form>
  );
}
