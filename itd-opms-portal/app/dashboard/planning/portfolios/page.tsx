"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  Filter,
  ArrowRight,
  Calendar,
  Briefcase,
  Loader2,
} from "lucide-react";
import { usePortfolios } from "@/hooks/use-planning";
import type { Portfolio } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(27, 115, 64, 0.1)", text: "#1B7340" },
  archived: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortfoliosPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = usePortfolios(
    page,
    20,
    status || undefined,
  );

  const portfolios = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <FolderOpen size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Portfolios
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Organize and track project portfolios by fiscal year
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/portfolios/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Portfolio
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={24}
              className="animate-spin text-[var(--primary)]"
            />
            <p className="text-sm text-[var(--neutral-gray)]">
              Loading portfolios...
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && portfolios.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center justify-center py-24 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] mb-4">
            <FolderOpen size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No portfolios found
          </p>
          <p className="text-sm text-[var(--neutral-gray)] mt-1 mb-4">
            Get started by creating your first portfolio.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/portfolios/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Portfolio
          </button>
        </motion.div>
      )}

      {/* Portfolio Grid */}
      {!isLoading && portfolios.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {portfolios.map((portfolio: Portfolio, index: number) => {
            const statusColor = STATUS_COLORS[portfolio.status] ?? {
              bg: "var(--surface-2)",
              text: "var(--neutral-gray)",
            };
            return (
              <motion.div
                key={portfolio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/planning/portfolios/${portfolio.id}`}
                  className="group block rounded-xl border p-5 transition-all duration-200 hover:shadow-md"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
                    >
                      <FolderOpen size={20} style={{ color: "#1B7340" }} />
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                    />
                  </div>

                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
                    {portfolio.name}
                  </h3>
                  {portfolio.description && (
                    <p className="text-xs text-[var(--neutral-gray)] line-clamp-2 mb-3">
                      {portfolio.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <Calendar size={12} />
                      <span>FY {portfolio.fiscalYear}</span>
                    </div>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                      style={{
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                      }}
                    >
                      {portfolio.status}
                    </span>
                  </div>

                  {portfolio.ownerId && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-gray)] mt-2">
                      <Briefcase size={12} />
                      <span>
                        Owner: {portfolio.ownerId.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--neutral-gray)]">
            {meta.totalItems} result{meta.totalItems !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[var(--neutral-gray)] tabular-nums">
              {page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
