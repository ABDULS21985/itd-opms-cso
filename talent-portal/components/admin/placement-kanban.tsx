"use client";

import {
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Briefcase,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  Check,
  MessageSquare,
  ArrowRight,
  Loader2,
  TrendingUp,
  Timer,
  Minimize2,
  Maximize2,
  Plus,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  GripVertical,
  AlertCircle,
} from "lucide-react";
import type { PlacementRecord } from "@/types/placement";
import { PlacementStatus } from "@/types/placement";

// ─────────────────────────────────────────────────────────────────────────────
// Column Config
// ─────────────────────────────────────────────────────────────────────────────

interface ColumnConfig {
  status: PlacementStatus;
  label: string;
  color: string;
  bgTint: string;
  icon: typeof Clock;
}

export const KANBAN_COLUMNS: ColumnConfig[] = [
  { status: PlacementStatus.AVAILABLE, label: "Available", color: "var(--info)", bgTint: "rgba(59,130,246,0.03)", icon: Clock },
  { status: PlacementStatus.IN_DISCUSSION, label: "In Discussion", color: "var(--primary)", bgTint: "rgba(30,77,183,0.03)", icon: MessageSquare },
  { status: PlacementStatus.INTERVIEWING, label: "Interviewing", color: "var(--accent-orange)", bgTint: "rgba(245,154,35,0.03)", icon: User },
  { status: PlacementStatus.OFFER, label: "Offer", color: "var(--badge-purple-dot)", bgTint: "rgba(139,92,246,0.03)", icon: FileText },
  { status: PlacementStatus.PLACED, label: "Placed", color: "var(--success)", bgTint: "rgba(16,185,129,0.03)", icon: CheckCircle2 },
  { status: PlacementStatus.COMPLETED, label: "Completed", color: "var(--success-dark)", bgTint: "rgba(5,150,105,0.03)", icon: CheckCircle2 },
];

const VALID_TRANSITIONS: Record<PlacementStatus, PlacementStatus[]> = {
  [PlacementStatus.AVAILABLE]: [PlacementStatus.IN_DISCUSSION, PlacementStatus.CANCELLED],
  [PlacementStatus.IN_DISCUSSION]: [PlacementStatus.INTERVIEWING, PlacementStatus.CANCELLED],
  [PlacementStatus.INTERVIEWING]: [PlacementStatus.OFFER, PlacementStatus.CANCELLED],
  [PlacementStatus.OFFER]: [PlacementStatus.PLACED, PlacementStatus.CANCELLED],
  [PlacementStatus.PLACED]: [PlacementStatus.COMPLETED, PlacementStatus.CANCELLED],
  [PlacementStatus.COMPLETED]: [],
  [PlacementStatus.CANCELLED]: [],
};

const PROGRESSION_STAGES: PlacementStatus[] = [
  PlacementStatus.AVAILABLE,
  PlacementStatus.IN_DISCUSSION,
  PlacementStatus.INTERVIEWING,
  PlacementStatus.OFFER,
  PlacementStatus.PLACED,
  PlacementStatus.COMPLETED,
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStageEntryDate(p: PlacementRecord): string | null {
  switch (p.status) {
    case PlacementStatus.AVAILABLE: return p.createdAt;
    case PlacementStatus.IN_DISCUSSION: return p.introDate || p.updatedAt;
    case PlacementStatus.INTERVIEWING: return p.interviewDate || p.updatedAt;
    case PlacementStatus.OFFER: return p.offerDate || p.updatedAt;
    case PlacementStatus.PLACED: return p.placedDate || p.updatedAt;
    case PlacementStatus.COMPLETED: return p.completedDate || p.updatedAt;
    default: return p.updatedAt;
  }
}

function getDaysInStage(p: PlacementRecord): number {
  const d = getStageEntryDate(p);
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

function daysBadgeVariant(days: number) {
  if (days <= 7) return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200/60" };
  if (days <= 14) return { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200/60" };
  return { bg: "bg-[var(--error)]/10", text: "text-[var(--error)]", border: "border-red-200/60" };
}

function stageProgress(status: PlacementStatus): number {
  const idx = PROGRESSION_STAGES.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getColumnForStatus(status: PlacementStatus) {
  return KANBAN_COLUMNS.find(c => c.status === status);
}

// ─────────────────────────────────────────────────────────────────────────────
// KanbanCard
// ─────────────────────────────────────────────────────────────────────────────

function KanbanCard({
  placement,
  compact = false,
  isDragOverlay = false,
}: {
  placement: PlacementRecord;
  compact?: boolean;
  isDragOverlay?: boolean;
}) {
  const days = getDaysInStage(placement);
  const badge = daysBadgeVariant(days);
  const progress = stageProgress(placement.status);
  const candidateName = placement.candidate?.fullName || "Unknown";
  const companyName = placement.employer?.companyName || "Unknown";
  const jobTitle = placement.job?.title || null;

  return (
    <div
      className={`group relative bg-[var(--surface-1)] rounded-xl border transition-all duration-200 ${
        isDragOverlay
          ? "shadow-2xl scale-105 rotate-[2deg] border-[var(--primary)]/30"
          : "border-[var(--border)] hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <div className={compact ? "p-3" : "p-3.5"}>
        {/* Header: Avatar + Name + Days */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {placement.candidate?.photoUrl ? (
                <img
                  src={placement.candidate.photoUrl}
                  alt={candidateName}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-[var(--primary)]">
                    {initials(candidateName)}
                  </span>
                </div>
              )}
              <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                {candidateName}
              </p>
            </div>
          </div>
          <span
            className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {days}d
          </span>
        </div>

        {/* Job Title */}
        {jobTitle && (
          <p className="text-xs font-medium text-[var(--primary)] mb-1 truncate">
            {jobTitle}
          </p>
        )}

        {/* Company */}
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--neutral-gray)]">
          <Building2 size={10} className="flex-shrink-0" />
          <span className="truncate">{companyName}</span>
        </div>

        {!compact && (
          <>
            {/* Progress Dots */}
            <div className="flex items-center gap-1 mt-2.5 mb-1.5">
              {PROGRESSION_STAGES.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i <= progress ? "bg-[var(--primary)]" : "bg-[var(--surface-3)]"
                  }`}
                />
              ))}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap">
              {placement.placementType && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--neutral-gray)] uppercase tracking-wider">
                  {placement.placementType.replace(/_/g, " ")}
                </span>
              )}
              {days > 14 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--error)]/10 text-[var(--error)] uppercase tracking-wider">
                  Overdue
                </span>
              )}
              {placement.startDate && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Calendar size={8} className="inline mr-0.5 -mt-px" />
                  {new Date(placement.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Hover Actions */}
      {!isDragOverlay && (
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Link
            href={`/admin/placements/${placement.id}`}
            className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--surface-1)]/90 border border-[var(--border)] text-[var(--neutral-gray)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-colors shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DraggableCard
// ─────────────────────────────────────────────────────────────────────────────

function DraggableCard({
  placement,
  compact,
}: {
  placement: PlacementRecord;
  compact: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: placement.id,
    data: { placement },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? "opacity-30 scale-95" : ""
      }`}
      style={{ transition: isDragging ? "opacity 200ms, transform 200ms" : undefined }}
    >
      <KanbanCard placement={placement} compact={compact} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DroppableColumn
// ─────────────────────────────────────────────────────────────────────────────

function DroppableColumn({
  config,
  items,
  compact,
  collapsed,
  onToggleCollapse,
  isDragActive,
  isValidTarget,
  showAddButton,
}: {
  config: ColumnConfig;
  items: PlacementRecord[];
  compact: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isDragActive: boolean;
  isValidTarget: boolean;
  showAddButton?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: config.status,
    disabled: isDragActive && !isValidTarget,
  });

  const ColIcon = config.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-all duration-200 ${
        collapsed ? "w-12" : "w-[260px] min-w-[260px]"
      } ${
        isDragActive
          ? isValidTarget
            ? isOver
              ? "border-2 shadow-lg ring-2 ring-offset-1"
              : "border border-dashed"
            : "opacity-40 border-[var(--border)]"
          : "border-[var(--border)]"
      }`}
      style={{
        backgroundColor: config.bgTint,
        borderColor: isDragActive && isValidTarget
          ? isOver ? config.color : `${config.color}60`
          : undefined,
        ["--tw-ring-color" as any]: isOver ? `${config.color}30` : undefined,
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
              style={{
                color: config.color,
                writingMode: "vertical-lr",
                transform: "rotate(180deg)",
              }}
            >
              {config.label}
            </span>
            <span className="text-[10px] font-bold text-[var(--neutral-gray)] bg-[var(--surface-2)] w-5 h-5 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <ColIcon size={14} style={{ color: config.color }} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                {config.label}
              </h3>
            </div>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: `${config.color}12`,
                color: config.color,
              }}
            >
              {items.length}
            </span>
            <ChevronDown
              size={14}
              className="text-[var(--surface-4)] flex-shrink-0"
            />
          </>
        )}
      </div>

      {/* Cards */}
      {!collapsed && (
        <div className="flex-1 space-y-2 px-2 pb-2 min-h-[80px]">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex items-center justify-center rounded-lg border-2 border-dashed py-8 transition-colors ${
                  isDragActive && isValidTarget
                    ? "border-[var(--primary)]/30 bg-[var(--primary)]/[0.02]"
                    : "border-[var(--surface-3)]"
                }`}
              >
                <p className="text-[11px] text-[var(--neutral-gray)] font-medium">
                  {isDragActive && isValidTarget ? "Drop here" : "No placements"}
                </p>
              </motion.div>
            ) : (
              items.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <DraggableCard placement={p} compact={compact} />
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {/* Add Button */}
          {showAddButton && !isDragActive && (
            <Link
              href="/admin/placements/new"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--neutral-gray)] hover:border-[var(--primary)]/30 hover:text-[var(--primary)] hover:bg-[var(--primary)]/[0.02] transition-colors text-xs font-medium"
            >
              <Plus size={12} />
              Add Placement
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TransitionModal
// ─────────────────────────────────────────────────────────────────────────────

function TransitionModal({
  placement,
  toStatus,
  onConfirm,
  onCancel,
  isLoading,
}: {
  placement: PlacementRecord;
  toStatus: PlacementStatus;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [notes, setNotes] = useState("");

  const fromCol = getColumnForStatus(placement.status);
  const toCol = getColumnForStatus(toStatus);
  const candidateName = placement.candidate?.fullName || "Unknown";
  const companyName = placement.employer?.companyName || "Unknown";
  const isCancelling = toStatus === PlacementStatus.CANCELLED;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {isCancelling ? "Cancel Placement" : "Move Placement"}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Transition Visualization */}
          <div className="flex items-center justify-center gap-4">
            {fromCol && (
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                  style={{ backgroundColor: `${fromCol.color}15` }}
                >
                  <fromCol.icon size={20} style={{ color: fromCol.color }} />
                </div>
                <p className="text-xs font-semibold" style={{ color: fromCol.color }}>
                  {fromCol.label}
                </p>
              </div>
            )}
            <ArrowRight size={20} className="text-[var(--neutral-gray)] flex-shrink-0" />
            {toCol ? (
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                  style={{ backgroundColor: `${toCol.color}15` }}
                >
                  <toCol.icon size={20} style={{ color: toCol.color }} />
                </div>
                <p className="text-xs font-semibold" style={{ color: toCol.color }}>
                  {toCol.label}
                </p>
              </div>
            ) : isCancelling ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-1.5 bg-[var(--error)]/10">
                  <XCircle size={20} className="text-[var(--error)]" />
                </div>
                <p className="text-xs font-semibold text-[var(--error)]">Cancelled</p>
              </div>
            ) : null}
          </div>

          {/* Placement Info */}
          <div className="bg-[var(--surface-1)] rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold text-[var(--text-primary)]">{candidateName}</p>
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
              {placement.job?.title ? `${placement.job.title} at ` : ""}
              {companyName}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              Notes <span className="font-normal text-[var(--neutral-gray)]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isCancelling
                  ? "Reason for cancellation..."
                  : "Add notes about this transition..."
              }
              rows={3}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm resize-none transition-all focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 placeholder:text-[var(--surface-4)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-1)]">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-medium text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes)}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-60 ${
              isCancelling
                ? "bg-[var(--error)] hover:bg-[var(--error)]/90"
                : "bg-[var(--primary)] hover:bg-[var(--secondary)]"
            }`}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {isCancelling ? "Confirm Cancel" : "Confirm Move"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickStats
// ─────────────────────────────────────────────────────────────────────────────

function QuickStats({ placements }: { placements: PlacementRecord[] }) {
  const total = placements.length;
  const active = placements.filter(
    (p) => p.status !== PlacementStatus.COMPLETED && p.status !== PlacementStatus.CANCELLED,
  ).length;
  const placed = placements.filter(
    (p) => p.status === PlacementStatus.PLACED || p.status === PlacementStatus.COMPLETED,
  ).length;
  const convRate = total > 0 ? Math.round((placed / total) * 100) : 0;

  const avgDays = useMemo(() => {
    const activePlacements = placements.filter(
      (p) => p.status !== PlacementStatus.COMPLETED && p.status !== PlacementStatus.CANCELLED,
    );
    if (activePlacements.length === 0) return 0;
    const totalDays = activePlacements.reduce((sum, p) => sum + getDaysInStage(p), 0);
    return Math.round(totalDays / activePlacements.length);
  }, [placements]);

  const stats = [
    { label: "Total", value: total, icon: TrendingUp, color: "var(--primary)" },
    { label: "Active", value: active, icon: Clock, color: "var(--warning)" },
    { label: "Avg. Days", value: `${avgDays}d`, icon: Timer, color: "var(--info)" },
    { label: "Conversion", value: `${convRate}%`, icon: CheckCircle2, color: "var(--success)" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] px-4 py-3"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${s.color} 10%, transparent)` }}
          >
            <s.icon size={16} style={{ color: s.color }} />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)] leading-tight">{s.value}</p>
            <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
              {s.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export interface PlacementKanbanProps {
  placements: PlacementRecord[];
  onStatusChange: (id: string, newStatus: PlacementStatus, notes?: string) => void;
  isUpdating?: boolean;
}

export function PlacementKanban({
  placements,
  onStatusChange,
  isUpdating,
}: PlacementKanbanProps) {
  // ── State ─────────────────────────────────────────────────────────
  const [compact, setCompact] = useState(false);
  const [collapsedCols, setCollapsedCols] = useState<Set<PlacementStatus>>(new Set());
  const [activeDrag, setActiveDrag] = useState<PlacementRecord | null>(null);
  const [transitionModal, setTransitionModal] = useState<{
    placement: PlacementRecord;
    toStatus: PlacementStatus;
  } | null>(null);

  // ── DnD ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const validTargets = useMemo(() => {
    if (!activeDrag) return new Set<PlacementStatus>();
    return new Set(VALID_TRANSITIONS[activeDrag.status] || []);
  }, [activeDrag]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const p = placements.find((x) => x.id === event.active.id);
      setActiveDrag(p || null);
    },
    [placements],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);
      if (!over) return;

      const p = placements.find((x) => x.id === active.id);
      const targetStatus = over.id as PlacementStatus;
      if (!p || p.status === targetStatus) return;

      const valid = VALID_TRANSITIONS[p.status] || [];
      if (!valid.includes(targetStatus)) return;

      setTransitionModal({ placement: p, toStatus: targetStatus });
    },
    [placements],
  );

  const handleTransitionConfirm = useCallback(
    (notes: string) => {
      if (!transitionModal) return;
      onStatusChange(
        transitionModal.placement.id,
        transitionModal.toStatus,
        notes || undefined,
      );
      setTransitionModal(null);
    },
    [transitionModal, onStatusChange],
  );

  // ── Column collapse ───────────────────────────────────────────────
  const toggleCollapse = useCallback((status: PlacementStatus) => {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  // ── Group placements by status ────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, PlacementRecord[]> = {};
    for (const col of KANBAN_COLUMNS) map[col.status] = [];
    for (const p of placements) {
      if (map[p.status]) map[p.status].push(p);
    }
    return map;
  }, [placements]);

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <QuickStats placements={placements} />

      {/* Board Controls */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setCompact(!compact)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--neutral-gray)] bg-[var(--surface-1)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-1)] transition-colors"
        >
          {compact ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          {compact ? "Detailed" : "Compact"}
        </button>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: "1000px" }}>
            {KANBAN_COLUMNS.map((col, idx) => (
              <DroppableColumn
                key={col.status}
                config={col}
                items={grouped[col.status] || []}
                compact={compact}
                collapsed={collapsedCols.has(col.status)}
                onToggleCollapse={() => toggleCollapse(col.status)}
                isDragActive={!!activeDrag}
                isValidTarget={validTargets.has(col.status)}
                showAddButton={idx === 0}
              />
            ))}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div style={{ width: 260 }}>
              <KanbanCard
                placement={activeDrag}
                compact={compact}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Cancelled placements count */}
      {placements.some((p) => p.status === PlacementStatus.CANCELLED) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
          <AlertCircle size={14} className="text-[var(--neutral-gray)]" />
          <span className="text-xs font-medium text-[var(--neutral-gray)]">
            {placements.filter((p) => p.status === PlacementStatus.CANCELLED).length} cancelled placement(s) not shown on board
          </span>
        </div>
      )}

      {/* Transition Modal */}
      <AnimatePresence>
        {transitionModal && (
          <TransitionModal
            placement={transitionModal.placement}
            toStatus={transitionModal.toStatus}
            onConfirm={handleTransitionConfirm}
            onCancel={() => setTransitionModal(null)}
            isLoading={isUpdating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
