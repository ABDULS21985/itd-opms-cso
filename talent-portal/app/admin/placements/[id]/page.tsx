"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Save,
  ChevronDown,
  Briefcase,
  User,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRight,
  Link2,
  ChevronRight,
  ArrowUpRight,
  Shield,
  MapPin,
  Upload,
  File,
  MessageCircle,
  Plus,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlacement, useUpdatePlacement, useUpdatePlacementStatus } from "@/hooks/use-placements";
import { PlacementStatus, PlacementType } from "@/types/placement";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// Scoped Styles
// ═══════════════════════════════════════════════════════════════════════════

const STYLE_ID = "admin-placement-detail-styles";

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes pd-fadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pd-scaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes pd-shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes pd-borderGlow {
        0%   { background-position: 0% 0%; }
        100% { background-position: 200% 0%; }
      }
      @keyframes pd-stepPop {
        0%   { transform: scale(0.6); opacity: 0; }
        60%  { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }

      .pd-section { animation: pd-fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .pd-scale-in { animation: pd-scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .pd-step-pop { animation: pd-stepPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

      .pd-card {
        position: relative;
        background: var(--surface-0);
        border: 1px solid var(--border);
        border-radius: 20px;
        overflow: hidden;
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .pd-card::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: inherit;
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
        background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(30,77,183,0.025), transparent 40%);
      }
      .pd-card:hover::before { opacity: 1; }
      .pd-card:hover {
        border-color: rgba(30,77,183,0.08);
        box-shadow: 0 6px 32px -10px rgba(30,77,183,0.08);
      }

      .pd-card-accent::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--primary), var(--success), var(--primary));
        background-size: 200% 100%;
        border-radius: 20px 20px 0 0;
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      .pd-card:hover::after,
      .pd-card:focus-within::after {
        opacity: 1;
        animation: pd-borderGlow 3s linear infinite;
      }

      .pd-skeleton {
        background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-1) 40%, var(--surface-2) 80%);
        background-size: 200% 100%;
        animation: pd-shimmer 1.8s ease-in-out infinite;
        border-radius: 12px;
      }

      .pd-step-current { box-shadow: 0 0 0 4px rgba(30,77,183,0.15); }

      @media (prefers-reduced-motion: reduce) {
        .pd-section, .pd-scale-in, .pd-step-pop { animation: none !important; opacity: 1 !important; transform: none !important; }
        .pd-card { transition: none !important; }
      }
      @media print {
        .pd-no-print { display: none !important; }
        .pd-card { border: 1px solid #ddd !important; box-shadow: none !important; border-radius: 8px !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(STYLE_ID)?.remove(); };
  }, []);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function stagger(index: number, base = 70) {
  return { animationDelay: `${index * base}ms` };
}

function useCardGlow() {
  return useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function getDaysInStage(createdAt: string, stageDate: string | null | undefined): number {
  const d = stageDate || createdAt;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

// ═══════════════════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════════════════

const statusConfig: Record<
  PlacementStatus,
  { label: string; bg: string; text: string; dot: string; icon: typeof Clock }
> = {
  [PlacementStatus.AVAILABLE]: { label: "Available", bg: "bg-[var(--primary)]/10", text: "text-[var(--primary)]", dot: "bg-[var(--primary)]", icon: Clock },
  [PlacementStatus.IN_DISCUSSION]: { label: "In Discussion", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]", dot: "bg-[var(--warning)]", icon: MessageSquare },
  [PlacementStatus.INTERVIEWING]: { label: "Interviewing", bg: "bg-[var(--badge-purple-bg)]", text: "text-[var(--badge-purple-text)]", dot: "bg-[var(--badge-purple-dot)]", icon: User },
  [PlacementStatus.OFFER]: { label: "Offer", bg: "bg-[var(--badge-blue-bg)]", text: "text-[var(--badge-blue-text)]", dot: "bg-[var(--badge-blue-dot)]", icon: FileText },
  [PlacementStatus.PLACED]: { label: "Placed", bg: "bg-[var(--success-light)]", text: "text-[var(--success-dark)]", dot: "bg-[var(--success)]", icon: CheckCircle2 },
  [PlacementStatus.COMPLETED]: { label: "Completed", bg: "bg-[var(--surface-2)]", text: "text-[var(--text-primary)]", dot: "bg-[var(--text-primary)]", icon: CheckCircle2 },
  [PlacementStatus.CANCELLED]: { label: "Cancelled", bg: "bg-[var(--error-light)]", text: "text-[var(--error-dark)]", dot: "bg-[var(--error)]", icon: XCircle },
};

const STATE_MACHINE: Record<PlacementStatus, PlacementStatus[]> = {
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

const placementTypeLabels: Record<string, string> = {
  [PlacementType.INTERNSHIP]: "Internship",
  [PlacementType.CONTRACT]: "Contract",
  [PlacementType.FULL_TIME]: "Full-Time",
};

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton / Error
// ═══════════════════════════════════════════════════════════════════════════

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <div className="pd-skeleton h-4 w-12" />
        <div className="pd-skeleton h-4 w-4" />
        <div className="pd-skeleton h-4 w-24" />
        <div className="pd-skeleton h-4 w-4" />
        <div className="pd-skeleton h-4 w-32" />
      </div>
      <div className="pd-skeleton h-[160px] w-full" style={{ borderRadius: 20 }} />
      <div className="pd-skeleton h-[100px] w-full" style={{ borderRadius: 20 }} />
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="pd-skeleton h-[250px] w-full" style={{ borderRadius: 20 }} />
          <div className="pd-skeleton h-[200px] w-full" style={{ borderRadius: 20 }} />
        </div>
        <div className="hidden lg:block w-80 space-y-4">
          <div className="pd-skeleton h-[200px] w-full" style={{ borderRadius: 20 }} />
          <div className="pd-skeleton h-[200px] w-full" style={{ borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="pd-section">
      <div className="pd-card p-14 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--error-light)] flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-[var(--error)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Failed to load placement</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/admin/placements" className="px-5 py-2.5 border border-[var(--border)] text-[var(--neutral-gray)] rounded-xl text-sm font-medium hover:bg-[var(--surface-2)] transition-colors">
            Back to Placements
          </Link>
          <button onClick={onRetry} className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] transition-colors">
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// InfoRow
// ═══════════════════════════════════════════════════════════════════════════

function InfoRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="w-7 h-7 rounded-lg bg-[var(--surface-1)] flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{value}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function AdminPlacementDetailPage() {
  useInjectStyles();
  const cardGlow = useCardGlow();
  const params = useParams();
  const placementId = params.id as string;
  const queryClient = useQueryClient();

  const [outcome, setOutcome] = useState("");
  const [fieldsInitialized, setFieldsInitialized] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "documents" | "activity">("notes");

  // Data fetching
  const { data: placement, isLoading, error, refetch } = usePlacement(placementId);
  const updatePlacement = useUpdatePlacement();
  const updateStatus = useUpdatePlacementStatus();

  // Initialize fields
  useEffect(() => {
    if (placement && !fieldsInitialized) {
      setOutcome(placement.outcomeNotes || "");
      setFieldsInitialized(true);
    }
  }, [placement, fieldsInitialized]);

  // Handlers
  const handleStatusChange = (newStatus: PlacementStatus) => {
    setShowStatusDropdown(false);
    updateStatus.mutate(
      { id: placementId, status: newStatus },
      {
        onSuccess: () => toast.success(`Status updated to ${statusConfig[newStatus].label}`),
        onError: (err: Error) => toast.error(err.message || "Failed to update status"),
      },
    );
  };

  const handleSaveNotes = () => {
    updatePlacement.mutate(
      { id: placementId, data: { outcomeNotes: outcome } },
      {
        onSuccess: () => toast.success("Notes saved successfully"),
        onError: (err: Error) => toast.error(err.message || "Failed to save notes"),
      },
    );
  };

  // Keyboard
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") window.location.href = "/admin/placements";
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // States
  if (isLoading) return <DetailSkeleton />;
  if (error || !placement) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );
  }

  const currentStatusConf = statusConfig[placement.status] || statusConfig[PlacementStatus.AVAILABLE];
  const validNextStatuses = STATE_MACHINE[placement.status] || [];
  const isTerminal = validNextStatuses.length === 0;
  const currentStageIndex = PROGRESSION_STAGES.indexOf(placement.status);
  const isCancelled = placement.status === PlacementStatus.CANCELLED;

  const stageDates: Record<string, string | null> = {
    [PlacementStatus.AVAILABLE]: placement.createdAt,
    [PlacementStatus.IN_DISCUSSION]: placement.introDate,
    [PlacementStatus.INTERVIEWING]: placement.interviewDate,
    [PlacementStatus.OFFER]: placement.offerDate,
    [PlacementStatus.PLACED]: placement.placedDate,
    [PlacementStatus.COMPLETED]: placement.completedDate,
  };

  const candidateName = placement.candidate?.fullName || "Unknown Candidate";
  const companyName = placement.employer?.companyName || "Unknown Employer";
  const jobTitle = placement.job?.title || null;

  const daysInStage = getDaysInStage(placement.createdAt, stageDates[placement.status]);

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <nav className="pd-section flex items-center gap-1.5 text-sm" style={stagger(0, 60)}>
        <Link href="/admin" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">Admin</Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <Link href="/admin/placements" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">Placements</Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <span className="text-[var(--text-primary)] font-semibold truncate max-w-[260px]">
          {candidateName} &rarr; {companyName}
        </span>
      </nav>

      {/* Hero Header */}
      <div className="pd-section pd-card overflow-hidden" style={stagger(1)} onMouseMove={cardGlow}>
        <div className="h-24 bg-gradient-to-r from-[var(--primary)] via-[var(--success)] to-[var(--primary)]/80 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMCAwaDJ2MmgtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

          {/* Status change */}
          {!isTerminal && (
            <div className="pd-no-print absolute top-4 right-4 relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={updateStatus.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-1)]/20 backdrop-blur-sm text-white rounded-xl text-sm font-bold hover:bg-[var(--surface-1)]/30 disabled:opacity-60 transition-colors border border-white/20"
              >
                {updateStatus.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Change Status
                <ChevronDown size={14} />
              </button>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] shadow-lg overflow-hidden min-w-[200px]">
                    {validNextStatuses.map((nextStatus) => {
                      const conf = statusConfig[nextStatus];
                      const StatusIcon = conf.icon;
                      const isCancelAction = nextStatus === PlacementStatus.CANCELLED;
                      return (
                        <button
                          key={nextStatus}
                          onClick={() => handleStatusChange(nextStatus)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left hover:bg-[var(--surface-1)] transition-colors ${
                            isCancelAction ? "text-[var(--error)] border-t border-[var(--border)]" : "text-[var(--text-primary)]"
                          }`}
                        >
                          <StatusIcon size={16} className={isCancelAction ? "text-[var(--error)]" : conf.text} />
                          {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-7 pb-6 -mt-8 relative">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 rounded-2xl border-4 border-[var(--surface-0)] shadow-lg bg-[var(--surface-1)] flex items-center justify-center flex-shrink-0">
              <Briefcase size={24} className="text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Placement Details</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${currentStatusConf.bg} ${currentStatusConf.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentStatusConf.dot}`} />
                  {currentStatusConf.label}
                </span>
                {daysInStage > 0 && !isTerminal && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    daysInStage <= 7 ? "bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]" : daysInStage <= 14 ? "bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)]" : "bg-[var(--badge-red-bg)] text-[var(--badge-red-text)]"
                  }`}>
                    {daysInStage}d in stage
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-[var(--neutral-gray)] font-medium">
                <span>{candidateName}</span>
                <span className="opacity-30">&rarr;</span>
                <span>{companyName}</span>
                <span className="opacity-30">|</span>
                <code className="text-xs bg-[var(--surface-2)] px-2 py-0.5 rounded-md font-mono">{placement.id.slice(0, 8)}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="pd-section pd-card pd-card-accent p-6" style={stagger(2)} onMouseMove={cardGlow}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-5">
          <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center">
            <Clock size={15} className="text-[var(--primary)]" />
          </span>
          Placement Pipeline
        </h3>
        <div className="relative">
          <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-[var(--surface-2)]" />
          {!isCancelled && currentStageIndex >= 0 && (
            <div
              className="absolute top-5 left-[5%] h-0.5 bg-[var(--primary)] transition-all duration-700 ease-out"
              style={{ width: `${(currentStageIndex / (PROGRESSION_STAGES.length - 1)) * 90}%` }}
            />
          )}
          <div className="relative flex justify-between">
            {PROGRESSION_STAGES.map((stage, idx) => {
              const conf = statusConfig[stage];
              const isReached = !isCancelled && currentStageIndex >= idx;
              const isCurrent = !isCancelled && placement.status === stage;
              const dateVal = stageDates[stage];
              return (
                <div key={stage} className="pd-step-pop flex flex-col items-center" style={{ ...stagger(idx, 80), width: `${100 / PROGRESSION_STAGES.length}%` }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    isCurrent
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white pd-step-current"
                      : isReached
                        ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
                        : "bg-[var(--surface-1)] border-[var(--surface-3)] text-[var(--surface-3)]"
                  }`}>
                    {isReached ? (isCurrent ? <conf.icon size={16} /> : <CheckCircle2 size={16} />) : idx + 1}
                  </div>
                  <span className={`mt-2 text-[11px] font-semibold text-center leading-tight ${
                    isCurrent ? "text-[var(--primary)]" : isReached ? "text-[var(--text-primary)]" : "text-[var(--neutral-gray)]"
                  }`}>
                    {conf.label}
                  </span>
                  {dateVal && (
                    <span className="mt-0.5 text-[10px] text-[var(--neutral-gray)]">{formatDate(dateVal)}</span>
                  )}
                </div>
              );
            })}
          </div>
          {isCancelled && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--error-light)]">
              <XCircle size={14} className="text-[var(--error-dark)]" />
              <span className="text-xs font-semibold text-[var(--error-dark)]">This placement was cancelled</span>
            </div>
          )}
        </div>
      </div>

      {/* Content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Party cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Candidate */}
            <div className="pd-section pd-card pd-card-accent p-6" style={stagger(3)} onMouseMove={cardGlow}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center"><User size={15} className="text-[var(--primary)]" /></span>
                  Candidate
                </h4>
                <Link href={`/admin/candidates/${placement.candidateId}`} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors">
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="flex items-center gap-3 mb-3">
                {placement.candidate?.photoUrl ? (
                  <img src={placement.candidate.photoUrl} alt={candidateName} className="w-12 h-12 rounded-xl object-cover border border-[var(--border)]" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--primary)]">{candidateName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{candidateName}</p>
                  {placement.candidate?.primaryTrack && <p className="text-xs text-[var(--neutral-gray)]">{placement.candidate.primaryTrack.name}</p>}
                </div>
              </div>
              {placement.candidate && (
                <div className="text-xs space-y-1.5 pt-3 border-t border-[var(--border)]">
                  {(placement.candidate.city || placement.candidate.country) && (
                    <div className="flex items-center gap-2 text-[var(--neutral-gray)]">
                      <MapPin size={11} />
                      {[placement.candidate.city, placement.candidate.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {placement.candidate.approvalStatus && (
                    <div className="flex items-center gap-2">
                      <Shield size={11} className="text-[var(--neutral-gray)]" />
                      <span className={`font-semibold ${placement.candidate.approvalStatus === "approved" ? "text-[var(--success-dark)]" : "text-[var(--neutral-gray)]"}`}>
                        {placement.candidate.approvalStatus.charAt(0).toUpperCase() + placement.candidate.approvalStatus.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Employer */}
            <div className="pd-section pd-card pd-card-accent p-6" style={stagger(4)} onMouseMove={cardGlow}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[var(--accent-orange)]/10 flex items-center justify-center"><Building2 size={15} className="text-[var(--accent-orange)]" /></span>
                  Employer
                </h4>
                <Link href={`/admin/employers/${placement.employerId}`} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors">
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="flex items-center gap-3 mb-3">
                {placement.employer?.logoUrl ? (
                  <img src={placement.employer.logoUrl} alt={companyName} className="w-12 h-12 rounded-xl object-cover border border-[var(--border)]" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-orange)]/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--accent-orange)]">{companyName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{companyName}</p>
                  {placement.employer?.sector && <p className="text-xs text-[var(--neutral-gray)]">{placement.employer.sector}</p>}
                </div>
              </div>
              {placement.employer && (
                <div className="text-xs space-y-1.5 pt-3 border-t border-[var(--border)]">
                  {(placement.employer.locationHq || placement.employer.country) && (
                    <div className="flex items-center gap-2 text-[var(--neutral-gray)]">
                      <MapPin size={11} />
                      {[placement.employer.locationHq, placement.employer.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {placement.employer.verificationStatus && (
                    <div className="flex items-center gap-2">
                      <Shield size={11} className="text-[var(--neutral-gray)]" />
                      <span className={`font-semibold ${placement.employer.verificationStatus === "verified" ? "text-[var(--success-dark)]" : "text-[var(--neutral-gray)]"}`}>
                        {placement.employer.verificationStatus.charAt(0).toUpperCase() + placement.employer.verificationStatus.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabbed Section */}
          <div className="pd-section pd-card" style={stagger(5)} onMouseMove={cardGlow}>
            <div className="flex border-b border-[var(--border)]">
              {([
                { id: "notes" as const, label: "Notes & Outcome", icon: MessageSquare },
                { id: "documents" as const, label: "Documents", icon: File },
                { id: "activity" as const, label: "Activity Log", icon: MessageCircle },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id ? "text-[var(--primary)]" : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="detail-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]"
                      transition={{ type: "spring", damping: 30, stiffness: 500 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === "notes" && (
                  <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
                    <div>
                      <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                        <FileText size={15} className="text-[var(--primary)]" />
                        Outcome Notes
                      </label>
                      <textarea
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                        placeholder="Record notes and outcomes for this placement..."
                        rows={6}
                        className="w-full px-4 py-3 border-[1.5px] border-[var(--border)] rounded-xl text-sm bg-[var(--surface-1)] resize-none transition-all duration-300 placeholder:text-[var(--surface-4)] focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/8 leading-relaxed"
                      />
                    </div>
                    <div className="pd-no-print flex justify-end">
                      <button onClick={handleSaveNotes} disabled={updatePlacement.isPending} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--secondary)] disabled:opacity-60 transition-colors">
                        {updatePlacement.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Notes
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === "documents" && (
                  <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Attached Documents</p>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors">
                        <Upload size={12} />
                        Upload
                      </button>
                    </div>
                    <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center">
                      <File size={32} className="mx-auto text-[var(--surface-3)] mb-3" />
                      <p className="text-sm font-medium text-[var(--neutral-gray)]">No documents attached</p>
                      <p className="text-xs text-[var(--surface-4)] mt-1">Upload contracts, agreements, or other relevant files</p>
                    </div>
                  </motion.div>
                )}

                {activeTab === "activity" && (
                  <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Communication Log</p>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors">
                        <Plus size={12} />
                        Add Note
                      </button>
                    </div>
                    <div className="space-y-0">
                      {[
                        { date: placement.createdAt, label: "Placement created", type: "system" },
                        placement.introDate ? { date: placement.introDate, label: "Moved to In Discussion", type: "status" } : null,
                        placement.interviewDate ? { date: placement.interviewDate, label: "Moved to Interviewing", type: "status" } : null,
                        placement.offerDate ? { date: placement.offerDate, label: "Offer extended", type: "status" } : null,
                        placement.placedDate ? { date: placement.placedDate, label: "Candidate placed", type: "success" } : null,
                        placement.completedDate ? { date: placement.completedDate, label: "Placement completed", type: "success" } : null,
                      ].filter(Boolean).reverse().map((event, idx, arr) => (
                        <div key={idx} className="flex gap-3 py-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              event!.type === "success" ? "bg-[var(--success)]" : event!.type === "status" ? "bg-[var(--primary)]" : "bg-[var(--surface-3)]"
                            }`} />
                            {idx < arr.length - 1 && <div className="flex-1 w-px bg-[var(--border)] mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{event!.label}</p>
                            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">{formatDateTime(event!.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Milestone Timeline */}
          <div className="pd-section pd-card p-6" style={stagger(6)} onMouseMove={cardGlow}>
            <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center"><Timer size={15} className="text-[var(--primary)]" /></span>
              Milestone Timeline
            </h4>
            <div className="space-y-3">
              {[
                { label: "Created", date: placement.createdAt },
                { label: "Introduction", date: placement.introDate },
                { label: "Interview", date: placement.interviewDate },
                { label: "Offer", date: placement.offerDate },
                { label: "Start Date", date: placement.startDate },
                { label: "Placed", date: placement.placedDate },
                { label: "End Date", date: placement.endDate },
                { label: "Completed", date: placement.completedDate },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-4">
                  <div className="w-28 flex-shrink-0">
                    <p className="text-xs font-semibold text-[var(--neutral-gray)]">{m.label}</p>
                  </div>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <div className="w-32 flex-shrink-0 text-right">
                    {m.date ? (
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{formatDate(m.date)}</span>
                    ) : (
                      <span className="text-xs text-[var(--surface-3)]">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-5">
          {/* Placement Info */}
          <div className="pd-section pd-card p-5 space-y-4" style={stagger(3)} onMouseMove={cardGlow}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60">Placement Info</h4>
            <div className="space-y-3">
              {jobTitle && <InfoRow label="Job Title" value={jobTitle} icon={<Briefcase size={13} className="text-[var(--primary)]" />} />}
              <InfoRow label="Type" value={placement.placementType ? placementTypeLabels[placement.placementType] || placement.placementType : "N/A"} icon={<FileText size={13} className="text-[var(--neutral-gray)]" />} />
              {placement.salaryRange && <InfoRow label="Salary Range" value={placement.salaryRange} icon={<DollarSign size={13} className="text-[var(--success)]" />} />}
              {placement.managedBy && <InfoRow label="Managed By" value={placement.managedBy} icon={<User size={13} className="text-[var(--neutral-gray)]" />} />}
            </div>
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              {placement.introRequestId && (
                <Link href={`/admin/intro-requests/${placement.introRequestId}`} className="flex items-center justify-between w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-colors group">
                  <span className="flex items-center gap-1.5"><Link2 size={13} /> Intro Request</span>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}
              {placement.jobId && (
                <Link href={`/admin/jobs/${placement.jobId}`} className="flex items-center justify-between w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-colors group">
                  <span className="flex items-center gap-1.5"><Briefcase size={13} /> Job Posting</span>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}
            </div>
          </div>

          {/* Key Dates */}
          <div className="pd-section pd-card p-5 space-y-3" style={stagger(4)} onMouseMove={cardGlow}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-1">Key Dates</h4>
            {[
              { label: "Start Date", date: placement.startDate, icon: <Calendar size={13} className="text-[var(--primary)]" /> },
              { label: "End Date", date: placement.endDate, icon: <Calendar size={13} className="text-[var(--neutral-gray)]" /> },
              { label: "Created", date: placement.createdAt, icon: <Clock size={13} className="text-[var(--neutral-gray)]" /> },
              { label: "Last Updated", date: placement.updatedAt, icon: <Clock size={13} className="text-[var(--neutral-gray)]" /> },
            ].filter((d) => d.date).map((d) => (
              <div key={d.label} className="flex items-center gap-3 text-sm">
                <span className="w-7 h-7 rounded-lg bg-[var(--surface-1)] flex items-center justify-center flex-shrink-0">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">{d.label}</p>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{formatDate(d.date)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stage Milestones */}
          <div className="pd-section pd-card p-5 space-y-3" style={stagger(5)} onMouseMove={cardGlow}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-1">Stage Milestones</h4>
            {[
              { label: "Intro", date: placement.introDate },
              { label: "Interview", date: placement.interviewDate },
              { label: "Offer", date: placement.offerDate },
              { label: "Placed", date: placement.placedDate },
              { label: "Completed", date: placement.completedDate },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-[var(--neutral-gray)] font-medium text-xs">{item.label}</span>
                <span className={`text-xs font-semibold ${item.date ? "text-[var(--text-primary)]" : "text-[var(--surface-3)]"}`}>{formatDate(item.date)}</span>
              </div>
            ))}
          </div>

          {/* Revenue Tracking */}
          <div className="pd-section pd-card p-5 space-y-3" style={stagger(6)} onMouseMove={cardGlow}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-1 flex items-center gap-2">
              <TrendingUp size={12} />
              Revenue Tracking
            </h4>
            <div className="space-y-3">
              {[
                { label: "Expected Fee", value: "Not set" },
                { label: "Invoiced", value: "N/A" },
                { label: "Paid", value: "N/A" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--neutral-gray)]">{r.label}</span>
                  <span className="text-xs font-semibold text-[var(--surface-3)]">{r.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] text-[var(--surface-4)] italic">Revenue tracking available for placed candidates</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
