"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Briefcase,
  MapPin,
  Monitor,
  DollarSign,
  Calendar,
  Clock,
  Users,
  Eye,
  Building2,
  AlertCircle,
  X,
  Loader2,
  History,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  Shield,
  Sparkles,
  Star,
  ArrowUpRight,
  GraduationCap,
  Globe,
  Zap,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { JobPost, JobApplication } from "@/types/job";
import { JobStatus, ApplicationStatus } from "@/types/job";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════════════════
   Inject Scoped Styles (brand-aligned keyframes & utilities)
   ═══════════════════════════════════════════════════════════════════════════ */

const STYLE_ID = "admin-job-detail-styles";

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes jd-fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes jd-fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes jd-scaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes jd-slideRight {
        from { opacity: 0; transform: translateX(-16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes jd-statusPulse {
        0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color, rgba(30,77,183,0.3)); }
        50%      { box-shadow: 0 0 0 6px var(--pulse-color, rgba(30,77,183,0)); }
      }
      @keyframes jd-shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes jd-borderGlow {
        0%   { background-position: 0% 0%; }
        100% { background-position: 200% 0%; }
      }
      @keyframes jd-countUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes jd-timelineDot {
        from { opacity: 0; transform: scale(0); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes jd-modalOverlay {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes jd-modalPanel {
        from { opacity: 0; transform: scale(0.95) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }

      .jd-section { animation: jd-fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .jd-slide-right { animation: jd-slideRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .jd-scale-in { animation: jd-scaleIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .jd-count-up { animation: jd-countUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .jd-card {
        position: relative;
        background: var(--surface-0);
        border: 1px solid var(--border);
        border-radius: 20px;
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        overflow: hidden;
      }
      .jd-card::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: inherit;
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
        background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(30,77,183,0.03), transparent 40%);
      }
      .jd-card:hover::before { opacity: 1; }
      .jd-card:hover {
        border-color: rgba(30,77,183,0.1);
        box-shadow: 0 8px 40px -12px rgba(30,77,183,0.1), 0 2px 8px -2px rgba(0,0,0,0.03);
      }

      .jd-card-accent { position: relative; }
      .jd-card-accent::after {
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
      .jd-card-accent:hover::after,
      .jd-card-accent:focus-within::after {
        opacity: 1;
        animation: jd-borderGlow 3s linear infinite;
      }

      .jd-row { transition: all 0.2s ease; position: relative; }
      .jd-row::before {
        content: '';
        position: absolute; left: 0; top: 50%;
        transform: translateY(-50%);
        width: 3px; height: 0;
        background: var(--primary);
        border-radius: 0 2px 2px 0;
        transition: height 0.2s ease;
      }
      .jd-row:hover { background: var(--surface-1); }
      .jd-row:hover::before { height: 55%; }

      .jd-btn-approve {
        position: relative; overflow: hidden;
        background: linear-gradient(135deg, var(--success) 0%, var(--success-dark) 100%);
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .jd-btn-approve:hover:not(:disabled) {
        box-shadow: 0 8px 24px -4px rgba(16,185,129,0.4);
        transform: translateY(-1px);
      }
      .jd-btn-approve:active:not(:disabled) { transform: translateY(0); }
      .jd-btn-approve::after {
        content: '';
        position: absolute; top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
      }
      .jd-btn-approve:hover::after { left: 100%; }

      .jd-btn-reject { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .jd-btn-reject:hover {
        background: var(--error-light);
        border-color: var(--error);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -2px rgba(239,68,68,0.2);
      }

      .jd-back { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .jd-back:hover {
        background: rgba(30,77,183,0.06);
        color: var(--primary);
        transform: translateX(-2px);
      }

      .jd-stat { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .jd-stat:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08);
      }

      .jd-status-live {
        --pulse-color: rgba(16,185,129,0.3);
        animation: jd-statusPulse 2s ease-in-out infinite;
      }
      .jd-status-pending {
        --pulse-color: rgba(245,158,11,0.3);
        animation: jd-statusPulse 2s ease-in-out infinite;
      }

      .jd-skill { transition: all 0.2s ease; }
      .jd-skill:hover { transform: translateY(-1px); box-shadow: 0 4px 8px -2px rgba(0,0,0,0.06); }

      .jd-timeline-dot { animation: jd-timelineDot 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      .jd-timeline-line { background: linear-gradient(to bottom, var(--border), transparent); }

      .jd-modal-overlay { animation: jd-modalOverlay 0.2s ease both; }
      .jd-modal-panel { animation: jd-modalPanel 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .jd-skeleton {
        background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-1) 40%, var(--surface-2) 80%);
        background-size: 200% 100%;
        animation: jd-shimmer 1.8s ease-in-out infinite;
        border-radius: 12px;
      }

      .jd-tab-btn {
        position: relative;
        padding: 0.625rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 0.75rem;
        transition: all 0.2s ease;
        color: var(--neutral-gray);
      }
      .jd-tab-btn:hover { color: var(--primary); background: var(--surface-1); }
      .jd-tab-btn[data-active="true"] {
        color: var(--primary);
        background: rgba(30,77,183,0.06);
      }
      .jd-tab-btn[data-active="true"]::after {
        content: '';
        position: absolute;
        bottom: -1px; left: 25%; right: 25%;
        height: 2px;
        background: var(--primary);
        border-radius: 2px;
      }

      .jd-employer-banner { position: relative; transition: all 0.3s ease; }
      .jd-employer-banner::before {
        content: '';
        position: absolute; left: 0; top: 0; bottom: 0;
        width: 4px;
        border-radius: 20px 0 0 20px;
        background: linear-gradient(to bottom, var(--accent-orange), var(--accent-red));
        opacity: 0.7;
        transition: opacity 0.3s ease;
      }
      .jd-employer-banner:hover::before { opacity: 1; }
      .jd-employer-banner:hover { box-shadow: 0 4px 20px -6px rgba(245,154,35,0.15); }

      @media (prefers-reduced-motion: reduce) {
        .jd-section, .jd-slide-right, .jd-scale-in, .jd-count-up,
        .jd-modal-overlay, .jd-modal-panel, .jd-timeline-dot {
          animation: none !important; opacity: 1 !important; transform: none !important;
        }
        .jd-card, .jd-row, .jd-stat, .jd-skill, .jd-btn-approve, .jd-btn-reject, .jd-back {
          transition: none !important;
        }
      }

      @media print {
        .jd-no-print { display: none !important; }
        .jd-card { border: 1px solid #ddd !important; box-shadow: none !important; border-radius: 8px !important; }
        .jd-section { animation: none !important; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById(STYLE_ID);
      el?.remove();
    };
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function staggerDelay(index: number, base = 80) {
  return { animationDelay: `${index * base}ms` };
}

function useCardGlow() {
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);
  return onMouseMove;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Types & Config
   ═══════════════════════════════════════════════════════════════════════════ */

interface AuditEntry {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details: string | null;
}

const jobStatusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; pulse?: string }
> = {
  [JobStatus.DRAFT]: {
    label: "Draft",
    bg: "bg-[var(--surface-2)]",
    text: "text-[var(--neutral-gray)]",
    dot: "bg-[var(--neutral-gray)]",
  },
  [JobStatus.PENDING_REVIEW]: {
    label: "Pending Review",
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-dark)]",
    dot: "bg-[var(--warning)]",
    pulse: "jd-status-pending",
  },
  [JobStatus.PUBLISHED]: {
    label: "Published",
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-dark)]",
    dot: "bg-[var(--success)]",
    pulse: "jd-status-live",
  },
  [JobStatus.CLOSED]: {
    label: "Closed",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error)]",
  },
  [JobStatus.ARCHIVED]: {
    label: "Archived",
    bg: "bg-[var(--surface-2)]",
    text: "text-[var(--neutral-gray)]",
    dot: "bg-[var(--surface-4)]",
  },
  [JobStatus.REJECTED]: {
    label: "Rejected",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error)]",
  },
};

type TabKey = "details" | "applications" | "activity";
const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "details", label: "Details", icon: <FileText size={15} /> },
  { key: "applications", label: "Applications", icon: <Users size={15} /> },
  { key: "activity", label: "Activity", icon: <History size={15} /> },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════════════ */

function MetaField({
  icon,
  label,
  value,
  index = 0,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  index?: number;
}) {
  return (
    <div
      className="jd-section flex items-start gap-3 p-4 rounded-2xl bg-[var(--surface-1)] border border-transparent hover:border-[var(--border)] transition-all duration-200"
      style={staggerDelay(index, 60)}
    >
      <span className="mt-0.5 w-9 h-9 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]/70 mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  index = 0,
  accentVar,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  index?: number;
  accentVar?: string;
}) {
  return (
    <div
      className="jd-stat jd-section flex-1 flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
      style={staggerDelay(index, 100)}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${accentVar || "var(--primary)"} 10%, transparent)`,
          color: accentVar || "var(--primary)",
        }}
      >
        {icon}
      </span>
      <div>
        <p className="jd-count-up text-xl font-bold text-[var(--text-primary)] tracking-tight leading-none">
          {value}
        </p>
        <p className="text-xs font-medium text-[var(--neutral-gray)] mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
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
      className="jd-section relative flex gap-4 pb-6 last:pb-0"
      style={staggerDelay(index, 80)}
    >
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px jd-timeline-line" />
      )}
      <div className="relative z-10 flex-shrink-0 mt-1">
        <span className="jd-timeline-dot block w-[9px] h-[9px] rounded-full bg-[var(--primary)] ring-[3px] ring-[var(--primary)]/15" />
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

/** Content quality score ring */
function QualityScore({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "var(--success)"
      : score >= 50
        ? "var(--warning)"
        : "var(--error)";

  return (
    <div className="flex items-center gap-3">
      <svg width="68" height="68" viewBox="0 0 68 68" className="flex-shrink-0">
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="5"
        />
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 34 34)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <text
          x="34"
          y="36"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="var(--foreground, #171717)"
        >
          {score}
        </text>
      </svg>
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)]">Content Quality</p>
        <p className="text-[11px] text-[var(--neutral-gray)]">
          {score >= 80 ? "Excellent" : score >= 50 ? "Good" : "Needs improvement"}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton Loader
   ═══════════════════════════════════════════════════════════════════════════ */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <div className="jd-skeleton h-4 w-12" />
        <div className="jd-skeleton h-4 w-4" />
        <div className="jd-skeleton h-4 w-16" />
        <div className="jd-skeleton h-4 w-4" />
        <div className="jd-skeleton h-4 w-40" />
      </div>
      <div className="jd-skeleton h-[180px] w-full" style={{ borderRadius: 20 }} />
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="jd-skeleton h-12 w-full" style={{ borderRadius: 12 }} />
          <div className="jd-skeleton h-[420px] w-full" style={{ borderRadius: 20 }} />
        </div>
        <div className="hidden lg:block w-80 space-y-4">
          <div className="jd-skeleton h-[200px] w-full" style={{ borderRadius: 20 }} />
          <div className="jd-skeleton h-[180px] w-full" style={{ borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Error State
   ═══════════════════════════════════════════════════════════════════════════ */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="jd-section">
      <div className="jd-card p-14 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--error-light)] flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-[var(--error)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">
          Failed to load job
        </h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">
          {message}
        </p>
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
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="jd-modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="jd-modal-panel relative bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[var(--error)] to-[var(--accent-red)]" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[var(--error-light)] flex items-center justify-center">
                <XCircle size={18} className="text-[var(--error)]" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Reject Job Posting
                </h2>
                <p className="text-xs text-[var(--neutral-gray)]">
                  This action will notify the employer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-all duration-200 group"
              aria-label="Close"
            >
              <X
                size={16}
                className="transition-transform duration-200 group-hover:rotate-90"
              />
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
              placeholder="Explain why this job posting is being rejected..."
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
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--error)] text-white rounded-xl text-sm font-bold hover:bg-[var(--error-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
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

export default function AdminJobDetailPage() {
  useInjectStyles();

  const params = useParams();
  const jobId = params.id as string;
  const queryClient = useQueryClient();
  const cardGlow = useCardGlow();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  // ── Data fetching ────────────────────────────────────────────────

  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-job", jobId],
    queryFn: () => apiClient.get<JobPost>(`/admin/jobs/${jobId}`),
    enabled: !!jobId,
  });

  const { data: applicationsData } = useQuery({
    queryKey: ["admin-job-applications", jobId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobApplication>>(
        `/admin/jobs/${jobId}/applications`,
      ),
    enabled: !!jobId,
  });

  const { data: auditHistory } = useQuery({
    queryKey: ["admin-job-audit", jobId],
    queryFn: () => apiClient.get<AuditEntry[]>(`/admin/jobs/${jobId}/audit`),
    enabled: !!jobId,
  });

  // ── Mutations ────────────────────────────────────────────────────

  const approveJob = useMutation({
    mutationFn: () => apiClient.post(`/admin/jobs/${jobId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["admin-job-audit", jobId] });
      toast.success("Job approved and published!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectJob = useMutation({
    mutationFn: (reason: string) =>
      apiClient.post(`/admin/jobs/${jobId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["admin-job-audit", jobId] });
      setShowRejectModal(false);
      toast.success("Job rejected.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Keyboard shortcuts ───────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        window.location.href = "/admin/jobs";
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── States ───────────────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  if (error || !job) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );
  }

  const statusConf = jobStatusConfig[job.status] || jobStatusConfig[JobStatus.DRAFT];
  const applications: JobApplication[] = (applicationsData as any)?.data || [];
  const auditEntries: AuditEntry[] = Array.isArray(auditHistory) ? auditHistory : [];

  // ── Content quality scoring ──────────────────────────────────────

  let qualityScore = 0;
  if (job.title) qualityScore += 15;
  if (job.description && job.description.length > 100) qualityScore += 25;
  if (job.responsibilities) qualityScore += 15;
  if (job.jobSkills && job.jobSkills.length > 0) qualityScore += 15;
  if (job.salaryMin || job.salaryMax) qualityScore += 10;
  if (job.location) qualityScore += 5;
  if (job.experienceLevel) qualityScore += 5;
  if (job.applicationDeadline) qualityScore += 5;
  if (job.hiringProcess) qualityScore += 5;

  // ── Metadata fields ─────────────────────────────────────────────

  type MetaItem = { icon: ReactNode; label: string; value: string };
  const metaFields: MetaItem[] = [];

  if (job.jobType) {
    metaFields.push({
      icon: <Briefcase size={16} />,
      label: "Job Type",
      value: job.jobType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  }
  if (job.workMode) {
    metaFields.push({
      icon: <Monitor size={16} />,
      label: "Work Mode",
      value: job.workMode.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  }
  if (job.location) {
    metaFields.push({
      icon: <MapPin size={16} />,
      label: "Location",
      value: job.location,
    });
  }
  if (job.salaryMin || job.salaryMax) {
    metaFields.push({
      icon: <DollarSign size={16} />,
      label: "Salary Range",
      value: `${job.salaryCurrency || ""} ${job.salaryMin?.toLocaleString() || "---"} -- ${job.salaryMax?.toLocaleString() || "---"}`,
    });
  }
  if (job.experienceLevel) {
    metaFields.push({
      icon: <GraduationCap size={16} />,
      label: "Experience",
      value: job.experienceLevel.replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  }
  if (job.applicationDeadline) {
    metaFields.push({
      icon: <Calendar size={16} />,
      label: "Deadline",
      value: new Date(job.applicationDeadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    });
  }
  if (job.timezonePreference) {
    metaFields.push({
      icon: <Globe size={16} />,
      label: "Timezone",
      value: job.timezonePreference,
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb ─────────────────────────────────────────── */}
      <nav className="jd-section flex items-center gap-1.5 text-sm" style={staggerDelay(0, 60)}>
        <Link href="/admin" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">
          Admin
        </Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <Link href="/admin/jobs" className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors font-medium">
          Jobs
        </Link>
        <ChevronRight size={14} className="text-[var(--surface-4)]" />
        <span className="text-[var(--text-primary)] font-semibold truncate max-w-[260px]">
          {job.title}
        </span>
      </nav>

      {/* ─── Hero Header ───────────────────────────────────────── */}
      <div
        className="jd-section jd-card overflow-hidden"
        style={staggerDelay(1)}
        onMouseMove={cardGlow}
      >
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-r from-[var(--primary)] via-[var(--info)] to-[var(--primary)]/80 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMCAwaDJ2Mmgt MnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

          {/* Action buttons on banner */}
          {job.status === JobStatus.PENDING_REVIEW && (
            <div className="jd-no-print absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => approveJob.mutate()}
                disabled={approveJob.isPending}
                className="jd-btn-approve flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 relative z-10"
              >
                {approveJob.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Approve & Publish
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="jd-btn-reject flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-[var(--surface-1)]/10"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          )}
        </div>

        {/* Job info overlay */}
        <div className="px-7 pb-6 -mt-10 relative">
          <div className="flex items-start gap-4">
            {/* Employer logo */}
            <div className="w-20 h-20 rounded-2xl border-4 border-[var(--surface-0)] shadow-lg bg-[var(--surface-1)] flex items-center justify-center flex-shrink-0">
              {job.employer?.logoUrl ? (
                <img
                  src={job.employer.logoUrl}
                  alt={job.employer.companyName}
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
                  {job.title}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${statusConf.bg} ${statusConf.text} ${statusConf.pulse || ""}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                  {statusConf.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-[var(--neutral-gray)] font-medium">
                {job.employer && (
                  <Link
                    href={`/admin/employers/${job.employerId}`}
                    className="hover:text-[var(--primary)] transition-colors flex items-center gap-1.5 group"
                  >
                    <Building2 size={13} />
                    {job.employer.companyName}
                    <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}
                {job.location && (
                  <>
                    <span className="opacity-30">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {job.location}
                    </span>
                  </>
                )}
                <span className="opacity-30">|</span>
                <span className="flex items-center gap-1">
                  <code className="text-xs bg-[var(--surface-2)] px-2 py-0.5 rounded-md font-mono">
                    {job.id.slice(0, 8)}
                  </code>
                </span>
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
          <div className="jd-section flex items-center gap-1 bg-[var(--surface-1)] rounded-2xl p-1.5" style={staggerDelay(2)}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className="jd-tab-btn flex items-center gap-1.5"
                data-active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
                {tab.key === "applications" && applications.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                    {applications.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ─── Details Tab ─────────────────────────────────── */}
          {activeTab === "details" && (
            <div className="space-y-5">
              {/* Metadata grid */}
              {metaFields.length > 0 && (
                <div
                  className="jd-section jd-card jd-card-accent p-6"
                  style={staggerDelay(3)}
                  onMouseMove={cardGlow}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {metaFields.map((f, i) => (
                      <MetaField key={f.label} icon={f.icon} label={f.label} value={f.value} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div
                className="jd-section jd-card p-7 space-y-6"
                style={staggerDelay(4)}
                onMouseMove={cardGlow}
              >
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2.5 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[var(--primary)]" />
                    Description
                  </h4>
                  <p className="text-sm text-[var(--neutral-gray)] whitespace-pre-wrap leading-[1.75]">
                    {job.description}
                  </p>
                </div>

                {/* Responsibilities */}
                {job.responsibilities && (
                  <div className="pt-5 border-t border-[var(--border)]">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2.5 flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full bg-[var(--accent-orange)]" />
                      Responsibilities
                    </h4>
                    <p className="text-sm text-[var(--neutral-gray)] whitespace-pre-wrap leading-[1.75]">
                      {job.responsibilities}
                    </p>
                  </div>
                )}

                {/* Hiring Process */}
                {job.hiringProcess && (
                  <div className="pt-5 border-t border-[var(--border)]">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2.5 flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full bg-[var(--info)]" />
                      Hiring Process
                    </h4>
                    <p className="text-sm text-[var(--neutral-gray)] whitespace-pre-wrap leading-[1.75]">
                      {job.hiringProcess}
                    </p>
                  </div>
                )}
              </div>

              {/* Skills */}
              {job.jobSkills && job.jobSkills.length > 0 && (
                <div
                  className="jd-section jd-card p-7"
                  style={staggerDelay(5)}
                  onMouseMove={cardGlow}
                >
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <span className="w-10 h-10 rounded-xl bg-[var(--info)]/8 text-[var(--info)] flex items-center justify-center">
                      <Zap size={18} />
                    </span>
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.jobSkills.map((js, i) => (
                      <span
                        key={js.id}
                        className={`jd-skill jd-section inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold cursor-default ${
                          js.isRequired
                            ? "bg-[var(--primary)]/8 text-[var(--primary)] border border-[var(--primary)]/10"
                            : "bg-[var(--surface-2)] text-[var(--neutral-gray)] border border-transparent"
                        }`}
                        style={staggerDelay(i, 40)}
                      >
                        {js.isRequired && (
                          <Star size={11} className="text-[var(--primary)]/60" />
                        )}
                        {js.skill?.name || "Skill"}
                        {!js.isRequired && (
                          <span className="text-[10px] opacity-60 font-medium ml-0.5">
                            (nice to have)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Nice-to-have text skills */}
                  {job.niceToHaveSkills && job.niceToHaveSkills.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-xs font-semibold text-[var(--neutral-gray)] mb-2 uppercase tracking-wider">
                        Also nice to have
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.niceToHaveSkills.map((skill, i) => (
                          <span
                            key={skill}
                            className="jd-skill jd-section inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                            style={staggerDelay(i, 30)}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Applications Tab ────────────────────────────── */}
          {activeTab === "applications" && (
            <div
              className="jd-section jd-card jd-card-accent"
              style={staggerDelay(3)}
              onMouseMove={cardGlow}
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center">
                    <Users size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                      Applications
                    </h3>
                    <p className="text-xs text-[var(--neutral-gray)] font-medium">
                      {applications.length} total
                    </p>
                  </div>
                </div>
              </div>

              {applications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">
                    <Users size={24} className="text-[var(--surface-4)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--neutral-gray)]">
                    No applications yet
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)]/60 mt-1">
                    Applications will appear here once candidates apply
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {applications.map((app, idx) => {
                    const appStatusLabel =
                      app.status.charAt(0).toUpperCase() + app.status.slice(1);
                    return (
                      <div
                        key={app.id}
                        className="jd-row jd-section flex items-center justify-between p-4 px-6"
                        style={staggerDelay(idx, 50)}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/12 to-[var(--primary)]/5 flex items-center justify-center">
                            <span className="text-sm font-bold text-[var(--primary)]">
                              {app.candidate?.fullName?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {app.candidate?.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-[var(--neutral-gray)] mt-0.5 font-medium">
                              Applied{" "}
                              {new Date(app.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                              {app.coverNote && (
                                <span className="text-[var(--neutral-gray)]/50"> | Has cover note</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              app.status === ApplicationStatus.SHORTLISTED
                                ? "bg-[var(--success-light)] text-[var(--success-dark)]"
                                : app.status === ApplicationStatus.REJECTED
                                  ? "bg-[var(--error-light)] text-[var(--error-dark)]"
                                  : app.status === ApplicationStatus.INTERVIEW
                                    ? "bg-[var(--info-light,var(--surface-2))] text-[var(--info,var(--primary))]"
                                    : app.status === ApplicationStatus.OFFER
                                      ? "bg-[var(--success-light)] text-[var(--success)]"
                                      : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                            }`}
                          >
                            {appStatusLabel}
                          </span>
                          {app.candidate && (
                            <Link
                              href={`/admin/candidates/${app.candidateId}`}
                              className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-all duration-200 group"
                              aria-label="View candidate"
                            >
                              <Eye
                                size={14}
                                className="transition-transform duration-200 group-hover:scale-110"
                              />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Activity Tab ────────────────────────────────── */}
          {activeTab === "activity" && (
            <div
              className="jd-section jd-card jd-card-accent"
              style={staggerDelay(3)}
              onMouseMove={cardGlow}
            >
              <div className="p-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center">
                    <History size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                      Audit History
                    </h3>
                    <p className="text-xs text-[var(--neutral-gray)] font-medium">
                      Activity timeline for this job
                    </p>
                  </div>
                </div>
              </div>

              {auditEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">
                    <History size={24} className="text-[var(--surface-4)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--neutral-gray)]">
                    No audit entries
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)]/60 mt-1">
                    Actions taken on this job will be recorded here
                  </p>
                </div>
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
          {/* Employer Card */}
          {job.employer && (
            <div
              className="jd-section jd-card jd-employer-banner p-5"
              style={staggerDelay(2)}
              onMouseMove={cardGlow}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-3">
                Employer
              </h4>
              <div className="flex items-center gap-3.5 mb-4">
                {job.employer.logoUrl ? (
                  <img
                    src={job.employer.logoUrl}
                    alt={job.employer.companyName}
                    className="w-11 h-11 rounded-xl object-cover border border-[var(--border)] shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/15 to-[var(--accent-red)]/8 flex items-center justify-center shadow-sm">
                    <Building2 size={18} className="text-[var(--accent-orange)]" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {job.employer.companyName}
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)] mt-0.5 font-medium flex items-center gap-1.5">
                    {job.employer.sector || "Employer"}
                    <span className="opacity-30">|</span>
                    {job.employer.verificationStatus === "verified" ? (
                      <span className="inline-flex items-center gap-1 text-[var(--success-dark)]">
                        <Shield size={10} /> Verified
                      </span>
                    ) : (
                      <span className="text-[var(--neutral-gray)]/70">
                        Unverified
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/employers/${job.employerId}`}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-semibold text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-colors group"
              >
                View Employer
                <ArrowUpRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          )}

          {/* Stats */}
          <div
            className="jd-section jd-card p-5 space-y-3"
            style={staggerDelay(3)}
            onMouseMove={cardGlow}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-1">
              Quick Stats
            </h4>
            <div className="space-y-2">
              <StatCard icon={<Eye size={16} />} value={job.viewCount ?? 0} label="Views" index={0} accentVar="var(--info)" />
              <StatCard icon={<Users size={16} />} value={job.applicationCount ?? 0} label="Applications" index={1} accentVar="var(--primary)" />
              <StatCard
                icon={<TrendingUp size={16} />}
                value={
                  job.viewCount && job.applicationCount
                    ? `${((job.applicationCount / job.viewCount) * 100).toFixed(1)}%`
                    : "0%"
                }
                label="Conversion"
                index={2}
                accentVar="var(--success)"
              />
            </div>
          </div>

          {/* Content Quality Score */}
          <div
            className="jd-section jd-card p-5"
            style={staggerDelay(4)}
            onMouseMove={cardGlow}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-3">
              Content Quality
            </h4>
            <QualityScore score={qualityScore} />
            <div className="mt-3 space-y-1.5">
              {[
                { check: !!job.title, label: "Title" },
                { check: job.description?.length > 100, label: "Description (100+ chars)" },
                { check: !!job.responsibilities, label: "Responsibilities" },
                { check: (job.jobSkills?.length ?? 0) > 0, label: "Required skills" },
                { check: !!(job.salaryMin || job.salaryMax), label: "Salary range" },
                { check: !!job.hiringProcess, label: "Hiring process" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  {item.check ? (
                    <CheckCircle2 size={13} className="text-[var(--success)] flex-shrink-0" />
                  ) : (
                    <div className="w-[13px] h-[13px] rounded-full border-2 border-[var(--surface-3)] flex-shrink-0" />
                  )}
                  <span className={item.check ? "text-[var(--text-primary)] font-medium" : "text-[var(--neutral-gray)]"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Dates */}
          <div
            className="jd-section jd-card p-5 space-y-3"
            style={staggerDelay(5)}
            onMouseMove={cardGlow}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--neutral-gray)]/60 mb-1">
              Key Dates
            </h4>
            {[
              { label: "Created", date: job.createdAt },
              { label: "Published", date: job.publishedAt },
              { label: "Moderated", date: job.moderatedAt },
              { label: "Deadline", date: job.applicationDeadline },
              { label: "Closed", date: job.closedAt },
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
        onReject={(reason) => rejectJob.mutate(reason)}
        isPending={rejectJob.isPending}
      />
    </div>
  );
}
