"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import type {
  AdminColumn,
  SortState,
  SortDirection,
  ActiveFilter,
} from "@/components/admin/admin-data-table/types";

/* ──────────────────────────────────────────────
   Options
   ────────────────────────────────────────────── */

export interface UseAdminTableOptions {
  tableId: string;
  columns: AdminColumn<any>[];
  defaultSort?: SortState;
  defaultPageSize?: number;
  syncToUrl?: boolean;
}

/* ──────────────────────────────────────────────
   Hook
   ────────────────────────────────────────────── */

export function useAdminTable(options: UseAdminTableOptions) {
  const {
    columns,
    defaultSort,
    defaultPageSize = 20,
    syncToUrl = true,
  } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Read initial state from URL ───────────────
  const urlQ = syncToUrl ? searchParams.get("q") ?? "" : "";
  const urlPage = syncToUrl
    ? parseInt(searchParams.get("page") ?? "1", 10)
    : 1;
  const urlLimit = syncToUrl
    ? parseInt(searchParams.get("limit") ?? String(defaultPageSize), 10)
    : defaultPageSize;
  const urlSortBy = syncToUrl
    ? searchParams.get("sort") ?? defaultSort?.key ?? ""
    : defaultSort?.key ?? "";
  const urlSortOrder = syncToUrl
    ? (searchParams.get("order") as SortDirection) ?? defaultSort?.direction ?? null
    : defaultSort?.direction ?? null;

  // ── State ─────────────────────────────────────
  const [searchValue, setSearchValue] = useState(urlQ);
  const debouncedSearch = useDebounce(searchValue, 300);

  const [filters, setFilters] = useState<Record<string, any>>(() => {
    if (!syncToUrl) return {};
    const initial: Record<string, any> = {};
    // Read column filter keys from URL
    for (const col of columns) {
      if (col.filter) {
        const val = searchParams.get(col.key);
        if (val !== null && val !== "") {
          if (col.filter.type === "date-range" || col.filter.type === "number-range") {
            const from = searchParams.get(`${col.key}From`);
            const to = searchParams.get(`${col.key}To`);
            if (from || to) initial[col.key] = [from ?? "", to ?? ""];
          } else {
            initial[col.key] = val;
          }
        }
      }
    }
    return initial;
  });

  const [sort, setSort] = useState<SortState>({
    key: urlSortBy,
    direction: urlSortOrder,
  });

  const [page, setPage] = useState(urlPage);
  const [pageSize, setPageSize] = useState(urlLimit);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── URL sync (write) ──────────────────────────
  useEffect(() => {
    if (!syncToUrl) return;

    const params = new URLSearchParams();

    if (debouncedSearch) params.set("q", debouncedSearch);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== defaultPageSize) params.set("limit", String(pageSize));
    if (sort.key && sort.direction) {
      params.set("sort", sort.key);
      params.set("order", sort.direction);
    }

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        if (value[0]) params.set(`${key}From`, value[0]);
        if (value[1]) params.set(`${key}To`, value[1]);
      } else {
        params.set(key, String(value));
      }
    }

    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, pageSize, sort, filters, syncToUrl]);

  // ── Reset page when filters change ────────────
  const setFilterValue = useCallback((key: string, value: any) => {
    setFilters((prev) => {
      if (value === undefined || value === null || value === "") {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
    setSelectedIds([]);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchValue("");
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handleSort = useCallback((newSort: SortState) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    setSelectedIds([]);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchValue(q);
    setPage(1);
    setSelectedIds([]);
  }, []);

  // ── Active filter chips ───────────────────────
  const activeFilterChips = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;
      const col = columns.find((c) => c.key === key);
      const label = col?.header ?? key;

      if (Array.isArray(value)) {
        const display = [value[0], value[1]].filter(Boolean).join(" - ");
        if (display) chips.push({ key, label, value: value as [string, string], displayValue: display });
      } else {
        // For select filters, find the option label
        const opt = col?.filter?.options?.find((o) => o.value === String(value));
        chips.push({
          key,
          label,
          value: String(value),
          displayValue: opt?.label ?? String(value).replace(/_/g, " "),
        });
      }
    }
    return chips;
  }, [filters, columns]);

  // ── Merged query filters for React Query ──────
  const queryFilters = useMemo(() => {
    const qf: Record<string, any> = {};
    if (debouncedSearch) qf.search = debouncedSearch;
    qf.page = page;
    qf.limit = pageSize;
    if (sort.key && sort.direction) {
      qf.sort = sort.key;
      qf.order = sort.direction;
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        if (value[0]) qf[`${key}From`] = value[0];
        if (value[1]) qf[`${key}To`] = value[1];
      } else {
        qf[key] = value;
      }
    }
    return qf;
  }, [debouncedSearch, page, pageSize, sort, filters]);

  return {
    // State
    searchValue,
    filters,
    sort,
    page,
    pageSize,
    selectedIds,
    debouncedSearch,
    activeFilterChips,
    queryFilters,

    // Setters
    setSearch: handleSearch,
    setFilterValue,
    setSort: handleSort,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    setSelectedIds,
    clearFilters,
  };
}
