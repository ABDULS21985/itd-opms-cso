"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  Ban,
  Globe,
  MapPin,
  Mail,
  Phone,
  Users,
  Briefcase,
  ExternalLink,
  AlertCircle,
  X,
  Loader2,
  History,
  Eye,
  Shield,
  ArrowUpRight,
  FileText,
  Handshake,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EmployerOrg, EmployerUser } from "@/types/employer";
import { EmployerVerificationStatus } from "@/types/employer";
import type { JobPost } from "@/types/job";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════════════════
   Scoped Styles
   ═══════════════════════════════════════════════════════════════════════════ */

const STYLE_ID = "admin-employer-detail-styles";

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes ed-fadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes ed-scaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes ed-slideRight {
        from { opacity: 0; transform: translateX(-14px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes ed-shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes ed-borderGlow {
        0%   { background-position: 0% 0%; }
        100% { background-position: 200% 0%; }
      }
      @keyframes ed-countPop {
        0%   { transform: scale(0.6); opacity: 0; }
        60%  { transform: scale(1.08); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes ed-statusPulse {
        0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color, rgba(245,158,11,0.3)); }
        50%      { box-shadow: 0 0 0 6px var(--pulse-color, rgba(245,158,11,0)); }
      }
      @keyframes ed-timelineDot {
        from { opacity: 0; transform: scale(0); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes ed-modalOverlay {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes ed-modalPanel {
        from { opacity: 0; transform: scale(0.95) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes ed-emptyFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50%      { transform: translateY(-6px) rotate(2deg); }
      }

      .ed-section { animation: ed-fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .ed-slide-right { animation: ed-slideRight 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .ed-scale-in { animation: ed-scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .ed-count-pop { animation: ed-countPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      .ed-empty-float { animation: ed-emptyFloat 5s ease-in-out infinite; }

      .ed-card {
        position: relative;
        background: var(--surface-0);
        border: 1px solid var(--border);
        border-radius: 20px;
        overflow: hidden;
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ed-card::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: inherit;
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
        background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(30,77,183,0.025), transparent 40%);
      }
      .ed-card:hover::before { opacity: 1; }
      .ed-card:hover {
        border-color: rgba(30,77,183,0.08);
        box-shadow: 0 6px 32px -10px rgba(30,77,183,0.08);
      }

      .ed-card-accent::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--accent-orange), var(--primary), var(--accent-orange));
        background-size: 200% 100%;
        border-radius: 20px 20px 0 0;
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      .ed-card:hover::after,
      .ed-card:focus-within::after {
        opacity: 1;
        animation: ed-borderGlow 3s linear infinite;
      }

      .ed-row { position: relative; transition: all 0.2s ease; }
      .ed-row::before {
        content: '';
        position: absolute; left: 0; top: 0; bottom: 0;
        width: 3px;
        background: var(--primary);
        border-radius: 0 2px 2px 0;
        transform: scaleY(0);
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ed-row:hover { background: var(--surface-1); }
      .ed-row:hover::before { transform: scaleY(0.55); }

      .ed-btn-verify {
        position: relative; overflow: hidden;
        background: linear-gradient(135deg, var(--success) 0%, var(--success-dark) 100%);
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ed-btn-verify:hover:not(:disabled) {
        box-shadow: 0 8px 24px -4px rgba(16,185,129,0.4);
        transform: translateY(-1px);
      }
      .ed-btn-verify:active:not(:disabled) { transform: translateY(0); }
      .ed-btn-verify::after {
        content: '';
        position: absolute; top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
      }
      .ed-btn-verify:hover::after { left: 100%; }

      .ed-btn-reject { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .ed-btn-reject:hover {
        background: var(--error-light);
        border-color: var(--error);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -2px rgba(239,68,68,0.2);
      }

      .ed-btn-suspend { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .ed-btn-suspend:hover {
        background: var(--surface-2);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -4px rgba(0,0,0,0.08);
      }

      .ed-status-pending {
        --pulse-color: rgba(245,158,11,0.3);
        animation: ed-statusPulse 2s ease-in-out infinite;
      }
      .ed-status-verified { --pulse-color: rgba(16,185,129,0.3); }

      .ed-stat { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .ed-stat:hover { transform: translateY(-3px); box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08); }

      .ed-timeline-dot { animation: ed-timelineDot 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      .ed-timeline-line { background: linear-gradient(to bottom, var(--border), transparent); }

      .ed-modal-overlay { animation: ed-modalOverlay 0.2s ease both; }
      .ed-modal-panel { animation: ed-modalPanel 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .ed-action { transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
      .ed-action:hover { transform: translateY(-1px); }

      .ed-skeleton {
        background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-1) 40%, var(--surface-2) 80%);
        background-size: 200% 100%;
        animation: ed-shimmer 1.8s ease-in-out infinite;
        border-radius: 12px;
      }

      .ed-info-field { transition: all 0.2s ease; }
      .ed-info-field:hover { background: var(--surface-1); border-color: var(--border); }

      .ed-tab-btn {
        position: relative;
        padding: 0.625rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 0.75rem;
        transition: all 0.2s ease;
        color: var(--neutral-gray);
      }
      .ed-tab-btn:hover { color: var(--primary); background: var(--surface-1); }
      .ed-tab-btn[data-active="true"] {
        color: var(--primary);
        background: rgba(30,77,183,0.06);
      }
      .ed-tab-btn[data-active="true"]::after {
        content: '';
        position: absolute;
        bottom: -1px; left: 25%; right: 25%;
        height: 2px;
        background: var(--primary);
        border-radius: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .ed-section, .ed-slide-right, .ed-scale-in, .ed-count-pop,
        .ed-empty-float, .ed-modal-overlay, .ed-modal-panel, .ed-timeline-dot {
          animation: none !important; opacity: 1 !important; transform: none !important;
        }
        .ed-card, .ed-row, .ed-btn-verify, .ed-btn-reject,
        .ed-btn-suspend, .ed-stat, .ed-action, .ed-info-field {
          transition: none !important;
        }
      }

      @media print {
        .ed-no-print { display: none !important; }
        .ed-card { border: 1px solid #ddd !important; box-shadow: none !important; border-radius: 8px !important; }
        .ed-section { animation: none !important; }
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

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Config
   ═══════════════════════════════════════════════════════════════════════════ */

interface AuditEntry {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details: string | null;
}

const verificationStatusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; pulse?: string }
> = {
  [EmployerVerificationStatus.PENDING]: {
    label: "Pending",
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-dark)]",
    dot: "bg-[var(--warning)]",
    pulse: "ed-status-pending",
  },
  [EmployerVerificationStatus.VERIFIED]: {
    label: "Verified",
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-dark)]",
    dot: "bg-[var(--success)]",
    pulse: "ed-status-verified",
  },
  [EmployerVerificationStatus.REJECTED]: {
    label: "Rejected",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error)]",
  },
  [EmployerVerificationStatus.SUSPENDED]: {
    label: "Suspended",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error)]",
  },
};

type TabKey = "overview" | "jobs" | "team" | "activity";
const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Building2 size={15} /> },
  { key: "jobs", label: "Jobs", icon: <Briefcase size={15} /> },
  { key: "team", label: "Team", icon: <Users size={15} /> },
  { key: "activity", label: "Activity", icon: <History size={15} /> },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════════════ */

function StatCard({
  icon,
  value,
  label,
  accentVar,
  index,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  accentVar: string;
  index: number;
}) {
  return (
    <div
      className="ed-stat ed-section flex items-center gap-3.5 flex-1 p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
      style={stagger(index, 100)}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${accentVar} 10%, transparent)`,
          color: accentVar,
        }}
      >
        {icon}
      </span>
      <div>
        <p className="ed-count-pop text-xl font-bold text-[var(--text-primary)] tracking-tight leading-none">
          {value}
        </p>
        <p className="text-xs font-medium text-[var(--neutral-gray)] mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
  href,
  index,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  index: number;
}) {
  const content = (
    <div
      className="ed-info-field ed-section flex items-start gap-3 p-4 rounded-2xl bg-[var(--surface-1)] border border-transparent"
      style={stagger(index, 50)}
    >
      <span className="mt-0.5 w-9 h-9 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]/70 mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug break-words">
          {value}
        </p>
      </div>
      {href && (
        <ArrowUpRight size={14} className="text-[var(--primary)] flex-shrink-0 mt-1" />
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:no-underline">
        {content}
      </a>
    );
  }
  return content;
}

function TimelineEntry({
  entry,
  isLast,
  index,
}: {
  entry: AuditEntry;
  isLast: boolean;
  index: number;
}) {
  return (
    <div
      className="ed-section relative flex gap-4 pb-6 last:pb-0"
      style={stagger(index, 80)}
    >
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px ed-timeline-line" />
      )}
      <div className="relative z-10 flex-shrink-0 mt-1">
        <span className="ed-timeline-dot block w-[9px] h-[9px] rounded-full bg-[var(--primary)] ring-[3px] ring-[var(--primary)]/15" />
      </div>
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
              {entry.action}
            </p>
            {entry.details && (
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5 leading-relaxed">
                {entry.details}
              </p>
            )}
            <p className="text-[11px] font-medium text-[var(--neutral-gray)]/60 mt-1">
              by {entry.performedBy}
            </p>
          </div>
          <span className="text-[11px] font-medium text-[var(--neutral-gray)]/60 whitespace-nowrap pt-0.5">
            {new Date(entry.performedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, sub }: { icon: ReactNode; message: string; sub?: string }) {
  return (
    <div className="p-12 text-center">
      <div className="ed-empty-float w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[var(--neutral-gray)]">{message}</p>
      {sub && <p className="text-xs text-[var(--neutral-gray)]/60 mt-1">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton / Error
   ═══════════════════════════════════════════════════════════════════════════ */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <div className="ed-skeleton h-4 w-12" />
        <div className="ed-skeleton h-4 w-4" />
        <div className="ed-skeleton h-4 w-20" />
        <div className="ed-skeleton h-4 w-4" />
        <div className="ed-skeleton h-4 w-40" />
      </div>
      <div className="ed-skeleton h-[180px] w-full" style={{ borderRadius: 20 }} />
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="ed-skeleton h-12 w-full" style={{ borderRadius: 12 }} />
          <div className="ed-skeleton h-[320px] w-full" style={{ borderRadius: 20 }} />
        </div>
        <div className="hidden lg:block w-80 space-y-4">
          <div className="ed-skeleton h-[200px] w-full" style={{ borderRadius: 20 }} />
          <div className="ed-skeleton h-[180px] w-full" style={{ borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ed-section">
      <div className="ed-card p-14 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--error-light)] flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-[var(--error)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Failed to load employer</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reject Modal
   ═══════════════════════════════════════════════════════════════════════════ */

function RejectModal({
  open,
  onClose,
  onReject,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
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
      <div className="ed-modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="ed-modal-panel relative bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[var(--error)] to-[var(--accent-red)]" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[var(--error-light)] flex items-center justify-center">
                <XCircle size={18} className="text-[var(--error)]" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Reject Employer</h2>
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
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] mb-2">
              Reason for rejection
              <span className="text-[10px] font-bold text-[var(--error)] bg-[var(--error-light)] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                Required
              </span>
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this employer is being rejected..."
              rows={4}
              className="w-full px-4 py-3 border-[1.5px] border-[var(--border)] rounded-xl text-sm bg-[var(--surface-1)] resize-none transition-all duration-300 placeholder:text-[var(--surface-4)] focus:outline-none focus:border-[var(--error)] focus:ring-4 focus:ring-[var(--error)]/8 leading-relaxed"
            />
            {reason.trim() && (
              <p className="text-[11px] text-[var(--neutral-gray)] mt-1.5 text-right font-medium">
                {reason.trim().split(/\s+/).length} words
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onReject(reason)}
              disabled={!reason.trim() || isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--error)] text-white rounded-xl text-sm font-bold hover:bg-[var(--error-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              {isPending ? "Rejecting..." : "Reject"}
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

export default function AdminEmployerDetailPage() {
  useInjectStyles();
  const cardGlow = useCardGlow();

  const params = useParams();
  const employerId = params.id as string;
  const queryClient = useQueryClient();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // ── Data fetching ────────────────────────────────────────────────

  const {
    data: employer,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-employer", employerId],
    queryFn: () => apiClient.get<EmployerOrg>(`/admin/employers/${employerId}`),
    enabled: !!employerId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ["admin-employer-jobs", employerId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobPost>>(`/admin/employers/${employerId}/jobs`),
    enabled: !!employerId,
  });

  const { data: auditHistory } = useQuery({
    queryKey: ["admin-employer-audit", employerId],
    queryFn: () =>
      apiClient.get<AuditEntry[]>(`/admin/employers/${employerId}/audit`),
    enabled: !!employerId,
  });

  // ── Mutations ────────────────────────────────────────────────────

  const verifyEmployer = useMutation({
    mutationFn: () => apiClient.post(`/admin/employers/${employerId}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employer", employerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-employer-audit", employerId] });
      toast.success("Employer verified!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectEmployer = useMutation({
    mutationFn: (reason: string) =>
      apiClient.post(`/admin/employers/${employerId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employer", employerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-employer-audit", employerId] });
      setShowRejectModal(false);
      toast.success("Employer rejected.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const suspendEmployer = useMutation({
    mutationFn: () => apiClient.post(`/admin/employers/${employerId}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employer", employerId] });
      toast.success("Employer suspended.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Keyboard shortcuts ───────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        window.location.href = "/admin/employers";
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── States ───────────────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  if (error || !employer) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );
  }

  const statusConf =
    verificationStatusConfig[employer.verificationStatus] ||
    verificationStatusConfig[EmployerVerificationStatus.PENDING];
  const teamMembers: EmployerUser[] = employer.employerUsers || [];
  const jobs: JobPost[] = (jobsData as any)?.data || [];
  const auditEntries: AuditEntry[] = Array.isArray(auditHistory) ? auditHistory : [];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb ─────────────────────────────────────────── */}
      <nav className="ed-section flex items-center gap-1.5 text-sm" style={stagger(0, 60)}>
        <Link href="/admin" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">
          Admin
        </Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <Link href="/admin/employers" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">
          Employers
        </Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <span className="text-[var(--text-primary)] font-semibold truncate max-w-[260px]">
          {employer.companyName}
        </span>
      </nav>

      {/* ─── Hero Header ───────────────────────────────────────── */}
      <div
        className="ed-section ed-card overflow-hidden"
        style={stagger(1)}
        onMouseMove={cardGlow}
      >
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-r from-[var(--accent-orange)] via-[var(--primary)] to-[var(--accent-orange)]/80 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMCAwaDJ2Mmgt MnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

          {/* Action buttons on banner */}
          <div className="ed-no-print absolute top-4 right-4 flex items-center gap-2">
            {(employer.verificationStatus === EmployerVerificationStatus.PENDING ||
              employer.verificationStatus === EmployerVerificationStatus.REJECTED) && (
              <button
                onClick={() => verifyEmployer.mutate()}
                disabled={verifyEmployer.isPending}
                className="ed-btn-verify flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 relative z-10"
              >
                {verifyEmployer.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Verify
              </button>
            )}
            {employer.verificationStatus !== EmployerVerificationStatus.REJECTED && (
              <button
                onClick={() => setShowRejectModal(true)}
                className="ed-btn-reject flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-[var(--surface-1)]/10"
              >
                <XCircle size={14} /> Reject
              </button>
            )}
            {employer.verificationStatus !== EmployerVerificationStatus.SUSPENDED && (
              <button
                onClick={() => suspendEmployer.mutate()}
                disabled={suspendEmployer.isPending}
                className="flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-[var(--surface-1)]/10 transition-colors"
              >
                {suspendEmployer.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Ban size={14} />
                )}
                Suspend
              </button>
            )}
          </div>
        </div>

        {/* Employer info overlay */}
        <div className="px-7 pb-6 -mt-10 relative">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-[var(--surface-0)] shadow-lg bg-[var(--surface-1)] flex items-center justify-center flex-shrink-0">
              {employer.logoUrl ? (
                <img
                  src={employer.logoUrl}
                  alt={employer.companyName}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/15 to-[var(--accent-red)]/8 flex items-center justify-center">
                  <Building2 size={28} className="text-[var(--accent-orange)]" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 mt-12">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight truncate">
                  {employer.companyName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${statusConf.bg} ${statusConf.text} ${statusConf.pulse || ""}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                  {statusConf.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-[var(--neutral-gray)] font-medium">
                {employer.sector && (
                  <span>{employer.sector}</span>
                )}
                {(employer.locationHq || employer.country) && (
                  <>
                    <span className="opacity-30">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {[employer.locationHq, employer.country].filter(Boolean).join(", ")}
                    </span>
                  </>
                )}
                <span className="opacity-30">|</span>
                <code className="text-xs bg-[var(--surface-2)] px-2 py-0.5 rounded-md font-mono">
                  {employer.id.slice(0, 8)}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab bar + Content/Sidebar ──────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Tabs + Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Tab bar */}
          <div className="ed-section flex items-center gap-1 bg-[var(--surface-1)] rounded-2xl p-1.5" style={stagger(2)}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className="ed-tab-btn flex items-center gap-1.5"
                data-active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
                {tab.key === "jobs" && jobs.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                    {jobs.length}
                  </span>
                )}
                {tab.key === "team" && teamMembers.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                    {teamMembers.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ─── Overview Tab ──────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Info grid */}
              <div
                className="ed-section ed-card ed-card-accent p-6"
                style={stagger(3)}
                onMouseMove={cardGlow}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {employer.websiteUrl && (
                    <InfoField icon={<Globe size={16} />} label="Website" value={employer.websiteUrl} href={employer.websiteUrl} index={0} />
                  )}
                  {(employer.locationHq || employer.country) && (
                    <InfoField icon={<MapPin size={16} />} label="Headquarters" value={[employer.locationHq, employer.country].filter(Boolean).join(", ")} index={1} />
                  )}
                  <InfoField icon={<Handshake size={16} />} label="Intro Requests" value={`${employer.totalRequests ?? 0} total`} index={2} />
                  <InfoField icon={<TrendingUp size={16} />} label="Placements" value={`${employer.totalPlacements ?? 0} total`} index={3} />
                </div>
              </div>

              {/* Description */}
              {employer.description && (
                <div
                  className="ed-section ed-card p-7"
                  style={stagger(4)}
                  onMouseMove={cardGlow}
                >
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2.5 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[var(--primary)]" />
                    About
                  </h4>
                  <p className="text-sm text-[var(--neutral-gray)] leading-[1.75] whitespace-pre-wrap">
                    {employer.description}
                  </p>
                </div>
              )}

              {/* Hiring preferences */}
              {((employer.hiringTracks && employer.hiringTracks.length > 0) ||
                (employer.hiringWorkModes && employer.hiringWorkModes.length > 0)) && (
                <div
                  className="ed-section ed-card p-7 space-y-4"
                  style={stagger(5)}
                  onMouseMove={cardGlow}
                >
                  {employer.hiringTracks && employer.hiringTracks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-2">
                        Hiring Tracks
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {employer.hiringTracks.map((track) => (
                          <span
                            key={track}
                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold bg-[var(--primary)]/8 text-[var(--primary)] border border-[var(--primary)]/10"
                          >
                            {track}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {employer.hiringWorkModes && employer.hiringWorkModes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-2">
                        Work Modes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {employer.hiringWorkModes.map((mode) => (
                          <span
                            key={mode}
                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                          >
                            {mode.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection reason */}
              {employer.rejectionReason && (
                <div className="ed-scale-in flex items-start gap-3 p-4 rounded-2xl bg-[var(--error-light)] border border-[var(--error)]/10">
                  <AlertCircle size={16} className="text-[var(--error)] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[var(--error-dark)] uppercase tracking-wider mb-0.5">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-[var(--error-dark)] leading-relaxed">
                      {employer.rejectionReason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Jobs Tab ──────────────────────────────────── */}
          {activeTab === "jobs" && (
            <div
              className="ed-section ed-card ed-card-accent"
              style={stagger(3)}
              onMouseMove={cardGlow}
            >
              <div className="flex items-center gap-3 p-6 border-b border-[var(--border)]">
                <span className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center">
                  <Briefcase size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Job Postings</h3>
                  <p className="text-xs text-[var(--neutral-gray)] font-medium">{jobs.length} total</p>
                </div>
              </div>

              {jobs.length === 0 ? (
                <EmptyState
                  icon={<Briefcase size={24} className="text-[var(--surface-4)]" />}
                  message="No job postings yet"
                  sub="Jobs will appear here when the employer creates them"
                />
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {jobs.map((job, idx) => (
                    <div
                      key={job.id}
                      className="ed-row ed-section flex items-center justify-between p-4 px-6"
                      style={stagger(idx, 45)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{job.title}</p>
                        <div className="flex items-center gap-2.5 mt-1 text-xs text-[var(--neutral-gray)] font-medium">
                          {job.jobType && (
                            <span className="inline-flex items-center gap-1 bg-[var(--surface-2)] px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                              {job.jobType.replace("_", " ")}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin size={10} className="text-[var(--surface-4)]" />
                              {job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Users size={10} className="text-[var(--surface-4)]" />
                            {job.applicationCount} applications
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            job.status === "published"
                              ? "bg-[var(--success-light)] text-[var(--success-dark)]"
                              : job.status === "draft"
                                ? "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                                : "bg-[var(--warning-light)] text-[var(--warning-dark)]"
                          }`}
                        >
                          {job.status}
                        </span>
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="ed-action p-2 rounded-xl hover:bg-[var(--primary)]/6 text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors group"
                          title="View job"
                        >
                          <Eye size={14} className="transition-transform duration-200 group-hover:scale-110" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Team Tab ──────────────────────────────────── */}
          {activeTab === "team" && (
            <div
              className="ed-section ed-card ed-card-accent"
              style={stagger(3)}
              onMouseMove={cardGlow}
            >
              <div className="flex items-center gap-3 p-6 border-b border-[var(--border)]">
                <span className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center">
                  <Users size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Team Members</h3>
                  <p className="text-xs text-[var(--neutral-gray)] font-medium">{teamMembers.length} people</p>
                </div>
              </div>

              {teamMembers.length === 0 ? (
                <EmptyState
                  icon={<Users size={24} className="text-[var(--surface-4)]" />}
                  message="No team members"
                  sub="Team members will appear here once added"
                />
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={member.id}
                      className="ed-row ed-section flex items-center justify-between p-4 px-6"
                      style={stagger(idx, 50)}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/12 to-[var(--accent-red)]/6 flex items-center justify-center shadow-sm">
                          <span className="text-sm font-bold text-[var(--accent-orange)]">
                            {initials(member.contactName)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{member.contactName}</p>
                          <p className="text-xs text-[var(--neutral-gray)] mt-0.5 font-medium flex items-center gap-1.5">
                            {member.roleTitle || member.role}
                            {member.phone && (
                              <>
                                <span className="opacity-30">|</span>
                                <span className="flex items-center gap-0.5">
                                  <Phone size={9} className="text-[var(--surface-4)]" />
                                  {member.phone}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-2)] text-[var(--neutral-gray)]">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Activity Tab ──────────────────────────────── */}
          {activeTab === "activity" && (
            <div
              className="ed-section ed-card ed-card-accent"
              style={stagger(3)}
              onMouseMove={cardGlow}
            >
              <div className="flex items-center gap-3 p-6 border-b border-[var(--border)]">
                <span className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center">
                  <History size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Audit History</h3>
                  <p className="text-xs text-[var(--neutral-gray)] font-medium">{auditEntries.length} entries</p>
                </div>
              </div>

              {auditEntries.length === 0 ? (
                <EmptyState
                  icon={<History size={24} className="text-[var(--surface-4)]" />}
                  message="No audit entries"
                  sub="Actions taken on this employer will be recorded here"
                />
              ) : (
                <div className="p-6 pl-8">
                  {auditEntries.map((entry, idx) => (
                    <TimelineEntry
                      key={entry.id}
                      entry={entry}
                      isLast={idx === auditEntries.length - 1}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-5">
          {/* Verification Status */}
          <div
            className="ed-section ed-card p-5"
            style={stagger(2)}
            onMouseMove={cardGlow}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-3">
              Verification
            </h4>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  employer.verificationStatus === EmployerVerificationStatus.VERIFIED
                    ? "bg-[var(--success-light)]"
                    : employer.verificationStatus === EmployerVerificationStatus.PENDING
                      ? "bg-[var(--warning-light)]"
                      : "bg-[var(--error-light)]"
                }`}
              >
                {employer.verificationStatus === EmployerVerificationStatus.VERIFIED ? (
                  <Shield size={22} className="text-[var(--success)]" />
                ) : employer.verificationStatus === EmployerVerificationStatus.PENDING ? (
                  <Clock size={22} className="text-[var(--warning)]" />
                ) : (
                  <AlertCircle size={22} className="text-[var(--error)]" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{statusConf.label}</p>
                <p className="text-xs text-[var(--neutral-gray)]">
                  {employer.verificationStatus === EmployerVerificationStatus.VERIFIED
                    ? "This employer is verified"
                    : employer.verificationStatus === EmployerVerificationStatus.PENDING
                      ? "Awaiting review"
                      : "Verification not approved"}
                </p>
              </div>
            </div>
            {employer.verifiedAt && (
              <p className="text-xs text-[var(--neutral-gray)] border-t border-[var(--border)] pt-2">
                Verified on{" "}
                {new Date(employer.verifiedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div
            className="ed-section ed-card p-5 space-y-3"
            style={stagger(3)}
            onMouseMove={cardGlow}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-1">
              Quick Stats
            </h4>
            <div className="space-y-2">
              <StatCard icon={<Handshake size={16} />} value={employer.totalRequests ?? 0} label="Intro Requests" accentVar="var(--primary)" index={0} />
              <StatCard icon={<TrendingUp size={16} />} value={employer.totalPlacements ?? 0} label="Placements" accentVar="var(--success)" index={1} />
              <StatCard icon={<Briefcase size={16} />} value={jobs.length} label="Job Postings" accentVar="var(--accent-orange)" index={2} />
              <StatCard icon={<Users size={16} />} value={teamMembers.length} label="Team Members" accentVar="var(--info)" index={3} />
            </div>
          </div>

          {/* Key Dates */}
          <div
            className="ed-section ed-card p-5 space-y-3"
            style={stagger(4)}
            onMouseMove={cardGlow}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-1">
              Key Dates
            </h4>
            {[
              { label: "Registered", date: employer.createdAt },
              { label: "Verified", date: employer.verifiedAt },
              { label: "Last Updated", date: employer.updatedAt },
            ]
              .filter((d) => d.date)
              .map((d) => (
                <div key={d.label} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--neutral-gray)] font-medium">{d.label}</span>
                  <span className="text-[var(--text-primary)] font-semibold text-xs">
                    {new Date(d.date!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
          </div>
        </aside>
      </div>

      {/* ─── Reject Modal ──────────────────────────────────────── */}
      <RejectModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={(reason) => rejectEmployer.mutate(reason)}
        isPending={rejectEmployer.isPending}
      />
    </div>
  );
}
