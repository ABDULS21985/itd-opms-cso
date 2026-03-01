"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { X, ArrowRightLeft, Loader2 } from "lucide-react";
import { collectDescendantIds, flattenTree, findNodeById } from "./constants";
import type { OrgTreeNode } from "@/types";

export function MoveUnitDialog({
  open,
  onClose,
  onSubmit,
  loading,
  unitId,
  unitName,
  treeNodes,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (newParentId: string) => void;
  loading: boolean;
  unitId: string;
  unitName: string;
  treeNodes: OrgTreeNode[];
}) {
  const [selectedParent, setSelectedParent] = useState("");

  const disabledIds = useMemo(() => {
    const target = findNodeById(treeNodes, unitId);
    return target ? collectDescendantIds(target) : new Set<string>();
  }, [treeNodes, unitId]);

  const flatNodes = useMemo(() => flattenTree(treeNodes), [treeNodes]);

  useEffect(() => {
    if (open) setSelectedParent("");
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedParent) return;
    onSubmit(selectedParent);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={() => !loading && onClose()}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)]"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <ArrowRightLeft className="h-6 w-6 text-[var(--primary)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Move Unit
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Select a new parent for <strong>{unitName}</strong>. You cannot move a
          unit into itself or its own descendants.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              New Parent <span className="text-[var(--error)]">*</span>
            </label>
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">Select a parent unit...</option>
              {flatNodes
                .filter(({ node }) => !disabledIds.has(node.id))
                .map(({ node, depth }) => (
                  <option key={node.id} value={node.id}>
                    {"\u00A0\u00A0".repeat(depth)}
                    {node.name} ({node.level})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedParent}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Moving...
                </span>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4" />
                  Move Unit
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
