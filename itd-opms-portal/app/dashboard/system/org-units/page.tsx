"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  Pencil,
  ArrowRightLeft,
  Trash2,
  Users,
  Calendar,
  Building2,
  Search,
  Loader2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useOrgTree,
  useOrgUnit,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useMoveOrgUnit,
  useDeleteOrgUnit,
  useSearchUsers,
} from "@/hooks/use-system";
import type { OrgTreeNode, OrgUnitDetail, UserSearchResult } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LEVEL_OPTIONS = [
  { value: "directorate", label: "Directorate" },
  { value: "department", label: "Department" },
  { value: "division", label: "Division" },
  { value: "office", label: "Office" },
  { value: "unit", label: "Unit" },
  { value: "team", label: "Team" },
  { value: "section", label: "Section" },
];

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  directorate: { bg: "rgba(220, 38, 38, 0.12)", text: "#DC2626" },
  department: { bg: "rgba(99, 102, 241, 0.12)", text: "#6366F1" },
  division: { bg: "rgba(59, 130, 246, 0.12)", text: "#3B82F6" },
  office: { bg: "rgba(139, 92, 246, 0.12)", text: "#8B5CF6" },
  unit: { bg: "rgba(16, 185, 129, 0.12)", text: "#10B981" },
  team: { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B" },
  section: { bg: "rgba(107, 114, 128, 0.12)", text: "#6B7280" },
};

function getLevelColor(level: string) {
  return (
    LEVEL_COLORS[level.toLowerCase()] ?? {
      bg: "rgba(107, 114, 128, 0.1)",
      text: "#6B7280",
    }
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers: tree traversal                                            */
/* ------------------------------------------------------------------ */

/** Build breadcrumb path from root to target node. */
function buildBreadcrumb(
  nodes: OrgTreeNode[],
  targetId: string,
  path: OrgTreeNode[] = [],
): OrgTreeNode[] | null {
  for (const node of nodes) {
    const currentPath = [...path, node];
    if (node.id === targetId) return currentPath;
    if (node.children?.length) {
      const found = buildBreadcrumb(node.children, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/** Collect all descendant IDs for a node (used to prevent moving to own subtree). */
function collectDescendantIds(node: OrgTreeNode): Set<string> {
  const ids = new Set<string>();
  ids.add(node.id);
  for (const child of node.children ?? []) {
    for (const id of collectDescendantIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

/** Flatten tree for parent selection. */
function flattenTree(
  nodes: OrgTreeNode[],
  depth = 0,
): { node: OrgTreeNode; depth: number }[] {
  const result: { node: OrgTreeNode; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  User Search Autocomplete                                           */
/* ------------------------------------------------------------------ */

function UserSearchAutocomplete({
  value,
  displayValue,
  onChange,
}: {
  value: string | undefined;
  displayValue: string;
  onChange: (userId: string | undefined, displayName: string) => void;
}) {
  const [query, setQuery] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearchUsers(debouncedQuery);

  function handleSelect(user: UserSearchResult) {
    onChange(user.id, user.displayName);
    setQuery(user.displayName);
    setOpen(false);
  }

  function handleClear() {
    onChange(undefined, "");
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) handleClear();
          }}
          onFocus={() => {
            if (query.length >= 2) setOpen(true);
          }}
          placeholder="Search for a manager..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-8 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--neutral-gray)]">
              <Loader2 size={14} className="animate-spin" />
              Searching...
            </div>
          ) : results && results.length > 0 ? (
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-1)] first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)] truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-[var(--neutral-gray)]">
              No users found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Org Tree Node Component (recursive)                                */
/* ------------------------------------------------------------------ */

function OrgTreeNodeComponent({
  node,
  depth,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  node: OrgTreeNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const levelColor = getLevelColor(node.level);

  return (
    <div>
      {/* Node row */}
      <div
        className={`group relative flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150 ${
          isSelected
            ? "bg-[var(--primary)]/8 border border-[var(--primary)]/25"
            : "hover:bg-[var(--surface-1)] border border-transparent"
        }`}
        style={{ marginLeft: depth * 24 }}
        onClick={() => onSelect(node.id)}
      >
        {/* Connector line for nested items */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0 border-l-2 border-[var(--border)]"
            style={{ left: -12 + depth * 24 }}
          />
        )}

        {/* Expand/collapse chevron */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
            hasChildren
              ? "hover:bg-[var(--surface-2)] text-[var(--text-secondary)]"
              : "text-transparent cursor-default"
          }`}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            ))}
        </button>

        {/* Level badge */}
        <span
          className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
        >
          {node.level}
        </span>

        {/* Name and info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {node.name}
          </p>
        </div>

        {/* Manager + user count */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {node.managerName && (
            <span className="text-xs text-[var(--neutral-gray)] truncate max-w-[120px]">
              {node.managerName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Users size={12} className="text-[var(--neutral-gray)]" />
            {node.userCount}
          </span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children.map((child) => (
            <OrgTreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create / Edit Unit Dialog                                          */
/* ------------------------------------------------------------------ */

function UnitFormDialog({
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

  // Reset when opening with new initial values
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

/* ------------------------------------------------------------------ */
/*  Move Unit Dialog                                                    */
/* ------------------------------------------------------------------ */

function MoveUnitDialog({
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

  // Compute disabled IDs (self + descendants)
  const disabledIds = useMemo(() => {
    function findNode(nodes: OrgTreeNode[]): OrgTreeNode | null {
      for (const n of nodes) {
        if (n.id === unitId) return n;
        const found = findNode(n.children ?? []);
        if (found) return found;
      }
      return null;
    }
    const target = findNode(treeNodes);
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

/* ------------------------------------------------------------------ */
/*  Detail Side Panel                                                   */
/* ------------------------------------------------------------------ */

function DetailPanel({
  unitId,
  treeNodes,
  onClose,
  onEdit,
  onMove,
  onDelete,
}: {
  unitId: string;
  treeNodes: OrgTreeNode[];
  onClose: () => void;
  onEdit: (unit: OrgUnitDetail) => void;
  onMove: (unit: OrgUnitDetail) => void;
  onDelete: (unit: OrgUnitDetail) => void;
}) {
  const { data: unit, isLoading } = useOrgUnit(unitId);
  const breadcrumb = useMemo(
    () => buildBreadcrumb(treeNodes, unitId) ?? [],
    [treeNodes, unitId],
  );

  if (isLoading || !unit) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--neutral-gray)]" />
      </div>
    );
  }

  const levelColor = getLevelColor(unit.level);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0 flex-1">
          {/* Breadcrumb */}
          {breadcrumb.length > 1 && (
            <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-[var(--neutral-gray)]">
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight size={10} className="text-[var(--border)]" />
                  )}
                  <span
                    className={
                      i === breadcrumb.length - 1
                        ? "font-medium text-[var(--text-primary)]"
                        : ""
                    }
                  >
                    {crumb.name}
                  </span>
                </span>
              ))}
            </div>
          )}
          <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
            {unit.name}
          </h2>
          <span
            className="mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
          >
            {unit.level}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 shrink-0 rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Info rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wide">
              Code
            </span>
            <span className="text-sm font-mono text-[var(--text-primary)]">
              {unit.code}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wide">
              Status
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                unit.isActive
                  ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                  : "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${unit.isActive ? "bg-[#10B981]" : "bg-[#EF4444]"}`}
              />
              {unit.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wide">
              Parent
            </span>
            <span className="text-sm text-[var(--text-primary)]">
              {unit.parentName || "\u2014"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wide">
              Manager
            </span>
            <span className="text-sm text-[var(--text-primary)]">
              {unit.managerName || "\u2014"}
            </span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-center">
            <Users size={16} className="mx-auto mb-1 text-[var(--primary)]" />
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {unit.userCount}
            </p>
            <p className="text-xs text-[var(--neutral-gray)]">Members</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-center">
            <Network
              size={16}
              className="mx-auto mb-1 text-[var(--primary)]"
            />
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {unit.childCount}
            </p>
            <p className="text-xs text-[var(--neutral-gray)]">Sub-units</p>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--neutral-gray)]">
              <Calendar size={12} />
              Created
            </span>
            <span className="text-[var(--text-primary)] tabular-nums">
              {formatDate(unit.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--neutral-gray)]">
              <Calendar size={12} />
              Updated
            </span>
            <span className="text-[var(--text-primary)] tabular-nums">
              {formatDate(unit.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-[var(--border)] px-5 py-4">
        <button
          type="button"
          onClick={() => onEdit(unit)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onMove(unit)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <ArrowRightLeft size={14} />
          Move
        </button>
        <button
          type="button"
          onClick={() => onDelete(unit)}
          disabled={unit.childCount > 0}
          title={
            unit.childCount > 0
              ? "Cannot delete a unit with child units"
              : "Delete this unit"
          }
          className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[rgba(239,68,68,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OrgUnitsPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Organization Structure", href: "/dashboard/system/org-units" },
  ]);

  const { data: treeNodes, isLoading } = useOrgTree();
  const createMutation = useCreateOrgUnit();
  const _updateMutation = useUpdateOrgUnit(undefined);
  const moveMutation = useMoveOrgUnit();
  const deleteMutation = useDeleteOrgUnit();

  /* ---- State ---- */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnitDetail | null>(null);
  const [moveTarget, setMoveTarget] = useState<OrgUnitDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgUnitDetail | null>(null);

  /* ---- Expand root nodes on first load ---- */
  useEffect(() => {
    if (treeNodes && treeNodes.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set(treeNodes.map((n) => n.id)));
    }
  }, [treeNodes]);

  /* ---- Update mutation needs the correct ID ---- */
  const editUpdateMutation = useUpdateOrgUnit(editTarget?.id);

  /* ---- Handlers ---- */
  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function handleCreate(data: {
    name: string;
    code: string;
    level: string;
    parentId?: string;
    managerUserId?: string;
  }) {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreate(false),
    });
  }

  function handleEdit(data: {
    name: string;
    code: string;
    level: string;
    parentId?: string;
    managerUserId?: string;
  }) {
    if (!editTarget) return;
    editUpdateMutation.mutate(data as Partial<OrgUnitDetail>, {
      onSuccess: () => setEditTarget(null),
    });
  }

  function handleMove(newParentId: string) {
    if (!moveTarget) return;
    moveMutation.mutate(
      { id: moveTarget.id, newParentId },
      { onSuccess: () => setMoveTarget(null) },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (selectedId === deleteTarget.id) setSelectedId(null);
      },
    });
  }

  const tree = treeNodes ?? [];

  /* ---- Render ---- */
  return (
    <PermissionGate permission="system.manage">
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
          >
            <Network size={20} style={{ color: "#6366F1" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Organisation Structure
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Manage the organisational hierarchy, units, and reporting lines
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Add Unit
        </button>
      </motion.div>

      {/* Main content: Tree + Detail Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-1 min-h-0 gap-0 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
      >
        {/* Org Tree Panel */}
        <div
          className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ${
            selectedId ? "border-r border-[var(--border)]" : ""
          }`}
        >
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{ paddingLeft: (i % 3) * 24 }}
                >
                  <div className="h-6 w-6 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="h-5 w-16 animate-pulse rounded-md bg-[var(--surface-2)]" />
                  <div className="h-4 flex-1 max-w-[180px] animate-pulse rounded-md bg-[var(--surface-2)]" />
                </div>
              ))}
            </div>
          ) : tree.length > 0 ? (
            tree.map((rootNode) => (
              <OrgTreeNodeComponent
                key={rootNode.id}
                node={rootNode}
                depth={0}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onToggle={handleToggle}
                onSelect={setSelectedId}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--surface-2)] mb-4">
                <Network size={24} className="text-[var(--neutral-gray)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                No organisational units
              </h3>
              <p className="text-sm text-[var(--neutral-gray)] mb-4">
                Create your first unit to build the org structure.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                Add Unit
              </button>
            </div>
          )}
        </div>

        {/* Detail Side Panel */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              key="detail-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="shrink-0 overflow-hidden bg-[var(--surface-0)]"
            >
              <div className="h-full w-[380px]">
                <DetailPanel
                  unitId={selectedId}
                  treeNodes={tree}
                  onClose={() => setSelectedId(null)}
                  onEdit={(unit) => setEditTarget(unit)}
                  onMove={(unit) => setMoveTarget(unit)}
                  onDelete={(unit) => setDeleteTarget(unit)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Create Unit Dialog */}
      <UnitFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        title="Create Organisational Unit"
        submitLabel="Create Unit"
        treeNodes={tree}
      />

      {/* Edit Unit Dialog */}
      <UnitFormDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        loading={editUpdateMutation.isPending}
        title="Edit Organisational Unit"
        submitLabel="Save Changes"
        treeNodes={tree}
        initial={
          editTarget
            ? {
                name: editTarget.name,
                code: editTarget.code,
                level: editTarget.level,
                parentId: editTarget.parentId,
                managerUserId: editTarget.managerUserId,
                managerName: editTarget.managerName,
              }
            : undefined
        }
      />

      {/* Move Unit Dialog */}
      {moveTarget && (
        <MoveUnitDialog
          open={moveTarget !== null}
          onClose={() => setMoveTarget(null)}
          onSubmit={handleMove}
          loading={moveMutation.isPending}
          unitId={moveTarget.id}
          unitName={moveTarget.name}
          treeNodes={tree}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Organisational Unit"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? ""}"? This action cannot be undone. The unit must have no child units to be deleted.`}
        confirmLabel="Delete Unit"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
    </PermissionGate>
  );
}
