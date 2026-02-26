"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import { Pagination } from "@/components/shared/pagination";
import type { AdminDataTableProps } from "./types";
import { useStickyHeaderShadow } from "./use-sticky-shadow";
import { TableToolbar } from "./table-toolbar";
import { ActiveFilterChips } from "./active-filter-chips";
import { BulkActionBar } from "./bulk-action-bar";
import { TableHeader } from "./table-header";
import { TableBody } from "./table-body";
import { MobileCardView } from "./mobile-card-view";

/* ──────────────────────────────────────────────
   Re-exports for convenience
   ────────────────────────────────────────────── */

export type {
  AdminColumn,
  AdminDataTableProps,
  BulkAction,
  SortState,
  SortDirection,
  PaginationState,
  ActiveFilter,
  FilterType,
  ColumnFilter,
  FilterOption,
} from "./types";

/* ──────────────────────────────────────────────
   Mobile breakpoint hook
   ────────────────────────────────────────────── */

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

/* ──────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────── */

export function AdminDataTable<T>({
  tableId,
  columns,
  data,
  keyExtractor,
  loading = false,
  error,
  onRetry,

  sort,
  onSort,

  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],

  searchValue = "",
  onSearch,
  searchPlaceholder,

  filters = {},
  onFilterChange,
  onClearFilters,
  activeFilters = [],

  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions = [],

  renderExpandedRow,
  onRowClick,
  renderCard,

  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,

  onExport,
  toolbarExtra,
  className = "",
}: AdminDataTableProps<T>) {
  // Column preferences
  const {
    preferences,
    setVisibility,
    setWidth,
    resetToDefaults,
  } = useColumnPreferences(tableId, columns);

  // Visible columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => preferences.visibility[col.key] !== false),
    [columns, preferences.visibility],
  );

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Selection helpers
  const allSelected =
    selectable && data.length > 0 && data.every((item) => selectedIds.includes(keyExtractor(item)));
  const someSelected =
    selectable && data.some((item) => selectedIds.includes(keyExtractor(item)));

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      // Deselect all on current page
      const pageIds = new Set(data.map(keyExtractor));
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      // Select all on current page
      const pageIds = data.map(keyExtractor);
      const combined = new Set([...selectedIds, ...pageIds]);
      onSelectionChange(Array.from(combined));
    }
  }, [allSelected, data, keyExtractor, onSelectionChange, selectedIds]);

  const handleToggleSelect = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((sid) => sid !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    },
    [onSelectionChange, selectedIds],
  );

  // Sticky header shadow
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolled = useStickyHeaderShadow(scrollRef);

  // Responsive
  const isMobile = useIsMobile();

  // Page key for animations
  const pageKey = pagination?.currentPage ?? 1;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Bulk action bar */}
      <AnimatePresence>
        {selectable && selectedIds.length > 0 && bulkActions.length > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.length}
            actions={bulkActions}
            selectedIds={selectedIds}
            onDeselectAll={() => onSelectionChange?.([])}
          />
        )}
      </AnimatePresence>

      {/* Toolbar */}
      {(onSearch || onFilterChange || onExport || toolbarExtra) && (
        <TableToolbar
          searchValue={searchValue}
          onSearch={onSearch ?? (() => {})}
          searchPlaceholder={searchPlaceholder}
          columns={columns}
          filters={filters}
          onFilterChange={onFilterChange ?? (() => {})}
          preferences={preferences}
          onVisibilityChange={setVisibility}
          onResetColumns={resetToDefaults}
          onExport={onExport}
          toolbarExtra={toolbarExtra}
        />
      )}

      {/* Active filter chips */}
      {activeFilters.length > 0 && onFilterChange && (
        <ActiveFilterChips
          filters={activeFilters}
          onRemove={(key) => onFilterChange(key, undefined)}
          onClearAll={onClearFilters ?? (() => {})}
        />
      )}

      {/* Mobile card view */}
      {isMobile ? (
        <MobileCardView
          columns={visibleColumns}
          data={data}
          keyExtractor={keyExtractor}
          loading={loading}
          error={error}
          onRetry={onRetry}
          renderCard={renderCard}
          selectable={selectable}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={emptyAction}
        />
      ) : (
        /* Desktop table view */
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
          <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-sm">
              <TableHeader
                columns={columns}
                visibleColumns={visibleColumns}
                preferences={preferences}
                sort={sort}
                onSort={onSort}
                selectable={selectable}
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={handleSelectAll}
                isScrolled={isScrolled}
                onResizeColumn={setWidth}
                hasExpansion={!!renderExpandedRow}
              />
              <TableBody
                visibleColumns={visibleColumns}
                preferences={preferences}
                data={data}
                keyExtractor={keyExtractor}
                loading={loading}
                error={error}
                onRetry={onRetry}
                selectable={selectable}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                renderExpandedRow={renderExpandedRow}
                onRowClick={onRowClick}
                emptyIcon={emptyIcon}
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
                emptyAction={emptyAction}
                pageKey={pageKey}
              />
            </table>
          </div>

          {/* Pagination footer */}
          {pagination && !loading && data.length > 0 && onPageChange && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                pageSizeOptions={pageSizeOptions}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile pagination */}
      {isMobile && pagination && !loading && data.length > 0 && onPageChange && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
