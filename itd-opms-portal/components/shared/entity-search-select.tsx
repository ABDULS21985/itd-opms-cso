"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { Search, X, Loader2, ChevronDown, AlertCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EntitySearchSelectProps<T> {
  /** Field label. */
  label?: string;
  /** Input placeholder. */
  placeholder?: string;
  /** Helper text shown below the field. */
  description?: string;
  /** Validation error message. */
  error?: string;
  /** Mark as required (shows red asterisk). */
  required?: boolean;
  /** Disable interaction. */
  disabled?: boolean;

  /** Currently selected item ID (controlled). */
  value: string | undefined;
  /** Human-readable display label for the selected value. */
  displayValue: string;
  /** Called when the user picks or clears a selection. */
  onChange: (id: string | undefined, label: string) => void;

  /** Items to render in the dropdown. */
  items: T[];
  /** Whether items are currently loading. */
  isLoading?: boolean;

  /** Extract the unique ID from an item. */
  getItemId: (item: T) => string;
  /** Extract the primary display label from an item. */
  getItemLabel: (item: T) => string;
  /** Optional subtitle (e.g., email, code). */
  getItemSubtitle?: (item: T) => string | undefined;
  /** Custom render for each dropdown option. If omitted, default layout is used. */
  renderOption?: (item: T, isHighlighted: boolean) => ReactNode;

  /** Called when the search query changes (for async search). */
  onSearch?: (query: string) => void;
  /** Minimum characters before triggering search. Default 0. */
  minSearchLength?: number;
  /** Whether to filter items client-side (for small, pre-loaded lists). Default false. */
  clientSideFilter?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EntitySearchSelect<T>({
  label,
  placeholder = "Search...",
  description,
  error,
  required = false,
  disabled = false,
  value,
  displayValue,
  onChange,
  items,
  isLoading = false,
  getItemId,
  getItemLabel,
  getItemSubtitle,
  renderOption,
  onSearch,
  minSearchLength = 0,
  clientSideFilter = false,
}: EntitySearchSelectProps<T>) {
  const [query, setQuery] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync display value when parent changes it externally.
  useEffect(() => {
    setQuery(displayValue);
  }, [displayValue]);

  // Close on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search callback.
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => {
      if (query.length >= minSearchLength) {
        onSearch(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch, minSearchLength]);

  // Client-side filtered items.
  const visibleItems = clientSideFilter
    ? items.filter((item) => {
        const q = query.toLowerCase();
        if (!q) return true;
        const label = getItemLabel(item).toLowerCase();
        const subtitle = getItemSubtitle?.(item)?.toLowerCase() ?? "";
        return label.includes(q) || subtitle.includes(q);
      })
    : items;

  // Reset highlight when items change.
  useEffect(() => {
    setHighlightIdx(-1);
  }, [visibleItems.length]);

  const handleSelect = useCallback(
    (item: T) => {
      onChange(getItemId(item), getItemLabel(item));
      setQuery(getItemLabel(item));
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange, getItemId, getItemLabel],
  );

  const handleClear = useCallback(() => {
    onChange(undefined, "");
    setQuery("");
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIdx((prev) =>
            prev < visibleItems.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIdx((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIdx >= 0 && highlightIdx < visibleItems.length) {
            handleSelect(visibleItems[highlightIdx]);
          }
          break;
        case "Escape":
          setOpen(false);
          setQuery(displayValue);
          break;
      }
    },
    [open, visibleItems, highlightIdx, handleSelect, displayValue],
  );

  // Scroll highlighted item into view.
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  const shouldShowDropdown =
    open && (query.length >= minSearchLength || clientSideFilter);

  return (
    <div ref={containerRef} className={label ? "space-y-0" : ""}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--error)] ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) handleClear();
          }}
          onFocus={() => {
            if (query.length >= minSearchLength || clientSideFilter)
              setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-xl border bg-[var(--surface-0)] pl-9 pr-16 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors ${
            error
              ? "border-[var(--error)] ring-2 ring-[var(--error)]/10"
              : "border-[var(--border)]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-[var(--neutral-gray)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {shouldShowDropdown && (
        <div
          ref={listRef}
          className="relative z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg max-h-56 overflow-y-auto"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--neutral-gray)]">
              <Loader2 size={14} className="animate-spin" />
              Searching...
            </div>
          ) : visibleItems.length > 0 ? (
            visibleItems.map((item, idx) => {
              const isHighlighted = idx === highlightIdx;
              if (renderOption) {
                return (
                  <div
                    key={getItemId(item)}
                    onClick={() => handleSelect(item)}
                    className={`cursor-pointer transition-colors ${
                      isHighlighted ? "bg-[var(--surface-1)]" : ""
                    } first:rounded-t-xl last:rounded-b-xl`}
                  >
                    {renderOption(item, isHighlighted)}
                  </div>
                );
              }

              const subtitle = getItemSubtitle?.(item);
              return (
                <button
                  key={getItemId(item)}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-1)] first:rounded-t-xl last:rounded-b-xl ${
                    isHighlighted ? "bg-[var(--surface-1)]" : ""
                  } ${getItemId(item) === value ? "bg-[var(--primary)]/5" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {getItemLabel(item)}
                    </p>
                    {subtitle && (
                      <p className="text-xs text-[var(--neutral-gray)] truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {getItemId(item) === value && (
                    <span className="shrink-0 text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-[var(--neutral-gray)]">
              {query.length < minSearchLength
                ? `Type at least ${minSearchLength} characters...`
                : "No results found"}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1 text-xs text-[var(--error)] mt-1.5 font-medium">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {/* Description */}
      {description && !error && (
        <p className="text-xs text-[var(--neutral-gray)] mt-1">
          {description}
        </p>
      )}
    </div>
  );
}
