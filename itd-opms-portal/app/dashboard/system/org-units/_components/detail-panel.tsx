"use client";

import { useMemo } from "react";
import {
  ChevronRight,
  X,
  Pencil,
  ArrowRightLeft,
  Trash2,
  Users,
  Network,
  Calendar,
  Loader2,
} from "lucide-react";
import { useOrgUnit } from "@/hooks/use-system";
import { getLevelColor, buildBreadcrumb, formatDate } from "./constants";
import type { OrgTreeNode, OrgUnitDetail } from "@/types";

export function DetailPanel({
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
