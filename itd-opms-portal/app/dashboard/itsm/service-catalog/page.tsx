"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Clock,
  ShieldCheck,
  Search,
  ArrowRight,
  Layers,
  Package,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCatalogCategories,
  useEntitledCatalogItems,
} from "@/hooks/use-itsm";
import type { CatalogItem, CatalogCategory } from "@/types";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ServiceCatalogPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: categories, isLoading: categoriesLoading } =
    useCatalogCategories();
  const { data: items, isLoading: itemsLoading } =
    useEntitledCatalogItems();

  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  /* Group items by category */
  const groupedItems = useMemo(() => {
    if (!items) return {};
    const groups: Record<string, CatalogItem[]> = {};

    let filtered = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q),
      );
    }

    if (selectedCategoryId) {
      filtered = filtered.filter(
        (item) => item.categoryId === selectedCategoryId,
      );
    }

    for (const item of filtered) {
      const key = item.categoryId || "uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [items, selectedCategoryId, searchQuery]);

  const categoryMap = useMemo(() => {
    const map: Record<string, CatalogCategory> = {};
    if (categories) {
      for (const cat of categories) {
        map[cat.id] = cat;
      }
    }
    return map;
  }, [categories]);

  const isLoading = categoriesLoading || itemsLoading;

  const handleRequestItem = (item: CatalogItem) => {
    const params = new URLSearchParams({
      catalogItemId: item.id,
      type: "service_request",
      title: item.name,
    });
    router.push(`/dashboard/itsm/tickets/new?${params.toString()}`);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
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
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <Search size={18} className="text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          />
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:w-64 shrink-0"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
            Categories
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
              style={{
                backgroundColor:
                  selectedCategoryId === null
                    ? "var(--primary)"
                    : "transparent",
                color:
                  selectedCategoryId === null
                    ? "#fff"
                    : "var(--text-primary)",
              }}
            >
              <div className="flex items-center gap-2">
                <Layers size={16} />
                All Services
              </div>
            </button>
            {categoriesLoading ? (
              <div className="space-y-2 px-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 rounded-lg bg-[var(--surface-2)] animate-pulse"
                  />
                ))}
              </div>
            ) : (
              categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
                  style={{
                    backgroundColor:
                      selectedCategoryId === cat.id
                        ? "var(--primary)"
                        : "transparent",
                    color:
                      selectedCategoryId === cat.id
                        ? "#fff"
                        : "var(--text-primary)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    {cat.name}
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>

        {/* Items Grid */}
        <div className="flex-1 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-xl bg-[var(--surface-2)] animate-pulse"
                />
              ))}
            </div>
          ) : Object.keys(groupedItems).length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <ShoppingCart
                size={48}
                className="text-[var(--text-secondary)] mb-4 opacity-40"
              />
              <p className="text-[var(--text-secondary)] text-sm">
                {searchQuery
                  ? "No services match your search."
                  : "No services available in this category."}
              </p>
            </motion.div>
          ) : (
            Object.entries(groupedItems).map(
              ([categoryId, categoryItems]) => (
                <motion.div
                  key={categoryId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                    {categoryMap[categoryId]?.name || "General Services"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {categoryItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.05,
                        }}
                      >
                        <button
                          onClick={() => handleRequestItem(item)}
                          className="group block w-full text-left rounded-xl border p-5 transition-all duration-200 hover:shadow-md"
                          style={{
                            backgroundColor: "var(--surface-0)",
                            borderColor: "var(--border)",
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  "rgba(59, 130, 246, 0.1)",
                              }}
                            >
                              <Package
                                size={18}
                                style={{ color: "#3B82F6" }}
                              />
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
                          <div className="flex items-center gap-3 flex-wrap">
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
                                  backgroundColor:
                                    "rgba(249, 115, 22, 0.1)",
                                  color: "#F97316",
                                }}
                              >
                                <ShieldCheck size={12} />
                                Approval Required
                              </span>
                            )}
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
