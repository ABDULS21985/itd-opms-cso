"use client";

import { useState, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useSearchUsers } from "@/hooks/use-system";
import type { UserSearchResult } from "@/types";

export function UserSearchAutocomplete({
  value,
  displayValue,
  onChange,
}: {
  value: string | undefined;
  displayValue: string;
  onChange: (userId: string | undefined, displayName: string) => void;
}) {
  const [query, setQuery] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearchUsers(debouncedQuery);

  function handleSelect(user: UserSearchResult) {
    onChange(user.id, user.displayName);
    setQuery(user.displayName);
    setOpen(false);
  }

  function handleClear() {
    onChange(undefined, "");
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) handleClear();
          }}
          onFocus={() => {
            if (query.length >= 2) setOpen(true);
          }}
          placeholder="Search for a manager..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-8 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--neutral-gray)]">
              <Loader2 size={14} className="animate-spin" />
              Searching...
            </div>
          ) : results && results.length > 0 ? (
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-1)] first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)] truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-[var(--neutral-gray)]">
              No users found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
