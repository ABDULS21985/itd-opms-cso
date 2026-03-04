"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Users, CheckSquare, Square } from "lucide-react";
import { useSearchUsers } from "@/hooks/use-system";
import type { UserSearchResult } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SelectedAttendee {
  id: string;
  displayName: string;
  email: string;
}

interface AttendeeSelectorProps {
  selected: SelectedAttendee[];
  onChange: (attendees: SelectedAttendee[]) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AttendeeSelector({
  selected,
  onChange,
}: AttendeeSelectorProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: results, isLoading } = useSearchUsers(debouncedQuery);

  const selectedIds = new Set(selected.map((a) => a.id));

  // Filter out already-selected users from results
  const filteredResults = results?.filter((u) => !selectedIds.has(u.id)) ?? [];
  const allResults = results ?? [];

  const handleSelect = useCallback(
    (user: UserSearchResult) => {
      if (selectedIds.has(user.id)) {
        onChange(selected.filter((a) => a.id !== user.id));
      } else {
        onChange([
          ...selected,
          { id: user.id, displayName: user.displayName, email: user.email },
        ]);
      }
    },
    [selected, selectedIds, onChange],
  );

  const handleSelectAll = useCallback(() => {
    if (!allResults.length) return;

    // Check if all results are already selected
    const allSelected = allResults.every((u) => selectedIds.has(u.id));

    if (allSelected) {
      // Deselect all from current results
      const resultIds = new Set(allResults.map((u) => u.id));
      onChange(selected.filter((a) => !resultIds.has(a.id)));
    } else {
      // Add all unselected results
      const newAttendees = allResults
        .filter((u) => !selectedIds.has(u.id))
        .map((u) => ({
          id: u.id,
          displayName: u.displayName,
          email: u.email,
        }));
      onChange([...selected, ...newAttendees]);
    }
  }, [allResults, selected, selectedIds, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(selected.filter((a) => a.id !== id));
    },
    [selected, onChange],
  );

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const allResultsSelected =
    allResults.length > 0 && allResults.every((u) => selectedIds.has(u.id));

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        Attendees
      </label>

      {/* Selected attendees chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((attendee) => (
            <span
              key={attendee.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[9px] font-bold">
                {attendee.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate max-w-[140px]">
                {attendee.displayName}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(attendee.id)}
                className="shrink-0 rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {selected.length > 1 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--neutral-gray)] hover:text-[var(--error)] hover:border-[var(--error)]/30 transition-colors"
            >
              <X size={10} />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setOpen(true);
          }}
          placeholder="Search users by name or email..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        {selected.length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-[var(--neutral-gray)]">
            <Users size={12} />
            {selected.length}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && debouncedQuery.length >= 2 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--neutral-gray)]">
              <Loader2 size={14} className="animate-spin" />
              Searching...
            </div>
          ) : allResults.length > 0 ? (
            <>
              {/* Select All row */}
              {allResults.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-1)] border-b border-[var(--border)]"
                >
                  {allResultsSelected ? (
                    <CheckSquare
                      size={16}
                      className="text-[var(--primary)] shrink-0"
                    />
                  ) : (
                    <Square
                      size={16}
                      className="text-[var(--neutral-gray)] shrink-0"
                    />
                  )}
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {allResultsSelected
                      ? "Deselect All"
                      : `Select All (${allResults.length})`}
                  </span>
                </button>
              )}

              {/* User rows */}
              {allResults.map((user) => {
                const isSelected = selectedIds.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-1)] ${
                      isSelected ? "bg-[var(--primary)]/5" : ""
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare
                        size={14}
                        className="text-[var(--primary)] shrink-0"
                      />
                    ) : (
                      <Square
                        size={14}
                        className="text-[var(--neutral-gray)] shrink-0"
                      />
                    )}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)] truncate">
                        {user.email}
                        {user.department && ` · ${user.department}`}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="shrink-0 text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-[var(--neutral-gray)]">
              No users found
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-[var(--neutral-gray)]">
        Search and select users to invite to this meeting.
      </p>
    </div>
  );
}
