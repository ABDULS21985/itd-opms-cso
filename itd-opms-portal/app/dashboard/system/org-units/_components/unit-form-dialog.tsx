"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Building2, Plus, Loader2 } from "lucide-react";
import { LEVEL_OPTIONS, flattenTree } from "./constants";
import { UserSearchAutocomplete } from "./user-search-autocomplete";
import type { OrgTreeNode } from "@/types";

export function UnitFormDialog({
  open,
  onClose,
  onSubmit,
  loading,
  title,
  submitLabel,
  initial,
  treeNodes,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    code: string;
    level: string;
    parentId?: string;
    managerUserId?: string;
  }) => void;
  loading: boolean;
  title: string;
  submitLabel: string;
  initial?: {
    name?: string;
    code?: string;
    level?: string;
    parentId?: string;
    managerUserId?: string;
    managerName?: string;
  };
  treeNodes: OrgTreeNode[];
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [level, setLevel] = useState(initial?.level ?? "department");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [managerUserId, setManagerUserId] = useState(
    initial?.managerUserId ?? "",
  );
  const [managerDisplay, setManagerDisplay] = useState(
    initial?.managerName ?? "",
  );

  const flatNodes = useMemo(() => flattenTree(treeNodes), [treeNodes]);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCode(initial?.code ?? "");
      setLevel(initial?.level ?? "department");
      setParentId(initial?.parentId ?? "");
      setManagerUserId(initial?.managerUserId ?? "");
      setManagerDisplay(initial?.managerName ?? "");
    }
  }, [open, initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      level,
      parentId: parentId || undefined,
      managerUserId: managerUserId || undefined,
    });
  }

  function handleClose() {
    if (loading) return;
    onClose();
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
        onClick={handleClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <Building2 className="h-6 w-6 text-[var(--primary)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Fill in the details below to configure the organisational unit.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Application Development"
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Code <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. APP-DEV"
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 uppercase"
            />
          </div>

          {/* Level */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Level <span className="text-[var(--error)]">*</span>
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Parent */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Parent Unit
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">None (root level)</option>
              {flatNodes.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {"\u00A0\u00A0".repeat(depth)}
                  {node.name} ({node.level})
                </option>
              ))}
            </select>
          </div>

          {/* Manager */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Manager
            </label>
            <UserSearchAutocomplete
              value={managerUserId || undefined}
              displayValue={managerDisplay}
              onChange={(uid, display) => {
                setManagerUserId(uid ?? "");
                setManagerDisplay(display);
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !code.trim()}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {submitLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
