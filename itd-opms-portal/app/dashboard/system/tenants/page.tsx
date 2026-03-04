"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Plus, ChevronRight, ChevronDown,
  ChevronsUpDown, ChevronsDownUp, Users, Calendar,
  Pencil, Power, X,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useTenants, useCreateTenant, useUpdateTenant, useDeactivateTenant,
} from "@/hooks/use-system";
import type { TenantDetail, TenantSummary } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const TENANT_TYPES = ["department", "division", "office", "unit"] as const;

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  department: { bg: "rgba(59, 130, 246, 0.12)", text: "#2563EB" },
  division:   { bg: "rgba(16, 185, 129, 0.12)", text: "#059669" },
  office:     { bg: "rgba(245, 158, 11, 0.12)", text: "#D97706" },
  unit:       { bg: "rgba(107, 114, 128, 0.12)", text: "#6B7280" },
};

const getTypeColor = (type: string) =>
  TYPE_COLORS[type] ?? { bg: "rgba(107,114,128,0.1)", text: "#6B7280" };

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const INPUT_CLS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";
const LABEL_CLS = "mb-1 block text-xs font-medium text-[var(--neutral-gray)]";

/* ------------------------------------------------------------------ */
/*  Tree building                                                      */
/* ------------------------------------------------------------------ */

interface TreeNode {
  id: string; name: string; code: string; type: string;
  isActive: boolean; userCount: number; children: TreeNode[];
}

function buildTree(tenants: TenantDetail[]): TreeNode[] {
  const map = new Map<string, TenantDetail>();
  tenants.forEach((t) => map.set(t.id, t));

  function toNode(t: TenantDetail | TenantSummary): TreeNode {
    const detail = map.get(t.id);
    return {
      id: t.id, name: t.name, code: t.code, type: t.type,
      isActive: t.isActive, userCount: t.userCount,
      children: (detail?.children ?? []).map((c) => toNode(map.get(c.id) ?? c)),
    };
  }
  return tenants.filter((t) => !t.parentId).map(toNode);
}

function collectAllIds(nodes: TreeNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (n: TreeNode) => { ids.add(n.id); n.children.forEach(walk); };
  nodes.forEach(walk);
  return ids;
}

/* ------------------------------------------------------------------ */
/*  TypeBadge                                                          */
/* ------------------------------------------------------------------ */

function TypeBadge({ type, size = "xs" }: { type: string; size?: "xs" | "sm" }) {
  const c = getTypeColor(type);
  const cls = size === "xs"
    ? "text-[10px] px-2 py-0.5"
    : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold capitalize ${cls}`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {type}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  TenantTreeNode (recursive)                                         */
/* ------------------------------------------------------------------ */

function TenantTreeNode({
  node, depth, expanded, selected, onToggle, onSelect,
}: {
  node: TreeNode; depth: number; expanded: Set<string>;
  selected: string | null; onToggle: (id: string) => void; onSelect: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-1)] ${
          selected === node.id ? "bg-[var(--primary)]/8 border border-[var(--primary)]/20" : ""
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <span
            role="button" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onToggle(node.id); } }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{node.name}</span>
          <span className="ml-1.5 text-xs text-[var(--neutral-gray)]">{node.code}</span>
        </div>
        <TypeBadge type={node.type} />
        <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--neutral-gray)] tabular-nums">
          <Users size={12} />{node.userCount}
        </span>
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${node.isActive ? "bg-[var(--success)]" : "bg-[var(--error)]"}`}
          title={node.isActive ? "Active" : "Inactive"}
        />
      </button>

      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TenantTreeNode key={child.id} node={child} depth={depth + 1}
                expanded={expanded} selected={selected} onToggle={onToggle} onSelect={onSelect} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tenant Form Dialog                                                 */
/* ------------------------------------------------------------------ */

interface TenantFormData { name: string; code: string; type: string; parentId: string; }

function TenantFormDialog({
  open, onClose, onSubmit, title, initial, tenants, loading,
}: {
  open: boolean; onClose: () => void; onSubmit: (d: TenantFormData) => void;
  title: string; initial?: Partial<TenantFormData>; tenants: TenantDetail[]; loading: boolean;
}) {
  const [form, setForm] = useState<TenantFormData>({ name: "", code: "", type: "department", parentId: "" });

  useEffect(() => {
    if (open) setForm({
      name: initial?.name ?? "", code: initial?.code ?? "",
      type: initial?.type ?? "department", parentId: initial?.parentId ?? "",
    });
  }, [open, initial]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, loading, onClose]);

  if (!open) return null;

  const set = (patch: Partial<TenantFormData>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl">
        <button type="button" onClick={onClose} disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
          aria-label="Close dialog">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-5">{title}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
          <div>
            <label className={LABEL_CLS}>Name</label>
            <input className={INPUT_CLS} value={form.name} onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. IT Solutions Division" required />
          </div>
          <div>
            <label className={LABEL_CLS}>Code</label>
            <input className={INPUT_CLS} value={form.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="e.g. ITSD" required />
          </div>
          <div>
            <label className={LABEL_CLS}>Type</label>
            <select className={INPUT_CLS} value={form.type} onChange={(e) => set({ type: e.target.value })}>
              {TENANT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Parent Tenant</label>
            <select className={INPUT_CLS} value={form.parentId} onChange={(e) => set({ parentId: e.target.value })}>
              <option value="">None (Root)</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.name.trim() || !form.code.trim()}
              className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Panel                                                       */
/* ------------------------------------------------------------------ */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-[var(--neutral-gray)] pt-0.5">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function DetailPanel({ tenant, onEdit, onDeactivate }: {
  tenant: TenantDetail; onEdit: () => void; onDeactivate: () => void;
}) {
  return (
    <motion.div key={tenant.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tenant.name}</h3>
          <p className="text-sm text-[var(--neutral-gray)]">{tenant.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]">
            <Pencil size={12} />Edit
          </button>
          {tenant.isActive && (
            <button type="button" onClick={onDeactivate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--error)]/30 px-2.5 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/8">
              <Power size={12} />Deactivate
            </button>
          )}
        </div>
      </div>
      {/* Fields */}
      <div className="space-y-3">
        <DetailRow label="Type"><TypeBadge type={tenant.type} size="sm" /></DetailRow>
        <DetailRow label="Status"><StatusBadge status={tenant.isActive ? "active" : "inactive"} /></DetailRow>
        <DetailRow label="Parent">
          <span className="text-sm text-[var(--text-primary)]">{tenant.parentName || "None (Root)"}</span>
        </DetailRow>
        <DetailRow label="Users">
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] tabular-nums">
            <Users size={14} className="text-[var(--neutral-gray)]" />{tenant.userCount}
          </span>
        </DetailRow>
        <DetailRow label="Created">
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] tabular-nums">
            <Calendar size={14} className="text-[var(--neutral-gray)]" />{fmtDate(tenant.createdAt)}
          </span>
        </DetailRow>
        <DetailRow label="Updated">
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] tabular-nums">
            <Calendar size={14} className="text-[var(--neutral-gray)]" />{fmtDate(tenant.updatedAt)}
          </span>
        </DetailRow>
        {tenant.config && Object.keys(tenant.config).length > 0 && (
          <DetailRow label="Config">
            <pre className="max-h-40 overflow-auto rounded-lg bg-[var(--surface-1)] p-3 text-xs text-[var(--text-secondary)] font-mono">
              {JSON.stringify(tenant.config, null, 2)}
            </pre>
          </DetailRow>
        )}
        {tenant.children && tenant.children.length > 0 && (
          <DetailRow label="Children">
            <div className="flex flex-wrap gap-1.5">
              {tenant.children.map((c) => {
                const cc = getTypeColor(c.type);
                return (
                  <span key={c.id}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cc.text }} />
                    {c.name}
                  </span>
                );
              })}
            </div>
          </DetailRow>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TenantsPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Tenants", href: "/dashboard/system/tenants" },
  ]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantDetail | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TenantDetail | null>(null);

  const { data: tenants, isLoading } = useTenants();
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant(editTarget?.id);
  const deactivateMutation = useDeactivateTenant();

  const list = useMemo(() => (Array.isArray(tenants) ? tenants : []), [tenants]);
  const tree = useMemo(() => buildTree(list), [list]);
  const selectedTenant = useMemo(() => list.find((t) => t.id === selectedId) ?? null, [list, selectedId]);

  const toggleNode = useCallback((id: string) => {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const expandAll = useCallback(() => setExpanded(collectAllIds(tree)), [tree]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  function handleCreate(data: TenantFormData) {
    createMutation.mutate(
      { name: data.name, code: data.code, type: data.type, parentId: data.parentId || undefined },
      { onSuccess: () => setShowCreate(false) },
    );
  }

  function handleEdit(data: TenantFormData) {
    if (!editTarget) return;
    updateMutation.mutate(
      { name: data.name, code: data.code, type: data.type, parentId: data.parentId || undefined } as Partial<TenantDetail>,
      { onSuccess: () => setEditTarget(null) },
    );
  }

  function handleDeactivateConfirm() {
    if (!deactivateTarget) return;
    deactivateMutation.mutate(deactivateTarget.id, { onSettled: () => setDeactivateTarget(null) });
  }

  return (
    <PermissionGate permission="system.manage">
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}>
            <Building2 size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Tenants</h1>
            <p className="text-sm text-[var(--neutral-gray)]">Manage organizational tenants and their hierarchy</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          <Plus size={16} />Add Tenant
        </button>
      </motion.div>

      {/* Tree + Detail */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Tree */}
        <div className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Hierarchy</h2>
            <div className="flex items-center gap-1">
              <button type="button" onClick={expandAll}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]">
                <ChevronsUpDown size={14} />Expand All
              </button>
              <button type="button" onClick={collapseAll}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]">
                <ChevronsDownUp size={14} />Collapse All
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 size={40} className="mb-3 text-[var(--neutral-gray)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">No tenants found</p>
              <p className="mt-1 text-xs text-[var(--neutral-gray)]">Create your first tenant to get started.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TenantTreeNode key={node.id} node={node} depth={0} expanded={expanded}
                  selected={selectedId} onToggle={toggleNode} onSelect={setSelectedId} />
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selectedTenant ? (
            <DetailPanel tenant={selectedTenant}
              onEdit={() => setEditTarget(selectedTenant)} onDeactivate={() => setDeactivateTarget(selectedTenant)} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-20 text-center">
              <Building2 size={36} className="mb-3 text-[var(--neutral-gray)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Select a tenant</p>
              <p className="mt-1 text-xs text-[var(--neutral-gray)]">Click on a tenant in the tree to view its details.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Create Dialog */}
      <TenantFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate}
        title="Add Tenant" tenants={list} loading={createMutation.isPending} />

      {/* Edit Dialog */}
      <TenantFormDialog open={editTarget !== null} onClose={() => setEditTarget(null)} onSubmit={handleEdit}
        title="Edit Tenant" tenants={list.filter((t) => t.id !== editTarget?.id)} loading={updateMutation.isPending}
        initial={editTarget ? { name: editTarget.name, code: editTarget.code, type: editTarget.type, parentId: editTarget.parentId } : undefined} />

      {/* Deactivate Confirmation */}
      <ConfirmDialog open={deactivateTarget !== null} onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivateConfirm} title="Deactivate Tenant" confirmLabel="Deactivate" variant="danger"
        loading={deactivateMutation.isPending}
        message={`Are you sure you want to deactivate "${deactivateTarget?.name ?? ""}"? All users under this tenant will lose access until it is reactivated.`} />
    </div>
    </PermissionGate>
  );
}
