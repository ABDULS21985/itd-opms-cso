import { type ReactNode } from "react";

/* ──────────────────────────────────────────────
   Filter types
   ────────────────────────────────────────────── */

export type FilterType = "text" | "select" | "date-range" | "number-range";

export interface FilterOption {
  value: string;
  label: string;
}

export interface ColumnFilter {
  type: FilterType;
  /** For "select" filters: the selectable options */
  options?: FilterOption[];
  /** Placeholder text for input-based filters */
  placeholder?: string;
}

/* ──────────────────────────────────────────────
   Column definition
   ────────────────────────────────────────────── */

export interface AdminColumn<T> {
  /** Unique key — also used as sort key and filter param key */
  key: string;
  /** Display header label */
  header: string;
  /** Custom cell renderer */
  render: (item: T) => ReactNode;
  /** Whether this column is sortable (default: false) */
  sortable?: boolean;
  /** Column-specific filter configuration */
  filter?: ColumnFilter;
  /** Header and cell alignment */
  align?: "left" | "center" | "right";
  /** Minimum width in pixels */
  minWidth?: number;
  /** Default width in pixels */
  defaultWidth?: number;
  /** Whether this column is visible by default (default: true) */
  defaultVisible?: boolean;
  /** Whether this column can be pinned (default: true) */
  pinnable?: boolean;
  /** Default pin position */
  defaultPin?: "left" | "right";
  /** Additional className for column cells */
  className?: string;
}

/* ──────────────────────────────────────────────
   Bulk actions
   ────────────────────────────────────────────── */

export interface BulkAction {
  label: string;
  icon?: ReactNode;
  onClick: (selectedIds: string[]) => void;
  variant?: "default" | "danger" | "success";
  disabled?: (selectedIds: string[]) => boolean;
}

/* ──────────────────────────────────────────────
   Sort
   ────────────────────────────────────────────── */

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  key: string;
  direction: SortDirection;
}

/* ──────────────────────────────────────────────
   Pagination
   ────────────────────────────────────────────── */

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

/* ──────────────────────────────────────────────
   Active filter chip
   ────────────────────────────────────────────── */

export interface ActiveFilter {
  key: string;
  label: string;
  value: string | [string, string];
  displayValue: string;
}

/* ──────────────────────────────────────────────
   Main component props
   ────────────────────────────────────────────── */

export interface AdminDataTableProps<T> {
  /** Unique ID for localStorage preferences */
  tableId: string;
  /** Column definitions */
  columns: AdminColumn<T>[];
  /** Data array */
  data: T[];
  /** Unique key extractor per row */
  keyExtractor: (item: T) => string;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Retry callback for error state */
  onRetry?: () => void;

  /* Sort */
  sort?: SortState;
  onSort?: (sort: SortState) => void;

  /* Pagination */
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];

  /* Global search */
  searchValue?: string;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;

  /* Column filters */
  filters?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onClearFilters?: () => void;
  activeFilters?: ActiveFilter[];

  /* Selection */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: BulkAction[];

  /* Row expansion */
  renderExpandedRow?: (item: T) => ReactNode;

  /* Row click */
  onRowClick?: (item: T) => void;

  /* Mobile card view */
  renderCard?: (item: T, selected?: boolean) => ReactNode;

  /* Empty state */
  emptyIcon?: React.ComponentType<{ size?: number; className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;

  /* Export */
  onExport?: (format: "csv" | "xlsx" | "pdf") => void;

  /* Toolbar extras */
  toolbarExtra?: ReactNode;

  /* Class overrides */
  className?: string;
}
