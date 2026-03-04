"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
  Users,
  GitBranch,
  DollarSign,
  Calendar,
  TrendingUp,
  Plus,
  X,
  Building2,
  ArrowRightLeft,
  History,
  Clock,
  Target,
  Shield,
  FileText,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  BarChart3,
  UserCircle,
  FolderOpen,
  Info,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProjectDocuments } from "@/components/planning/project-documents";
import { FormField } from "@/components/shared/form-field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserPicker } from "@/components/shared/pickers";
import {
  useProject,
  useProjectStakeholders,
  useProjectDependencies,
  useApproveProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectStakeholder,
  useRemoveProjectStakeholder,
  useAddProjectDependency,
  useRemoveProjectDependency,
  useProjects,
} from "@/hooks/use-planning";
import {
  useProjectDivisionAssignments,
  useDivisionAssignmentHistory,
  useAssignProjectDivision,
  useUnassignProjectDivision,
  useReassignProjectDivision,
} from "@/hooks/use-reporting";
import { useOrgUnits } from "@/hooks/use-system";
import type {
  ProjectStakeholder,
  ProjectDependency,
  ProjectDivisionAssignment,
  DivisionAssignmentLog,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  RAG & Priority mappings                                            */
/* ------------------------------------------------------------------ */

const RAG_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  green: { color: "#22C55E", bg: "rgba(34,197,94,0.08)", label: "On Track" },
  amber: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", label: "At Risk" },
  red: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", label: "Critical" },
  grey: { color: "#9CA3AF", bg: "rgba(156,163,175,0.08)", label: "Not Set" },
};

function ragInfo(ragStatus: string) {
  return RAG_COLORS[ragStatus?.toLowerCase()] ?? RAG_COLORS.grey;
}

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
  high: { color: "#EA580C", bg: "rgba(234,88,12,0.08)" },
  medium: { color: "#D97706", bg: "rgba(217,119,6,0.08)" },
  low: { color: "#059669", bg: "rgba(5,150,105,0.08)" },
};

function priorityColor(priority: string) {
  return PRIORITY_COLORS[priority?.toLowerCase()] ?? { color: "var(--neutral-gray)", bg: "var(--surface-2)" };
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; gradient: string }> = {
  draft: { icon: FileText, gradient: "from-slate-400 to-slate-500" },
  pending_approval: { icon: Clock, gradient: "from-amber-400 to-amber-500" },
  approved: { icon: CheckCircle, gradient: "from-blue-400 to-blue-500" },
  active: { icon: PlayCircle, gradient: "from-emerald-400 to-emerald-500" },
  on_hold: { icon: PauseCircle, gradient: "from-amber-400 to-orange-500" },
  completed: { icon: CheckCircle, gradient: "from-green-400 to-green-600" },
  cancelled: { icon: XCircle, gradient: "from-red-400 to-red-500" },
};

/* ------------------------------------------------------------------ */
/*  Section component                                                   */
/* ------------------------------------------------------------------ */

function Section({
  icon: Icon,
  title,
  count,
  action,
  children,
  delay = 0,
  collapsible = false,
  defaultOpen = true,
}: {
  icon: typeof Users;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm overflow-hidden"
    >
      <div
        className={`flex items-center justify-between px-5 py-4 ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27,115,64,0.08)" }}
          >
            <Icon size={16} style={{ color: "#1B7340" }} />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          {count !== undefined && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--surface-2)] px-1.5 text-[10px] font-bold text-[var(--neutral-gray)] tabular-nums">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {collapsible && (
            <ChevronDown
              size={16}
              className={`text-[var(--neutral-gray)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Circular Progress Ring                                              */
/* ------------------------------------------------------------------ */

function ProgressRing({ value, size = 80, stroke = 6, color }: { value: number; size?: number; stroke?: number; color: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{value}%</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: project, isLoading } = useProject(id);
  const { data: stakeholders } = useProjectStakeholders(id);
  const { data: dependencies } = useProjectDependencies(id);
  const { data: allProjectsData } = useProjects(1, 100);

  const approveProject = useApproveProject();
  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();
  const addStakeholder = useAddProjectStakeholder(id);
  const removeStakeholder = useRemoveProjectStakeholder(id);
  const addDependency = useAddProjectDependency(id);
  const removeDependency = useRemoveProjectDependency(id);

  /* ---- Division assignment hooks ---- */
  const { data: divisionAssignments } = useProjectDivisionAssignments(id);
  const { data: divisionHistory } = useDivisionAssignmentHistory(id);
  const { data: orgUnitsData } = useOrgUnits(1, 100);
  const assignDivision = useAssignProjectDivision(id);
  const unassignDivision = useUnassignProjectDivision(id);
  const reassignDivision = useReassignProjectDivision(id);

  const orgUnits = Array.isArray(orgUnitsData)
    ? orgUnitsData
    : orgUnitsData?.data ?? [];

  const divisionOptions = orgUnits
    .filter(
      (ou) =>
        ou.level === "office" ||
        ou.level === "division" ||
        ou.level === "department",
    )
    .map((ou) => ({ value: ou.id, label: `${ou.code} — ${ou.name}` }));

  /* ---- Local state for inline forms ---- */
  const [showDivisionForm, setShowDivisionForm] = useState(false);
  const [divFormDivisionId, setDivFormDivisionId] = useState("");
  const [divFormType, setDivFormType] = useState("primary");
  const [divFormNotes, setDivFormNotes] = useState("");

  const [showReassignForm, setShowReassignForm] = useState(false);
  const [reassignFromId, setReassignFromId] = useState("");
  const [reassignToId, setReassignToId] = useState("");
  const [reassignNotes, setReassignNotes] = useState("");

  const [showDivisionHistory, setShowDivisionHistory] = useState(false);

  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [stUserId, setStUserId] = useState("");
  const [stUserDisplay, setStUserDisplay] = useState("");
  const [stRole, setStRole] = useState("");
  const [stInfluence, setStInfluence] = useState("");
  const [stInterest, setStInterest] = useState("");

  const [showDependencyForm, setShowDependencyForm] = useState(false);
  const [depProjectId, setDepProjectId] = useState("");
  const [depType, setDepType] = useState("finish_to_start");
  const [depDescription, setDepDescription] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /* ---- Expanded content tabs ---- */
  const [activeContentTab, setActiveContentTab] = useState<string | null>(null);

  const allProjects = allProjectsData?.data ?? [];

  const isActing =
    approveProject.isPending ||
    updateProject.isPending ||
    deleteProject.isPending;

  /* Days info */
  const daysInfo = useMemo(() => {
    if (!project?.plannedStart || !project?.plannedEnd) return null;
    const start = new Date(project.plannedStart);
    const end = new Date(project.plannedEnd);
    const total = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsed = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, total - elapsed);
    const isOverdue = Date.now() > end.getTime() && project.status !== "completed" && project.status !== "cancelled";
    return { total, elapsed: Math.max(0, elapsed), remaining, isOverdue };
  }, [project?.plannedStart, project?.plannedEnd, project?.status]);

  /* Content tabs */
  const contentTabs = useMemo(() => {
    const tabs: { key: string; label: string; content: string }[] = [];
    if (project?.description) tabs.push({ key: "description", label: "Description", content: project.description });
    if (project?.charter) tabs.push({ key: "charter", label: "Charter", content: project.charter });
    if (project?.scope) tabs.push({ key: "scope", label: "Scope", content: project.scope });
    if (project?.businessCase) tabs.push({ key: "businessCase", label: "Business Case", content: project.businessCase });
    return tabs;
  }, [project?.description, project?.charter, project?.scope, project?.businessCase]);

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-[3px] border-[var(--surface-2)]" />
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-[3px] border-transparent border-t-[var(--primary)]" />
          </div>
          <p className="text-sm font-medium text-[var(--neutral-gray)]">
            Loading project details...
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-1)]">
            <FolderOpen size={28} className="text-[var(--neutral-gray)]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">Project not found</p>
            <p className="mt-1 text-sm text-[var(--neutral-gray)]">The project you're looking for doesn't exist or has been removed.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/projects")}
            className="mt-2 flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={16} />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  /* ---- Helpers ---- */

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(d: string): string {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  const budgetPct =
    project.budgetApproved && project.budgetApproved > 0
      ? ((project.budgetSpent ?? 0) / project.budgetApproved) * 100
      : 0;

  const completionPct = project.completionPct ?? 0;
  const rag = ragInfo(project.ragStatus);
  const prio = priorityColor(project.priority);


  /* ---- Status transition actions ---- */

  function handleStatusTransition(newStatus: string) {
    updateProject.mutate({ status: newStatus });
  }

  function handleDeleteConfirm() {
    deleteProject.mutate(id, {
      onSuccess: () => router.push("/dashboard/planning/projects"),
    });
  }

  function handleAddStakeholder(e: React.FormEvent) {
    e.preventDefault();
    if (!stUserId.trim() || !stRole.trim()) return;
    addStakeholder.mutate(
      { userId: stUserId.trim(), role: stRole.trim(), influence: stInfluence.trim() || undefined, interest: stInterest.trim() || undefined },
      { onSuccess: () => { setShowStakeholderForm(false); setStUserId(""); setStUserDisplay(""); setStRole(""); setStInfluence(""); setStInterest(""); } },
    );
  }

  function handleAddDependency(e: React.FormEvent) {
    e.preventDefault();
    if (!depProjectId) return;
    addDependency.mutate(
      { dependsOnProjectId: depProjectId, dependencyType: depType, description: depDescription.trim() || undefined },
      { onSuccess: () => { setShowDependencyForm(false); setDepProjectId(""); setDepType("finish_to_start"); setDepDescription(""); } },
    );
  }

  function handleAssignDivision(e: React.FormEvent) {
    e.preventDefault();
    if (!divFormDivisionId) return;
    assignDivision.mutate(
      { divisionId: divFormDivisionId, assignmentType: divFormType, notes: divFormNotes.trim() || undefined },
      { onSuccess: () => { setShowDivisionForm(false); setDivFormDivisionId(""); setDivFormType("primary"); setDivFormNotes(""); } },
    );
  }

  function handleReassignDivision(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignFromId || !reassignToId) return;
    reassignDivision.mutate(
      { fromDivisionId: reassignFromId, toDivisionId: reassignToId, notes: reassignNotes.trim() || undefined },
      { onSuccess: () => { setShowReassignForm(false); setReassignFromId(""); setReassignToId(""); setReassignNotes(""); } },
    );
  }

  /* ---- Status action buttons ---- */
  function renderStatusActions() {
    if (!project) return null;
    const s = project.status.toLowerCase();
    const btnBase = "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50";

    return (
      <div className="flex flex-wrap items-center gap-2">
        {(s === "draft" || s === "pending_approval") && (
          <button type="button" disabled={isActing} onClick={() => approveProject.mutate(id)} className={`${btnBase} bg-green-600 text-white hover:bg-green-700 shadow-sm`}>
            {approveProject.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            Approve
          </button>
        )}
        {(s === "approved" || s === "on_hold") && (
          <button type="button" disabled={isActing} onClick={() => handleStatusTransition("active")} className={`${btnBase} bg-[var(--primary)] text-white hover:opacity-90 shadow-sm`}>
            <PlayCircle size={15} />
            Activate
          </button>
        )}
        {s === "active" && (
          <>
            <button type="button" disabled={isActing} onClick={() => handleStatusTransition("on_hold")} className={`${btnBase} border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100`}>
              <PauseCircle size={15} />
              Hold
            </button>
            <button type="button" disabled={isActing} onClick={() => handleStatusTransition("completed")} className={`${btnBase} bg-green-600 text-white hover:bg-green-700 shadow-sm`}>
              <CheckCircle size={15} />
              Complete
            </button>
          </>
        )}
        {s !== "completed" && s !== "cancelled" && (
          <button type="button" disabled={isActing} onClick={() => handleStatusTransition("cancelled")} className={`${btnBase} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
            <XCircle size={15} />
            Cancel
          </button>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* ─── Back Button ─── */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/planning/projects")}
          className="group flex items-center gap-2 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Projects
        </button>
      </motion.div>

      {/* ─── Hero Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm"
      >
        {/* Top accent bar */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${rag.color}, ${rag.color}88, transparent)` }} />

        <div className="p-6">
          {/* Title row */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(27,115,64,0.12), rgba(27,115,64,0.04))",
                  border: "1px solid rgba(27,115,64,0.1)",
                }}
              >
                <Briefcase size={24} style={{ color: "#1B7340" }} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                  {project.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-lg bg-[var(--surface-1)] px-2.5 py-1 text-xs font-mono font-medium text-[var(--neutral-gray)]">
                    {project.code}
                  </span>
                  <StatusBadge status={project.status} />
                  {/* RAG indicator */}
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: rag.bg, color: rag.color }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rag.color }} />
                    {rag.label}
                  </span>
                  {/* Priority */}
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize"
                    style={{ backgroundColor: prio.bg, color: prio.color }}
                  >
                    <Target size={10} />
                    {project.priority}
                  </span>
                  {/* Overdue badge */}
                  {daysInfo?.isOverdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                      <AlertTriangle size={10} />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {renderStatusActions()}
              <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />
              <button
                type="button"
                onClick={() => router.push(`/dashboard/planning/projects/${id}/edit`)}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-all hover:shadow-md hover:border-[var(--primary)]/30 hover:text-[var(--primary)]"
              >
                <Edit size={15} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteProject.isPending}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
              >
                {deleteProject.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>

          {/* Key people row */}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-4">
            {project.sponsorName && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
                  <Shield size={12} className="text-blue-500" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--neutral-gray)]">Sponsor</span>
                  <p className="text-xs font-medium text-[var(--text-primary)] -mt-0.5">{project.sponsorName}</p>
                </div>
              </div>
            )}
            {project.projectManagerName && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50">
                  <UserCircle size={12} className="text-purple-500" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--neutral-gray)]">Project Manager</span>
                  <p className="text-xs font-medium text-[var(--text-primary)] -mt-0.5">{project.projectManagerName}</p>
                </div>
              </div>
            )}
            {project.portfolioName && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50">
                  <FolderOpen size={12} className="text-amber-500" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--neutral-gray)]">Portfolio</span>
                  <p className="text-xs font-medium text-[var(--text-primary)] -mt-0.5">{project.portfolioName}</p>
                </div>
              </div>
            )}
            {project.divisionName && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Building2 size={12} className="text-emerald-500" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--neutral-gray)]">Division</span>
                  <p className="text-xs font-medium text-[var(--text-primary)] -mt-0.5">{project.divisionName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Overview Dashboard Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.04] blur-2xl" style={{ backgroundColor: rag.color }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-gray)]">Progress</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{completionPct}</span>
                <span className="text-sm text-[var(--neutral-gray)]">%</span>
              </div>
            </div>
            <ProgressRing value={completionPct} size={64} stroke={5} color={rag.color} />
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: rag.color }}
            />
          </div>
        </motion.div>

        {/* Budget */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#C9A84C] opacity-[0.04] blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-gray)]">Budget</p>
          <p className="mt-1.5 text-lg font-bold text-[var(--text-primary)]">
            {project.budgetApproved ? formatCurrency(project.budgetApproved) : "Not set"}
          </p>
          {project.budgetApproved && project.budgetApproved > 0 && (
            <>
              <p className="text-xs text-[var(--neutral-gray)] mt-1">
                <span className="font-medium" style={{ color: budgetPct > 90 ? "#EF4444" : "var(--text-primary)" }}>
                  {formatCurrency(project.budgetSpent ?? 0)}
                </span>{" "}
                spent ({budgetPct.toFixed(0)}%)
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: budgetPct > 90 ? "#EF4444" : "#1B7340" }}
                />
              </div>
            </>
          )}
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#3B82F6] opacity-[0.04] blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-gray)]">Timeline</p>
          <div className="mt-1.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--neutral-gray)]">Start</span>
              <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                {project.plannedStart ? formatDate(project.plannedStart) : "TBD"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--neutral-gray)]">End</span>
              <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                {project.plannedEnd ? formatDate(project.plannedEnd) : "TBD"}
              </span>
            </div>
            {project.actualStart && (
              <div className="flex items-center justify-between border-t border-dashed border-[var(--border)] pt-1.5">
                <span className="text-xs text-[var(--neutral-gray)]">Actual Start</span>
                <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">{formatDate(project.actualStart)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Days Remaining */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#8B5CF6] opacity-[0.04] blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-gray)]">
            {daysInfo?.isOverdue ? "Overdue" : "Days Left"}
          </p>
          <p className={`mt-1.5 text-3xl font-bold tabular-nums ${daysInfo?.isOverdue ? "text-red-500" : "text-[var(--text-primary)]"}`}>
            {daysInfo ? daysInfo.remaining : "—"}
          </p>
          {daysInfo && (
            <p className="text-xs text-[var(--neutral-gray)] mt-1">
              of {daysInfo.total} total days ({daysInfo.elapsed} elapsed)
            </p>
          )}
        </motion.div>
      </div>

      {/* ─── Content Tabs (Description / Charter / Scope / Business Case) ─── */}
      {contentTabs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm overflow-hidden"
        >
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-[var(--border)] bg-[var(--surface-1)] px-1">
            {contentTabs.map((tab) => {
              const isActive = (activeContentTab ?? contentTabs[0]?.key) === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveContentTab(tab.key)}
                  className={`relative px-4 py-3 text-xs font-semibold transition-colors ${
                    isActive ? "text-[var(--primary)]" : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="content-tab-indicator"
                      className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {/* Content */}
          <div className="p-5">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
              {contentTabs.find((t) => t.key === (activeContentTab ?? contentTabs[0]?.key))?.content}
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Stakeholders ─── */}
      <Section
        icon={Users}
        title="Stakeholders"
        count={stakeholders?.length ?? 0}
        delay={0.3}
        action={
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowStakeholderForm((f) => !f); }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
          >
            <Plus size={13} />
            Add
          </button>
        }
      >
        {/* Add form */}
        <AnimatePresence>
          {showStakeholderForm && (
            <motion.form
              onSubmit={handleAddStakeholder}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <UserPicker label="User" required value={stUserId || undefined} displayValue={stUserDisplay} onChange={(id, name) => { setStUserId(id ?? ""); setStUserDisplay(name); }} />
                <FormField label="Role" name="stRole" value={stRole} onChange={setStRole} placeholder="e.g. Sponsor, PM, Developer" required />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Influence" name="stInfluence" type="select" value={stInfluence} onChange={setStInfluence} options={[{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} placeholder="Select influence" />
                <FormField label="Interest" name="stInterest" type="select" value={stInterest} onChange={setStInterest} options={[{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} placeholder="Select interest" />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={addStakeholder.isPending} className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {addStakeholder.isPending && <Loader2 size={12} className="animate-spin" />}
                  Add Stakeholder
                </button>
                <button type="button" onClick={() => setShowStakeholderForm(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* List */}
        {!stakeholders || stakeholders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Users size={24} className="text-[var(--neutral-gray)]" />
            <p className="text-sm text-[var(--neutral-gray)]">No stakeholders added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stakeholders.map((sh: ProjectStakeholder) => (
              <div key={sh.id} className="group flex items-center justify-between rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-1)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-bold">
                    {sh.role.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{sh.role}</p>
                    <p className="text-[11px] text-[var(--neutral-gray)] font-mono truncate">{sh.userId.slice(0, 12)}...</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sh.influence && <span className="text-[10px] text-[var(--neutral-gray)]">Influence: <span className="font-medium capitalize">{sh.influence}</span></span>}
                      {sh.interest && <span className="text-[10px] text-[var(--neutral-gray)]">Interest: <span className="font-medium capitalize">{sh.interest}</span></span>}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => removeStakeholder.mutate(sh.id)} disabled={removeStakeholder.isPending} className="shrink-0 rounded-lg p-1.5 text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── Dependencies ─── */}
      <Section
        icon={GitBranch}
        title="Dependencies"
        count={dependencies?.length ?? 0}
        delay={0.33}
        action={
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowDependencyForm((f) => !f); }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
          >
            <Plus size={13} />
            Add
          </button>
        }
      >
        <AnimatePresence>
          {showDependencyForm && (
            <motion.form
              onSubmit={handleAddDependency}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 overflow-hidden"
            >
              <FormField label="Depends On Project" name="depProjectId" type="select" value={depProjectId} onChange={setDepProjectId} options={allProjects.filter((p) => p.id !== id).map((p) => ({ value: p.id, label: `${p.code} - ${p.title}` }))} placeholder="Select project" required />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Type" name="depType" type="select" value={depType} onChange={setDepType} options={[{ value: "finish_to_start", label: "Finish to Start" }, { value: "start_to_start", label: "Start to Start" }, { value: "finish_to_finish", label: "Finish to Finish" }, { value: "start_to_finish", label: "Start to Finish" }]} />
                <FormField label="Description" name="depDescription" value={depDescription} onChange={setDepDescription} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={addDependency.isPending} className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {addDependency.isPending && <Loader2 size={12} className="animate-spin" />}
                  Add Dependency
                </button>
                <button type="button" onClick={() => setShowDependencyForm(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {!dependencies || dependencies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <GitBranch size={24} className="text-[var(--neutral-gray)]" />
            <p className="text-sm text-[var(--neutral-gray)]">No dependencies defined yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dependencies.map((dep: ProjectDependency) => {
              const depProject = allProjects.find((p) => p.id === dep.dependsOnProjectId);
              return (
                <div key={dep.id} className="group flex items-center justify-between rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-1)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                      <GitBranch size={14} className="text-[var(--neutral-gray)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{depProject ? `${depProject.code} - ${depProject.title}` : dep.dependsOnProjectId.slice(0, 12) + "..."}</p>
                      <p className="text-xs text-[var(--neutral-gray)]">
                        <span className="capitalize">{dep.dependencyType.replace(/_/g, " ")}</span>
                        {dep.description && ` — ${dep.description}`}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeDependency.mutate(dep.id)} disabled={removeDependency.isPending} className="shrink-0 rounded-lg p-1.5 text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ─── Division / Office Assignment ─── */}
      <Section
        icon={Building2}
        title="Division / Office Assignment"
        count={divisionAssignments?.length ?? 0}
        delay={0.36}
        action={
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {divisionAssignments && divisionAssignments.length > 0 && (
              <button type="button" onClick={() => setShowReassignForm((f) => !f)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors">
                <ArrowRightLeft size={13} />
                Reassign
              </button>
            )}
            <button type="button" onClick={() => setShowDivisionForm((f) => !f)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors">
              <Plus size={13} />
              Assign
            </button>
          </div>
        }
      >
        {/* Primary Division */}
        {project.divisionName && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--primary)]/20 bg-[rgba(27,115,64,0.04)] px-3.5 py-2.5">
            <Building2 size={14} className="text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Primary: {project.divisionName}</span>
          </div>
        )}

        {/* Assign Division Form */}
        <AnimatePresence>
          {showDivisionForm && (
            <motion.form
              onSubmit={handleAssignDivision}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 overflow-hidden"
            >
              <FormField label="Division / Office" name="divFormDivisionId" type="select" value={divFormDivisionId} onChange={setDivFormDivisionId} options={divisionOptions} placeholder="Select division or office" required />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Assignment Type" name="divFormType" type="select" value={divFormType} onChange={setDivFormType} options={[{ value: "primary", label: "Primary Owner" }, { value: "collaborator", label: "Collaborator" }, { value: "stakeholder", label: "Stakeholder" }, { value: "reviewer", label: "Reviewer" }]} />
                <FormField label="Notes" name="divFormNotes" value={divFormNotes} onChange={setDivFormNotes} placeholder="Optional assignment notes" />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={assignDivision.isPending} className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {assignDivision.isPending && <Loader2 size={12} className="animate-spin" />}
                  Assign
                </button>
                <button type="button" onClick={() => setShowDivisionForm(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Reassign Division Form */}
        <AnimatePresence>
          {showReassignForm && (
            <motion.form
              onSubmit={handleReassignDivision}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 overflow-hidden"
            >
              <p className="text-xs font-medium text-amber-700 mb-2">Transfer project ownership from one division to another</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="From Division" name="reassignFromId" type="select" value={reassignFromId} onChange={setReassignFromId} options={divisionAssignments?.filter((da: ProjectDivisionAssignment) => da.status === "active").map((da: ProjectDivisionAssignment) => ({ value: da.divisionId, label: `${da.divisionCode} — ${da.divisionName}` })) ?? []} placeholder="Select current division" required />
                <FormField label="To Division" name="reassignToId" type="select" value={reassignToId} onChange={setReassignToId} options={divisionOptions} placeholder="Select new division" required />
              </div>
              <FormField label="Reason for Reassignment" name="reassignNotes" value={reassignNotes} onChange={setReassignNotes} placeholder="e.g. Division restructuring, project scope change" />
              <div className="flex items-center gap-2">
                <button type="submit" disabled={reassignDivision.isPending} className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {reassignDivision.isPending && <Loader2 size={12} className="animate-spin" />}
                  Reassign
                </button>
                <button type="button" onClick={() => setShowReassignForm(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Division Assignments List */}
        {!divisionAssignments || divisionAssignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Building2 size={24} className="text-[var(--neutral-gray)]" />
            <p className="text-sm text-[var(--neutral-gray)]">No division assignments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {divisionAssignments.map((da: ProjectDivisionAssignment) => (
              <div key={da.id} className="group flex items-center justify-between rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-1)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: da.assignmentType === "primary" ? "rgba(27,115,64,0.08)" : "var(--surface-2)" }}>
                    <Building2 size={14} style={{ color: da.assignmentType === "primary" ? "#1B7340" : "var(--neutral-gray)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{da.divisionName || da.divisionCode || da.divisionId.slice(0, 8) + "..."}</p>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      <span className="capitalize">{da.assignmentType}</span>
                      {da.status !== "active" && <span className="ml-1 text-amber-600">({da.status})</span>}
                      {da.notes && ` — ${da.notes}`}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => unassignDivision.mutate(da.divisionId)} disabled={unassignDivision.isPending} className="shrink-0 rounded-lg p-1.5 text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-600" title="Remove assignment">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Assignment History Toggle */}
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <button type="button" onClick={() => setShowDivisionHistory((f) => !f)} className="flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors">
            <History size={14} />
            {showDivisionHistory ? "Hide" : "Show"} Assignment History
          </button>

          <AnimatePresence>
            {showDivisionHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {!divisionHistory || divisionHistory.length === 0 ? (
                  <p className="text-xs text-[var(--neutral-gray)] py-2 text-center">No assignment history available.</p>
                ) : (
                  divisionHistory.map((log: DivisionAssignmentLog) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] mt-0.5">
                        <Clock size={12} className="text-[var(--neutral-gray)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] capitalize">{log.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-[var(--neutral-gray)]">
                          {log.performerName || log.performedBy.slice(0, 8) + "..."}
                          {log.fromDivisionName && ` — from ${log.fromDivisionName}`}
                          {log.toDivisionName && ` to ${log.toDivisionName}`}
                        </p>
                        {log.notes && <p className="text-xs text-[var(--neutral-gray)] italic mt-0.5">{log.notes}</p>}
                        <p className="text-[10px] text-[var(--neutral-gray)] mt-1 tabular-nums">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Section>

      {/* ─── Project Documents ─── */}
      <Section icon={FileText} title="Documents" delay={0.39}>
        <ProjectDocuments projectId={id} />
      </Section>

      {/* ─── Metadata ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.42 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(27,115,64,0.08)" }}>
            <Info size={16} style={{ color: "#1B7340" }} />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Project Metadata</h2>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: "Priority", value: project.priority, capitalize: true },
            { label: "Portfolio", value: project.portfolioName || "Not assigned" },
            { label: "Division / Office", value: project.divisionName || "Not assigned" },
            { label: "Sponsor", value: project.sponsorName || "Not assigned" },
            { label: "Project Manager", value: project.projectManagerName || "Not assigned" },
            { label: "Created", value: new Date(project.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
            { label: "Last Updated", value: new Date(project.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
          ].map(({ label, value, capitalize }) => (
            <div key={label} className="rounded-xl bg-[var(--surface-1)] p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">{label}</dt>
              <dd className={`mt-1 text-sm font-medium text-[var(--text-primary)] ${capitalize ? "capitalize" : ""}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </motion.div>

      {/* ─── Delete Confirmation ─── */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${project.title}"? This action cannot be undone.`}
        confirmLabel="Delete Project"
        variant="danger"
        loading={deleteProject.isPending}
      />
    </div>
  );
}
