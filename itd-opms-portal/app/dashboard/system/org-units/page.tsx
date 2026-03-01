"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useOrgTree,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useMoveOrgUnit,
  useDeleteOrgUnit,
} from "@/hooks/use-system";
import { Toolbar } from "./_components/toolbar";
import { EnhancedTreeView } from "./_components/enhanced-tree-view";
import { OrgChartView } from "./_components/org-chart-view";
import { SunburstView } from "./_components/sunburst-view";
import { DetailPanel } from "./_components/detail-panel";
import { UnitFormDialog } from "./_components/unit-form-dialog";
import { MoveUnitDialog } from "./_components/move-unit-dialog";
import { exportSvgAsPng } from "./_components/export-png";
import {
  collectAllIds, countNodes, getMatchingNodeIds, findAncestorIds, flattenTree,
} from "./_components/constants";
import type { ViewMode } from "./_components/types";
import type { OrgTreeNode, OrgUnitDetail } from "@/types";

/* ---- Export helpers ---- */

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCsv(tree: OrgTreeNode[]) {
  const rows: string[][] = [["Name", "Code", "Level", "Manager", "Users", "Depth"]];
  for (const { node, depth } of flattenTree(tree)) {
    rows.push([node.name, node.code ?? "", node.level, node.managerName ?? "", String(node.userCount), String(depth)]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), "org-structure.csv");
}

function exportJson(tree: OrgTreeNode[]) {
  downloadBlob(new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" }), "org-structure.json");
}

/* ---- Mutation data shape ---- */

interface UnitFormData {
  name: string;
  code: string;
  level: string;
  parentId?: string;
  managerUserId?: string;
}

/* ---- Page ---- */

export default function OrgUnitsPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Organization Structure", href: "/dashboard/system/org-units" },
  ]);

  const { data: treeNodes, isLoading } = useOrgTree();
  const createMutation = useCreateOrgUnit();
  const moveMutation = useMoveOrgUnit();
  const deleteMutation = useDeleteOrgUnit();

  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnitDetail | null>(null);
  const [moveTarget, setMoveTarget] = useState<OrgUnitDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgUnitDetail | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const tree = treeNodes ?? [];
  const editUpdateMutation = useUpdateOrgUnit(editTarget?.id);
  const hasFilter = searchQuery.trim().length > 0 || levelFilter.length > 0;

  const highlightedIds = useMemo(() => {
    if (!hasFilter) return new Set<string>();
    return getMatchingNodeIds(tree, searchQuery, levelFilter);
  }, [tree, searchQuery, levelFilter, hasFilter]);

  const nodeCount = useMemo(() => countNodes(tree), [tree]);

  // Auto-expand root nodes on first load
  useEffect(() => {
    if (treeNodes && treeNodes.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set(treeNodes.map((n) => n.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeNodes]);

  // Search auto-expand: expand ancestors of matching nodes
  useEffect(() => {
    if (!hasFilter || tree.length === 0) return;
    const ancestorIds = new Set<string>();
    for (const matchId of highlightedIds) {
      const ancestors = findAncestorIds(tree, matchId);
      if (ancestors) for (const aid of ancestors) ancestorIds.add(aid);
    }
    if (ancestorIds.size > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const id of ancestorIds) next.add(id);
        return next;
      });
    }
  }, [highlightedIds, hasFilter, tree]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleCreate = (data: UnitFormData) =>
    createMutation.mutate(data, { onSuccess: () => setShowCreate(false) });

  const handleEdit = (data: UnitFormData) => {
    if (!editTarget) return;
    editUpdateMutation.mutate(data as Partial<OrgUnitDetail>, { onSuccess: () => setEditTarget(null) });
  };

  const handleMove = (newParentId: string) => {
    if (!moveTarget) return;
    moveMutation.mutate({ id: moveTarget.id, newParentId }, { onSuccess: () => setMoveTarget(null) });
  };

  const handleMoveNode = (nodeId: string, newParentId: string) =>
    moveMutation.mutate({ id: nodeId, newParentId });

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (selectedId === deleteTarget.id) setSelectedId(null);
      },
    });
  };

  const handleExportPng = () => {
    const svg = contentRef.current?.querySelector("svg");
    if (svg) exportSvgAsPng(svg, "org-structure.png");
  };

  const viewProps = {
    tree, selectedId, onSelect: setSelectedId, expandedIds,
    onToggle: handleToggle, highlightedIds, searchQuery, onMoveNode: handleMoveNode,
  };

  return (
    <PermissionGate permission="system.manage">
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
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
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Organisation Structure</h1>
              <p className="text-sm text-[var(--neutral-gray)]">
                Manage the organisational hierarchy, units, and reporting lines
              </p>
            </div>
          </div>
        </motion.div>

        {/* Toolbar */}
        <Toolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          levelFilter={levelFilter}
          onLevelFilterChange={setLevelFilter}
          onExpandAll={() => setExpandedIds(collectAllIds(tree))}
          onCollapseAll={() => setExpandedIds(new Set())}
          onCreateUnit={() => setShowCreate(true)}
          onExportPng={handleExportPng}
          onExportCsv={() => exportCsv(tree)}
          onExportJson={() => exportJson(tree)}
          nodeCount={nodeCount}
        />

        {/* Main content: View + Detail Panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-1 min-h-0 gap-0 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
        >
          {/* Active view */}
          <div ref={contentRef} className="flex-1 min-h-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ paddingLeft: (i % 3) * 24 }}>
                    <div className="h-6 w-6 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="h-5 w-16 animate-pulse rounded-md bg-[var(--surface-2)]" />
                    <div className="h-4 flex-1 max-w-[180px] animate-pulse rounded-md bg-[var(--surface-2)]" />
                  </div>
                ))}
              </div>
            ) : tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--surface-2)] mb-4">
                  <Network size={24} className="text-[var(--neutral-gray)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No organisational units</h3>
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
            ) : (
              <>
                {viewMode === "chart" && <OrgChartView {...viewProps} />}
                {viewMode === "sunburst" && <SunburstView {...viewProps} />}
                {viewMode === "tree" && <EnhancedTreeView {...viewProps} />}
              </>
            )}
          </div>

          {/* Detail Side Panel (animated width) */}
          <AnimatePresence>
            {selectedId && (
              <motion.div
                key="detail-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="shrink-0 overflow-hidden bg-[var(--surface-0)] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:w-full max-md:shadow-xl"
              >
                <div className="h-full w-[380px] max-md:w-full">
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
          initial={editTarget ? {
            name: editTarget.name, code: editTarget.code, level: editTarget.level,
            parentId: editTarget.parentId, managerUserId: editTarget.managerUserId,
            managerName: editTarget.managerName,
          } : undefined}
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
