"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Plus,
  Filter,
  AlertTriangle,
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  X,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCircle,
  FolderKanban,
  Percent,
  Clock,
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  useAllocations,
  useCapacityHeatmap,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
  type AllocationEntry,
  type CreateAllocationBody,
  type UpdateAllocationBody,
} from "@/hooks/use-heatmap";
import { useSearchUsers } from "@/hooks/use-system";
import { useProjects } from "@/hooks/use-planning";
import type { UserSearchResult, Project } from "@/types";

/* ================================================================== */
/*  Constants                                                           */
/* ================================================================== */

const ALLOCATION_COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
  "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1",
];

type SortField = "userName" | "projectTitle" | "allocationPct" | "periodStart" | "periodEnd";
type SortOrder = "asc" | "desc";
type ViewMode = "table" | "cards";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function getAllocationColor(pct: number): { bg: string; text: string } {
  if (pct > 100) return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
  if (pct > 80) return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
  if (pct > 50) return { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" };
  return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getQuarterDates(): { start: string; end: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function exportToCSV(allocations: AllocationEntry[]) {
  const headers = ["User", "Project", "Allocation %", "Start Date", "End Date"];
  const rows = allocations.map((a) => [
    a.userName, a.projectTitle, String(a.allocationPct),
    formatDate(a.periodStart), formatDate(a.periodEnd),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `capacity-allocations-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================== */
/*  KPI Summary Card                                                    */
/* ================================================================== */

function KPICard({
  label, value, suffix, icon: Icon, color, bgColor, subtitle, index, isLoading,
}: {
  label: string; value: number | string | undefined; suffix?: string;
  icon: typeof Users; color: string; bgColor: string;
  subtitle?: string; index: number; isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 rounded-lg bg-[var(--surface-2)] animate-pulse" />
      ) : (
        <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
          {value ?? "—"}{suffix}
        </p>
      )}
      {subtitle && (
        <p className="text-[11px] text-[var(--text-secondary)] mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/*  User Autocomplete                                                   */
/* ================================================================== */

function UserAutocomplete({
  value, onChange, label,
}: {
  value: { id: string; name: string } | null;
  onChange: (user: { id: string; name: string } | null) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: results } = useSearchUsers(query);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2">
          <UserCircle size={16} className="text-[var(--text-secondary)]" />
          <span className="flex-1 text-sm text-[var(--text-primary)]">{value.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search users..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      )}
      <AnimatePresence>
        {open && !value && results && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg max-h-48 overflow-y-auto"
          >
            {results.map((u: UserSearchResult) => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onChange({ id: u.id, name: u.displayName }); setQuery(""); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-1)] transition-colors"
              >
                <UserCircle size={16} className="text-[var(--text-secondary)]" />
                <div>
                  <p className="text-[var(--text-primary)] font-medium">{u.displayName}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{u.email}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Project Picker                                                      */
/* ================================================================== */

function ProjectPicker({
  value, onChange, label,
}: {
  value: { id: string; title: string } | null;
  onChange: (project: { id: string; title: string } | null) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: projectsRaw } = useProjects(1, 100);
  const ref = useRef<HTMLDivElement>(null);

  const projects = useMemo<Project[]>(() => {
    if (!projectsRaw) return [];
    if (Array.isArray(projectsRaw)) return projectsRaw;
    if ("data" in projectsRaw) return (projectsRaw as { data: Project[] }).data ?? [];
    return [];
  }, [projectsRaw]);

  const filtered = useMemo(() => {
    if (!query) return projects.slice(0, 20);
    const q = query.toLowerCase();
    return projects.filter((p) =>
      p.title.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [projects, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2">
          <FolderKanban size={16} className="text-[var(--text-secondary)]" />
          <span className="flex-1 text-sm text-[var(--text-primary)]">{value.title}</span>
          <button type="button" onClick={() => onChange(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search projects..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      )}
      <AnimatePresence>
        {open && !value && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg max-h-48 overflow-y-auto"
          >
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange({ id: p.id, title: p.title }); setQuery(""); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-1)] transition-colors"
              >
                <FolderKanban size={14} className="text-[var(--text-secondary)]" />
                <div>
                  <p className="text-[var(--text-primary)] font-medium">{p.title}</p>
                  {p.code && <p className="text-[10px] text-[var(--text-secondary)]">{p.code}</p>}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Allocation Form Dialog                                              */
/* ================================================================== */

function AllocationDialog({
  open, onClose, editTarget,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: AllocationEntry | null;
}) {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [project, setProject] = useState<{ id: string; title: string } | null>(null);
  const [allocationPct, setAllocationPct] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const createMutation = useCreateAllocation();
  const updateMutation = useUpdateAllocation(editTarget?.id);
  const isEdit = !!editTarget;

  // Populate form when editing
  useEffect(() => {
    if (editTarget) {
      setUser({ id: editTarget.userId, name: editTarget.userName });
      setProject({ id: editTarget.projectId, title: editTarget.projectTitle });
      setAllocationPct(String(editTarget.allocationPct));
      setPeriodStart(editTarget.periodStart.split("T")[0]);
      setPeriodEnd(editTarget.periodEnd.split("T")[0]);
    } else {
      setUser(null);
      setProject(null);
      setAllocationPct("");
      setPeriodStart("");
      setPeriodEnd("");
    }
    setErrors([]);
  }, [editTarget, open]);

  function validate(): boolean {
    const errs: string[] = [];
    if (!isEdit && !user) errs.push("User is required");
    if (!isEdit && !project) errs.push("Project is required");
    const pct = parseFloat(allocationPct);
    if (isNaN(pct) || pct <= 0 || pct > 200) errs.push("Allocation must be between 1% and 200%");
    if (!periodStart) errs.push("Start date is required");
    if (!periodEnd) errs.push("End date is required");
    if (periodStart && periodEnd && periodStart >= periodEnd) errs.push("End date must be after start date");
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (isEdit) {
      const body: UpdateAllocationBody = {};
      const pct = parseFloat(allocationPct);
      if (pct !== editTarget.allocationPct) body.allocationPct = pct;
      if (periodStart !== editTarget.periodStart.split("T")[0]) body.periodStart = periodStart;
      if (periodEnd !== editTarget.periodEnd.split("T")[0]) body.periodEnd = periodEnd;
      updateMutation.mutate(body, { onSuccess: onClose });
    } else {
      const body: CreateAllocationBody = {
        userId: user!.id,
        projectId: project!.id,
        allocationPct: parseFloat(allocationPct),
        periodStart,
        periodEnd,
      };
      createMutation.mutate(body, { onSuccess: onClose });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {isEdit ? "Edit Allocation" : "New Allocation"}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {e}
                </p>
              ))}
            </div>
          )}

          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UserAutocomplete label="User *" value={user} onChange={setUser} />
              <ProjectPicker label="Project *" value={project} onChange={setProject} />
            </div>
          )}

          {isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">User</label>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">
                  <UserCircle size={16} className="text-[var(--text-secondary)]" />
                  <span className="text-sm text-[var(--text-secondary)]">{user?.name}</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Project</label>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">
                  <FolderKanban size={16} className="text-[var(--text-secondary)]" />
                  <span className="text-sm text-[var(--text-secondary)]">{project?.title}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Allocation Percentage *
            </label>
            <div className="relative">
              <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="number"
                min={1}
                max={200}
                step={5}
                value={allocationPct}
                onChange={(e) => setAllocationPct(e.target.value)}
                placeholder="e.g. 50"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Start Date *
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                End Date *
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Create Allocation"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Delete Confirmation Dialog                                          */
/* ================================================================== */

function DeleteDialog({
  target, onClose,
}: {
  target: AllocationEntry | null;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteAllocation(target?.id);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl"
      >
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Delete Allocation
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Remove <strong>{target.userName}</strong>&apos;s {target.allocationPct}% allocation
            to <strong>{target.projectTitle}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => deleteMutation.mutate(undefined, { onSuccess: onClose })}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Allocation Card (User Summary)                                      */
/* ================================================================== */

function AllocationCard({
  userName, userId, allocations, onEdit, onDelete,
}: {
  userName: string;
  userId: string;
  allocations: AllocationEntry[];
  onEdit: (a: AllocationEntry) => void;
  onDelete: (a: AllocationEntry) => void;
}) {
  const totalPct = allocations.reduce((sum, a) => sum + a.allocationPct, 0);
  const isOver = totalPct > 100;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--surface-1)] transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)]">
          <UserCircle size={20} className="text-[var(--text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{userName}</p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {allocations.length} project{allocations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOver && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}>
              <AlertTriangle size={10} /> Over
            </span>
          )}
          <span className="text-lg font-bold tabular-nums" style={{ color: isOver ? "#EF4444" : totalPct >= 80 ? "#F59E0B" : "#10B981" }}>
            {Math.round(totalPct)}%
          </span>
          {expanded ? <ChevronUp size={16} className="text-[var(--text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--text-secondary)]" />}
        </div>
      </button>

      {/* Stacked Bar */}
      <div className="px-4 pb-2">
        <div className="h-3 rounded-full bg-[var(--surface-2)] overflow-hidden flex relative">
          {allocations.map((alloc, i) => (
            <motion.div
              key={alloc.id}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(alloc.allocationPct, 100)}%` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="h-full"
              style={{ backgroundColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length], opacity: 0.85 }}
            />
          ))}
          {/* 100% marker */}
          <div className="absolute top-0 bottom-0 border-r-2 border-dashed border-[var(--text-secondary)]" style={{ left: `${Math.min(100, 100)}%`, opacity: 0.3 }} />
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)] p-4 space-y-2">
              {allocations.map((alloc, i) => {
                const color = ALLOCATION_COLORS[i % ALLOCATION_COLORS.length];
                return (
                  <div key={alloc.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--surface-1)] transition-colors group">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{alloc.projectTitle}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                        {formatDate(alloc.periodStart)} — {formatDate(alloc.periodEnd)}
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color }}>
                      {alloc.allocationPct}%
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(alloc); }}
                        className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)]">
                        <Edit2 size={13} />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(alloc); }}
                        className="p-1 rounded-lg hover:bg-red-50 text-[var(--text-secondary)] hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                           */
/* ================================================================== */

export default function CapacityPage() {
  // State
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortField, setSortField] = useState<SortField>("userName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AllocationEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AllocationEntry | null>(null);

  // Filters
  const [filterUser, setFilterUser] = useState<{ id: string; name: string } | null>(null);
  const [filterProject, setFilterProject] = useState<{ id: string; title: string } | null>(null);
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  // Data
  const filters = useMemo(() => ({
    userId: filterUser?.id,
    projectId: filterProject?.id,
    start: filterDateStart || undefined,
    end: filterDateEnd || undefined,
    page,
    limit: 50,
  }), [filterUser, filterProject, filterDateStart, filterDateEnd, page]);

  const { data: allocationsData, isLoading } = useAllocations(filters);
  const allocations = allocationsData?.data ?? [];
  const meta = allocationsData?.meta;

  // Heatmap summary for KPI cards (current quarter)
  const quarterDates = useMemo(() => getQuarterDates(), []);
  const { data: heatmapData, isLoading: heatmapLoading } = useCapacityHeatmap(
    quarterDates.start, quarterDates.end, "user", "month",
  );
  const summary = heatmapData?.summary;

  // Active filter count
  const activeFilterCount = [filterUser, filterProject, filterDateStart, filterDateEnd].filter(Boolean).length;

  // Sorted allocations
  const sortedAllocations = useMemo(() => {
    const sorted = [...allocations].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "userName": cmp = a.userName.localeCompare(b.userName); break;
        case "projectTitle": cmp = a.projectTitle.localeCompare(b.projectTitle); break;
        case "allocationPct": cmp = a.allocationPct - b.allocationPct; break;
        case "periodStart": cmp = a.periodStart.localeCompare(b.periodStart); break;
        case "periodEnd": cmp = a.periodEnd.localeCompare(b.periodEnd); break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [allocations, sortField, sortOrder]);

  // Grouped by user (for cards view)
  const groupedByUser = useMemo(() => {
    const map = new Map<string, { userName: string; allocations: AllocationEntry[] }>();
    for (const alloc of sortedAllocations) {
      const existing = map.get(alloc.userId);
      if (existing) {
        existing.allocations.push(alloc);
      } else {
        map.set(alloc.userId, { userName: alloc.userName, allocations: [alloc] });
      }
    }
    return Array.from(map.entries()).sort((a, b) => {
      const totalA = a[1].allocations.reduce((s, al) => s + al.allocationPct, 0);
      const totalB = b[1].allocations.reduce((s, al) => s + al.allocationPct, 0);
      return totalB - totalA; // Over-allocated first
    });
  }, [sortedAllocations]);

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }, [sortField]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-[var(--text-secondary)] opacity-40" />;
    return sortOrder === "asc"
      ? <ArrowUp size={12} className="text-[var(--primary)]" />
      : <ArrowDown size={12} className="text-[var(--primary)]" />;
  }

  // Clear filters
  function clearFilters() {
    setFilterUser(null);
    setFilterProject(null);
    setFilterDateStart("");
    setFilterDateEnd("");
    setPage(1);
  }

  // Open edit
  function handleEdit(alloc: AllocationEntry) {
    setEditTarget(alloc);
    setDialogOpen(true);
  }

  // Open create
  function handleCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
            <BarChart3 size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Capacity Planning</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage resource allocations and track team utilization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/people/capacity/heatmap"
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <LayoutGrid size={16} />
            Heatmap
          </Link>
          <button type="button" onClick={() => setShowFilters((f) => !f)}
            className="relative flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]">
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button type="button" onClick={() => exportToCSV(sortedAllocations)}
            disabled={allocations.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40">
            <Download size={16} />
          </button>
          <button type="button" onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            <Plus size={16} />
            New Allocation
          </button>
        </div>
      </motion.div>

      {/* ---- KPI Summary Cards ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Resources"
          value={summary?.totalUsers}
          icon={Users}
          color="#3B82F6"
          bgColor="rgba(59, 130, 246, 0.1)"
          index={0}
          isLoading={heatmapLoading}
          subtitle="This quarter"
        />
        <KPICard
          label="Over-Allocated"
          value={summary?.overAllocatedUsers}
          icon={TrendingUp}
          color="#EF4444"
          bgColor="rgba(239, 68, 68, 0.1)"
          index={1}
          isLoading={heatmapLoading}
          subtitle={summary && summary.totalUsers > 0
            ? `${Math.round((summary.overAllocatedUsers / summary.totalUsers) * 100)}% of team`
            : undefined}
        />
        <KPICard
          label="Under-Utilized"
          value={summary?.underUtilizedUsers}
          icon={TrendingDown}
          color="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.1)"
          index={2}
          isLoading={heatmapLoading}
          subtitle={summary && summary.totalUsers > 0
            ? `${Math.round((summary.underUtilizedUsers / summary.totalUsers) * 100)}% of team`
            : undefined}
        />
        <KPICard
          label="Avg Utilization"
          value={summary ? Math.round(summary.averageUtilization) : undefined}
          suffix="%"
          icon={BarChart3}
          color={
            (summary?.averageUtilization ?? 0) >= 80 ? "#10B981"
            : (summary?.averageUtilization ?? 0) >= 50 ? "#F59E0B"
            : "#EF4444"
          }
          bgColor={
            (summary?.averageUtilization ?? 0) >= 80 ? "rgba(16, 185, 129, 0.1)"
            : (summary?.averageUtilization ?? 0) >= 50 ? "rgba(245, 158, 11, 0.1)"
            : "rgba(239, 68, 68, 0.1)"
          }
          index={3}
          isLoading={heatmapLoading}
          subtitle="Target: 80–100%"
        />
      </div>

      {/* ---- Over-allocation Warning ---- */}
      {summary && summary.overAllocatedUsers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{summary.overAllocatedUsers} resource{summary.overAllocatedUsers > 1 ? "s" : ""}</strong>{" "}
            {summary.overAllocatedUsers > 1 ? "are" : "is"} allocated over 100% this quarter.
            Review workloads to prevent burnout and delivery risks.
          </p>
          <Link href="/dashboard/people/capacity/heatmap"
            className="ml-auto flex-shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2">
            View Heatmap
          </Link>
        </motion.div>
      )}

      {/* ---- Filters Panel ---- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Filter Allocations
                </p>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters}
                    className="text-xs text-[var(--primary)] font-medium hover:underline">
                    Clear All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <UserAutocomplete label="User" value={filterUser}
                  onChange={(u) => { setFilterUser(u); setPage(1); }} />
                <ProjectPicker label="Project" value={filterProject}
                  onChange={(p) => { setFilterProject(p); setPage(1); }} />
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Start After</label>
                  <input type="date" value={filterDateStart}
                    onChange={(e) => { setFilterDateStart(e.target.value); setPage(1); }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">End Before</label>
                  <input type="date" value={filterDateEnd}
                    onChange={(e) => { setFilterDateEnd(e.target.value); setPage(1); }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- View Toggle + Count ---- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          {isLoading ? "Loading..." : (
            <>
              <strong className="text-[var(--text-primary)]">{meta?.totalItems ?? allocations.length}</strong>{" "}
              allocation{(meta?.totalItems ?? allocations.length) !== 1 ? "s" : ""}
              {activeFilterCount > 0 && " (filtered)"}
            </>
          )}
        </p>
        <div className="flex items-center rounded-xl border border-[var(--border)] overflow-hidden">
          <button type="button" onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"}`}>
            <List size={14} /> Table
          </button>
          <button type="button" onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"}`}>
            <LayoutGrid size={14} /> Cards
          </button>
        </div>
      </motion.div>

      {/* ---- Content ---- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : allocations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-16 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-[var(--surface-2)] mb-4">
              <Users size={28} className="text-[var(--text-secondary)]" />
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)] mb-1">
              No capacity allocations found
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              {activeFilterCount > 0
                ? "No allocations match your current filters. Try adjusting or clearing them."
                : "Start by creating allocations to assign team members to projects and track their capacity utilization."}
            </p>
            {activeFilterCount > 0 ? (
              <button type="button" onClick={clearFilters}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]">
                Clear Filters
              </button>
            ) : (
              <button type="button" onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                <Plus size={16} /> Create First Allocation
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* ---- TABLE VIEW ---- */
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    {[
                      { key: "userName" as SortField, label: "User" },
                      { key: "projectTitle" as SortField, label: "Project" },
                      { key: "allocationPct" as SortField, label: "Allocation" },
                      { key: "periodStart" as SortField, label: "Start" },
                      { key: "periodEnd" as SortField, label: "End" },
                    ].map(({ key, label }) => (
                      <th key={key}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => handleSort(key)}>
                        <div className="flex items-center gap-1.5">
                          {label}
                          <SortIcon field={key} />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sortedAllocations.map((alloc) => {
                    const { bg, text } = getAllocationColor(alloc.allocationPct);
                    return (
                      <tr key={alloc.id} className="hover:bg-[var(--surface-1)] transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)]">
                              <UserCircle size={16} className="text-[var(--text-secondary)]" />
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">{alloc.userName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FolderKanban size={14} className="text-[var(--text-secondary)]" />
                            <span className="text-[var(--text-primary)]">{alloc.projectTitle}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${Math.min(alloc.allocationPct, 100)}%`,
                                backgroundColor: text,
                              }} />
                            </div>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                              style={{ backgroundColor: bg, color: text }}>
                              {alloc.allocationPct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] tabular-nums">
                          {formatDate(alloc.periodStart)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] tabular-nums">
                          {formatDate(alloc.periodEnd)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => handleEdit(alloc)}
                              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors"
                              title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => setDeleteTarget(alloc)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                              title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ---- CARDS VIEW ---- */
          <div className="space-y-3">
            {groupedByUser.map(([userId, { userName, allocations: userAllocs }]) => (
              <AllocationCard
                key={userId}
                userName={userName}
                userId={userId}
                allocations={userAllocs}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}

        {/* ---- Pagination ---- */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-secondary)]">
              Page {meta.page} of {meta.totalPages}
              <span className="ml-1 text-[var(--text-secondary)]">
                ({meta.totalItems} total)
              </span>
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40">
                Previous
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 :
                  page >= meta.totalPages - 2 ? meta.totalPages - 4 + i :
                  page - 2 + i;
                if (pageNum < 1 || pageNum > meta.totalPages) return null;
                return (
                  <button key={pageNum} type="button" onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      pageNum === page
                        ? "bg-[var(--primary)] text-white"
                        : "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                    }`}>
                    {pageNum}
                  </button>
                );
              })}
              <button type="button" disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ---- Dialogs ---- */}
      <AnimatePresence>
        {dialogOpen && (
          <AllocationDialog
            open={dialogOpen}
            onClose={() => { setDialogOpen(false); setEditTarget(null); }}
            editTarget={editTarget}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
