"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  Search,
  X,
  Loader2,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SelectedEntity {
  id: string;
  label: string;
  subtitle?: string;
}

export interface EntityMultiSelectProps<T> {
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

  /** Currently selected items (controlled). */
  selected: SelectedEntity[];
  /** Called when selection changes. */
  onChange: (items: SelectedEntity[]) => void;

  /** Items to render in the dropdown. */
  items: T[];
  /** Whether items are currently loading. */
  isLoading?: boolean;

  /** Extract the unique ID from an item. */
  getItemId: (item: T) => string;
  /** Extract the primary display label from an item. */
  getItemLabel: (item: T) => string;
  /** Optional subtitle (e.g., email, department). */
  getItemSubtitle?: (item: T) => string | undefined;
  /** Custom render for each dropdown option. If omitted, default layout is used. */
  renderOption?: (item: T, isSelected: boolean) => ReactNode;

  /** Called when the search query changes (for async search). */
  onSearch?: (query: string) => void;
  /** Minimum characters before triggering search. Default 2. */
  minSearchLength?: number;
  /** Whether to filter items client-side (for small, pre-loaded lists). Default false. */
  clientSideFilter?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EntityMultiSelect<T>({
  label,
  placeholder = "Search...",
  description,
  error,
  required = false,
  disabled = false,
  selected,
  onChange,
  items,
  isLoading = false,
  getItemId,
  getItemLabel,
  getItemSubtitle,
  renderOption,
  onSearch,
  minSearchLength = 2,
  clientSideFilter = false,
}: EntityMultiSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Trigger external search.
  useEffect(() => {
    if (onSearch && debouncedQuery.length >= minSearchLength) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch, minSearchLength]);

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

  const selectedIds = new Set(selected.map((s) => s.id));

  // Client-side filtered items.
  const visibleItems = clientSideFilter
    ? items.filter((item) => {
        const q = query.toLowerCase();
        if (!q) return true;
        const lbl = getItemLabel(item).toLowerCase();
        const sub = getItemSubtitle?.(item)?.toLowerCase() ?? "";
        return lbl.includes(q) || sub.includes(q);
      })
    : items;

  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedIds.has(getItemId(item)));

  const handleToggle = useCallback(
    (item: T) => {
      const id = getItemId(item);
      if (selectedIds.has(id)) {
        onChange(selected.filter((s) => s.id !== id));
      } else {
        onChange([
          ...selected,
          {
            id,
            label: getItemLabel(item),
            subtitle: getItemSubtitle?.(item),
          },
        ]);
      }
    },
    [selected, selectedIds, onChange, getItemId, getItemLabel, getItemSubtitle],
  );

  const handleSelectAll = useCallback(() => {
    if (!visibleItems.length) return;
    if (allVisibleSelected) {
      const visIds = new Set(visibleItems.map(getItemId));
      onChange(selected.filter((s) => !visIds.has(s.id)));
    } else {
      const newItems = visibleItems
        .filter((item) => !selectedIds.has(getItemId(item)))
        .map((item) => ({
          id: getItemId(item),
          label: getItemLabel(item),
          subtitle: getItemSubtitle?.(item),
        }));
      onChange([...selected, ...newItems]);
    }
  }, [
    visibleItems,
    allVisibleSelected,
    selected,
    selectedIds,
    onChange,
    getItemId,
    getItemLabel,
    getItemSubtitle,
  ]);

  const handleRemove = useCallback(
    (id: string) => onChange(selected.filter((s) => s.id !== id)),
    [selected, onChange],
  );

  const handleClearAll = useCallback(() => onChange([]), [onChange]);

  const shouldShowDropdown =
    open &&
    (debouncedQuery.length >= minSearchLength ||
      clientSideFilter ||
      query === "");

  return (
    <div ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--error)] ml-0.5">*</span>}
        </label>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[9px] font-bold">
                {item.label.charAt(0).toUpperCase()}
              </span>
              <span className="truncate max-w-[140px]">{item.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="shrink-0 rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors"
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))}
          {selected.length > 1 && !disabled && (
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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
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
            if (query.length >= minSearchLength || clientSideFilter)
              setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-xl border bg-[var(--surface-0)] pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors ${
            error
              ? "border-[var(--error)] ring-2 ring-[var(--error)]/10"
              : "border-[var(--border)]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        {selected.length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--neutral-gray)]">
            {selected.length} selected
          </span>
        )}
      </div>

      {/* Dropdown */}
      {shouldShowDropdown && (
        <div className="relative z-50 mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--neutral-gray)]">
              <Loader2 size={14} className="animate-spin" />
              Searching...
            </div>
          ) : visibleItems.length > 0 ? (
            <>
              {/* Select All */}
              {visibleItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-1)] border-b border-[var(--border)]"
                >
                  {allVisibleSelected ? (
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
                    {allVisibleSelected
                      ? "Deselect All"
                      : `Select All (${visibleItems.length})`}
                  </span>
                </button>
              )}

              {/* Items */}
              {visibleItems.map((item) => {
                const id = getItemId(item);
                const isSelected = selectedIds.has(id);

                if (renderOption) {
                  return (
                    <div
                      key={id}
                      onClick={() => handleToggle(item)}
                      className="cursor-pointer"
                    >
                      {renderOption(item, isSelected)}
                    </div>
                  );
                }

                const subtitle = getItemSubtitle?.(item);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleToggle(item)}
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
