"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building2,
  User,
  Briefcase,
  Clock,
  Calendar,
  MapPin,
  Monitor,
  MessageSquare,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
  ChevronRight,
  ArrowUpRight,
  Shield,
  Handshake,
  Phone,
  Globe,
  ArrowRight,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { IntroRequest } from "@/types/intro-request";
import {
  useApproveIntroRequest,
  useDeclineIntroRequest,
  useRequestInfoIntroRequest,
} from "@/hooks/use-admin";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════════════════
   Scoped Styles
   ═══════════════════════════════════════════════════════════════════════════ */

const STYLE_ID = "admin-intro-request-detail-styles";

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes ir-fadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes ir-scaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes ir-slideRight {
        from { opacity: 0; transform: translateX(-14px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes ir-shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes ir-borderGlow {
        0%   { background-position: 0% 0%; }
        100% { background-position: 200% 0%; }
      }
      @keyframes ir-statusPulse {
        0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color, rgba(245,158,11,0.3)); }
        50%      { box-shadow: 0 0 0 6px var(--pulse-color, rgba(245,158,11,0)); }
      }
      @keyframes ir-modalOverlay {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes ir-modalPanel {
        from { opacity: 0; transform: scale(0.95) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes ir-connectPulse {
        0%, 100% { opacity: 0.4; }
        50%      { opacity: 1; }
      }

      .ir-section { animation: ir-fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .ir-slide-right { animation: ir-slideRight 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .ir-scale-in { animation: ir-scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .ir-card {
        position: relative;
        background: var(--surface-0);
        border: 1px solid var(--border);
        border-radius: 20px;
        overflow: hidden;
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ir-card::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: inherit;
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
        background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(30,77,183,0.025), transparent 40%);
      }
      .ir-card:hover::before { opacity: 1; }
      .ir-card:hover {
        border-color: rgba(30,77,183,0.08);
        box-shadow: 0 6px 32px -10px rgba(30,77,183,0.08);
      }

      .ir-card-accent::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--primary), var(--info), var(--primary));
        background-size: 200% 100%;
        border-radius: 20px 20px 0 0;
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      .ir-card:hover::after,
      .ir-card:focus-within::after {
        opacity: 1;
        animation: ir-borderGlow 3s linear infinite;
      }

      .ir-btn-approve {
        position: relative; overflow: hidden;
        background: linear-gradient(135deg, var(--success) 0%, var(--success-dark) 100%);
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ir-btn-approve:hover:not(:disabled) {
        box-shadow: 0 8px 24px -4px rgba(16,185,129,0.4);
        transform: translateY(-1px);
      }
      .ir-btn-approve::after {
        content: '';
        position: absolute; top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
      }
      .ir-btn-approve:hover::after { left: 100%; }

      .ir-btn-decline { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .ir-btn-decline:hover {
        background: var(--error-light);
        border-color: var(--error);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -2px rgba(239,68,68,0.2);
      }

      .ir-status-pending {
        --pulse-color: rgba(245,158,11,0.3);
        animation: ir-statusPulse 2s ease-in-out infinite;
      }

      .ir-skeleton {
        background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-1) 40%, var(--surface-2) 80%);
        background-size: 200% 100%;
        animation: ir-shimmer 1.8s ease-in-out infinite;
        border-radius: 12px;
      }

      .ir-modal-overlay { animation: ir-modalOverlay 0.2s ease both; }
      .ir-modal-panel { animation: ir-modalPanel 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .ir-connect-dot {
        animation: ir-connectPulse 2s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .ir-section, .ir-slide-right, .ir-scale-in,
        .ir-modal-overlay, .ir-modal-panel, .ir-connect-dot {
          animation: none !important; opacity: 1 !important; transform: none !important;
        }
        .ir-card, .ir-btn-approve, .ir-btn-decline {
          transition: none !important;
        }
      }

      @media print {
        .ir-no-print { display: none !important; }
        .ir-card { border: 1px solid #ddd !important; box-shadow: none !important; border-radius: 8px !important; }
        .ir-section { animation: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(STYLE_ID)?.remove(); };
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

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

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string | null | undefined) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const workModeLabels: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};

/* ═══════════════════════════════════════════════════════════════════════════
   Config
   ═══════════════════════════════════════════════════════════════════════════ */

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; pulse?: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-dark)]",
    dot: "bg-[var(--warning)]",
    pulse: "ir-status-pending",
  },
  approved: {
    label: "Approved",
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-dark)]",
    dot: "bg-[var(--success)]",
  },
  declined: {
    label: "Declined",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error)]",
  },
  completed: {
    label: "Completed",
    bg: "bg-[var(--primary)]/10",
    text: "text-[var(--primary)]",
    dot: "bg-[var(--primary)]",
  },
  more_info_needed: {
    label: "More Info Needed",
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-dark)]",
    dot: "bg-[var(--warning)]",
  },
  scheduled: {
    label: "Scheduled",
    bg: "bg-[var(--info-light,var(--surface-2))]",
    text: "text-[var(--info,var(--primary))]",
    dot: "bg-[var(--info,var(--primary))]",
  },
};

const candidateResponseConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  accepted: { label: "Accepted", bg: "bg-[var(--success-light)]", text: "text-[var(--success-dark)]" },
  declined: { label: "Declined", bg: "bg-[var(--error-light)]", text: "text-[var(--error-dark)]" },
  pending: { label: "Pending", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton / Error
   ═══════════════════════════════════════════════════════════════════════════ */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <div className="ir-skeleton h-4 w-12" />
        <div className="ir-skeleton h-4 w-4" />
        <div className="ir-skeleton h-4 w-28" />
        <div className="ir-skeleton h-4 w-4" />
        <div className="ir-skeleton h-4 w-24" />
      </div>
      <div className="ir-skeleton h-[160px] w-full" style={{ borderRadius: 20 }} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ir-skeleton h-[220px]" style={{ borderRadius: 20 }} />
        <div className="ir-skeleton h-[220px]" style={{ borderRadius: 20 }} />
        <div className="ir-skeleton h-[220px]" style={{ borderRadius: 20 }} />
      </div>
      <div className="ir-skeleton h-[200px] w-full" style={{ borderRadius: 20 }} />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ir-section">
      <div className="ir-card p-14 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--error-light)] flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-[var(--error)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Failed to load intro request</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/admin/intro-requests"
            className="px-5 py-2.5 border border-[var(--border)] text-[var(--neutral-gray)] rounded-xl text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
          >
            Back to List
          </Link>
          <button
            onClick={onRetry}
            className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Decline Modal
   ═══════════════════════════════════════════════════════════════════════════ */

function DeclineModal({
  open,
  onClose,
  onDecline,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onDecline: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ir-modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="ir-modal-panel relative bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[var(--error)] to-[var(--accent-red)]" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[var(--error-light)] flex items-center justify-center">
                <XCircle size={18} className="text-[var(--error)]" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Decline Intro Request</h2>
                <p className="text-xs text-[var(--neutral-gray)]">This will notify the employer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-all duration-200 group"
              aria-label="Close"
            >
              <X size={16} className="transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Reason for declining (optional)
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for declining this intro request..."
              rows={4}
              className="w-full px-4 py-3 border-[1.5px] border-[var(--border)] rounded-xl text-sm bg-[var(--surface-1)] resize-none transition-all duration-300 placeholder:text-[var(--surface-4)] focus:outline-none focus:border-[var(--error)] focus:ring-4 focus:ring-[var(--error)]/8 leading-relaxed"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onDecline(reason)}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--error)] text-white rounded-xl text-sm font-bold hover:bg-[var(--error-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              {isPending ? "Declining..." : "Decline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AdminIntroRequestDetailPage() {
  useInjectStyles();
  const cardGlow = useCardGlow();

  const params = useParams();
  const introRequestId = params.id as string;
  const queryClient = useQueryClient();

  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────

  const {
    data: introRequest,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-intro-request", introRequestId],
    queryFn: () =>
      apiClient.get<IntroRequest>(`/admin/intro-requests/${introRequestId}`),
    enabled: !!introRequestId,
  });

  // ── Mutations ────────────────────────────────────────────────────

  const approveMutation = useApproveIntroRequest();
  const declineMutation = useDeclineIntroRequest();
  const requestInfoMutation = useRequestInfoIntroRequest();

  const handleApprove = () => {
    approveMutation.mutate(introRequestId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-intro-request", introRequestId] });
        toast.success("Intro request approved.");
      },
      onError: (err: Error) => toast.error(err.message || "Failed to approve intro request."),
    });
  };

  const handleDecline = (reason: string) => {
    declineMutation.mutate(
      { id: introRequestId, reason: reason || undefined },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["admin-intro-request", introRequestId] });
          setShowDeclineModal(false);
          toast.success("Intro request declined.");
        },
        onError: (err: Error) => toast.error(err.message || "Failed to decline intro request."),
      },
    );
  };

  const handleRequestInfo = () => {
    requestInfoMutation.mutate(introRequestId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-intro-request", introRequestId] });
        toast.success("More information requested from employer.");
      },
      onError: (err: Error) => toast.error(err.message || "Failed to request more info."),
    });
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        window.location.href = "/admin/intro-requests";
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── States ───────────────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  if (error || !introRequest) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );
  }

  const statusConf = statusConfig[introRequest.status] ?? statusConfig.pending;
  const isPending = introRequest.status === "pending";
  const isMoreInfoNeeded = introRequest.status === "more_info_needed";
  const canTakeAction = isPending || isMoreInfoNeeded;

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb ─────────────────────────────────────────── */}
      <nav className="ir-section flex items-center gap-1.5 text-sm" style={stagger(0, 60)}>
        <Link href="/admin" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">
          Admin
        </Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <Link href="/admin/intro-requests" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">
          Intro Requests
        </Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <span className="text-[var(--text-primary)] font-semibold truncate max-w-[260px]">
          {introRequest.roleTitle}
        </span>
      </nav>

      {/* ─── Hero Header ───────────────────────────────────────── */}
      <div
        className="ir-section ir-card overflow-hidden"
        style={stagger(1)}
        onMouseMove={cardGlow}
      >
        <div className="h-24 bg-gradient-to-r from-[var(--primary)] via-[var(--info)] to-[var(--primary)]/80 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMCAwaDJ2Mmgt MnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

          {/* Actions on banner */}
          {canTakeAction && (
            <div className="ir-no-print absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="ir-btn-approve flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 relative z-10"
              >
                {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                className="ir-btn-decline flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-[var(--surface-1)]/10"
              >
                <XCircle size={14} /> Decline
              </button>
              <button
                onClick={handleRequestInfo}
                disabled={requestInfoMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-[var(--surface-1)]/10 transition-colors disabled:opacity-60"
              >
                {requestInfoMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
                Request Info
              </button>
            </div>
          )}
        </div>

        <div className="px-7 pb-6 -mt-8 relative">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 rounded-2xl border-4 border-[var(--surface-0)] shadow-lg bg-[var(--surface-1)] flex items-center justify-center flex-shrink-0">
              <Handshake size={24} className="text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight truncate">
                  {introRequest.roleTitle}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${statusConf.bg} ${statusConf.text} ${statusConf.pulse || ""}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                  {statusConf.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-[var(--neutral-gray)] font-medium">
                <span>Intro Request</span>
                <span className="opacity-30">|</span>
                <code className="text-xs bg-[var(--surface-2)] px-2 py-0.5 rounded-md font-mono">
                  {introRequest.id.slice(0, 8)}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Three-Panel: Employer — Connection — Candidate ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Employer Panel */}
        <div
          className="ir-section ir-card ir-card-accent p-6"
          style={stagger(2)}
          onMouseMove={cardGlow}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[var(--accent-orange)]/10 flex items-center justify-center">
                <Building2 size={15} className="text-[var(--accent-orange)]" />
              </span>
              Employer
            </h3>
            {introRequest.employer && (
              <Link
                href={`/admin/employers/${introRequest.employerId}`}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
              >
                <ArrowUpRight size={14} />
              </Link>
            )}
          </div>

          {introRequest.employer ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {introRequest.employer.logoUrl ? (
                  <img
                    src={introRequest.employer.logoUrl}
                    alt={introRequest.employer.companyName}
                    className="w-12 h-12 rounded-xl object-cover border border-[var(--border)]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-orange)]/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--accent-orange)]">
                      {introRequest.employer.companyName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{introRequest.employer.companyName}</p>
                  {introRequest.employer.sector && (
                    <p className="text-xs text-[var(--neutral-gray)]">{introRequest.employer.sector}</p>
                  )}
                </div>
              </div>

              <div className="text-xs space-y-2 pt-3 border-t border-[var(--border)]">
                {introRequest.employer.verificationStatus && (
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-[var(--neutral-gray)]" />
                    <span className={`font-semibold ${introRequest.employer.verificationStatus === "verified" ? "text-[var(--success-dark)]" : "text-[var(--neutral-gray)]"}`}>
                      {introRequest.employer.verificationStatus.charAt(0).toUpperCase() + introRequest.employer.verificationStatus.slice(1)}
                    </span>
                  </div>
                )}
                {(introRequest.employer.locationHq || introRequest.employer.country) && (
                  <div className="flex items-center gap-2 text-[var(--neutral-gray)]">
                    <MapPin size={12} />
                    {[introRequest.employer.locationHq, introRequest.employer.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {introRequest.employer.websiteUrl && (
                  <a
                    href={introRequest.employer.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[var(--primary)] hover:underline"
                  >
                    <Globe size={12} /> Website
                  </a>
                )}
              </div>

              {introRequest.employer.employerUsers && introRequest.employer.employerUsers.length > 0 && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-2">Contact</p>
                  {introRequest.employer.employerUsers.map((eu) => (
                    <div key={eu.id} className="text-xs">
                      <p className="font-semibold text-[var(--text-primary)]">{eu.contactName}</p>
                      {eu.roleTitle && <p className="text-[var(--neutral-gray)]">{eu.roleTitle}</p>}
                      {eu.phone && (
                        <p className="text-[var(--neutral-gray)] flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {eu.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[var(--neutral-gray)]">
              <p>Employer ID: {introRequest.employerId}</p>
            </div>
          )}
        </div>

        {/* Connection Panel (center) */}
        <div
          className="ir-section ir-card p-6 flex flex-col"
          style={stagger(3)}
          onMouseMove={cardGlow}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center">
              <Handshake size={15} className="text-[var(--primary)]" />
            </span>
            Connection Details
          </h3>

          <div className="space-y-4 flex-1">
            {/* Visual connection */}
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-orange)]/10 flex items-center justify-center">
                <Building2 size={16} className="text-[var(--accent-orange)]" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 rounded-full bg-[var(--border)] ir-connect-dot" style={{ animationDelay: "0ms" }} />
                <div className="w-3 h-0.5 rounded-full bg-[var(--border)] ir-connect-dot" style={{ animationDelay: "200ms" }} />
                <div className="w-3 h-0.5 rounded-full bg-[var(--border)] ir-connect-dot" style={{ animationDelay: "400ms" }} />
                <ArrowRight size={14} className="text-[var(--primary)] mx-1" />
                <div className="w-3 h-0.5 rounded-full bg-[var(--border)] ir-connect-dot" style={{ animationDelay: "600ms" }} />
                <div className="w-3 h-0.5 rounded-full bg-[var(--border)] ir-connect-dot" style={{ animationDelay: "800ms" }} />
                <div className="w-3 h-0.5 rounded-full bg-[var(--border)] ir-connect-dot" style={{ animationDelay: "1000ms" }} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 flex items-center justify-center">
                <User size={16} className="text-[var(--primary)]" />
              </div>
            </div>

            {/* Role details */}
            <div className="space-y-3">
              {introRequest.roleDescription && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Role Description</p>
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed bg-[var(--surface-1)] rounded-xl p-3">
                    {introRequest.roleDescription}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {introRequest.workMode && (
                  <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)] p-2 rounded-lg bg-[var(--surface-1)]">
                    <Monitor size={13} className="flex-shrink-0 text-[var(--primary)]" />
                    <span className="font-medium">{workModeLabels[introRequest.workMode] ?? introRequest.workMode}</span>
                  </div>
                )}
                {introRequest.locationExpectation && (
                  <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)] p-2 rounded-lg bg-[var(--surface-1)]">
                    <MapPin size={13} className="flex-shrink-0 text-[var(--primary)]" />
                    <span className="font-medium">{introRequest.locationExpectation}</span>
                  </div>
                )}
                {introRequest.desiredStartDate && (
                  <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)] p-2 rounded-lg bg-[var(--surface-1)]">
                    <Calendar size={13} className="flex-shrink-0 text-[var(--primary)]" />
                    <span className="font-medium">Start: {formatShortDate(introRequest.desiredStartDate)}</span>
                  </div>
                )}
              </div>

              {introRequest.notesToPlacementUnit && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Employer Notes</p>
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed bg-[var(--surface-1)] rounded-xl p-3">
                    {introRequest.notesToPlacementUnit}
                  </p>
                </div>
              )}
            </div>

            {/* Candidate response */}
            {introRequest.candidateResponse && (
              <div className="pt-3 border-t border-[var(--border)]">
                <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1.5">Candidate Response</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${(candidateResponseConfig[introRequest.candidateResponse] ?? candidateResponseConfig.pending).bg} ${(candidateResponseConfig[introRequest.candidateResponse] ?? candidateResponseConfig.pending).text}`}>
                    {(candidateResponseConfig[introRequest.candidateResponse] ?? candidateResponseConfig.pending).label}
                  </span>
                  {introRequest.candidateRespondedAt && (
                    <span className="text-[10px] text-[var(--neutral-gray)]">
                      {formatShortDate(introRequest.candidateRespondedAt)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Candidate Panel */}
        <div
          className="ir-section ir-card ir-card-accent p-6"
          style={stagger(4)}
          onMouseMove={cardGlow}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center">
                <User size={15} className="text-[var(--primary)]" />
              </span>
              Candidate
            </h3>
            {introRequest.candidate && (
              <Link
                href={`/admin/candidates/${introRequest.candidateId}`}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
              >
                <ArrowUpRight size={14} />
              </Link>
            )}
          </div>

          {introRequest.candidate ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {introRequest.candidate.photoUrl ? (
                  <img
                    src={introRequest.candidate.photoUrl}
                    alt={introRequest.candidate.fullName}
                    className="w-12 h-12 rounded-xl object-cover border border-[var(--border)]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--primary)]">
                      {introRequest.candidate.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{introRequest.candidate.fullName}</p>
                  {introRequest.candidate.primaryTrack && (
                    <p className="text-xs text-[var(--neutral-gray)]">{introRequest.candidate.primaryTrack.name}</p>
                  )}
                </div>
              </div>

              <div className="text-xs space-y-2 pt-3 border-t border-[var(--border)]">
                {(introRequest.candidate.city || introRequest.candidate.country) && (
                  <div className="flex items-center gap-2 text-[var(--neutral-gray)]">
                    <MapPin size={12} />
                    {[introRequest.candidate.city, introRequest.candidate.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {introRequest.candidate.contactEmail && (
                  <div className="flex items-center gap-2 text-[var(--neutral-gray)]">
                    <MessageSquare size={12} />
                    {introRequest.candidate.contactEmail}
                  </div>
                )}
                {introRequest.candidate.yearsOfExperience != null && (
                  <div className="flex items-center gap-2 text-[var(--neutral-gray)]">
                    <Briefcase size={12} />
                    {introRequest.candidate.yearsOfExperience} yr{introRequest.candidate.yearsOfExperience !== 1 ? "s" : ""} experience
                  </div>
                )}
                {introRequest.candidate.approvalStatus && (
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-[var(--neutral-gray)]" />
                    <span className={`font-semibold ${introRequest.candidate.approvalStatus === "approved" ? "text-[var(--success-dark)]" : "text-[var(--neutral-gray)]"}`}>
                      {introRequest.candidate.approvalStatus.charAt(0).toUpperCase() + introRequest.candidate.approvalStatus.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--neutral-gray)]">
              <p>Candidate ID: {introRequest.candidateId}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Timeline & Notes Row ──────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Timeline */}
        <div
          className="ir-section ir-card p-6 flex-1"
          style={stagger(5)}
          onMouseMove={cardGlow}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/8 flex items-center justify-center">
              <Clock size={15} className="text-[var(--primary)]" />
            </span>
            Timeline
          </h3>
          <div className="space-y-3">
            {[
              { label: "Created", date: introRequest.createdAt, icon: <Calendar size={13} /> },
              { label: "Last Updated", date: introRequest.updatedAt, icon: <Clock size={13} /> },
              { label: "Handled At", date: introRequest.handledAt, icon: <CheckCircle2 size={13} /> },
              { label: "Candidate Responded", date: introRequest.candidateRespondedAt, icon: <User size={13} /> },
            ]
              .filter((d) => d.date)
              .map((d, idx) => (
                <div key={d.label} className="ir-section flex items-center gap-3" style={stagger(idx, 60)}>
                  <span className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center text-[var(--neutral-gray)] flex-shrink-0">
                    {d.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{d.label}</p>
                    <p className="text-[11px] text-[var(--neutral-gray)]">{formatDate(d.date)}</p>
                  </div>
                </div>
              ))}
            {introRequest.handledBy && (
              <div className="ir-section flex items-center gap-3" style={stagger(4, 60)}>
                <span className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center text-[var(--neutral-gray)] flex-shrink-0">
                  <Shield size={13} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Handled By</p>
                  <p className="text-[11px] text-[var(--neutral-gray)]">{introRequest.handledBy}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Decline Reason / Admin Notes */}
        <div className="flex-1 space-y-5">
          {introRequest.declineReason && (
            <div
              className="ir-scale-in ir-card p-6 border-[var(--error)]/20"
              style={stagger(5)}
            >
              <h3 className="text-sm font-bold text-[var(--error)] flex items-center gap-2 mb-3">
                <XCircle size={16} /> Decline Reason
              </h3>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed bg-[var(--error-light)] rounded-xl p-4">
                {introRequest.declineReason}
              </p>
            </div>
          )}

          {introRequest.adminNotes && (
            <div
              className="ir-section ir-card p-6"
              style={stagger(6)}
              onMouseMove={cardGlow}
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                <FileText size={16} className="text-[var(--primary)]" /> Admin Notes
              </h3>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed bg-[var(--surface-1)] rounded-xl p-4">
                {introRequest.adminNotes}
              </p>
            </div>
          )}

          {!introRequest.declineReason && !introRequest.adminNotes && (
            <div
              className="ir-section ir-card p-8 text-center"
              style={stagger(6)}
              onMouseMove={cardGlow}
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">
                <FileText size={20} className="text-[var(--surface-4)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--neutral-gray)]">No notes yet</p>
              <p className="text-xs text-[var(--neutral-gray)]/60 mt-1">Admin notes and decline reasons will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Decline Modal ─────────────────────────────────────── */}
      <DeclineModal
        open={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        onDecline={handleDecline}
        isPending={declineMutation.isPending}
      />
    </div>
  );
}
