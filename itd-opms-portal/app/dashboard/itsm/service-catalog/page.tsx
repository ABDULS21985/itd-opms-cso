"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Heart,
  History,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import {
  useCatalogCategories,
  useEntitledCatalogItems,
} from "@/hooks/use-itsm";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { CatalogCategory, CatalogItem, PaginatedResponse } from "@/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [key],
  );

  return [storedValue, setValue];
}

function formatRelativeTimeInline(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function HeroActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: "rgba(255,255,255,0.6)",
        backgroundColor: "rgba(255,255,255,0.74)",
        backdropFilter: "blur(18px)",
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function MetricCard({
  label,
  value,
  helper,
  accent,
  loading,
}: {
  label: string;
  value: ReactNode;
  helper: string;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/78 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      {loading ? (
        <div className="mt-3">
          <LoadingValue />
        </div>
      ) : (
        <p className="mt-3 text-2xl font-bold" style={{ color: accent }}>
          {value}
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function QuickLaneCard({
  title,
  description,
  count,
  active,
  accent,
  icon: Icon,
  onClick,
  ariaLabel,
}: {
  title: string;
  description: string;
  count: number;
  active: boolean;
  accent: string;
  icon: ElementType;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className="group rounded-[26px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderColor: active ? `${accent}46` : "var(--border)",
        backgroundImage: active
          ? `radial-gradient(circle at top right, ${accent}18, transparent 36%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`
          : "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          <Icon size={18} />
        </span>
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: active ? accent : "var(--text-primary)" }}
        >
          {count}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
        {description}
      </p>
    </button>
  );
}

function CategoryMultiSelect({
  categories,
  categoryCounts,
  selectedIds,
  onChange,
}: {
  categories: CatalogCategory[];
  categoryCounts: Record<string, number>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }

    onChange([...selectedIds, id]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open category lens"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
          selectedIds.length > 0 && "ring-1 ring-[var(--primary)]",
        )}
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor:
            selectedIds.length > 0 ? "var(--primary)" : "var(--border)",
          color: "var(--text-primary)",
        }}
      >
        <Layers size={15} />
        Category lens
        {selectedIds.length > 0 && (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {selectedIds.length}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 w-72 overflow-hidden rounded-[24px] border shadow-lg"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Category lens
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Select multiple service families to narrow the board.
              </p>
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto p-2">
              {categories.map((category) => {
                const selected = selectedIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggle(category.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-1)]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        selected
                          ? "border-[var(--primary)] bg-[var(--primary)]"
                          : "border-[var(--border)]",
                      )}
                    >
                      {selected && <Check size={10} className="text-white" />}
                    </div>
                    <Package
                      size={14}
                      className="shrink-0 text-[var(--text-secondary)]"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {category.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {categoryCounts[category.id] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedIds.length > 0 && (
              <div className="border-t border-[var(--border)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-sm font-medium text-[var(--primary)]"
                >
                  Clear category lens
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FavoriteButton({
  itemId,
  itemName,
  isFavorited,
  onToggle,
  size = 16,
}: {
  itemId: string;
  itemName: string;
  isFavorited: boolean;
  onToggle: (id: string) => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={`Toggle favorite for ${itemName}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(itemId);
      }}
      className="rounded-xl p-2 transition-colors hover:bg-[var(--surface-2)]"
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        size={size}
        className={cn(
          "transition-colors duration-200",
          isFavorited
            ? "fill-red-500 text-red-500"
            : "text-[var(--text-secondary)]",
        )}
      />
    </button>
  );
}

function ServiceMetaBadges({
  item,
  categoryName,
}: {
  item: CatalogItem;
  categoryName?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {categoryName && (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: "var(--surface-2)",
            color: "var(--text-secondary)",
          }}
        >
          {categoryName}
        </span>
      )}

      {item.estimatedDelivery && (
        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <Clock size={12} />
          {item.estimatedDelivery}
        </span>
      )}

      {item.approvalRequired && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: "rgba(249,115,22,0.12)",
            color: "#C2410C",
          }}
        >
          <ShieldCheck size={12} />
          Approval
        </span>
      )}
    </div>
  );
}

function ServiceCard({
  item,
  categoryName,
  isFavorited,
  onToggleFavorite,
  onClick,
  index = 0,
}: {
  item: CatalogItem;
  categoryName?: string;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
  index?: number;
}) {
  const accent = item.approvalRequired ? "#F97316" : "#2563EB";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <div
        className="group flex h-full flex-col rounded-[28px] border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        style={{
          borderColor: `${accent}18`,
          backgroundImage: `radial-gradient(circle at top right, ${accent}12, transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            <Package size={20} />
          </span>

          <FavoriteButton
            itemId={item.id}
            itemName={item.name}
            isFavorited={isFavorited}
            onToggle={onToggleFavorite}
          />
        </div>

        <button
          type="button"
          aria-label={`Open service ${item.name}`}
          onClick={onClick}
          className="mt-5 flex flex-1 flex-col text-left"
        >
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-[var(--text-primary)]">
              {item.name}
            </h4>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {item.description ||
                "Service details will open in the request brief."}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <ServiceMetaBadges item={item} categoryName={categoryName} />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-primary)]">
                Open request brief
              </span>
              <ArrowRight
                size={16}
                className="text-[var(--text-secondary)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
              />
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );
}

function ServiceRow({
  item,
  categoryName,
  isFavorited,
  onToggleFavorite,
  onClick,
  index = 0,
}: {
  item: CatalogItem;
  categoryName?: string;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
  index?: number;
}) {
  const accent = item.approvalRequired ? "#F97316" : "#2563EB";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <div
        className="group flex items-center gap-4 rounded-[24px] border px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          borderColor: `${accent}18`,
          backgroundImage: `linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
        }}
      >
        <button
          type="button"
          aria-label={`Open service ${item.name}`}
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            <Package size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {item.name}
              </h4>
              {item.approvalRequired && (
                <span
                  className="hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-flex"
                  style={{
                    backgroundColor: "rgba(249,115,22,0.12)",
                    color: "#C2410C",
                  }}
                >
                  Approval
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
              {item.description ||
                "Open the request brief to view service details."}
            </p>
          </div>

          <div className="hidden shrink-0 md:block">
            <ServiceMetaBadges item={item} categoryName={categoryName} />
          </div>

          <ArrowRight
            size={16}
            className="shrink-0 text-[var(--text-secondary)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
          />
        </button>

        <FavoriteButton
          itemId={item.id}
          itemName={item.name}
          isFavorited={isFavorited}
          onToggle={onToggleFavorite}
        />
      </div>
    </motion.div>
  );
}

function ServiceCollection({
  items,
  viewMode,
  categoryMap,
  favoriteSet,
  onToggleFavorite,
  onViewItem,
  showCategory = true,
}: {
  items: CatalogItem[];
  viewMode: "grid" | "list";
  categoryMap: Record<string, CatalogCategory>;
  favoriteSet: Set<string>;
  onToggleFavorite: (id: string) => void;
  onViewItem: (item: CatalogItem) => void;
  showCategory?: boolean;
}) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {items.map((item, index) => (
          <ServiceCard
            key={item.id}
            item={item}
            categoryName={
              showCategory && item.categoryId
                ? categoryMap[item.categoryId]?.name
                : undefined
            }
            isFavorited={favoriteSet.has(item.id)}
            onToggleFavorite={onToggleFavorite}
            onClick={() => onViewItem(item)}
            index={index}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <ServiceRow
          key={item.id}
          item={item}
          categoryName={
            showCategory && item.categoryId
              ? categoryMap[item.categoryId]?.name
              : undefined
          }
          isFavorited={favoriteSet.has(item.id)}
          onToggleFavorite={onToggleFavorite}
          onClick={() => onViewItem(item)}
          index={index}
        />
      ))}
    </div>
  );
}

function SpotlightCollection({
  title,
  description,
  icon: Icon,
  items,
  loading,
  accent,
  emptyTitle,
  emptyDescription,
  categoryMap,
  favoriteSet,
  onToggleFavorite,
  onViewItem,
  getMeta,
}: {
  title: string;
  description: string;
  icon: ElementType;
  items: CatalogItem[];
  loading: boolean;
  accent: string;
  emptyTitle: string;
  emptyDescription: string;
  categoryMap: Record<string, CatalogCategory>;
  favoriteSet: Set<string>;
  onToggleFavorite: (id: string) => void;
  onViewItem: (item: CatalogItem) => void;
  getMeta: (item: CatalogItem) => string;
}) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: `${accent}20`,
        backgroundImage: `radial-gradient(circle at top right, ${accent}12, transparent 36%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {title}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          <Icon size={18} />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-[22px] bg-[var(--surface-0)]/70"
            />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-0)]/72 p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {emptyTitle}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {emptyDescription}
            </p>
          </div>
        ) : (
          items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="group flex w-full items-start gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-0)]/80 p-4 text-left transition-colors hover:bg-[var(--surface-0)]"
            >
              <button
                type="button"
                onClick={() => onViewItem(item)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${accent}14`, color: accent }}
                >
                  <Package size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {item.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                      {item.categoryId
                        ? categoryMap[item.categoryId]?.name ||
                          "General services"
                        : "General services"}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    {getMeta(item)}
                  </p>
                </div>
              </button>

              <FavoriteButton
                itemId={item.id}
                itemName={item.name}
                isFavorited={favoriteSet.has(item.id)}
                onToggle={onToggleFavorite}
                size={14}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center"
    >
      <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--surface-1)] text-[var(--text-secondary)]">
        <Icon size={28} />
      </span>
      <h3 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0F766E" }}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

export default function ServiceCatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const urlSearch = searchParams.get("q") || "";
  const urlCategories =
    searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const urlApprovalRequired = searchParams.get("approval") === "true";
  const urlEntitledOnly = searchParams.get("entitled") !== "false";
  const urlViewMode = (searchParams.get("view") as "grid" | "list") || null;

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedCategoryIds, setSelectedCategoryIds] =
    useState<string[]>(urlCategories);
  const [approvalRequired, setApprovalRequired] = useState(urlApprovalRequired);
  const [entitledOnly, setEntitledOnly] = useState(urlEntitledOnly);
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "list">(
    "catalog-view-mode",
    urlViewMode || "grid",
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
          return;
        }

        params.set(key, value);
      });

      const newUrl = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    updateSearchParams({ q: debouncedSearch || null });
  }, [debouncedSearch, updateSearchParams]);

  useEffect(() => {
    updateSearchParams({
      categories:
        selectedCategoryIds.length > 0 ? selectedCategoryIds.join(",") : null,
    });
  }, [selectedCategoryIds, updateSearchParams]);

  useEffect(() => {
    updateSearchParams({
      approval: approvalRequired ? "true" : null,
      entitled: entitledOnly ? null : "false",
      view: viewMode === "grid" ? null : viewMode,
    });
  }, [approvalRequired, entitledOnly, viewMode, updateSearchParams]);

  const { data: categories, isLoading: categoriesLoading } =
    useCatalogCategories();
  const { data: entitledItems, isLoading: entitledItemsLoading } =
    useEntitledCatalogItems();

  const { data: marketplaceResponse, isLoading: marketplaceLoading } = useQuery(
    {
      queryKey: ["catalog-marketplace", entitledOnly],
      queryFn: () =>
        apiClient.get<PaginatedResponse<CatalogItem>>("/itsm/catalog/items", {
          page: 1,
          limit: 150,
          status: "active",
        }),
      enabled: !entitledOnly,
    },
  );

  const isSearchActive = debouncedSearch.trim().length > 0;

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: [
      "catalog-search",
      debouncedSearch,
      selectedCategoryIds,
      approvalRequired,
    ],
    queryFn: () =>
      apiClient.get<CatalogItem[]>("/itsm/catalog/search/search", {
        q: debouncedSearch,
        category_id:
          selectedCategoryIds.length === 1 ? selectedCategoryIds[0] : undefined,
        approval_required: approvalRequired ? true : undefined,
        page: 1,
        limit: 50,
      }),
    enabled: isSearchActive,
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["catalog-favorites"],
    queryFn: () => apiClient.get<string[]>("/itsm/catalog/search/favorites"),
  });

  const { data: popularItems, isLoading: popularLoading } = useQuery({
    queryKey: ["catalog-popular"],
    queryFn: () =>
      apiClient.get<CatalogItem[]>("/itsm/catalog/search/popular", {
        limit: 5,
      }),
  });

  const { data: recentItems, isLoading: recentLoading } = useQuery({
    queryKey: ["catalog-recent"],
    queryFn: () =>
      apiClient.get<CatalogItem[]>("/itsm/catalog/search/recent", {
        limit: 5,
      }),
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds || []), [favoriteIds]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiClient.post<{ favorited: boolean }>(
        `/itsm/catalog/search/favorites/${itemId}`,
      ),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["catalog-favorites"] });
      const previousFavorites = queryClient.getQueryData<string[]>([
        "catalog-favorites",
      ]);

      queryClient.setQueryData<string[]>(
        ["catalog-favorites"],
        (currentFavorites) => {
          if (!currentFavorites) return [itemId];
          if (currentFavorites.includes(itemId)) {
            return currentFavorites.filter((id) => id !== itemId);
          }

          return [...currentFavorites, itemId];
        },
      );

      return { previousFavorites };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          ["catalog-favorites"],
          context.previousFavorites,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-favorites"] });
    },
  });

  const handleToggleFavorite = useCallback(
    (itemId: string) => {
      toggleFavoriteMutation.mutate(itemId);
    },
    [toggleFavoriteMutation],
  );

  const sourceItems = entitledOnly
    ? entitledItems || []
    : marketplaceResponse?.data || [];

  const entitledSet = useMemo(
    () => new Set((entitledItems || []).map((item) => item.id)),
    [entitledItems],
  );

  const categoryMap = useMemo(() => {
    const map: Record<string, CatalogCategory> = {};
    for (const category of categories || []) {
      map[category.id] = category;
    }
    return map;
  }, [categories]);

  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of sourceItems) {
      const key = item.categoryId || "uncategorized";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [sourceItems]);

  const searchScopedItems = useMemo(() => {
    let items = searchResults || [];

    if (entitledOnly) {
      items = items.filter((item) => entitledSet.has(item.id));
    }

    return items;
  }, [entitledOnly, entitledSet, searchResults]);

  const displayItems = useMemo(() => {
    let items = isSearchActive ? searchScopedItems : sourceItems;

    if (selectedCategoryIds.length > 0) {
      items = items.filter(
        (item) =>
          item.categoryId && selectedCategoryIds.includes(item.categoryId),
      );
    }

    if (approvalRequired) {
      items = items.filter((item) => item.approvalRequired);
    }

    if (showFavoritesOnly) {
      items = items.filter((item) => favoriteSet.has(item.id));
    }

    return items;
  }, [
    approvalRequired,
    favoriteSet,
    isSearchActive,
    searchScopedItems,
    selectedCategoryIds,
    showFavoritesOnly,
    sourceItems,
  ]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};

    for (const item of displayItems) {
      const key = item.categoryId || "uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    return Object.entries(groups).sort(([leftId], [rightId]) => {
      const leftName = categoryMap[leftId]?.name || "General services";
      const rightName = categoryMap[rightId]?.name || "General services";
      return leftName.localeCompare(rightName);
    });
  }, [categoryMap, displayItems]);

  const favoriteItemMap = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    const collections = [
      sourceItems,
      searchResults || [],
      popularItems || [],
      recentItems || [],
    ];

    for (const collection of collections) {
      for (const item of collection) {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      }
    }

    return map;
  }, [popularItems, recentItems, searchResults, sourceItems]);

  const favoritedItems = useMemo(
    () =>
      Array.from(favoriteSet)
        .map((id) => favoriteItemMap.get(id))
        .filter((item): item is CatalogItem => Boolean(item)),
    [favoriteItemMap, favoriteSet],
  );

  const approvalItemCount = useMemo(
    () => sourceItems.filter((item) => item.approvalRequired).length,
    [sourceItems],
  );

  const activeCategoryCount = useMemo(
    () =>
      (categories || []).filter(
        (category) => (categoryItemCounts[category.id] || 0) > 0,
      ).length,
    [categories, categoryItemCounts],
  );

  const topCategories = useMemo(
    () =>
      (categories || [])
        .map((category) => ({
          ...category,
          count: categoryItemCounts[category.id] || 0,
        }))
        .filter((category) => category.count > 0)
        .sort((left, right) => right.count - left.count)
        .slice(0, 3),
    [categories, categoryItemCounts],
  );

  const activeCategoryNames = selectedCategoryIds.map(
    (id) => categoryMap[id]?.name || id,
  );

  const hasBoardFilters =
    selectedCategoryIds.length > 0 ||
    approvalRequired ||
    showFavoritesOnly ||
    !entitledOnly;

  const showPersonalizedSections = !isSearchActive && !hasBoardFilters;

  const catalogLoading =
    categoriesLoading ||
    (entitledOnly ? entitledItemsLoading : marketplaceLoading);

  const pulseMeta = useMemo(() => {
    if (isSearchActive) {
      return {
        title: `Searching "${debouncedSearch}"`,
        description:
          "Live catalog search is active. The board below reflects the current query after local lensing is applied.",
        accent: "#2563EB",
        icon: Search,
      };
    }

    if (showFavoritesOnly) {
      return {
        title: "Favorites in focus",
        description:
          "Only your saved request shortcuts are shown, making it easier to jump back into recurring asks.",
        accent: "#DC2626",
        icon: Heart,
      };
    }

    if (approvalRequired) {
      return {
        title: "Approval-routed services",
        description:
          "This view is concentrated on catalog items that trigger an approval workflow before fulfillment.",
        accent: "#F97316",
        icon: ShieldAlert,
      };
    }

    if (selectedCategoryIds.length === 1) {
      return {
        title: `${activeCategoryNames[0]} in focus`,
        description:
          "The board is narrowed to a single category lens so the service set is easier to compare.",
        accent: "#0F766E",
        icon: Layers,
      };
    }

    if (selectedCategoryIds.length > 1) {
      return {
        title: "Multi-category lens",
        description:
          "Several categories are active, so the board is blending multiple service families into one working set.",
        accent: "#7C3AED",
        icon: Layers,
      };
    }

    if (!entitledOnly) {
      return {
        title: "Expanded marketplace",
        description:
          "The entitlement guardrail is open, so you are browsing the wider active catalog instead of just your default set.",
        accent: "#D97706",
        icon: Sparkles,
      };
    }

    return {
      title: "Entitled marketplace",
      description:
        "The board is showing the services currently available to you with no extra lenses applied.",
      accent: "#2563EB",
      icon: ShoppingCart,
    };
  }, [
    activeCategoryNames,
    approvalRequired,
    debouncedSearch,
    entitledOnly,
    isSearchActive,
    selectedCategoryIds.length,
    showFavoritesOnly,
  ]);

  const currentBoardTitle = useMemo(() => {
    if (isSearchActive) return "Search results";
    if (showFavoritesOnly) return "Favorite services";
    if (selectedCategoryIds.length === 1)
      return `${activeCategoryNames[0]} services`;
    if (selectedCategoryIds.length > 1) return "Multi-category selection";
    if (approvalRequired) return "Approval-routed services";
    if (!entitledOnly) return "Expanded marketplace";
    return "All services";
  }, [
    activeCategoryNames,
    approvalRequired,
    entitledOnly,
    isSearchActive,
    selectedCategoryIds.length,
    showFavoritesOnly,
  ]);

  const currentBoardDescription = useMemo(() => {
    if (isSearchActive) {
      return `Showing ${displayItems.length} matched service${displayItems.length === 1 ? "" : "s"} for the current search query.`;
    }

    if (showFavoritesOnly) {
      return "This board only contains the services you have explicitly saved for faster repeat requests.";
    }

    if (selectedCategoryIds.length === 1) {
      return `Browse ${activeCategoryNames[0]} without the rest of the catalog competing for attention.`;
    }

    if (selectedCategoryIds.length > 1) {
      return "This board blends multiple categories into one working set so you can compare related services side by side.";
    }

    if (approvalRequired) {
      return "Every service shown here routes into an approval path before fulfillment begins.";
    }

    if (!entitledOnly) {
      return "The board is broadened to the wider active marketplace instead of just your entitled set.";
    }

    return "Browse the full service collection available to you, grouped by category when the board is open.";
  }, [
    activeCategoryNames,
    approvalRequired,
    displayItems.length,
    entitledOnly,
    isSearchActive,
    selectedCategoryIds.length,
    showFavoritesOnly,
  ]);

  const activeLensChips = [
    ...activeCategoryNames,
    ...(approvalRequired ? ["Approval required"] : []),
    ...(showFavoritesOnly ? ["Favorites only"] : []),
    ...(entitledOnly ? ["Entitled only"] : ["Expanded marketplace"]),
  ];

  const quickLanes = [
    {
      key: "all",
      title: "All services",
      description: "Return to the full board and browse the wider service mix.",
      count: sourceItems.length,
      active:
        !showFavoritesOnly &&
        selectedCategoryIds.length === 0 &&
        !approvalRequired &&
        entitledOnly,
      accent: "#2563EB",
      icon: ShoppingCart,
      ariaLabel: "Focus all services",
      onClick: () => {
        setShowFavoritesOnly(false);
        setSelectedCategoryIds([]);
        setApprovalRequired(false);
        setEntitledOnly(true);
      },
    },
    {
      key: "favorites",
      title: "Saved favorites",
      description: "Jump straight to the items you keep returning to.",
      count: favoritedItems.length,
      active: showFavoritesOnly,
      accent: "#DC2626",
      icon: Heart,
      ariaLabel: "Focus favorites",
      onClick: () => {
        setShowFavoritesOnly(true);
        setSelectedCategoryIds([]);
        setApprovalRequired(false);
      },
    },
    {
      key: "approval",
      title: "Approval flow",
      description:
        "Surface items that route into governance or manager approval.",
      count: approvalItemCount,
      active: approvalRequired,
      accent: "#F97316",
      icon: ShieldAlert,
      ariaLabel: "Focus approval required services",
      onClick: () => {
        setApprovalRequired(true);
        setShowFavoritesOnly(false);
      },
    },
    ...topCategories.map((category) => ({
      key: category.id,
      title: category.name,
      description: `Browse ${category.count} service${category.count === 1 ? "" : "s"} in this category lane.`,
      count: category.count,
      active:
        selectedCategoryIds.length === 1 &&
        selectedCategoryIds[0] === category.id &&
        !showFavoritesOnly,
      accent: "#0F766E",
      icon: Layers,
      ariaLabel: `Focus lane ${category.name}`,
      onClick: () => {
        setSelectedCategoryIds([category.id]);
        setShowFavoritesOnly(false);
      },
    })),
  ];

  const clearFilters = () => {
    setSearchInput("");
    setSelectedCategoryIds([]);
    setApprovalRequired(false);
    setEntitledOnly(true);
    setShowFavoritesOnly(false);
  };

  const handleViewItem = useCallback(
    (item: CatalogItem) => {
      router.push(`/dashboard/itsm/service-catalog/${item.id}`);
    },
    [router],
  );

  const PulseIcon = pulseMeta.icon;

  return (
    <div className="space-y-6 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-[32px] border shadow-sm"
        style={{
          borderColor: "rgba(37, 99, 235, 0.16)",
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(37,99,235,0.16), transparent 28%), radial-gradient(circle at 100% 0%, rgba(249,115,22,0.12), transparent 24%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
        }}
      >
        <div className="grid gap-6 p-6 lg:p-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
              <Sparkles size={14} />
              Request marketplace
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--text-primary)] lg:text-5xl">
              Service Catalog
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--text-secondary)] lg:text-base">
              Browse fulfillment-ready IT services, focus the board with quick
              lenses, and move from discovery into request submission without
              losing the operational context around approvals, favorites, and
              recent demand.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <HeroActionButton
                icon={FileText}
                label="My Requests"
                onClick={() =>
                  router.push("/dashboard/itsm/service-catalog/my-requests")
                }
              />
              <HeroActionButton
                icon={Settings}
                label="Manage Catalog"
                onClick={() =>
                  router.push("/dashboard/itsm/service-catalog/manage")
                }
              />
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Visible services"
                value={sourceItems.length}
                helper="Services currently available in the active catalog scope."
                accent="#2563EB"
                loading={catalogLoading}
              />
              <MetricCard
                label="Approval flows"
                value={approvalItemCount}
                helper="Services that route into approval before fulfillment."
                accent="#F97316"
                loading={catalogLoading}
              />
              <MetricCard
                label="Saved favorites"
                value={favoriteSet.size}
                helper="Services you have pinned as repeat request shortcuts."
                accent="#DC2626"
              />
              <MetricCard
                label="Active categories"
                value={activeCategoryCount}
                helper="Service families with live items in the current scope."
                accent="#0F766E"
                loading={catalogLoading}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)]/82 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Catalog pulse
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {pulseMeta.title}
                </h2>
              </div>
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: `${pulseMeta.accent}14`,
                  color: pulseMeta.accent,
                }}
              >
                <PulseIcon size={20} />
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {pulseMeta.description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Trending lead
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {popularItems?.[0]?.name || "No trend signal yet"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Recent motion
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {recentItems?.[0]?.name || "No recent request signal"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Favorite bank
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {favoriteSet.size} saved shortcut
                  {favoriteSet.size === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Focus lanes
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Jump into the right service slice
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            These quick lanes reset the board into useful views before you reach
            for the heavier search and filter controls.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {quickLanes.map((lane) => (
            <QuickLaneCard
              key={lane.key}
              title={lane.title}
              description={lane.description}
              count={lane.count}
              active={lane.active}
              accent={lane.accent}
              icon={lane.icon}
              onClick={lane.onClick}
              ariaLabel={lane.ariaLabel}
            />
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)]"
      >
        <div className="p-5 lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Search console
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Find the right service fast
              </h2>
            </div>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              {isSearchActive && !searchLoading
                ? `${displayItems.length} service match${displayItems.length === 1 ? "" : "es"} are currently visible.`
                : "Search by service name or description, then layer category and approval lenses on top."}
            </p>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div
              className={cn(
                "flex items-center gap-3 rounded-[24px] border px-4 py-4 transition-colors",
                isSearchActive && "ring-1 ring-[var(--primary)]",
              )}
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: isSearchActive
                  ? "var(--primary)"
                  : "var(--border)",
              }}
            >
              {searchLoading && isSearchActive ? (
                <Loader2
                  size={18}
                  className="animate-spin text-[var(--primary)]"
                />
              ) : (
                <Search size={18} className="text-[var(--text-secondary)]" />
              )}

              <input
                type="text"
                placeholder="Search services by name or description"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />

              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear service search"
                  onClick={() => setSearchInput("")}
                  className="rounded-xl p-2 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <X size={16} className="text-[var(--text-secondary)]" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CategoryMultiSelect
                categories={categories || []}
                categoryCounts={categoryItemCounts}
                selectedIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
              />

              <button
                type="button"
                onClick={() => setApprovalRequired((current) => !current)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                  approvalRequired && "ring-1 ring-[var(--primary)]",
                )}
                style={{
                  backgroundColor: approvalRequired
                    ? "rgba(249,115,22,0.08)"
                    : "var(--surface-0)",
                  borderColor: approvalRequired ? "#F97316" : "var(--border)",
                  color: approvalRequired ? "#C2410C" : "var(--text-primary)",
                }}
              >
                <ShieldCheck size={15} />
                Approval required
              </button>

              <button
                type="button"
                onClick={() => setEntitledOnly((current) => !current)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                  entitledOnly && "ring-1 ring-[var(--primary)]",
                )}
                style={{
                  backgroundColor: entitledOnly
                    ? "rgba(37,99,235,0.08)"
                    : "var(--surface-0)",
                  borderColor: entitledOnly ? "#2563EB" : "var(--border)",
                  color: entitledOnly ? "#1D4ED8" : "var(--text-primary)",
                }}
              >
                <Check size={15} />
                Entitled only
              </button>

              <div
                className="flex items-center overflow-hidden rounded-2xl border"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  type="button"
                  aria-label="Switch to grid view"
                  onClick={() => setViewMode("grid")}
                  className="flex h-11 w-11 items-center justify-center transition-colors"
                  style={{
                    backgroundColor:
                      viewMode === "grid"
                        ? "var(--primary)"
                        : "var(--surface-0)",
                    color:
                      viewMode === "grid" ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Switch to list view"
                  onClick={() => setViewMode("list")}
                  className="flex h-11 w-11 items-center justify-center transition-colors"
                  style={{
                    backgroundColor:
                      viewMode === "list"
                        ? "var(--primary)"
                        : "var(--surface-0)",
                    color:
                      viewMode === "list" ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  <List size={16} />
                </button>
              </div>

              {(hasBoardFilters || isSearchActive) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Reset lens
                </button>
              )}
            </div>
          </div>

          {activeLensChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeLensChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(37,99,235,0.08)",
                    color: "var(--primary)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {showPersonalizedSections && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                For you
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                Request momentum
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              These collections give you a faster way back into services you
              recently touched, saved, or are seeing traction across the
              catalog.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SpotlightCollection
              title="Recently requested"
              description="Your latest catalog activity surfaced as a quick re-entry path."
              icon={History}
              items={recentItems || []}
              loading={recentLoading}
              accent="#2563EB"
              emptyTitle="No recent requests"
              emptyDescription="Request activity will show up here once you start using the catalog."
              categoryMap={categoryMap}
              favoriteSet={favoriteSet}
              onToggleFavorite={handleToggleFavorite}
              onViewItem={handleViewItem}
              getMeta={(item) =>
                item.createdAt
                  ? `Requested ${formatRelativeTimeInline(item.createdAt)}`
                  : "Recently touched"
              }
            />
            <SpotlightCollection
              title="Popular right now"
              description="Services seeing current demand so you can spot common request paths."
              icon={TrendingUp}
              items={popularItems || []}
              loading={popularLoading}
              accent="#0F766E"
              emptyTitle="No trend data yet"
              emptyDescription="Popular services will appear once usage data is available."
              categoryMap={categoryMap}
              favoriteSet={favoriteSet}
              onToggleFavorite={handleToggleFavorite}
              onViewItem={handleViewItem}
              getMeta={(item) =>
                item.estimatedDelivery
                  ? `Typical delivery: ${item.estimatedDelivery}`
                  : "Trending service"
              }
            />
            <SpotlightCollection
              title="Saved favorites"
              description="Pinned services ready for faster repeat requests."
              icon={Star}
              items={favoritedItems}
              loading={false}
              accent="#DC2626"
              emptyTitle="No favorites saved"
              emptyDescription="Use the heart action on any service to build a reusable shortlist."
              categoryMap={categoryMap}
              favoriteSet={favoriteSet}
              onToggleFavorite={handleToggleFavorite}
              onViewItem={handleViewItem}
              getMeta={(item) =>
                item.approvalRequired
                  ? "Saved and approval-routed"
                  : "Saved for quick access"
              }
            />
          </div>
        </motion.section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="space-y-4"
        >
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Live service board
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {currentBoardTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {currentBoardDescription}
            </p>
          </div>

          {catalogLoading || (isSearchActive && searchLoading) ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-[28px] bg-[var(--surface-1)]"
                />
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            isSearchActive ? (
              <EmptyState
                icon={Search}
                title="No matching services found"
                description={`No services match "${debouncedSearch}" with the current catalog lens. Broaden the query or reset the board filters.`}
                actionLabel="Reset lens"
                onAction={clearFilters}
              />
            ) : showFavoritesOnly ? (
              <EmptyState
                icon={Heart}
                title="No favorites saved yet"
                description="Use the heart action on any service to build a shortlist of repeat-request items."
              />
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="No services available in this board"
                description="The current lens does not expose any services. Adjust the filters or wait for the catalog to be populated."
                actionLabel={hasBoardFilters ? "Reset lens" : undefined}
                onAction={hasBoardFilters ? clearFilters : undefined}
              />
            )
          ) : isSearchActive ||
            showFavoritesOnly ||
            selectedCategoryIds.length > 1 ||
            approvalRequired ||
            !entitledOnly ? (
            <ServiceCollection
              items={displayItems}
              viewMode={viewMode}
              categoryMap={categoryMap}
              favoriteSet={favoriteSet}
              onToggleFavorite={handleToggleFavorite}
              onViewItem={handleViewItem}
            />
          ) : (
            <div className="space-y-4">
              {groupedItems.map(([categoryId, items]) => (
                <div
                  key={categoryId}
                  className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {items.length} service{items.length === 1 ? "" : "s"}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                        {categoryMap[categoryId]?.name || "General services"}
                      </h3>
                    </div>
                    {categoryMap[categoryId] ? (
                      <button
                        type="button"
                        aria-label={`Focus category ${categoryMap[categoryId]?.name}`}
                        onClick={() => setSelectedCategoryIds([categoryId])}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                      >
                        Focus category
                        <ArrowRight size={15} />
                      </button>
                    ) : (
                      <span className="text-sm text-[var(--text-secondary)]">
                        General service lane
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <ServiceCollection
                      items={items}
                      viewMode={viewMode}
                      categoryMap={categoryMap}
                      favoriteSet={favoriteSet}
                      onToggleFavorite={handleToggleFavorite}
                      onViewItem={handleViewItem}
                      showCategory={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="space-y-4"
        >
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Current lens
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Board context
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              The current board lens is{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {pulseMeta.title.toLowerCase()}
              </span>
              . Use this summary to understand whether you are browsing
              favorites, approvals, category slices, or the wider marketplace.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {activeLensChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(37,99,235,0.08)",
                    color: "var(--primary)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MetricCard
                label="Board items"
                value={displayItems.length}
                helper="Services currently visible on the main board."
                accent={pulseMeta.accent}
              />
              <MetricCard
                label="Search term"
                value={isSearchActive ? debouncedSearch : "None"}
                helper="The active search term applied to the board."
                accent="#7C3AED"
              />
              <MetricCard
                label="View mode"
                value={viewMode === "grid" ? "Grid" : "List"}
                helper="Current board layout for catalog browsing."
                accent="#0F766E"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Category coverage
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Service families
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Use these category controls as a secondary way to narrow the board
              without opening the multi-select lens.
            </p>

            <div className="mt-5 space-y-2">
              {(categories || []).map((category) => {
                const active =
                  selectedCategoryIds.length === 1 &&
                  selectedCategoryIds[0] === category.id;
                const count = categoryItemCounts[category.id] || 0;

                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-label={`Focus category ${category.name}`}
                    onClick={() => {
                      setSelectedCategoryIds([category.id]);
                      setShowFavoritesOnly(false);
                    }}
                    className="flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: active
                        ? "rgba(15,118,110,0.28)"
                        : "var(--border)",
                      backgroundColor: active
                        ? "rgba(15,118,110,0.08)"
                        : "var(--surface-0)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor: active
                            ? "rgba(15,118,110,0.14)"
                            : "var(--surface-1)",
                          color: active ? "#0F766E" : "var(--text-secondary)",
                        }}
                      >
                        <Package size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {category.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {count} service{count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      size={15}
                      className="text-[var(--text-secondary)]"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Request shortcuts
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Next moves
            </h3>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/itsm/service-catalog/my-requests")
                }
                className="flex w-full items-center justify-between rounded-[22px] border border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-1)]"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    My requests
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Track submitted requests and current fulfillment state.
                  </p>
                </div>
                <FileText size={16} className="text-[var(--text-secondary)]" />
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/itsm/service-catalog/manage")
                }
                className="flex w-full items-center justify-between rounded-[22px] border border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-1)]"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Catalog management
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Review categories, items, and supporting catalog structure.
                  </p>
                </div>
                <Settings size={16} className="text-[var(--text-secondary)]" />
              </button>

              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Quick note
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {approvalItemCount > 0
                    ? `${approvalItemCount} service${approvalItemCount === 1 ? "" : "s"} in the current scope require approval.`
                    : "No approval-routed services are exposed in the current scope."}
                </p>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
