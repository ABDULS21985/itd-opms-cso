"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Users,
  Eye,
  Calendar,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  TableIcon,
  TrendingUp,
  Percent,
  Timer,
  Loader2,
  Pencil,
  UserPlus,
  AlertCircle,
  Check,
  Columns3,
  Minus,
  Trash2,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePipelines,
  usePipeline,
  useCreatePipeline,
  useMovePipelineCandidate,
  useAddCandidateToPipeline,
  useRemovePipelineCandidate,
} from "@/hooks/use-pipeline";
import { useTalents } from "@/hooks/use-candidates";
import type {
  PipelineCandidate,
  PipelineStage,
  PipelineWithCandidates,
} from "@/types/pipeline";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { showUndoToast } from "@/components/shared/undo-toast";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// Constants & Helpers
// ═══════════════════════════════════════════════════════════════════════════

const ACCENT = "#C4A35A";
const TERMINAL_KEYWORDS = ["placed", "declined", "rejected", "hired", "closed"];

type ViewMode = "kanban" | "table";

function isTerminalStage(stageName: string): boolean {
  const lower = stageName.toLowerCase();
  return TERMINAL_KEYWORDS.some((kw) => lower.includes(kw));
}

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

function daysLabel(d: number): string {
  return d === 0 ? "Today" : `${d}d`;
}

function daysBadgeColor(d: number): { bg: string; text: string } {
  if (d <= 7) return { bg: "bg-emerald-50", text: "text-emerald-600" };
  if (d <= 14) return { bg: "bg-amber-50", text: "text-amber-600" };
  return { bg: "bg-[var(--error)]/10", text: "text-[var(--error)]" };
}

// ═══════════════════════════════════════════════════════════════════════════
// Match Score Ring (SVG)
// ═══════════════════════════════════════════════════════════════════════════

function MatchScoreRing({ score, size = 32 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const c = Math.PI * 2 * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const color = pct >= 75 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--error)";

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 origin-center"
        fill={color}
        fontSize={size * 0.28}
        fontWeight={700}
      >
        {pct}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Animated Counter
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * eased));
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = value;
    }
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Stat Card
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  color,
  idx,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof Users;
  color: string;
  idx: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] p-4"
      style={{ background: `color-mix(in srgb, ${color} 6%, var(--surface-0))` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--neutral-gray)]">{label}</p>
          <p className="text-xl font-extrabold text-[var(--text-primary)]">
            <AnimatedCounter value={value} suffix={suffix} />
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Conversion Funnel
// ═══════════════════════════════════════════════════════════════════════════

function ConversionFunnel({
  stages,
  candidatesByStage,
  total,
}: {
  stages: PipelineStage[];
  candidatesByStage: Record<string, PipelineCandidate[]>;
  total: number;
}) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {sorted.map((stage, idx) => {
        const count = candidatesByStage[stage.id]?.length || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const prevCount = idx > 0 ? (candidatesByStage[sorted[idx - 1].id]?.length || 0) : total;
        const conversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
        const widthPct = total > 0 ? Math.max(20, (count / total) * 100) : 20;

        return (
          <div key={stage.id} className="flex items-center gap-1 flex-shrink-0">
            {idx > 0 && (
              <ChevronRight size={14} className="text-[var(--surface-3)] flex-shrink-0" />
            )}
            <div
              className="rounded-lg px-3 py-2 text-center min-w-[80px] transition-all duration-500"
              style={{
                background: `color-mix(in srgb, ${stage.color} ${Math.max(8, widthPct * 0.4)}%, transparent)`,
                borderLeft: `3px solid ${stage.color}`,
              }}
            >
              <p className="text-xs font-bold text-[var(--text-primary)]">{stage.name}</p>
              <p className="text-lg font-extrabold" style={{ color: stage.color }}>
                {count}
              </p>
              <p className="text-[10px] text-[var(--neutral-gray)]">
                {idx === 0 ? `${pct}% of total` : `${conversion}% conv.`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Candidate Card (Kanban)
// ═══════════════════════════════════════════════════════════════════════════

function CandidateCard({
  pc,
  isDragging,
  isOverlay,
  onRemove,
}: {
  pc: PipelineCandidate;
  isDragging?: boolean;
  isOverlay?: boolean;
  onRemove?: (candidateId: string) => void;
}) {
  const c = pc.candidate;
  const skills = c?.candidateSkills?.slice(0, 3) || [];
  const days = daysSince(pc.movedAt);
  const dColors = daysBadgeColor(days);

  return (
    <div
      className={`group relative bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-3.5 transition-all duration-200 ${
        isDragging
          ? "shadow-xl ring-2 ring-[#C4A35A]/40 rotate-2 scale-105"
          : isOverlay
            ? "shadow-2xl ring-2 ring-[#C4A35A]/50 rotate-2 scale-105"
            : "shadow-sm hover:shadow-md hover:border-[var(--surface-3)] cursor-grab active:cursor-grabbing"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--border)]">
          {c?.photoUrl ? (
            <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-[var(--neutral-gray)]">
              {c?.fullName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {c?.fullName || "Unknown"}
          </p>
          <p className="text-[11px] text-[var(--neutral-gray)] truncate">
            {c?.primaryTrack?.name || c?.primaryStacks?.join(", ") || (c?.city && c?.country ? `${c.city}, ${c.country}` : "")}
          </p>
        </div>
        {/* Match Score Ring */}
        {pc.matchScore !== null && pc.matchScore !== undefined && (
          <MatchScoreRing score={pc.matchScore} size={34} />
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {skills.map((sk: any) => (
            <span
              key={sk.id}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-1)] text-[var(--neutral-gray)] border border-[var(--border)]"
            >
              {sk.skill?.name || sk.customTagName || "Skill"}
            </span>
          ))}
          {(c?.candidateSkills?.length || 0) > 3 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-1)] text-[var(--neutral-gray)]">
              +{(c?.candidateSkills?.length || 0) - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Days badge + Quick actions */}
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[var(--border)]">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${dColors.bg} ${dColors.text}`}>
          {daysLabel(days)} in stage
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
            title="View Profile"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
            title="Schedule Interview"
          >
            <Calendar size={13} />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
            title="Add Note"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove?.(pc.candidateId); }}
            className="p-1.5 rounded-lg hover:bg-[var(--error)]/5 text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
            title="Remove"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sortable Candidate Card
// ═══════════════════════════════════════════════════════════════════════════

function SortableCandidateCard({
  pc,
  onRemove,
}: {
  pc: PipelineCandidate;
  onRemove?: (candidateId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pc.candidateId,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CandidateCard pc={pc} isDragging={isDragging} onRemove={onRemove} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Kanban Column
// ═══════════════════════════════════════════════════════════════════════════

function KanbanColumn({
  stage,
  candidates,
  total,
  isOver,
  collapsed,
  onToggleCollapse,
  onRemove,
}: {
  stage: PipelineStage;
  candidates: PipelineCandidate[];
  total: number;
  isOver: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRemove?: (candidateId: string) => void;
}) {
  const candidateIds = candidates.map((c) => c.candidateId);
  const conversionPct = total > 0 ? Math.round((candidates.length / total) * 100) : 0;

  return (
    <div
      className={`flex flex-col flex-shrink-0 transition-all duration-300 ${
        collapsed ? "w-14" : "w-[80vw] sm:w-[300px]"
      }`}
    >
      {/* Column Header */}
      <div
        className={`rounded-t-xl px-3 py-3 border border-b-0 border-[var(--border)] transition-all ${
          isOver ? "ring-2 ring-[#C4A35A]/30" : ""
        }`}
        style={{
          borderTop: `3px solid ${stage.color}`,
          background: `color-mix(in srgb, ${stage.color} 4%, var(--surface-0))`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
          {!collapsed && (
            <>
              <h3 className="text-sm font-bold text-[var(--text-primary)] truncate flex-1">{stage.name}</h3>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${stage.color} 15%, transparent)`,
                  color: stage.color,
                }}
              >
                {candidates.length}
              </span>
              <span className="text-[10px] text-[var(--neutral-gray)] flex-shrink-0">{conversionPct}%</span>
            </>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] flex-shrink-0 transition-colors"
            title={collapsed ? "Expand column" : "Collapse column"}
          >
            {collapsed ? <ChevronRight size={14} /> : <Minus size={14} />}
          </button>
        </div>
      </div>

      {/* Column Body */}
      {!collapsed ? (
        <SortableContext items={candidateIds} strategy={verticalListSortingStrategy}>
          <div
            className={`flex-1 space-y-2.5 p-2.5 rounded-b-xl border border-t-0 border-[var(--border)] min-h-[180px] transition-all duration-300 ${
              isOver
                ? "bg-[#C4A35A]/5 border-dashed border-[#C4A35A]/30"
                : "bg-[var(--surface-1)]/50"
            }`}
          >
            {candidates.map((pc) => (
              <SortableCandidateCard key={pc.candidateId} pc={pc} onRemove={onRemove} />
            ))}
            {candidates.length === 0 && (
              <div className={`text-center py-10 rounded-xl border-2 border-dashed transition-colors ${
                isOver ? "border-[#C4A35A]/40 bg-[#C4A35A]/5" : "border-[var(--border)]"
              }`}>
                <UserPlus size={24} className="mx-auto text-[var(--surface-3)] mb-2" />
                <p className="text-xs font-medium text-[var(--neutral-gray)]">Drag candidates here</p>
              </div>
            )}
          </div>
        </SortableContext>
      ) : (
        <div className="flex-1 flex flex-col items-center gap-1 py-3 rounded-b-xl border border-t-0 border-[var(--border)] bg-[var(--surface-1)]/50">
          <span className="text-lg font-bold" style={{ color: stage.color }}>
            {candidates.length}
          </span>
          <span
            className="text-[9px] font-semibold text-[var(--neutral-gray)] [writing-mode:vertical-lr] rotate-180 tracking-wider uppercase"
          >
            {stage.name}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Table View
// ═══════════════════════════════════════════════════════════════════════════

function TableView({
  pipeline,
  stages,
  onMoveToStage,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  allSelected,
  onRemove,
}: {
  pipeline: PipelineWithCandidates;
  stages: PipelineStage[];
  onMoveToStage: (candidateId: string, stageId: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  allSelected: boolean;
  onRemove: (candidateId: string) => void;
}) {
  const [sortField, setSortField] = useState<"name" | "stage" | "score" | "days">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedCandidates = useMemo(() => {
    const all = [...(pipeline.candidates || [])];
    const stageOrderMap = new Map(stages.map((s) => [s.id, s.order]));
    all.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.candidate?.fullName || "").localeCompare(b.candidate?.fullName || "");
          break;
        case "stage":
          cmp = (stageOrderMap.get(a.stageId) || 0) - (stageOrderMap.get(b.stageId) || 0);
          break;
        case "score":
          cmp = (a.matchScore || 0) - (b.matchScore || 0);
          break;
        case "days":
          cmp = daysSince(b.movedAt) - daysSince(a.movedAt);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return all;
  }, [pipeline.candidates, stages, sortField, sortDir]);

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const SortHeader = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
    >
      {children}
      <ArrowUpDown size={10} className={sortField === field ? "text-[#C4A35A]" : ""} />
    </button>
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface-0)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--surface-1)] border-b border-[var(--border)]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-[var(--border)] accent-[#C4A35A]"
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="name">Candidate</SortHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="stage">Current Stage</SortHeader>
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader field="score">Match Score</SortHeader>
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader field="days">Days in Stage</SortHeader>
              </th>
              <th className="px-4 py-3 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--neutral-gray)]">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCandidates.map((pc) => {
              const c = pc.candidate;
              const currentStage = stages.find((s) => s.id === pc.stageId);
              const days = daysSince(pc.movedAt);
              const dColors = daysBadgeColor(days);
              const selected = selectedIds.has(pc.candidateId);

              return (
                <tr
                  key={pc.candidateId}
                  className={`border-b border-[var(--border)] transition-colors ${
                    selected ? "bg-[#C4A35A]/5" : "hover:bg-[var(--surface-1)]"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(pc.candidateId)}
                      className="w-4 h-4 rounded border-[var(--border)] accent-[#C4A35A]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[var(--border)]">
                        {c?.photoUrl ? (
                          <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-[var(--neutral-gray)]">
                            {c?.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{c?.fullName || "Unknown"}</p>
                        <p className="text-[11px] text-[var(--neutral-gray)]">
                          {c?.primaryTrack?.name || c?.primaryStacks?.join(", ") || ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={pc.stageId}
                      onChange={(e) => onMoveToStage(pc.candidateId, e.target.value)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] cursor-pointer hover:border-[var(--surface-3)] transition-colors"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: currentStage?.color || "var(--border)",
                      }}
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {pc.matchScore !== null && pc.matchScore !== undefined ? (
                      <div className="flex justify-center">
                        <MatchScoreRing score={pc.matchScore} size={30} />
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--surface-3)]">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${dColors.bg} ${dColors.text}`}>
                      {daysLabel(days)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors" title="View profile">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors" title="Schedule interview">
                        <Calendar size={14} />
                      </button>
                      <button
                        onClick={() => onRemove(pc.candidateId)}
                        className="p-1.5 rounded-lg hover:bg-[var(--error)]/5 text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedCandidates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Users size={28} className="mx-auto text-[var(--surface-3)] mb-2" />
                  <p className="text-sm text-[var(--neutral-gray)]">No candidates in this pipeline</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Create Pipeline Modal
// ═══════════════════════════════════════════════════════════════════════════

function CreatePipelineModal({
  open,
  onClose,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
  }

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[var(--surface-0)] rounded-2xl shadow-xl border border-[var(--border)] p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center">
                  <Columns3 size={20} className="text-[#C4A35A]" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Create Pipeline</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <label className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1.5 block">
                Pipeline name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Frontend Engineers Q2 2026"
                className="w-full border-[1.5px] border-[var(--border)] rounded-xl px-4 py-3 text-sm bg-[var(--surface-1)] placeholder:text-[var(--surface-4)] focus:outline-none focus:border-[#C4A35A] focus:ring-4 focus:ring-[#C4A35A]/8 transition-all"
                autoFocus
              />
              <div className="mt-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                <p className="text-[11px] font-semibold text-[var(--neutral-gray)] mb-1.5">Default stages:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Interested", "Intro Requested", "Intro Approved", "Interview", "Offer", "Placed", "Declined"].map((s) => (
                    <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-0)] text-[var(--text-primary)] border border-[var(--border)]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || isCreating}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl bg-[#C4A35A] text-white hover:bg-[#E08A13] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {isCreating ? "Creating..." : "Create Pipeline"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Add Candidate Modal
// ═══════════════════════════════════════════════════════════════════════════

function AddCandidateModal({
  open,
  onClose,
  onAdd,
  isAdding,
  pipelineCandidateIds,
  stages,
  candidatesByStage,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (candidateId: string, stageId?: string) => void;
  isAdding: boolean;
  pipelineCandidateIds: Set<string>;
  stages: PipelineStage[];
  candidatesByStage: Record<string, PipelineCandidate[]>;
}) {
  const [search, setSearch] = useState("");
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>(undefined);
  const { data: talents } = useTalents({ search });
  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.order - b.order), [stages]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedStageId(undefined);
    }
  }, [open]);

  function findStageForCandidate(candidateId: string): PipelineStage | null {
    for (const stage of stages) {
      if (candidatesByStage[stage.id]?.some((pc) => pc.candidateId === candidateId)) {
        return stage;
      }
    }
    return null;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[var(--surface-0)] rounded-2xl shadow-xl border border-[var(--border)] p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center">
                  <UserPlus size={20} className="text-[#C4A35A]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Candidate</h2>
                  <p className="text-xs text-[var(--neutral-gray)]">Search and add candidates to your pipeline</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full border-[1.5px] border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm bg-[var(--surface-1)] placeholder:text-[var(--surface-4)] focus:outline-none focus:border-[#C4A35A] focus:ring-4 focus:ring-[#C4A35A]/8 transition-all"
                autoFocus
              />
            </div>

            {/* Target Stage */}
            {sortedStages.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--neutral-gray)] mb-2">Target Stage</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedStageId(undefined)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      !selectedStageId
                        ? "bg-[#C4A35A]/10 border-[#C4A35A]/30 text-[#C4A35A]"
                        : "border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    First stage
                  </button>
                  {sortedStages.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStageId(s.id)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedStageId === s.id
                          ? "border-[var(--surface-3)] text-[var(--text-primary)] bg-[var(--surface-1)]"
                          : "border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]"
                      }`}
                      style={selectedStageId === s.id ? { borderLeftWidth: 3, borderLeftColor: s.color } : undefined}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {(talents as any)?.data?.map((candidate: any) => {
                const inPipeline = pipelineCandidateIds.has(candidate.id);
                const existingStage = inPipeline ? findStageForCandidate(candidate.id) : null;

                return (
                  <div
                    key={candidate.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      inPipeline
                        ? "border-[var(--warning)]/30 bg-[var(--warning-light)]"
                        : "border-[var(--border)] hover:bg-[var(--surface-1)] hover:border-[var(--surface-3)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[var(--border)]">
                        {candidate.photoUrl ? (
                          <img src={candidate.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-[var(--neutral-gray)]">
                            {candidate.fullName?.charAt(0)?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{candidate.fullName}</p>
                        <p className="text-[11px] text-[var(--neutral-gray)]">
                          {candidate.primaryStacks?.join(", ") || ""}
                        </p>
                        {inPipeline && existingStage && (
                          <p className="text-[10px] font-medium text-[var(--warning-dark)] mt-0.5 flex items-center gap-1">
                            <AlertCircle size={10} />
                            Already in &ldquo;{existingStage.name}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    {inPipeline ? (
                      <span className="text-xs font-semibold px-3 py-1.5 bg-[var(--surface-2)] text-[var(--neutral-gray)] rounded-lg flex items-center gap-1.5">
                        <Check size={12} />
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => onAdd(candidate.id, selectedStageId)}
                        disabled={isAdding}
                        className="text-xs font-bold px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#E08A13] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Add
                      </button>
                    )}
                  </div>
                );
              }) || (
                <div className="text-center py-12">
                  <Search size={28} className="mx-auto text-[var(--surface-3)] mb-2" />
                  <p className="text-sm text-[var(--neutral-gray)]">
                    {search ? "No candidates found" : "Search for candidates to add"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function PipelinePage() {
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [filterScoreMax, setFilterScoreMax] = useState(100);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    candidateId: string;
    targetStageId: string;
    targetStageName: string;
    candidateName: string;
  }>({ open: false, candidateId: "", targetStageId: "", targetStageName: "", candidateName: "" });

  const [removeConfirmState, setRemoveConfirmState] = useState<{
    open: boolean;
    candidateId: string;
    candidateName: string;
  }>({ open: false, candidateId: "", candidateName: "" });

  const activePipelineId = selectedPipelineId || (pipelines as any)?.[0]?.id || null;
  const { data: pipeline, isLoading: pipelineLoading } = usePipeline(activePipelineId);
  const createPipeline = useCreatePipeline();
  const moveCandidate = useMovePipelineCandidate();
  const addCandidate = useAddCandidateToPipeline();
  const removeCandidate = useRemovePipelineCandidate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const stages = useMemo(
    () => [...(pipeline?.stages || [])].sort((a, b) => a.order - b.order),
    [pipeline?.stages],
  );

  const candidatesByStage = useMemo(() => {
    const map: Record<string, PipelineCandidate[]> = {};
    for (const stage of stages) {
      map[stage.id] = [];
    }
    if (pipeline?.candidates) {
      for (const pc of pipeline.candidates) {
        if (map[pc.stageId]) {
          map[pc.stageId].push(pc);
        }
      }
    }
    return map;
  }, [pipeline, stages]);

  // Apply search and filter
  const filteredCandidatesByStage = useMemo(() => {
    const map: Record<string, PipelineCandidate[]> = {};
    for (const stage of stages) {
      let candidates = candidatesByStage[stage.id] || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        candidates = candidates.filter((pc) => pc.candidate?.fullName?.toLowerCase().includes(q));
      }
      if (filterStage && filterStage !== stage.id) {
        candidates = [];
      }
      if (filterScoreMin > 0 || filterScoreMax < 100) {
        candidates = candidates.filter((pc) => {
          const s = pc.matchScore ?? 0;
          return s >= filterScoreMin && s <= filterScoreMax;
        });
      }
      map[stage.id] = candidates;
    }
    return map;
  }, [candidatesByStage, stages, searchQuery, filterStage, filterScoreMin, filterScoreMax]);

  const totalCandidates = pipeline?.candidates?.length || 0;
  const filteredTotal = useMemo(
    () => Object.values(filteredCandidatesByStage).reduce((sum, arr) => sum + arr.length, 0),
    [filteredCandidatesByStage],
  );

  const pipelineCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    if (pipeline?.candidates) {
      for (const pc of pipeline.candidates) ids.add(pc.candidateId);
    }
    return ids;
  }, [pipeline]);

  // Stats
  const stats = useMemo(() => {
    const candidates = pipeline?.candidates || [];
    const avgDays =
      candidates.length > 0
        ? Math.round(candidates.reduce((sum, pc) => sum + daysSince(pc.movedAt), 0) / candidates.length)
        : 0;
    const placedCount = stages
      .filter((s) => isTerminalStage(s.name) && s.name.toLowerCase().includes("placed"))
      .reduce((sum, s) => sum + (candidatesByStage[s.id]?.length || 0), 0);
    const conversionRate = totalCandidates > 0 ? Math.round((placedCount / totalCandidates) * 100) : 0;
    return { total: totalCandidates, conversionRate, avgDays, placedCount };
  }, [pipeline, stages, candidatesByStage, totalCandidates]);

  const activeCandidate = activeDragId
    ? pipeline?.candidates?.find((c) => c.candidateId === activeDragId) || null
    : null;

  const activePipeline = useMemo(
    () => (pipelines as any)?.find((p: any) => p.id === activePipelineId),
    [pipelines, activePipelineId],
  );

  // ─── Drag Handlers ──────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over || !pipeline) {
      setOverStageId(null);
      return;
    }
    const overId = over.id as string;
    const stageMatch = stages.find((s) => s.id === overId);
    if (stageMatch) {
      setOverStageId(stageMatch.id);
      return;
    }
    const overCandidate = pipeline.candidates?.find((c) => c.candidateId === overId);
    if (overCandidate) {
      setOverStageId(overCandidate.stageId);
    }
  }

  const doMove = useCallback(
    (candidateId: string, targetStageId: string) => {
      if (!pipeline) return;
      const pc = pipeline.candidates?.find((c) => c.candidateId === candidateId);
      if (!pc || pc.stageId === targetStageId) return;

      const toStage = stages.find((s) => s.id === targetStageId);
      const candidateName = pc.candidate?.fullName || "Candidate";
      const toStageName = toStage?.name || "Unknown";

      moveCandidate.mutate(
        { pipelineId: pipeline.id, candidateId, stageId: targetStageId },
        {
          onSuccess: () => {
            showUndoToast({
              message: `Moved ${candidateName} to ${toStageName}`,
              undoAction: () => {
                moveCandidate.mutate({
                  pipelineId: pipeline.id,
                  candidateId,
                  stageId: pc.stageId,
                });
              },
              variant: "success",
            });
          },
          onError: () => {
            toast.error("Failed to move candidate. Please try again.");
          },
        },
      );
    },
    [pipeline, stages, moveCandidate],
  );

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    setOverStageId(null);
    const { active, over } = event;
    if (!over || !pipeline) return;

    const draggedCandidateId = active.id as string;
    const draggedPc = pipeline.candidates?.find((c) => c.candidateId === draggedCandidateId);
    if (!draggedPc) return;

    let targetStageId: string | null = null;
    const overId = over.id as string;
    const stageMatch = stages.find((s) => s.id === overId);
    if (stageMatch) {
      targetStageId = stageMatch.id;
    } else {
      const overCandidate = pipeline.candidates?.find((c) => c.candidateId === overId);
      if (overCandidate) targetStageId = overCandidate.stageId;
    }

    if (!targetStageId || targetStageId === draggedPc.stageId) return;

    const targetStage = stages.find((s) => s.id === targetStageId);
    if (targetStage && isTerminalStage(targetStage.name)) {
      setConfirmState({
        open: true,
        candidateId: draggedCandidateId,
        targetStageId,
        targetStageName: targetStage.name,
        candidateName: draggedPc.candidate?.fullName || "this candidate",
      });
      return;
    }

    doMove(draggedCandidateId, targetStageId);
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────

  function handleCreatePipeline(name: string) {
    createPipeline.mutate(
      { name, isDefault: !pipelines?.length },
      {
        onSuccess: (created: any) => {
          setSelectedPipelineId(created.id);
          setShowCreateModal(false);
          toast.success("Pipeline created successfully");
        },
        onError: () => {
          toast.error("Failed to create pipeline");
        },
      },
    );
  }

  function handleAddCandidate(candidateId: string, stageId?: string) {
    if (!activePipelineId) return;
    addCandidate.mutate(
      { pipelineId: activePipelineId, candidateId, stageId },
      {
        onSuccess: () => {
          toast.success("Candidate added to pipeline");
        },
        onError: (err: any) => {
          if (err?.status === 409) {
            toast.error("This candidate is already in the pipeline");
          } else {
            toast.error(err?.message || "Failed to add candidate");
          }
        },
      },
    );
  }

  function handleRemoveCandidate(candidateId: string) {
    const pc = pipeline?.candidates?.find((c) => c.candidateId === candidateId);
    setRemoveConfirmState({
      open: true,
      candidateId,
      candidateName: pc?.candidate?.fullName || "this candidate",
    });
  }

  function confirmRemove() {
    if (!activePipelineId || !removeConfirmState.candidateId) return;
    removeCandidate.mutate(
      { pipelineId: activePipelineId, candidateId: removeConfirmState.candidateId },
      {
        onSuccess: () => {
          toast.success("Candidate removed from pipeline");
          setRemoveConfirmState({ open: false, candidateId: "", candidateName: "" });
        },
        onError: () => {
          toast.error("Failed to remove candidate");
        },
      },
    );
  }

  function handleMoveToStage(candidateId: string, stageId: string) {
    const targetStage = stages.find((s) => s.id === stageId);
    const pc = pipeline?.candidates?.find((c) => c.candidateId === candidateId);
    if (!pc || pc.stageId === stageId) return;

    if (targetStage && isTerminalStage(targetStage.name)) {
      setConfirmState({
        open: true,
        candidateId,
        targetStageId: stageId,
        targetStageName: targetStage.name,
        candidateName: pc.candidate?.fullName || "this candidate",
      });
      return;
    }
    doMove(candidateId, stageId);
  }

  function confirmTerminalMove() {
    doMove(confirmState.candidateId, confirmState.targetStageId);
    setConfirmState({ open: false, candidateId: "", targetStageId: "", targetStageName: "", candidateName: "" });
  }

  // Table selection
  const allTableSelected = useMemo(() => {
    const all = pipeline?.candidates || [];
    return all.length > 0 && all.every((pc) => selectedTableIds.has(pc.candidateId));
  }, [pipeline, selectedTableIds]);

  function toggleTableSelect(id: string) {
    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTableSelectAll() {
    if (allTableSelected) {
      setSelectedTableIds(new Set());
    } else {
      setSelectedTableIds(new Set((pipeline?.candidates || []).map((pc) => pc.candidateId)));
    }
  }

  function handleBulkRemove() {
    toast.info(`Bulk remove ${selectedTableIds.size} candidates — coming soon`);
  }

  function handleBulkMove(stageId: string) {
    Array.from(selectedTableIds).forEach((candidateId) => {
      doMove(candidateId, stageId);
    });
    setSelectedTableIds(new Set());
  }

  function toggleCollapse(stageId: string) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  // ─── Loading States ─────────────────────────────────────────────────────

  if (pipelinesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#C4A35A] mx-auto mb-3" />
          <p className="text-sm text-[var(--neutral-gray)]">Loading pipelines...</p>
        </div>
      </div>
    );
  }

  // ─── No Pipelines Empty State ───────────────────────────────────────────

  if (!activePipelineId) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-md"
          >
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#C4A35A]/20 to-[#C4A35A]/5 flex items-center justify-center border border-[#C4A35A]/20">
              <Columns3 size={36} className="text-[#C4A35A]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No pipelines yet</h2>
            <p className="text-sm text-[var(--neutral-gray)] mb-6 leading-relaxed">
              Create your first hiring pipeline to start tracking candidates through your recruitment stages
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#C4A35A] to-[#E08A13] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#C4A35A]/20 hover:shadow-[#C4A35A]/30 hover:scale-[1.02] transition-all"
            >
              <Plus size={16} />
              Create Your First Pipeline
            </button>
          </motion.div>
        </div>
        <CreatePipelineModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePipeline}
          isCreating={createPipeline.isPending}
        />
      </>
    );
  }

  return (
    <div className="h-full flex flex-col gap-5">
      {/* ─── Board Header ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Pipeline Selector */}
            <div className="relative">
              <button
                onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
                className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl hover:border-[var(--surface-3)] transition-colors"
              >
                <Columns3 size={16} className="text-[#C4A35A]" />
                <div className="text-left">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{activePipeline?.name || "Pipeline"}</p>
                  <p className="text-[10px] text-[var(--neutral-gray)]">{totalCandidates} candidates</p>
                </div>
                <ChevronDown size={14} className="text-[var(--neutral-gray)]" />
              </button>
              {showPipelineDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPipelineDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--surface-0)] rounded-xl border border-[var(--border)] shadow-lg overflow-hidden min-w-[240px]">
                    {(pipelines as any)?.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPipelineId(p.id);
                          setShowPipelineDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[var(--surface-1)] transition-colors ${
                          p.id === activePipelineId ? "bg-[#C4A35A]/5 font-semibold" : ""
                        }`}
                      >
                        <Columns3 size={14} className={p.id === activePipelineId ? "text-[#C4A35A]" : "text-[var(--neutral-gray)]"} />
                        <span className="flex-1 text-[var(--text-primary)]">{p.name}</span>
                        {p.id === activePipelineId && <Check size={14} className="text-[#C4A35A]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <h1 className="text-xl font-bold text-[var(--text-primary)] hidden lg:block">Hiring Pipeline</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates..."
                className="pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-0)] placeholder:text-[var(--surface-4)] focus:outline-none focus:border-[#C4A35A] focus:ring-4 focus:ring-[#C4A35A]/8 transition-all w-[180px]"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${
                  filterStage || filterScoreMin > 0 || filterScoreMax < 100
                    ? "border-[#C4A35A]/30 bg-[#C4A35A]/5 text-[#C4A35A]"
                    : "border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
                }`}
              >
                <SlidersHorizontal size={14} />
                Filters
              </button>
              {showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface-0)] rounded-xl border border-[var(--border)] shadow-lg p-4 min-w-[240px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--neutral-gray)] mb-2">Filter by Stage</p>
                    <div className="space-y-1 mb-4">
                      <button
                        onClick={() => setFilterStage(null)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          !filterStage ? "bg-[#C4A35A]/10 text-[#C4A35A]" : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
                        }`}
                      >
                        All Stages
                      </button>
                      {stages.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setFilterStage(s.id)}
                          className={`w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            filterStage === s.id ? "bg-[var(--surface-1)] text-[var(--text-primary)]" : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--neutral-gray)] mb-2">Match Score Range</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={filterScoreMin}
                        onChange={(e) => setFilterScoreMin(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs border border-[var(--border)] rounded-lg text-center"
                      />
                      <span className="text-xs text-[var(--neutral-gray)]">to</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={filterScoreMax}
                        onChange={(e) => setFilterScoreMax(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs border border-[var(--border)] rounded-lg text-center"
                      />
                    </div>
                    {(filterStage || filterScoreMin > 0 || filterScoreMax < 100) && (
                      <button
                        onClick={() => {
                          setFilterStage(null);
                          setFilterScoreMin(0);
                          setFilterScoreMax(100);
                        }}
                        className="mt-3 w-full text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/5 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-0.5">
              {([
                { mode: "kanban" as const, icon: LayoutGrid, label: "Board" },
                { mode: "table" as const, icon: TableIcon, label: "Table" },
              ] as const).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === mode
                      ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddCandidate(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-1)] transition-colors text-[var(--text-primary)]"
            >
              <UserPlus size={15} />
              <span className="hidden sm:inline">Add Candidate</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2 bg-gradient-to-r from-[#C4A35A] to-[#E08A13] text-white rounded-xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New Pipeline</span>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Candidates" value={stats.total} icon={Users} color={ACCENT} idx={0} />
          <StatCard label="Conversion Rate" value={stats.conversionRate} suffix="%" icon={TrendingUp} color="var(--success)" idx={1} />
          <StatCard label="Avg Days in Pipeline" value={stats.avgDays} icon={Timer} color="var(--info)" idx={2} />
          <StatCard label="Placed" value={stats.placedCount} icon={Check} color="var(--success)" idx={3} />
        </div>

        {/* Conversion Funnel Toggle */}
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="flex items-center gap-2 text-xs font-semibold text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Percent size={12} />
          Conversion Funnel
          {showMetrics ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <AnimatePresence>
          {showMetrics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <ConversionFunnel stages={stages} candidatesByStage={candidatesByStage} total={totalCandidates} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Board / Table ───────────────────────────────────────────────── */}
      {pipelineLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 size={28} className="animate-spin text-[#C4A35A] mx-auto mb-3" />
            <p className="text-sm text-[var(--neutral-gray)]">Loading pipeline...</p>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto pb-4 -mx-1 px-1">
            <div className="flex gap-3 min-h-[500px]">
              {stages.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  candidates={filteredCandidatesByStage[stage.id] || []}
                  total={filteredTotal}
                  isOver={overStageId === stage.id && activeDragId !== null}
                  collapsed={collapsedColumns.has(stage.id)}
                  onToggleCollapse={() => toggleCollapse(stage.id)}
                  onRemove={handleRemoveCandidate}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeCandidate ? <CandidateCard pc={activeCandidate} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {/* Bulk actions bar */}
          <AnimatePresence>
            {selectedTableIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-3 bg-[#C4A35A]/5 border border-[#C4A35A]/20 rounded-xl"
              >
                <span className="text-xs font-bold text-[#C4A35A]">{selectedTableIds.size} selected</span>
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleBulkMove(e.target.value);
                      e.target.value = "";
                    }}
                    defaultValue=""
                    className="text-xs border border-[var(--border)] rounded-lg px-3 py-1.5 bg-[var(--surface-0)]"
                  >
                    <option value="" disabled>
                      Move to stage...
                    </option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkRemove}
                    className="text-xs font-medium px-3 py-1.5 text-[var(--error)] border border-[var(--error)]/20 rounded-lg hover:bg-[var(--error)]/5 transition-colors"
                  >
                    Remove Selected
                  </button>
                  <button
                    onClick={() => setSelectedTableIds(new Set())}
                    className="text-xs font-medium px-3 py-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <TableView
            pipeline={pipeline!}
            stages={stages}
            onMoveToStage={handleMoveToStage}
            selectedIds={selectedTableIds}
            onToggleSelect={toggleTableSelect}
            onSelectAll={toggleTableSelectAll}
            allSelected={allTableSelected}
            onRemove={handleRemoveCandidate}
          />
        </div>
      )}

      {/* ─── Modals & Dialogs ────────────────────────────────────────────── */}
      <CreatePipelineModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePipeline}
        isCreating={createPipeline.isPending}
      />

      <AddCandidateModal
        open={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
        onAdd={handleAddCandidate}
        isAdding={addCandidate.isPending}
        pipelineCandidateIds={pipelineCandidateIds}
        stages={stages}
        candidatesByStage={candidatesByStage}
      />

      {/* Terminal stage confirmation */}
      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, candidateId: "", targetStageId: "", targetStageName: "", candidateName: "" })}
        onConfirm={confirmTerminalMove}
        title={`Move to ${confirmState.targetStageName}?`}
        message={`You are about to move ${confirmState.candidateName} to "${confirmState.targetStageName}". This is a terminal stage and typically indicates the end of the pipeline for this candidate.`}
        confirmLabel="Confirm Move"
        variant="warning"
        loading={moveCandidate.isPending}
      />

      {/* Remove confirmation */}
      <ConfirmDialog
        open={removeConfirmState.open}
        onClose={() => setRemoveConfirmState({ open: false, candidateId: "", candidateName: "" })}
        onConfirm={confirmRemove}
        title="Remove Candidate"
        message={`Are you sure you want to remove ${removeConfirmState.candidateName} from this pipeline? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        loading={removeCandidate.isPending}
      />
    </div>
  );
}
