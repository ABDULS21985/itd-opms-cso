"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  ClipboardList,
  Users,
  Calendar,
  DollarSign,
  Check,
  AlertCircle,
  CircleDot,
  TrendingUp,
  Shield,
  Briefcase,
  Building2,
  Sparkles,
  ChevronRight,
  Eye,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import {
  useProject,
  useUpdateProject,
  usePortfolios,
} from "@/hooks/use-planning";
import { useOrgUnits, useUsers } from "@/hooks/use-system";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const PRIORITIES = [
  { value: "low", label: "Low", color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  { value: "medium", label: "Medium", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  { value: "high", label: "High", color: "#F97316", bg: "rgba(249,115,22,0.1)" },
  { value: "critical", label: "Critical", color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
];

const STATUSES = [
  { value: "proposed", label: "Proposed", icon: FileText, color: "#6B7280" },
  { value: "approved", label: "Approved", icon: Check, color: "#3B82F6" },
  { value: "active", label: "Active", icon: TrendingUp, color: "#10B981" },
  { value: "on_hold", label: "On Hold", icon: AlertCircle, color: "#F59E0B" },
  { value: "completed", label: "Completed", icon: Sparkles, color: "#8B5CF6" },
  { value: "cancelled", label: "Cancelled", icon: CircleDot, color: "#EF4444" },
];

const RAG_OPTIONS = [
  { value: "green", label: "Green", color: "#10B981", description: "On track" },
  { value: "amber", label: "Amber", color: "#F59E0B", description: "At risk" },
  { value: "red", label: "Red", color: "#EF4444", description: "Off track" },
];

interface SectionDef {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const SECTIONS: SectionDef[] = [
  { id: "basic", label: "Basic Info", icon: FileText, color: "#3B82F6" },
  { id: "charter", label: "Charter & Scope", icon: ClipboardList, color: "#8B5CF6" },
  { id: "team", label: "Team & Status", icon: Users, color: "#10B981" },
  { id: "timeline", label: "Timeline", icon: Calendar, color: "#F59E0B" },
  { id: "budget", label: "Budget & Progress", icon: DollarSign, color: "#EC4899" },
];

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/* ================================================================== */
/*  Section Header                                                     */
/* ================================================================== */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color,
  filled,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  filled: boolean;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          {filled && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]/10"
            >
              <Check size={12} style={{ color: "#10B981" }} strokeWidth={3} />
            </motion.div>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Visual RAG Selector                                                */
/* ================================================================== */

function RAGSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
        RAG Status
      </label>
      <div className="flex gap-3">
        {RAG_OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="relative flex-1 rounded-xl border-2 p-3 text-center transition-all duration-200"
              style={{
                borderColor: isActive ? opt.color : "var(--border)",
                backgroundColor: isActive ? `${opt.color}08` : "transparent",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="rag-indicator"
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: opt.color }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Check size={12} className="text-white" strokeWidth={3} />
                </motion.div>
              )}
              <div
                className="mx-auto mb-1.5 h-4 w-4 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              <p
                className="text-xs font-semibold"
                style={{ color: isActive ? opt.color : "var(--text-primary)" }}
              >
                {opt.label}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Visual Priority Selector                                           */
/* ================================================================== */

function PrioritySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
        Priority Level
      </label>
      <div className="flex gap-2">
        {PRIORITIES.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="flex-1 rounded-xl border-2 px-3 py-2.5 text-center transition-all duration-200"
              style={{
                borderColor: isActive ? opt.color : "var(--border)",
                backgroundColor: isActive ? opt.bg : "transparent",
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Check size={14} style={{ color: opt.color }} strokeWidth={3} />
                  </motion.div>
                )}
                <span
                  className="text-xs font-semibold"
                  style={{ color: isActive ? opt.color : "var(--text-secondary)" }}
                >
                  {opt.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Visual Status Selector                                             */
/* ================================================================== */

function StatusSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
        Project Status
      </label>
      <div className="grid grid-cols-3 gap-2">
        {STATUSES.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all duration-200"
              style={{
                borderColor: isActive ? opt.color : "var(--border)",
                backgroundColor: isActive ? `${opt.color}10` : "transparent",
              }}
            >
              <Icon
                size={15}
                style={{ color: isActive ? opt.color : "var(--text-secondary)" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: isActive ? opt.color : "var(--text-secondary)" }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Progress Slider                                                    */
/* ================================================================== */

function ProgressSlider({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const pct = value === "" ? 0 : Math.min(100, Math.max(0, Number(value)));

  const progressColor =
    pct >= 75 ? "#10B981" : pct >= 50 ? "#3B82F6" : pct >= 25 ? "#F59E0B" : "#EF4444";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Completion
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2 py-1 text-center text-sm font-semibold text-[var(--text-primary)] tabular-nums focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
          <span className="text-sm font-medium text-[var(--text-secondary)]">%</span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative mt-1">
        <input
          type="range"
          min="0"
          max="100"
          value={pct}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 z-10 h-3 w-full cursor-pointer opacity-0"
        />
        <div className="h-3 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ backgroundColor: progressColor }}
          />
        </div>
        {/* Markers */}
        <div className="flex justify-between mt-1.5">
          {[0, 25, 50, 75, 100].map((mark) => (
            <span
              key={mark}
              className="text-[10px] tabular-nums"
              style={{
                color: pct >= mark ? progressColor : "var(--text-secondary)",
                fontWeight: pct >= mark ? 600 : 400,
              }}
            >
              {mark}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Budget Visualizer                                                  */
/* ================================================================== */

function BudgetVisualizer({
  approved,
  spent,
}: {
  approved: string;
  spent: string;
}) {
  const approvedNum = Number(approved) || 0;
  const spentNum = Number(spent) || 0;
  const pct = approvedNum > 0 ? Math.min(100, (spentNum / approvedNum) * 100) : 0;

  const barColor =
    pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#10B981";

  if (approvedNum <= 0 && spentNum <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 mt-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Budget Utilization
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: barColor }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
          style={{ backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-secondary)]">
        <span>
          Spent: <strong className="text-[var(--text-primary)]">{formatCurrency(spentNum)}</strong>
        </span>
        <span>
          Approved: <strong className="text-[var(--text-primary)]">{formatCurrency(approvedNum)}</strong>
        </span>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Timeline Visual                                                    */
/* ================================================================== */

function TimelineVisual({
  plannedStart,
  plannedEnd,
  actualStart,
  actualEnd,
}: {
  plannedStart: string;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string;
}) {
  const hasPlanned = plannedStart && plannedEnd;
  const hasActual = actualStart || actualEnd;

  if (!hasPlanned && !hasActual) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 mt-4"
    >
      <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        Timeline Overview
      </span>
      <div className="mt-3 space-y-3">
        {hasPlanned && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-secondary)] w-16 shrink-0">
              Planned
            </span>
            <div className="flex-1 h-6 rounded-lg bg-[#3B82F6]/10 relative overflow-hidden flex items-center px-2">
              <span className="text-[10px] font-semibold text-[#3B82F6] tabular-nums truncate">
                {new Date(plannedStart).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
                {" — "}
                {new Date(plannedEnd).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
        {hasActual && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-secondary)] w-16 shrink-0">
              Actual
            </span>
            <div className="flex-1 h-6 rounded-lg bg-[#10B981]/10 relative overflow-hidden flex items-center px-2">
              <span className="text-[10px] font-semibold text-[#10B981] tabular-nums truncate">
                {actualStart
                  ? new Date(actualStart).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })
                  : "TBD"}
                {" — "}
                {actualEnd
                  ? new Date(actualEnd).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "In progress"}
              </span>
            </div>
          </div>
        )}
        {hasPlanned && plannedEnd < today && !actualEnd && (
          <div className="flex items-center gap-2 mt-1">
            <AlertCircle size={12} className="text-[#EF4444]" />
            <span className="text-[11px] font-medium text-[#EF4444]">
              Project is past the planned end date
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: project, isLoading: projectLoading } = useProject(id);
  const updateProject = useUpdateProject(id);
  const { data: portfoliosData } = usePortfolios(1, 100);
  const portfolios = portfoliosData?.data ?? [];
  const { data: orgUnitsData } = useOrgUnits(1, 100);
  const { data: usersData } = useUsers(1, 200);

  const orgUnits = Array.isArray(orgUnitsData)
    ? orgUnitsData
    : orgUnitsData?.data ?? [];

  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];

  const portfolioOptions = portfolios.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const divisionOptions = orgUnits
    .filter(
      (ou) =>
        ou.level === "office" ||
        ou.level === "division" ||
        ou.level === "department",
    )
    .map((ou) => ({ value: ou.id, label: `${ou.code} — ${ou.name}` }));

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.displayName || u.email,
  }));

  /* ---- Form state ---- */
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [description, setDescription] = useState("");
  const [charter, setCharter] = useState("");
  const [scope, setScope] = useState("");
  const [businessCase, setBusinessCase] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [status, setStatus] = useState("");
  const [ragStatus, setRagStatus] = useState("");
  const [priority, setPriority] = useState("medium");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [budgetApproved, setBudgetApproved] = useState("");
  const [budgetSpent, setBudgetSpent] = useState("");
  const [completionPct, setCompletionPct] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  /* ---- Section refs for scrollspy ---- */
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* ---- Pre-fill form from existing project ---- */
  useEffect(() => {
    if (project && !initialized) {
      setTitle(project.title || "");
      setCode(project.code || "");
      setPortfolioId(project.portfolioId || "");
      setDivisionId(project.divisionId || "");
      setDescription(project.description || "");
      setCharter(project.charter || "");
      setScope(project.scope || "");
      setBusinessCase(project.businessCase || "");
      setSponsorId(project.sponsorId || "");
      setProjectManagerId(project.projectManagerId || "");
      setStatus(project.status || "");
      setRagStatus(project.ragStatus || "");
      setPriority(project.priority || "medium");
      setPlannedStart(formatDateForInput(project.plannedStart));
      setPlannedEnd(formatDateForInput(project.plannedEnd));
      setActualStart(formatDateForInput(project.actualStart));
      setActualEnd(formatDateForInput(project.actualEnd));
      setBudgetApproved(project.budgetApproved ? String(project.budgetApproved) : "");
      setBudgetSpent(project.budgetSpent ? String(project.budgetSpent) : "");
      setCompletionPct(project.completionPct != null ? String(project.completionPct) : "");
      setInitialized(true);
    }
  }, [project, initialized]);

  /* ---- Scrollspy ---- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0.1 },
    );

    for (const ref of Object.values(sectionRefs.current)) {
      if (ref) observer.observe(ref);
    }

    return () => observer.disconnect();
  }, [initialized]);

  /* ---- Section completeness ---- */
  const sectionFilled = useMemo(
    () => ({
      basic: !!(title.trim() && code.trim()),
      charter: !!(charter.trim() || scope.trim() || businessCase.trim()),
      team: !!(sponsorId || projectManagerId || status),
      timeline: !!(plannedStart || plannedEnd),
      budget: !!(budgetApproved || budgetSpent || completionPct),
    }),
    [title, code, charter, scope, businessCase, sponsorId, projectManagerId, status, plannedStart, plannedEnd, budgetApproved, budgetSpent, completionPct],
  );

  const filledCount = Object.values(sectionFilled).filter(Boolean).length;

  /* ---- Dirty check ---- */
  const isDirty = useMemo(() => {
    if (!project || !initialized) return false;
    return (
      title !== (project.title || "") ||
      code !== (project.code || "") ||
      portfolioId !== (project.portfolioId || "") ||
      divisionId !== (project.divisionId || "") ||
      description !== (project.description || "") ||
      charter !== (project.charter || "") ||
      scope !== (project.scope || "") ||
      businessCase !== (project.businessCase || "") ||
      sponsorId !== (project.sponsorId || "") ||
      projectManagerId !== (project.projectManagerId || "") ||
      status !== (project.status || "") ||
      ragStatus !== (project.ragStatus || "") ||
      priority !== (project.priority || "medium") ||
      plannedStart !== formatDateForInput(project.plannedStart) ||
      plannedEnd !== formatDateForInput(project.plannedEnd) ||
      actualStart !== formatDateForInput(project.actualStart) ||
      actualEnd !== formatDateForInput(project.actualEnd) ||
      budgetApproved !== (project.budgetApproved ? String(project.budgetApproved) : "") ||
      budgetSpent !== (project.budgetSpent ? String(project.budgetSpent) : "") ||
      completionPct !== (project.completionPct != null ? String(project.completionPct) : "")
    );
  }, [
    project, initialized, title, code, portfolioId, divisionId, description,
    charter, scope, businessCase, sponsorId, projectManagerId, status,
    ragStatus, priority, plannedStart, plannedEnd, actualStart, actualEnd,
    budgetApproved, budgetSpent, completionPct,
  ]);

  function scrollToSection(sectionId: string) {
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Project title is required";
    if (!code.trim()) newErrors.code = "Project code is required";
    if (plannedStart && plannedEnd && plannedStart > plannedEnd) {
      newErrors.plannedEnd = "End date must be after start date";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.title || newErrors.code) scrollToSection("basic");
      else if (newErrors.plannedEnd) scrollToSection("timeline");
    }
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    updateProject.mutate(
      {
        title: title.trim(),
        code: code.trim(),
        portfolioId: portfolioId || undefined,
        divisionId: divisionId || undefined,
        description: description.trim() || undefined,
        charter: charter.trim() || undefined,
        scope: scope.trim() || undefined,
        businessCase: businessCase.trim() || undefined,
        sponsorId: sponsorId || undefined,
        projectManagerId: projectManagerId || undefined,
        status: status || undefined,
        ragStatus: ragStatus || undefined,
        priority,
        plannedStart: plannedStart ? `${plannedStart}T00:00:00Z` : undefined,
        plannedEnd: plannedEnd ? `${plannedEnd}T00:00:00Z` : undefined,
        actualStart: actualStart ? `${actualStart}T00:00:00Z` : undefined,
        actualEnd: actualEnd ? `${actualEnd}T00:00:00Z` : undefined,
        budgetApproved: budgetApproved ? Number(budgetApproved) : undefined,
        budgetSpent: budgetSpent ? Number(budgetSpent) : undefined,
        completionPct: completionPct !== "" ? Number(completionPct) : undefined,
      },
      {
        onSuccess: () => {
          router.push(`/dashboard/planning/projects/${id}`);
        },
      },
    );
  }

  /* ---- Loading ---- */
  if (projectLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 rounded bg-[var(--surface-2)]" />
          <div className="h-8 w-64 rounded bg-[var(--surface-2)]" />
          <div className="h-4 w-96 rounded bg-[var(--surface-2)]" />
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 mt-8">
            <div className="hidden lg:block space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-[var(--surface-2)]" />
              ))}
            </div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-[var(--surface-2)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center">
        <AlertCircle size={32} className="mx-auto text-[var(--text-secondary)] mb-3" />
        <p className="text-lg font-semibold text-[var(--text-primary)]">
          Project not found
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          The project you are trying to edit does not exist or has been removed.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/planning/projects")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push(`/dashboard/planning/projects/${id}`)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Project
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}
            >
              <Briefcase size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Edit Project
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {project.code} &middot; {project.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Unsaved badge */}
            <AnimatePresence>
              {isDirty && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 px-3 py-1.5"
                >
                  <div className="h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span className="text-xs font-semibold text-[#F59E0B]">
                    Unsaved changes
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => router.push(`/dashboard/planning/projects/${id}`)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <Eye size={16} />
              View
            </button>
          </div>
        </div>

        {/* Section completion bar */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[var(--primary)]"
              initial={false}
              animate={{ width: `${(filledCount / SECTIONS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
            {filledCount}/{SECTIONS.length} sections
          </span>
        </div>
      </motion.div>

      {/* ── Layout: Sidebar + Form ── */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="hidden lg:block"
          >
            <div className="sticky top-24 space-y-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isFilled = sectionFilled[section.id as keyof typeof sectionFilled];

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary)]/5 border border-[var(--primary)]/20"
                        : "border border-transparent hover:bg-[var(--surface-1)]"
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: isActive ? `${section.color}15` : "var(--surface-2)",
                      }}
                    >
                      <Icon
                        size={16}
                        style={{
                          color: isActive ? section.color : "var(--text-secondary)",
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-medium block truncate ${
                          isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {section.label}
                      </span>
                    </div>
                    {isFilled && (
                      <Check size={14} style={{ color: "#10B981" }} strokeWidth={3} />
                    )}
                  </button>
                );
              })}

              {/* Save button in sidebar */}
              <div className="pt-4 mt-4 border-t border-[var(--border)]">
                <button
                  type="submit"
                  disabled={updateProject.isPending || !isDirty}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {updateProject.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {updateProject.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.aside>

          {/* ── Form Sections ── */}
          <div className="space-y-6">
            {/* Section: Basic Information */}
            <motion.div
              id="basic"
              ref={(el) => { sectionRefs.current.basic = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm scroll-mt-24"
            >
              <SectionHeader
                icon={FileText}
                title="Basic Information"
                subtitle="Project identity, portfolio assignment, and description"
                color="#3B82F6"
                filled={sectionFilled.basic}
              />
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Project Title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g. Core Banking Upgrade"
                    required
                    error={errors.title}
                  />
                  <FormField
                    label="Project Code"
                    name="code"
                    value={code}
                    onChange={setCode}
                    placeholder="e.g. PRJ-2026-001"
                    required
                    error={errors.code}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Portfolio"
                    name="portfolioId"
                    type="select"
                    value={portfolioId}
                    onChange={setPortfolioId}
                    options={portfolioOptions}
                    placeholder="Select portfolio (optional)"
                  />
                  <FormField
                    label="Division / Office"
                    name="divisionId"
                    type="select"
                    value={divisionId}
                    onChange={setDivisionId}
                    options={divisionOptions}
                    placeholder="Select division (optional)"
                  />
                </div>

                <FormField
                  label="Description"
                  name="description"
                  type="textarea"
                  value={description}
                  onChange={setDescription}
                  placeholder="Brief summary of the project objectives and deliverables"
                  rows={3}
                />
              </div>
            </motion.div>

            {/* Section: Charter & Scope */}
            <motion.div
              id="charter"
              ref={(el) => { sectionRefs.current.charter = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm scroll-mt-24"
            >
              <SectionHeader
                icon={ClipboardList}
                title="Charter & Scope"
                subtitle="Define project objectives, scope boundaries, and business justification"
                color="#8B5CF6"
                filled={sectionFilled.charter}
              />
              <div className="space-y-4">
                <FormField
                  label="Project Charter"
                  name="charter"
                  type="textarea"
                  value={charter}
                  onChange={setCharter}
                  placeholder="Describe the project purpose, objectives, and high-level deliverables"
                  rows={4}
                />
                <FormField
                  label="Scope"
                  name="scope"
                  type="textarea"
                  value={scope}
                  onChange={setScope}
                  placeholder="Define what is in scope and out of scope"
                  rows={3}
                />
                <FormField
                  label="Business Case"
                  name="businessCase"
                  type="textarea"
                  value={businessCase}
                  onChange={setBusinessCase}
                  placeholder="Justify the project — expected benefits, ROI, strategic alignment"
                  rows={3}
                />
              </div>
            </motion.div>

            {/* Section: Team & Status */}
            <motion.div
              id="team"
              ref={(el) => { sectionRefs.current.team = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm scroll-mt-24"
            >
              <SectionHeader
                icon={Users}
                title="Team & Status"
                subtitle="Key stakeholders, project status, and priority settings"
                color="#10B981"
                filled={sectionFilled.team}
              />
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Project Sponsor"
                    name="sponsorId"
                    type="select"
                    value={sponsorId}
                    onChange={setSponsorId}
                    options={userOptions}
                    placeholder="Select sponsor"
                  />
                  <FormField
                    label="Project Manager"
                    name="projectManagerId"
                    type="select"
                    value={projectManagerId}
                    onChange={setProjectManagerId}
                    options={userOptions}
                    placeholder="Select project manager"
                  />
                </div>

                <div className="border-t border-[var(--border)] pt-5">
                  <StatusSelector value={status} onChange={setStatus} />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <RAGSelector value={ragStatus} onChange={setRagStatus} />
                  <PrioritySelector value={priority} onChange={setPriority} />
                </div>
              </div>
            </motion.div>

            {/* Section: Timeline */}
            <motion.div
              id="timeline"
              ref={(el) => { sectionRefs.current.timeline = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm scroll-mt-24"
            >
              <SectionHeader
                icon={Calendar}
                title="Timeline"
                subtitle="Planned and actual project schedule"
                color="#F59E0B"
                filled={sectionFilled.timeline}
              />
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Planned Start"
                    name="plannedStart"
                    type="date"
                    value={plannedStart}
                    onChange={setPlannedStart}
                  />
                  <FormField
                    label="Planned End"
                    name="plannedEnd"
                    type="date"
                    value={plannedEnd}
                    onChange={setPlannedEnd}
                    error={errors.plannedEnd}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Actual Start"
                    name="actualStart"
                    type="date"
                    value={actualStart}
                    onChange={setActualStart}
                  />
                  <FormField
                    label="Actual End"
                    name="actualEnd"
                    type="date"
                    value={actualEnd}
                    onChange={setActualEnd}
                  />
                </div>

                <TimelineVisual
                  plannedStart={plannedStart}
                  plannedEnd={plannedEnd}
                  actualStart={actualStart}
                  actualEnd={actualEnd}
                />
              </div>
            </motion.div>

            {/* Section: Budget & Progress */}
            <motion.div
              id="budget"
              ref={(el) => { sectionRefs.current.budget = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm scroll-mt-24"
            >
              <SectionHeader
                icon={DollarSign}
                title="Budget & Progress"
                subtitle="Financial tracking and overall project completion"
                color="#EC4899"
                filled={sectionFilled.budget}
              />
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Approved Budget"
                    name="budgetApproved"
                    type="number"
                    value={budgetApproved}
                    onChange={setBudgetApproved}
                    placeholder="e.g. 50000000"
                    description="Budget amount in NGN"
                  />
                  <FormField
                    label="Spent Budget"
                    name="budgetSpent"
                    type="number"
                    value={budgetSpent}
                    onChange={setBudgetSpent}
                    placeholder="e.g. 12000000"
                    description="Amount spent in NGN"
                  />
                </div>

                <BudgetVisualizer approved={budgetApproved} spent={budgetSpent} />

                <div className="border-t border-[var(--border)] pt-5">
                  <ProgressSlider value={completionPct} onChange={setCompletionPct} />
                </div>
              </div>
            </motion.div>

            {/* ── Mobile Save Button ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="flex items-center justify-between lg:justify-end gap-3 pt-2"
            >
              <button
                type="button"
                onClick={() => router.push(`/dashboard/planning/projects/${id}`)}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProject.isPending || !isDirty}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {updateProject.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {updateProject.isPending ? "Saving..." : "Save Changes"}
              </button>
            </motion.div>
          </div>
        </div>
      </form>
    </div>
  );
}
