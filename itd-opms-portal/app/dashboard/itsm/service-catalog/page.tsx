"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ShoppingCart,
  Clock,
  ShieldCheck,
  Search,
  ArrowRight,
  Layers,
  Package,
  Heart,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  Check,
  TrendingUp,
  History,
  Star,
  FileText,
  Settings,
  Loader2,
} from "lucide-react";
import {
  useCatalogCategories,
  useEntitledCatalogItems,
} from "@/hooks/use-itsm";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { CatalogItem, CatalogCategory } from "@/types";

/* ------------------------------------------------------------------ */
/*  Inline hook: useDebounce                                           */
/* ------------------------------------------------------------------ */

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/* ------------------------------------------------------------------ */
/*  Inline hook: useLocalStorage                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Skeleton Components                                                */
/* ------------------------------------------------------------------ */

function CardSkeleton() {
  return (
    <div
      className="rounded-xl border p-5 animate-pulse"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)]" />
        <div className="w-6 h-6 rounded bg-[var(--surface-2)]" />
      </div>
      <div className="h-4 w-3/4 rounded bg-[var(--surface-2)] mb-2" />
      <div className="h-3 w-full rounded bg-[var(--surface-2)] mb-1" />
      <div className="h-3 w-2/3 rounded bg-[var(--surface-2)] mb-3" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-[var(--surface-2)]" />
        <div className="h-5 w-24 rounded-full bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 rounded-xl border px-5 py-4 animate-pulse"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-48 rounded bg-[var(--surface-2)] mb-1" />
        <div className="h-3 w-72 rounded bg-[var(--surface-2)]" />
      </div>
      <div className="h-5 w-20 rounded-full bg-[var(--surface-2)]" />
      <div className="h-5 w-16 rounded bg-[var(--surface-2)]" />
      <div className="w-6 h-6 rounded bg-[var(--surface-2)]" />
    </div>
  );
}

function HorizontalCardSkeleton() {
  return (
    <div
      className="min-w-[180px] rounded-xl border p-4 animate-pulse shrink-0"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] mb-2" />
      <div className="h-3 w-24 rounded bg-[var(--surface-2)] mb-1" />
      <div className="h-2.5 w-16 rounded bg-[var(--surface-2)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Multi-Select Dropdown                                     */
/* ------------------------------------------------------------------ */

function CategoryMultiSelect({
  categories,
  selectedIds,
  onChange,
}: {
  categories: CatalogCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          selectedIds.length > 0 && "ring-1 ring-[var(--primary)]",
        )}
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: selectedIds.length > 0 ? "var(--primary)" : "var(--border)",
          color: "var(--text-primary)",
        }}
      >
        <Layers size={14} />
        Categories
        {selectedIds.length > 0 && (
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
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
            className="absolute z-30 mt-1 w-64 rounded-xl border shadow-lg overflow-hidden"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="max-h-64 overflow-y-auto p-1">
              {categories.map((cat) => {
                const selected = selectedIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggle(cat.id)}
                    className="flex items-center gap-2.5 w-full text-left rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-1)]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        selected
                          ? "bg-[var(--primary)] border-[var(--primary)]"
                          : "border-[var(--border)]",
                      )}
                    >
                      {selected && <Check size={10} className="text-white" />}
                    </div>
                    <Package size={14} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
            {selectedIds.length > 0 && (
              <div
                className="border-t px-3 py-2"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => onChange([])}
                  className="text-xs font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Favorite Heart Button                                              */
/* ------------------------------------------------------------------ */

function FavoriteButton({
  itemId,
  isFavorited,
  onToggle,
  size = 16,
}: {
  itemId: string;
  isFavorited: boolean;
  onToggle: (id: string) => void;
  size?: number;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle(itemId);
      }}
      className="p-1 rounded-md transition-colors hover:bg-[var(--surface-2)]"
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        size={size}
        className={cn(
          "transition-colors duration-200",
          isFavorited ? "fill-red-500 text-red-500" : "text-[var(--text-secondary)]",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Service Card (Grid View)                                           */
/* ------------------------------------------------------------------ */

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <button
        onClick={onClick}
        className="group block w-full text-left rounded-xl border p-5 transition-all duration-200 hover:shadow-md relative"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        {/* Favorite heart — top-right */}
        <div className="absolute top-3 right-3">
          <FavoriteButton
            itemId={item.id}
            isFavorited={isFavorited}
            onToggle={onToggleFavorite}
          />
        </div>

        <div className="flex items-start justify-between mb-3 pr-8">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <Package size={18} style={{ color: "#3B82F6" }} />
          </div>
          <ArrowRight
            size={16}
            className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
          />
        </div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
          {item.name}
        </h4>
        {item.description && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {categoryName && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
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
              className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
              style={{
                backgroundColor: "rgba(249, 115, 22, 0.1)",
                color: "#F97316",
              }}
            >
              <ShieldCheck size={12} />
              Approval
            </span>
          )}
        </div>
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Service Row (List View)                                            */
/* ------------------------------------------------------------------ */

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <button
        onClick={onClick}
        className="group flex items-center gap-4 w-full text-left rounded-xl border px-5 py-4 transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
        >
          <Package size={18} style={{ color: "#3B82F6" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {item.name}
          </h4>
          {item.description && (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {item.description}
            </p>
          )}
        </div>
        {categoryName && (
          <span
            className="hidden md:inline-flex items-center text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-secondary)",
            }}
          >
            {categoryName}
          </span>
        )}
        {item.estimatedDelivery && (
          <span className="hidden lg:inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] shrink-0">
            <Clock size={12} />
            {item.estimatedDelivery}
          </span>
        )}
        {item.approvalRequired && (
          <span
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 shrink-0"
            style={{
              backgroundColor: "rgba(249, 115, 22, 0.1)",
              color: "#F97316",
            }}
          >
            <ShieldCheck size={12} />
            Approval
          </span>
        )}
        <FavoriteButton
          itemId={item.id}
          isFavorited={isFavorited}
          onToggle={onToggleFavorite}
        />
        <ArrowRight
          size={16}
          className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 shrink-0"
        />
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <Icon size={48} className="text-[var(--text-secondary)] mb-4 opacity-40" />
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
        {title}
      </p>
      <p className="text-xs text-[var(--text-secondary)]">{description}</p>
    </motion.div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function ServiceCatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  /* ---- URL-based state ---- */
  const urlSearch = searchParams.get("q") || "";
  const urlCategories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const urlApprovalRequired = searchParams.get("approval") === "true";
  const urlEntitledOnly = searchParams.get("entitled") !== "false"; // default true
  const urlViewMode = (searchParams.get("view") as "grid" | "list") || null;

  /* ---- Local state ---- */
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(urlCategories);
  const [approvalRequired, setApprovalRequired] = useState(urlApprovalRequired);
  const [entitledOnly, setEntitledOnly] = useState(urlEntitledOnly);
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "list">(
    "catalog-view-mode",
    urlViewMode || "grid",
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  /* ---- Sync state to URL search params ---- */
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const newUrl = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router],
  );

  /* Sync debounced search to URL */
  useEffect(() => {
    updateSearchParams({ q: debouncedSearch || null });
  }, [debouncedSearch, updateSearchParams]);

  /* Sync category filters to URL */
  useEffect(() => {
    updateSearchParams({
      categories: selectedCategoryIds.length > 0 ? selectedCategoryIds.join(",") : null,
    });
  }, [selectedCategoryIds, updateSearchParams]);

  /* Sync toggles to URL */
  useEffect(() => {
    updateSearchParams({
      approval: approvalRequired ? "true" : null,
      entitled: entitledOnly ? null : "false",
      view: viewMode === "grid" ? null : viewMode,
    });
  }, [approvalRequired, entitledOnly, viewMode, updateSearchParams]);

  /* ---- Data queries ---- */
  const { data: categories, isLoading: categoriesLoading } =
    useCatalogCategories();
  const { data: entitledItems, isLoading: itemsLoading } =
    useEntitledCatalogItems();

  /* Server-side search */
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
        category_id: selectedCategoryIds.length === 1 ? selectedCategoryIds[0] : undefined,
        approval_required: approvalRequired ? true : undefined,
        page: 1,
        limit: 50,
      }),
    enabled: isSearchActive,
  });

  /* Favorites */
  const { data: favoriteIds } = useQuery({
    queryKey: ["catalog-favorites"],
    queryFn: () =>
      apiClient.get<string[]>("/itsm/catalog/search/favorites"),
  });

  const favoriteSet = useMemo(
    () => new Set(favoriteIds || []),
    [favoriteIds],
  );

  const toggleFavoriteMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiClient.post<{ favorited: boolean }>(
        `/itsm/catalog/search/favorites/${itemId}`,
      ),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["catalog-favorites"] });
      const previousFavorites = queryClient.getQueryData<string[]>(["catalog-favorites"]);
      queryClient.setQueryData<string[]>(["catalog-favorites"], (old) => {
        if (!old) return [itemId];
        if (old.includes(itemId)) return old.filter((id) => id !== itemId);
        return [...old, itemId];
      });
      return { previousFavorites };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(["catalog-favorites"], context.previousFavorites);
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

  /* Popular items */
  const { data: popularItems, isLoading: popularLoading } = useQuery({
    queryKey: ["catalog-popular"],
    queryFn: () =>
      apiClient.get<CatalogItem[]>("/itsm/catalog/search/popular", {
        limit: 5,
      }),
  });

  /* Recent items */
  const { data: recentItems, isLoading: recentLoading } = useQuery({
    queryKey: ["catalog-recent"],
    queryFn: () =>
      apiClient.get<CatalogItem[]>("/itsm/catalog/search/recent", {
        limit: 5,
      }),
  });

  /* ---- Derived data ---- */
  const categoryMap = useMemo(() => {
    const map: Record<string, CatalogCategory> = {};
    if (categories) {
      for (const cat of categories) {
        map[cat.id] = cat;
      }
    }
    return map;
  }, [categories]);

  /* Count items per category (from entitled items) */
  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (entitledItems) {
      for (const item of entitledItems) {
        const key = item.categoryId || "uncategorized";
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [entitledItems]);

  /* Determine which items to display */
  const displayItems = useMemo(() => {
    if (isSearchActive) {
      return searchResults || [];
    }

    let items = entitledItems || [];

    // Category filter
    if (selectedCategoryIds.length > 0) {
      items = items.filter(
        (item) => item.categoryId && selectedCategoryIds.includes(item.categoryId),
      );
    }

    // Approval required filter
    if (approvalRequired) {
      items = items.filter((item) => item.approvalRequired);
    }

    // Favorites only filter
    if (showFavoritesOnly) {
      items = items.filter((item) => favoriteSet.has(item.id));
    }

    return items;
  }, [
    isSearchActive,
    searchResults,
    entitledItems,
    selectedCategoryIds,
    approvalRequired,
    showFavoritesOnly,
    favoriteSet,
  ]);

  /* Group items by category for "All Services" view */
  const groupedItems = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};
    for (const item of displayItems) {
      const key = item.categoryId || "uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [displayItems]);

  /* Favorited items list */
  const favoritedItems = useMemo(() => {
    if (!entitledItems || favoriteSet.size === 0) return [];
    return entitledItems.filter((item) => favoriteSet.has(item.id));
  }, [entitledItems, favoriteSet]);

  const isLoading = categoriesLoading || itemsLoading;

  const handleViewItem = useCallback(
    (item: CatalogItem) => {
      router.push(`/dashboard/itsm/service-catalog/${item.id}`);
    },
    [router],
  );

  /* ---- Are filters active? ---- */
  const hasActiveFilters =
    selectedCategoryIds.length > 0 || approvalRequired || showFavoritesOnly || !entitledOnly;

  /* ---- Show personalized sections only when not searching and no active filters ---- */
  const showPersonalizedSections = !isSearchActive && !hasActiveFilters;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            >
              <ShoppingCart size={20} style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Service Catalog
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Browse and request IT services available to you.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                router.push("/dashboard/itsm/service-catalog/my-requests")
              }
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <FileText size={14} />
              My Requests
            </button>
            <button
              onClick={() =>
                router.push("/dashboard/itsm/service-catalog/manage")
              }
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Settings size={14} />
              Manage
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
            isSearchActive && "ring-1 ring-[var(--primary)]",
          )}
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: isSearchActive ? "var(--primary)" : "var(--border)",
          }}
        >
          {searchLoading && isSearchActive ? (
            <Loader2
              size={18}
              className="text-[var(--primary)] animate-spin"
            />
          ) : (
            <Search size={18} className="text-[var(--text-secondary)]" />
          )}
          <input
            type="text"
            placeholder="Search services by name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="p-1 rounded-md hover:bg-[var(--surface-2)] transition-colors"
            >
              <X size={16} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
        {/* Search result count */}
        {isSearchActive && !searchLoading && searchResults && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">
              {searchResults.length}
            </span>{" "}
            result{searchResults.length !== 1 ? "s" : ""} for{" "}
            <span className="font-medium text-[var(--text-primary)]">
              &lsquo;{debouncedSearch}&rsquo;
            </span>
          </p>
        )}
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Category multi-select */}
          <CategoryMultiSelect
            categories={categories || []}
            selectedIds={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
          />

          {/* Approval required toggle */}
          <button
            onClick={() => setApprovalRequired(!approvalRequired)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              approvalRequired && "ring-1 ring-[var(--primary)]",
            )}
            style={{
              backgroundColor: approvalRequired
                ? "rgba(59, 130, 246, 0.08)"
                : "var(--surface-0)",
              borderColor: approvalRequired ? "var(--primary)" : "var(--border)",
              color: approvalRequired
                ? "var(--primary)"
                : "var(--text-primary)",
            }}
          >
            <ShieldCheck size={14} />
            Approval Required
          </button>

          {/* Entitled only toggle */}
          <button
            onClick={() => setEntitledOnly(!entitledOnly)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              entitledOnly && "ring-1 ring-[var(--primary)]",
            )}
            style={{
              backgroundColor: entitledOnly
                ? "rgba(59, 130, 246, 0.08)"
                : "var(--surface-0)",
              borderColor: entitledOnly ? "var(--primary)" : "var(--border)",
              color: entitledOnly
                ? "var(--primary)"
                : "var(--text-primary)",
            }}
          >
            <Check size={14} />
            Entitled Only
          </button>

          {/* Category filter chips */}
          {selectedCategoryIds.map((catId) => (
            <span
              key={catId}
              className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-xs font-medium"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "var(--primary)",
              }}
            >
              {categoryMap[catId]?.name || catId}
              <button
                onClick={() =>
                  setSelectedCategoryIds(
                    selectedCategoryIds.filter((id) => id !== catId),
                  )
                }
                className="p-0.5 rounded-full hover:bg-[rgba(59,130,246,0.2)] transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* View mode toggle */}
          <div
            className="flex items-center rounded-lg border overflow-hidden"
            style={{
              borderColor: "var(--border)",
            }}
          >
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center justify-center w-9 h-9 transition-colors",
              )}
              style={{
                backgroundColor:
                  viewMode === "grid" ? "var(--primary)" : "var(--surface-0)",
                color: viewMode === "grid" ? "#fff" : "var(--text-secondary)",
              }}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center justify-center w-9 h-9 transition-colors",
              )}
              style={{
                backgroundColor:
                  viewMode === "list" ? "var(--primary)" : "var(--surface-0)",
                color: viewMode === "list" ? "#fff" : "var(--text-secondary)",
              }}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:w-64 shrink-0"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
            Categories
          </h2>
          <div className="space-y-1">
            {/* Favorites filter button */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
              style={{
                backgroundColor: showFavoritesOnly
                  ? "var(--primary)"
                  : "transparent",
                color: showFavoritesOnly ? "#fff" : "var(--text-primary)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart
                    size={16}
                    className={cn(showFavoritesOnly && "fill-white")}
                  />
                  Favorites
                </div>
                {favoritedItems.length > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: showFavoritesOnly
                        ? "rgba(255,255,255,0.2)"
                        : "var(--surface-2)",
                      color: showFavoritesOnly
                        ? "#fff"
                        : "var(--text-secondary)",
                    }}
                  >
                    {favoritedItems.length}
                  </span>
                )}
              </div>
            </button>

            {/* Divider */}
            <div
              className="mx-3 my-1 border-t"
              style={{ borderColor: "var(--border)" }}
            />

            {/* All Services */}
            <button
              onClick={() => {
                setSelectedCategoryIds([]);
                setShowFavoritesOnly(false);
              }}
              className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
              style={{
                backgroundColor:
                  selectedCategoryIds.length === 0 && !showFavoritesOnly
                    ? "var(--primary)"
                    : "transparent",
                color:
                  selectedCategoryIds.length === 0 && !showFavoritesOnly
                    ? "#fff"
                    : "var(--text-primary)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} />
                  All Services
                </div>
                {entitledItems && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        selectedCategoryIds.length === 0 && !showFavoritesOnly
                          ? "rgba(255,255,255,0.2)"
                          : "var(--surface-2)",
                      color:
                        selectedCategoryIds.length === 0 && !showFavoritesOnly
                          ? "#fff"
                          : "var(--text-secondary)",
                    }}
                  >
                    {entitledItems.length}
                  </span>
                )}
              </div>
            </button>

            {/* Category list */}
            {categoriesLoading ? (
              <div className="space-y-2 px-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-9 rounded-lg bg-[var(--surface-2)] animate-pulse"
                  />
                ))}
              </div>
            ) : (
              categories?.map((cat) => {
                const isActive =
                  selectedCategoryIds.length === 1 &&
                  selectedCategoryIds[0] === cat.id &&
                  !showFavoritesOnly;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryIds([cat.id]);
                      setShowFavoritesOnly(false);
                    }}
                    className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
                    style={{
                      backgroundColor: isActive
                        ? "var(--primary)"
                        : "transparent",
                      color: isActive ? "#fff" : "var(--text-primary)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={16} />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isActive
                            ? "rgba(255,255,255,0.2)"
                            : "var(--surface-2)",
                          color: isActive ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {categoryItemCounts[cat.id] || 0}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8 min-w-0">
          {/* Personalized Sections (only when NOT searching and no active filters) */}
          {showPersonalizedSections && (
            <>
              {/* Recently Requested */}
              {recentLoading ? (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <History size={14} />
                    Recently Requested
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {[1, 2, 3, 4].map((i) => (
                      <HorizontalCardSkeleton key={i} />
                    ))}
                  </div>
                </section>
              ) : recentItems && recentItems.length > 0 ? (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <History size={14} />
                    Recently Requested
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {recentItems.map((item, idx) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        onClick={() => handleViewItem(item)}
                        className="group min-w-[180px] rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md shrink-0"
                        style={{
                          backgroundColor: "var(--surface-0)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                          style={{
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                          }}
                        >
                          <Package size={16} style={{ color: "#3B82F6" }} />
                        </div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-0.5">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                          <Clock size={10} />
                          {item.createdAt
                            ? `Requested ${formatRelativeTimeInline(item.createdAt)}`
                            : "Recently"}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </motion.section>
              ) : null}

              {/* My Favorites */}
              {favoritedItems.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <Star size={14} />
                    My Favorites
                  </h3>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {favoritedItems.map((item, index) => (
                        <ServiceCard
                          key={item.id}
                          item={item}
                          categoryName={
                            item.categoryId
                              ? categoryMap[item.categoryId]?.name
                              : undefined
                          }
                          isFavorited={true}
                          onToggleFavorite={handleToggleFavorite}
                          onClick={() => handleViewItem(item)}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {favoritedItems.map((item, index) => (
                        <ServiceRow
                          key={item.id}
                          item={item}
                          categoryName={
                            item.categoryId
                              ? categoryMap[item.categoryId]?.name
                              : undefined
                          }
                          isFavorited={true}
                          onToggleFavorite={handleToggleFavorite}
                          onClick={() => handleViewItem(item)}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </motion.section>
              )}

              {/* Popular Services */}
              {popularLoading ? (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <TrendingUp size={14} />
                    Popular Services
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                </section>
              ) : popularItems && popularItems.length > 0 ? (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <TrendingUp size={14} />
                    Popular Services
                  </h3>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {popularItems.map((item, index) => (
                        <ServiceCard
                          key={item.id}
                          item={item}
                          categoryName={
                            item.categoryId
                              ? categoryMap[item.categoryId]?.name
                              : undefined
                          }
                          isFavorited={favoriteSet.has(item.id)}
                          onToggleFavorite={handleToggleFavorite}
                          onClick={() => handleViewItem(item)}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {popularItems.map((item, index) => (
                        <ServiceRow
                          key={item.id}
                          item={item}
                          categoryName={
                            item.categoryId
                              ? categoryMap[item.categoryId]?.name
                              : undefined
                          }
                          isFavorited={favoriteSet.has(item.id)}
                          onToggleFavorite={handleToggleFavorite}
                          onClick={() => handleViewItem(item)}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </motion.section>
              ) : null}
            </>
          )}

          {/* All Services / Search Results */}
          <section>
            {!showPersonalizedSections && (
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                {isSearchActive
                  ? "Search Results"
                  : showFavoritesOnly
                    ? "Favorite Services"
                    : "All Services"}
              </h3>
            )}
            {showPersonalizedSections && (
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <Layers size={14} />
                All Services
              </h3>
            )}

            {/* Loading state */}
            {(isLoading || (isSearchActive && searchLoading)) ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </div>
              )
            ) : displayItems.length === 0 ? (
              /* Empty state */
              isSearchActive ? (
                <EmptyState
                  icon={Search}
                  title="No results found"
                  description={`No services match "${debouncedSearch}". Try a different search term.`}
                />
              ) : showFavoritesOnly ? (
                <EmptyState
                  icon={Heart}
                  title="No favorites yet"
                  description="Click the heart icon on any service to add it to your favorites."
                />
              ) : (
                <EmptyState
                  icon={ShoppingCart}
                  title="No services available"
                  description="No services match your current filters."
                />
              )
            ) : isSearchActive || showFavoritesOnly || selectedCategoryIds.length > 1 ? (
              /* Flat list (search / favorites / multi-category filter) */
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {displayItems.map((item, index) => (
                    <ServiceCard
                      key={item.id}
                      item={item}
                      categoryName={
                        item.categoryId
                          ? categoryMap[item.categoryId]?.name
                          : undefined
                      }
                      isFavorited={favoriteSet.has(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onClick={() => handleViewItem(item)}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayItems.map((item, index) => (
                    <ServiceRow
                      key={item.id}
                      item={item}
                      categoryName={
                        item.categoryId
                          ? categoryMap[item.categoryId]?.name
                          : undefined
                      }
                      isFavorited={favoriteSet.has(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onClick={() => handleViewItem(item)}
                      index={index}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Grouped by category */
              Object.entries(groupedItems).map(
                ([categoryId, categoryItems]) => (
                  <motion.div
                    key={categoryId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-6 last:mb-0"
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                      {categoryMap[categoryId]?.name || "General Services"}
                    </h4>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {categoryItems.map((item, index) => (
                          <ServiceCard
                            key={item.id}
                            item={item}
                            isFavorited={favoriteSet.has(item.id)}
                            onToggleFavorite={handleToggleFavorite}
                            onClick={() => handleViewItem(item)}
                            index={index}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categoryItems.map((item, index) => (
                          <ServiceRow
                            key={item.id}
                            item={item}
                            isFavorited={favoriteSet.has(item.id)}
                            onToggleFavorite={handleToggleFavorite}
                            onClick={() => handleViewItem(item)}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                ),
              )
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline utility: lightweight relative time for "recent" cards       */
/* ------------------------------------------------------------------ */

function formatRelativeTimeInline(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60)
    return `${diffMinutes}m ago`;
  if (diffHours < 24)
    return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}
