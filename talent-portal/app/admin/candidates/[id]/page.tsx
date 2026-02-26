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
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ban,
  Archive,
  MapPin,
  Mail,
  Phone,
  Github,
  Linkedin,
  Globe,
  Briefcase,
  Monitor,
  Clock,
  Star,
  Eye,
  ExternalLink,
  AlertCircle,
  X,
  Save,
  Plus,
  Loader2,
  MessageSquare,
  Tag,
  History,
  User,
  Shield,
  ArrowUpRight,
  TrendingUp,
  Handshake,
  Zap,
  ChevronRight,
  FileText,
  FolderOpen,
  Languages,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import type { CandidateProfile } from "@/types/candidate";
import { ProfileApprovalStatus } from "@/types/candidate";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════════════════
   Scoped Styles — Digibit brand variables
   ═══════════════════════════════════════════════════════════════════════════ */

const STYLE_ID = "admin-candidate-detail-styles";

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes cd-fadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes cd-scaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes cd-slideRight {
        from { opacity: 0; transform: translateX(-14px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes cd-shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes cd-borderGlow {
        0%   { background-position: 0% 0%; }
        100% { background-position: 200% 0%; }
      }
      @keyframes cd-countPop {
        0%   { transform: scale(0.6); opacity: 0; }
        60%  { transform: scale(1.08); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes cd-statusPulse {
        0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color, rgba(245,158,11,0.3)); }
        50%      { box-shadow: 0 0 0 6px var(--pulse-color, rgba(245,158,11,0)); }
      }
      @keyframes cd-timelineDot {
        from { opacity: 0; transform: scale(0); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes cd-modalOverlay {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes cd-modalPanel {
        from { opacity: 0; transform: scale(0.95) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes cd-emptyFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50%      { transform: translateY(-6px) rotate(2deg); }
      }
      @keyframes cd-chipIn {
        from { opacity: 0; transform: scale(0.85); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes cd-progressFill {
        from { width: 0%; }
      }
      @keyframes cd-ringFill {
        from { stroke-dashoffset: var(--ring-circumference, 301); }
      }
      @keyframes cd-tabSlide {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .cd-section { animation: cd-fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .cd-slide-right { animation: cd-slideRight 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .cd-scale-in { animation: cd-scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .cd-count-pop { animation: cd-countPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      .cd-chip-in { animation: cd-chipIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .cd-empty-float { animation: cd-emptyFloat 5s ease-in-out infinite; }
      .cd-tab-content { animation: cd-tabSlide 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .cd-card {
        position: relative;
        background: var(--surface-0);
        border: 1px solid var(--border);
        border-radius: 20px;
        overflow: hidden;
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-card::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: inherit;
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
        background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(30,77,183,0.025), transparent 40%);
      }
      .cd-card:hover::before { opacity: 1; }
      .cd-card:hover { border-color: rgba(30,77,183,0.08); box-shadow: 0 6px 32px -10px rgba(30,77,183,0.08); }

      .cd-card-accent::after {
        content: '';
        position: absolute; top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--primary), var(--info), var(--primary));
        background-size: 200% 100%;
        border-radius: 20px 20px 0 0;
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      .cd-card:hover::after, .cd-card:focus-within::after { opacity: 1; animation: cd-borderGlow 3s linear infinite; }

      .cd-row { position: relative; transition: all 0.2s ease; }
      .cd-row::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0;
        width: 3px; background: var(--primary); border-radius: 0 2px 2px 0;
        transform: scaleY(0); transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-row:hover { background: var(--surface-1); }
      .cd-row:hover::before { transform: scaleY(0.55); }

      .cd-back { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .cd-back:hover { background: color-mix(in srgb, var(--primary) 6%, transparent); color: var(--primary); transform: translateX(-2px); }

      .cd-btn-approve {
        position: relative; overflow: hidden;
        background: linear-gradient(135deg, var(--success) 0%, var(--success-dark) 100%);
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-btn-approve:hover:not(:disabled) { box-shadow: 0 8px 24px -4px rgba(16,185,129,0.4); transform: translateY(-1px); }
      .cd-btn-approve:active:not(:disabled) { transform: translateY(0); }
      .cd-btn-approve::after {
        content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s ease;
      }
      .cd-btn-approve:hover::after { left: 100%; }

      .cd-btn-reject { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .cd-btn-reject:hover { background: var(--error-light); border-color: var(--error); transform: translateY(-1px); box-shadow: 0 4px 12px -2px rgba(239,68,68,0.2); }

      .cd-btn-warning { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .cd-btn-warning:hover { background: var(--warning-light); border-color: var(--warning); transform: translateY(-1px); box-shadow: 0 4px 12px -2px rgba(245,158,11,0.2); }

      .cd-btn-neutral { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .cd-btn-neutral:hover { background: var(--surface-2); transform: translateY(-1px); box-shadow: 0 4px 12px -4px rgba(0,0,0,0.08); }

      .cd-btn-save {
        position: relative; overflow: hidden;
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-btn-save:hover:not(:disabled) { box-shadow: 0 8px 24px -4px rgba(30,77,183,0.4); transform: translateY(-1px); }
      .cd-btn-save::after {
        content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); transition: left 0.5s ease;
      }
      .cd-btn-save:hover::after { left: 100%; }

      .cd-status-submitted { --pulse-color: rgba(245,158,11,0.3); animation: cd-statusPulse 2s ease-in-out infinite; }
      .cd-status-approved { --pulse-color: rgba(16,185,129,0.3); }

      .cd-input {
        border: 1.5px solid var(--border);
        transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-input:hover:not(:focus) { border-color: color-mix(in srgb, var(--primary) 25%, var(--border)); }
      .cd-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 8%, transparent); }

      .cd-textarea {
        border: 1.5px solid var(--border);
        transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 8%, transparent); }

      .cd-stat { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
      .cd-stat:hover { transform: translateY(-3px); box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08); }

      .cd-skill { transition: all 0.2s ease; }
      .cd-skill:hover { transform: translateY(-1px); box-shadow: 0 4px 8px -2px rgba(0,0,0,0.06); }

      .cd-flag { transition: all 0.2s ease; }
      .cd-flag:hover { box-shadow: 0 4px 8px -2px rgba(0,0,0,0.06); }

      .cd-timeline-dot { animation: cd-timelineDot 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      .cd-timeline-line { background: linear-gradient(to bottom, var(--border), transparent); }

      .cd-modal-overlay { animation: cd-modalOverlay 0.2s ease both; }
      .cd-modal-panel { animation: cd-modalPanel 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .cd-skeleton {
        background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-1) 40%, var(--surface-2) 80%);
        background-size: 200% 100%; animation: cd-shimmer 1.8s ease-in-out infinite; border-radius: 12px;
      }

      .cd-progress-fill { animation: cd-progressFill 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .cd-ring-fill {
        animation: cd-ringFill 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-delay: 0.3s;
      }

      .cd-range-track {
        -webkit-appearance: none; appearance: none;
        height: 6px; border-radius: 6px; outline: none; cursor: pointer;
        background: linear-gradient(to right, var(--primary) 0%, var(--primary) var(--fill, 50%), var(--surface-2) var(--fill, 50%), var(--surface-2) 100%);
        transition: background 0.1s ease;
      }
      .cd-range-track::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 18px; height: 18px; border-radius: 50%;
        background: white; border: 3px solid var(--primary);
        box-shadow: 0 2px 8px rgba(30,77,183,0.2);
        cursor: pointer; transition: all 0.2s ease;
      }
      .cd-range-track::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 2px 12px rgba(30,77,183,0.35);
      }
      .cd-range-track::-moz-range-thumb {
        width: 18px; height: 18px; border-radius: 50%;
        background: white; border: 3px solid var(--primary);
        box-shadow: 0 2px 8px rgba(30,77,183,0.2);
        cursor: pointer;
      }

      .cd-info-field { transition: all 0.2s ease; }
      .cd-info-field:hover { background: var(--surface-1); border-color: var(--border); }

      .cd-tab-btn {
        position: relative;
        transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-tab-btn::after {
        content: '';
        position: absolute; bottom: -1px; left: 0; right: 0;
        height: 2px; border-radius: 2px 2px 0 0;
        background: var(--primary);
        transform: scaleX(0);
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .cd-tab-btn[data-active="true"]::after { transform: scaleX(1); }
      .cd-tab-btn:hover { color: var(--primary); }

      @media (prefers-reduced-motion: reduce) {
        .cd-section, .cd-slide-right, .cd-scale-in, .cd-count-pop,
        .cd-chip-in, .cd-empty-float, .cd-modal-overlay, .cd-modal-panel,
        .cd-timeline-dot, .cd-progress-fill, .cd-ring-fill, .cd-tab-content {
          animation: none !important; opacity: 1 !important; transform: none !important;
        }
        .cd-card, .cd-row, .cd-back, .cd-btn-approve, .cd-btn-reject,
        .cd-btn-warning, .cd-btn-neutral, .cd-btn-save, .cd-stat,
        .cd-skill, .cd-flag, .cd-info-field, .cd-input, .cd-textarea, .cd-tab-btn {
          transition: none !important;
        }
      }

      @media print {
        .cd-card { box-shadow: none !important; border: 1px solid #ddd; }
        .cd-btn-approve, .cd-btn-reject, .cd-btn-warning, .cd-btn-neutral, .cd-btn-save { display: none; }
        .cd-modal-overlay, .cd-modal-panel { display: none; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(STYLE_ID)?.remove(); };
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function stagger(i: number, base = 70) {
  return { animationDelay: `${i * base}ms` };
}

function useCardGlow() {
  return useCallback((e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
  }, []);
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
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

type TabId = "overview" | "activity" | "notes" | "documents";

const approvalStatusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; pulse?: string }
> = {
  [ProfileApprovalStatus.DRAFT]: { label: "Draft", bg: "bg-[var(--surface-2)]", text: "text-[var(--neutral-gray)]", dot: "bg-[var(--surface-4)]" },
  [ProfileApprovalStatus.SUBMITTED]: { label: "Submitted", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]", dot: "bg-[var(--warning)]", pulse: "cd-status-submitted" },
  [ProfileApprovalStatus.APPROVED]: { label: "Approved", bg: "bg-[var(--success-light)]", text: "text-[var(--success-dark)]", dot: "bg-[var(--success)]", pulse: "cd-status-approved" },
  [ProfileApprovalStatus.NEEDS_UPDATE]: { label: "Needs Update", bg: "bg-[var(--error-light)]", text: "text-[var(--error-dark)]", dot: "bg-[var(--error)]" },
  [ProfileApprovalStatus.SUSPENDED]: { label: "Suspended", bg: "bg-[var(--error-light)]", text: "text-[var(--error-dark)]", dot: "bg-[var(--error)]" },
  [ProfileApprovalStatus.ARCHIVED]: { label: "Archived", bg: "bg-[var(--surface-2)]", text: "text-[var(--neutral-gray)]", dot: "bg-[var(--surface-4)]" },
};

const TAB_ITEMS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "activity", label: "Activity", icon: History },
  { id: "notes", label: "Admin Notes", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FolderOpen },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionHeader({ icon, title, count, subtitle }: { icon: ReactNode; title: string; count?: number; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 p-6 border-b border-[var(--border)]">
      <span className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">{title}</h3>
          {count != null && <span className="cd-count-pop text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/8 px-2 py-0.5 rounded-lg">{count}</span>}
        </div>
        {subtitle && <p className="text-xs text-[var(--neutral-gray)] mt-0.5 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, accentVar, index }: { icon: ReactNode; value: number | string; label: string; accentVar: string; index: number }) {
  return (
    <div className="cd-stat cd-section flex items-center gap-3.5 flex-1 p-4 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)]" style={stagger(index, 100)}>
      <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${accentVar} 10%, transparent)`, color: accentVar }}>{icon}</span>
      <div>
        <p className="cd-count-pop text-xl font-bold text-[var(--text-primary)] tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-[var(--neutral-gray)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function InfoField({ icon, label, value, href, index }: { icon: ReactNode; label: string; value: string; href?: string; index: number }) {
  const inner = (
    <div className="cd-info-field cd-section flex items-start gap-3 p-4 rounded-2xl bg-[var(--surface-1)] border border-transparent" style={stagger(index, 50)}>
      <span className="mt-0.5 w-9 h-9 rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]/70 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug break-words">{value}</p>
      </div>
      {href && <ArrowUpRight size={14} className="text-[var(--primary)] flex-shrink-0 mt-1" />}
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:no-underline">{inner}</a>;
  return inner;
}

function TimelineEntry({ entry, isLast, index }: { entry: AuditEntry; isLast: boolean; index: number }) {
  return (
    <div className="cd-section relative flex gap-4 pb-6 last:pb-0" style={stagger(index, 80)}>
      {!isLast && <div className="absolute left-[15px] top-[32px] bottom-0 w-px cd-timeline-line" />}
      <div className="relative z-10 flex-shrink-0 mt-1">
        <span className="cd-timeline-dot block w-[9px] h-[9px] rounded-full bg-[var(--primary)] ring-[3px] ring-[var(--primary)]/15" />
      </div>
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{entry.action}</p>
            {entry.details && <p className="text-xs text-[var(--neutral-gray)] mt-0.5 leading-relaxed">{entry.details}</p>}
            <p className="text-[11px] font-medium text-[var(--neutral-gray)]/60 mt-1">by {entry.performedBy}</p>
          </div>
          <span className="text-[11px] font-medium text-[var(--neutral-gray)]/60 whitespace-nowrap pt-0.5">
            {formatDateTime(entry.performedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, sub }: { icon: ReactNode; message: string; sub?: string }) {
  return (
    <div className="p-12 text-center">
      <div className="cd-empty-float w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">{icon}</div>
      <p className="text-sm font-semibold text-[var(--neutral-gray)]">{message}</p>
      {sub && <p className="text-xs text-[var(--neutral-gray)]/60 mt-1">{sub}</p>}
    </div>
  );
}

/** Circular SVG progress ring for profile strength */
function StrengthRing({ value }: { value: number }) {
  const size = 96;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "var(--success)" : value >= 50 ? "var(--warning)" : "var(--error)";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="cd-ring-fill"
          style={{ "--ring-circumference": circumference } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-[var(--text-primary)] leading-none">{value}%</span>
        <span className="text-[9px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mt-0.5">Strength</span>
      </div>
    </div>
  );
}

/** Rating slider */
function RatingSlider({ label, value, onChange, index }: { label: string; value: number; onChange: (v: number) => void; index: number }) {
  const fill = ((value - 1) / 9) * 100;
  return (
    <div className="cd-section" style={stagger(index, 60)}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-[var(--text-primary)]">{label}</label>
        <span className="cd-count-pop text-sm font-bold text-[var(--primary)] bg-[var(--primary)]/8 px-2.5 py-0.5 rounded-lg tabular-nums">{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cd-range-track w-full"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton & Modal
   ═══════════════════════════════════════════════════════════════════════════ */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="cd-skeleton w-10 h-10" />
        <div className="space-y-2 flex-1"><div className="cd-skeleton h-7 w-56" /><div className="cd-skeleton h-4 w-36" /></div>
      </div>
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="cd-skeleton h-[76px]" style={{ borderRadius: 16 }} />)}</div>
      <div className="flex gap-6">
        <div className="flex-1 cd-skeleton h-[480px]" style={{ borderRadius: 20 }} />
        <div className="w-[340px] cd-skeleton h-[480px]" style={{ borderRadius: 20 }} />
      </div>
    </div>
  );
}

function ActionModal({
  open, onClose, title, subtitle, icon, iconBg, accentGradient, buttonLabel, buttonBg,
  value, onChange, placeholder, onSubmit, isPending, disabled,
}: {
  open: boolean; onClose: () => void; title: string; subtitle: string;
  icon: ReactNode; iconBg: string; accentGradient: string;
  buttonLabel: string; buttonBg: string; buttonHoverBg?: string;
  value: string; onChange: (v: string) => void; placeholder: string;
  onSubmit: () => void; isPending: boolean; disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (open) { onChange(""); setTimeout(() => textareaRef.current?.focus(), 100); } }, [open]);
  useEffect(() => { if (open) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; } }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cd-modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="cd-modal-panel relative bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-md overflow-hidden">
        <div className="h-1" style={{ background: accentGradient }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>{icon}</span>
              <div><h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2><p className="text-xs text-[var(--neutral-gray)]">{subtitle}</p></div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-all duration-200 group" aria-label="Close">
              <X size={16} className="transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] mb-2">
              Reason <span className="text-[10px] font-bold bg-[var(--surface-2)] text-[var(--neutral-gray)] px-1.5 py-0.5 rounded-md uppercase tracking-wider">Required</span>
            </label>
            <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4}
              className="w-full px-4 py-3 border-[1.5px] border-[var(--border)] rounded-xl text-sm bg-[var(--surface-1)] resize-none transition-all duration-300 placeholder:text-[var(--surface-4)] focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/8 leading-relaxed" />
            {value.trim() && <p className="text-[11px] text-[var(--neutral-gray)] mt-1.5 text-right font-medium">{value.trim().split(/\s+/).length} words</p>}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
            <button onClick={onSubmit} disabled={disabled || isPending}
              className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden"
              style={{ background: isPending ? "var(--surface-4)" : buttonBg }}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : icon}
              {isPending ? "Processing\u2026" : buttonLabel}
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

export default function AdminCandidateDetailPage() {
  useInjectStyles();
  const cardGlow = useCardGlow();
  const params = useParams();
  const candidateId = params.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRequestUpdateModal, setShowRequestUpdateModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [adminNotesEdited, setAdminNotesEdited] = useState(false);
  const [newFlag, setNewFlag] = useState("");
  const [technicalRating, setTechnicalRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [teamworkRating, setTeamworkRating] = useState(5);

  // ── Data Fetching ────────────────────────────────────────

  const { data: candidate, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-candidate", candidateId],
    queryFn: () => apiClient.get<CandidateProfile>(`/admin/candidates/${candidateId}`),
    enabled: !!candidateId,
  });

  const { data: auditHistory } = useQuery({
    queryKey: ["admin-candidate-audit", candidateId],
    queryFn: () => apiClient.get<AuditEntry[]>(`/admin/candidates/${candidateId}/audit`),
    enabled: !!candidateId,
  });

  // Initialize editable fields from fetched data
  useEffect(() => {
    if (candidate && !adminNotesEdited) {
      setAdminNotes(candidate.adminNotes || "");
      const ratings = candidate.internalRatings as Record<string, number> | null;
      if (ratings) {
        setTechnicalRating(ratings.technical || 5);
        setCommunicationRating(ratings.communication || 5);
        setTeamworkRating(ratings.teamwork || 5);
      }
    }
  }, [candidate, adminNotesEdited]);

  // ── Keyboard shortcuts ────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") window.history.back();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Mutations ────────────────────────────────────────────

  const approveCandidate = useMutation({
    mutationFn: () => apiClient.post(`/admin/candidates/${candidateId}/approve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-candidate", candidateId] }); queryClient.invalidateQueries({ queryKey: ["admin-candidate-audit", candidateId] }); toast.success("Candidate approved!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectCandidate = useMutation({
    mutationFn: (reason: string) => apiClient.post(`/admin/candidates/${candidateId}/reject`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-candidate", candidateId] }); queryClient.invalidateQueries({ queryKey: ["admin-candidate-audit", candidateId] }); setShowRejectModal(false); setRejectReason(""); toast.success("Candidate rejected."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const requestUpdate = useMutation({
    mutationFn: (notes: string) => apiClient.post(`/admin/candidates/${candidateId}/request-update`, { reason: notes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-candidate", candidateId] }); queryClient.invalidateQueries({ queryKey: ["admin-candidate-audit", candidateId] }); setShowRequestUpdateModal(false); setUpdateNotes(""); toast.success("Update requested."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const suspendCandidate = useMutation({
    mutationFn: () => apiClient.post(`/admin/candidates/${candidateId}/suspend`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-candidate", candidateId] }); toast.success("Candidate suspended."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveCandidate = useMutation({
    mutationFn: () => apiClient.post(`/admin/candidates/${candidateId}/archive`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-candidate", candidateId] }); toast.success("Candidate archived."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveAdminData = useMutation({
    mutationFn: () => apiClient.put(`/admin/candidates/${candidateId}`, { adminNotes, internalRatings: { technical: technicalRating, communication: communicationRating, teamwork: teamworkRating }, adminFlags: candidate?.adminFlags || [] }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-candidate", candidateId] }); toast.success("Admin data saved."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateFlags = useMutation({
    mutationFn: (flags: string[]) => apiClient.put(`/admin/candidates/${candidateId}`, { adminFlags: flags }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-candidate", candidateId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAddFlag = () => {
    if (!newFlag.trim() || !candidate) return;
    updateFlags.mutate([...(candidate.adminFlags || []), newFlag.trim()]);
    setNewFlag("");
  };

  const handleRemoveFlag = (flag: string) => {
    if (!candidate) return;
    updateFlags.mutate((candidate.adminFlags || []).filter((f) => f !== flag));
  };

  // ── States ────────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  if (error || !candidate) {
    return (
      <div className="cd-section">
        <div className="cd-card p-14 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--error-light)] flex items-center justify-center mb-5"><AlertCircle size={28} className="text-[var(--error)]" /></div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Failed to load candidate</h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">{error instanceof Error ? error.message : "Something went wrong."}</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] transition-colors">Try Again</button>
        </div>
      </div>
    );
  }

  const statusConf = approvalStatusConfig[candidate.approvalStatus] || approvalStatusConfig[ProfileApprovalStatus.DRAFT];
  const auditEntries: AuditEntry[] = Array.isArray(auditHistory) ? auditHistory : [];

  // Build info fields
  const infoFields: { icon: ReactNode; label: string; value: string; href?: string }[] = [];
  if (candidate.contactEmail) infoFields.push({ icon: <Mail size={16} />, label: "Email", value: candidate.contactEmail });
  if (candidate.phone) infoFields.push({ icon: <Phone size={16} />, label: "Phone", value: candidate.phone });
  if (candidate.city || candidate.country) infoFields.push({ icon: <MapPin size={16} />, label: "Location", value: [candidate.city, candidate.country].filter(Boolean).join(", ") });
  if (candidate.yearsOfExperience != null) infoFields.push({ icon: <Briefcase size={16} />, label: "Experience", value: `${candidate.yearsOfExperience} year${candidate.yearsOfExperience !== 1 ? "s" : ""}` });
  if (candidate.availabilityStatus) infoFields.push({ icon: <Clock size={16} />, label: "Availability", value: candidate.availabilityStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) });
  if (candidate.preferredWorkMode) infoFields.push({ icon: <Monitor size={16} />, label: "Work Mode", value: candidate.preferredWorkMode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) });
  if (candidate.githubUrl) infoFields.push({ icon: <Github size={16} />, label: "GitHub", value: "View Profile", href: candidate.githubUrl });
  if (candidate.linkedinUrl) infoFields.push({ icon: <Linkedin size={16} />, label: "LinkedIn", value: "View Profile", href: candidate.linkedinUrl });
  if (candidate.portfolioUrl) infoFields.push({ icon: <Globe size={16} />, label: "Portfolio", value: "View Site", href: candidate.portfolioUrl });

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumbs ───────────────────────────────────── */}
      <nav className="cd-section flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-gray)]" style={stagger(0, 50)}>
        <Link href="/admin" className="hover:text-[var(--primary)] transition-colors">Admin</Link>
        <ChevronRight size={12} className="opacity-40" />
        <Link href="/admin/candidates" className="hover:text-[var(--primary)] transition-colors">Candidates</Link>
        <ChevronRight size={12} className="opacity-40" />
        <span className="text-[var(--text-primary)]">{candidate.fullName}</span>
      </nav>

      {/* ─── Hero Header ────────────────────────────────────── */}
      <div className="cd-section cd-card overflow-hidden" style={stagger(0)} onMouseMove={cardGlow}>
        <div className="h-2 bg-gradient-to-r from-[var(--primary)] via-[var(--info)] to-[var(--primary)]" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            {/* Avatar + Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Link href="/admin/candidates" className="cd-back p-2 rounded-xl text-[var(--neutral-gray)] flex-shrink-0 lg:hidden" aria-label="Back"><ArrowLeft size={20} /></Link>

              <div className="relative flex-shrink-0">
                {candidate.photoUrl ? (
                  <img src={candidate.photoUrl} alt={candidate.fullName} className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl object-cover border-2 border-[var(--border)] shadow-md" />
                ) : (
                  <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5 flex items-center justify-center shadow-md border border-[var(--border)]">
                    <span className="text-2xl font-bold text-[var(--primary)]">{initials(candidate.fullName)}</span>
                  </div>
                )}
                {candidate.approvalStatus === ProfileApprovalStatus.APPROVED && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--success)] flex items-center justify-center border-2 border-[var(--surface-0)] shadow-sm">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{candidate.fullName}</h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusConf.bg} ${statusConf.text} ${statusConf.pulse || ""}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />{statusConf.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm text-[var(--neutral-gray)]">
                  {candidate.primaryTrack && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <GraduationCap size={13} className="text-[var(--primary)]" />
                      {candidate.primaryTrack.name}
                    </span>
                  )}
                  {(candidate.city || candidate.country) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} />
                      {[candidate.city, candidate.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {candidate.approvedAt && (
                    <span className="text-xs text-[var(--neutral-gray)]/60">
                      Approved {formatDate(candidate.approvedAt)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--neutral-gray)]/50 mt-1 font-mono">{candidate.id}</p>
              </div>
            </div>

            {/* Profile Strength Ring */}
            <StrengthRing value={candidate.profileStrength ?? 0} />

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/candidates" className="cd-back p-2.5 rounded-xl text-[var(--neutral-gray)] hidden lg:block" aria-label="Back"><ArrowLeft size={20} /></Link>

              {(candidate.approvalStatus === ProfileApprovalStatus.SUBMITTED || candidate.approvalStatus === ProfileApprovalStatus.NEEDS_UPDATE) && (
                <button onClick={() => approveCandidate.mutate()} disabled={approveCandidate.isPending} className="cd-btn-approve flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 relative z-10">
                  {approveCandidate.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                </button>
              )}
              {candidate.approvalStatus !== ProfileApprovalStatus.SUSPENDED && candidate.approvalStatus !== ProfileApprovalStatus.ARCHIVED && (
                <>
                  <button onClick={() => setShowRejectModal(true)} className="cd-btn-reject flex items-center gap-2 px-4 py-2.5 border-[1.5px] border-[var(--error)]/25 text-[var(--error)] rounded-xl text-sm font-semibold">
                    <XCircle size={14} /> Reject
                  </button>
                  <button onClick={() => setShowRequestUpdateModal(true)} className="cd-btn-warning flex items-center gap-2 px-4 py-2.5 border-[1.5px] border-[var(--warning)]/25 text-[var(--warning-dark)] rounded-xl text-sm font-semibold">
                    <RefreshCw size={14} /> Update
                  </button>
                </>
              )}
              {candidate.approvalStatus !== ProfileApprovalStatus.SUSPENDED && (
                <button onClick={() => suspendCandidate.mutate()} disabled={suspendCandidate.isPending} className="cd-btn-neutral flex items-center gap-2 px-4 py-2.5 border-[1.5px] border-[var(--border)] text-[var(--neutral-gray)] rounded-xl text-sm font-semibold">
                  {suspendCandidate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Suspend
                </button>
              )}
              {candidate.approvalStatus !== ProfileApprovalStatus.ARCHIVED && (
                <button onClick={() => archiveCandidate.mutate()} disabled={archiveCandidate.isPending} className="cd-btn-neutral flex items-center gap-2 px-4 py-2.5 border-[1.5px] border-[var(--border)] text-[var(--neutral-gray)] rounded-xl text-sm font-semibold">
                  {archiveCandidate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} Archive
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Eye size={19} />} value={candidate.profileViews ?? 0} label="Profile views" accentVar="var(--info)" index={0} />
        <StatCard icon={<Handshake size={19} />} value={candidate.introRequestsReceived ?? 0} label="Intro requests" accentVar="var(--primary)" index={1} />
        <StatCard icon={<TrendingUp size={19} />} value={`${candidate.profileStrength ?? 0}%`} label="Profile strength" accentVar="var(--success)" index={2} />
        <StatCard icon={<Shield size={19} />} value={candidate.visibilityLevel ?? "\u2014"} label="Visibility" accentVar="var(--accent-orange)" index={3} />
      </div>

      {/* ─── Tabbed Content + Sidebar ────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content with tabs */}
        <div className="flex-1 min-w-0 space-y-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-[var(--border)] mb-6">
            {TAB_ITEMS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-active={activeTab === tab.id}
                  className={`cd-tab-btn flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? "text-[var(--primary)]"
                      : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                  {tab.id === "activity" && auditEntries.length > 0 && (
                    <span className="text-[10px] font-bold bg-[var(--surface-2)] px-1.5 py-0.5 rounded-md">{auditEntries.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <div className="cd-tab-content space-y-6" key="overview">
              <div className="cd-card cd-card-accent" onMouseMove={cardGlow}>
                <SectionHeader icon={<User size={18} />} title="Candidate Profile" subtitle="Personal info, skills, and profile details" />
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {infoFields.map((f, i) => <InfoField key={f.label} icon={f.icon} label={f.label} value={f.value} href={f.href} index={i} />)}
                  </div>

                  {candidate.bio && (
                    <div className="pt-5 border-t border-[var(--border)]">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2.5 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-[var(--primary)]" /> Bio</h4>
                      <p className="text-sm text-[var(--neutral-gray)] whitespace-pre-wrap leading-[1.75]">{candidate.bio}</p>
                    </div>
                  )}

                  {candidate.candidateSkills && candidate.candidateSkills.length > 0 && (
                    <div className="pt-5 border-t border-[var(--border)]">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-[var(--info)]" /> Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.candidateSkills.map((cs, i) => (
                          <span key={cs.id} className={`cd-skill cd-chip-in inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold cursor-default ${cs.isVerified ? "bg-[var(--primary)]/8 text-[var(--primary)] border border-[var(--primary)]/10" : "bg-[var(--surface-2)] text-[var(--neutral-gray)] border border-transparent"}`} style={stagger(i, 30)}>
                            {cs.isVerified && <Star size={11} className="text-[var(--primary)]/60" />}
                            {cs.skill?.name || cs.customTagName || "Skill"}
                            {cs.isVerified && <span className="text-[10px] opacity-60 font-medium">(verified)</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {candidate.spokenLanguages && candidate.spokenLanguages.length > 0 && (
                    <div className="pt-5 border-t border-[var(--border)]">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-[var(--accent-orange)]" /> Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.spokenLanguages.map((lang, i) => (
                          <span key={lang} className="cd-chip-in inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-[var(--surface-2)] text-[var(--neutral-gray)]" style={stagger(i, 30)}>
                            <Languages size={12} /> {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {candidate.candidateProjects && candidate.candidateProjects.length > 0 && (
                    <div className="pt-5 border-t border-[var(--border)]">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-[var(--success)]" /> Projects</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {candidate.candidateProjects.map((proj) => (
                          <div key={proj.id} className="p-4 rounded-xl bg-[var(--surface-1)] border border-transparent hover:border-[var(--border)] transition-all">
                            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{proj.title}</p>
                            {proj.description && <p className="text-xs text-[var(--neutral-gray)] line-clamp-2 leading-relaxed">{proj.description}</p>}
                            {proj.techStack && proj.techStack.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {proj.techStack.slice(0, 4).map((t) => (
                                  <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--primary)]/6 text-[var(--primary)]">{t}</span>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              {proj.projectUrl && (
                                <a href={proj.projectUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                                  <ExternalLink size={10} /> Live
                                </a>
                              )}
                              {proj.githubUrl && (
                                <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                                  <Github size={10} /> Code
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Activity Tab ── */}
          {activeTab === "activity" && (
            <div className="cd-tab-content space-y-6" key="activity">
              <div className="cd-card cd-card-accent" onMouseMove={cardGlow}>
                <SectionHeader icon={<History size={18} />} title="Audit History" count={auditEntries.length} subtitle="Activity timeline for this candidate" />
                {auditEntries.length === 0 ? (
                  <EmptyState icon={<History size={24} className="text-[var(--surface-4)]" />} message="No audit entries" sub="Actions will be recorded here" />
                ) : (
                  <div className="p-6 pl-8">
                    {auditEntries.map((entry, idx) => <TimelineEntry key={entry.id} entry={entry} isLast={idx === auditEntries.length - 1} index={idx} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Admin Notes Tab ── */}
          {activeTab === "notes" && (
            <div className="cd-tab-content space-y-6" key="notes">
              <div className="cd-card cd-card-accent" onMouseMove={cardGlow}>
                <SectionHeader icon={<MessageSquare size={18} />} title="Internal Notes" subtitle="Private notes about this candidate" />
                <div className="p-6">
                  <textarea
                    value={adminNotes}
                    onChange={(e) => { setAdminNotes(e.target.value); setAdminNotesEdited(true); }}
                    placeholder="Add internal notes about this candidate\u2026"
                    rows={6}
                    className="cd-textarea w-full px-4 py-3 rounded-xl text-sm bg-[var(--surface-1)] resize-none focus:outline-none placeholder:text-[var(--surface-4)] leading-relaxed"
                  />
                  {adminNotes.trim() && <p className="text-[11px] text-[var(--neutral-gray)] mt-1.5 text-right font-medium">{adminNotes.trim().split(/\s+/).length} words</p>}
                </div>
              </div>

              <div className="cd-card cd-card-accent" onMouseMove={cardGlow}>
                <SectionHeader icon={<Star size={18} />} title="Internal Ratings" subtitle="Rate the candidate across key dimensions" />
                <div className="p-6 space-y-5">
                  <RatingSlider label="Technical" value={technicalRating} onChange={setTechnicalRating} index={0} />
                  <RatingSlider label="Communication" value={communicationRating} onChange={setCommunicationRating} index={1} />
                  <RatingSlider label="Teamwork" value={teamworkRating} onChange={setTeamworkRating} index={2} />
                </div>
              </div>

              <div className="cd-card cd-card-accent" onMouseMove={cardGlow}>
                <SectionHeader icon={<Tag size={18} />} title="Admin Flags" count={(candidate.adminFlags || []).length} subtitle="Custom tags and labels for internal tracking" />
                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                    {(candidate.adminFlags || []).map((flag, i) => (
                      <span key={flag} className="cd-flag cd-chip-in inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)]/6 text-[var(--primary)] border border-[var(--primary)]/10" style={stagger(i, 40)}>
                        <Tag size={12} className="opacity-50" />
                        {flag}
                        <button onClick={() => handleRemoveFlag(flag)} className="p-0.5 rounded-md hover:bg-[var(--error-light)] text-[var(--neutral-gray)] hover:text-[var(--error)] transition-all duration-200 group/rm">
                          <X size={12} className="transition-transform duration-200 group-hover/rm:rotate-90" />
                        </button>
                      </span>
                    ))}
                    {(!candidate.adminFlags || candidate.adminFlags.length === 0) && (
                      <p className="text-sm text-[var(--neutral-gray)]/60 italic">No flags added yet</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] transition-colors duration-300 group-focus-within:text-[var(--primary)]" />
                      <input
                        type="text" value={newFlag} onChange={(e) => setNewFlag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddFlag()}
                        placeholder="Add a flag (e.g. Top Performer, Priority)"
                        className="cd-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm bg-[var(--surface-1)] focus:outline-none placeholder:text-[var(--surface-4)]"
                      />
                    </div>
                    <button onClick={handleAddFlag} disabled={!newFlag.trim()}
                      className="cd-btn-neutral flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold border-[1.5px] border-[var(--border)] text-[var(--neutral-gray)] bg-[var(--surface-1)] disabled:opacity-40">
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => saveAdminData.mutate()} disabled={saveAdminData.isPending}
                  className="cd-btn-save flex items-center gap-2.5 px-7 py-3 text-white rounded-2xl text-sm font-bold tracking-[-0.01em] relative z-10 disabled:opacity-50">
                  {saveAdminData.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Admin Data
                  <ChevronRight size={14} className="ml-0.5 opacity-60" />
                </button>
              </div>
            </div>
          )}

          {/* ── Documents Tab ── */}
          {activeTab === "documents" && (
            <div className="cd-tab-content space-y-6" key="documents">
              <div className="cd-card cd-card-accent" onMouseMove={cardGlow}>
                <SectionHeader icon={<FolderOpen size={18} />} title="Documents" count={candidate.candidateDocuments?.length ?? 0} subtitle="Uploaded files and certificates" />
                {(!candidate.candidateDocuments || candidate.candidateDocuments.length === 0) ? (
                  <EmptyState icon={<FileText size={24} className="text-[var(--surface-4)]" />} message="No documents uploaded" sub="CV, certificates, and other documents will appear here" />
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {candidate.candidateDocuments.map((doc, idx) => (
                      <div key={doc.id} className="cd-row cd-section flex items-center justify-between p-4 px-6" style={stagger(idx, 50)}>
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/8 flex items-center justify-center">
                            <FileText size={16} className="text-[var(--primary)]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{doc.fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--neutral-gray)]">
                              <span className="uppercase font-semibold bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[10px]">{doc.documentType.replace(/_/g, " ")}</span>
                              {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                              {doc.isCurrent && <span className="text-[var(--success-dark)] font-semibold">Current</span>}
                            </div>
                          </div>
                        </div>
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-xl hover:bg-[var(--primary)]/6 text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <div className="w-full lg:w-[340px] flex-shrink-0 space-y-5">
          {/* Quick Stats */}
          <div className="cd-section cd-card" style={stagger(3)} onMouseMove={cardGlow}>
            <div className="p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Zap size={14} className="text-[var(--accent-orange)]" /> Quick Stats
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Profile Views", value: String(candidate.profileViews ?? 0) },
                  { label: "Intro Requests", value: String(candidate.introRequestsReceived ?? 0) },
                  { label: "Experience", value: candidate.yearsOfExperience != null ? `${candidate.yearsOfExperience} yrs` : "\u2014" },
                  { label: "Skills Count", value: String(candidate.candidateSkills?.length ?? 0) },
                  { label: "Documents", value: String(candidate.candidateDocuments?.length ?? 0) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--neutral-gray)]">{item.label}</span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Profile Strength</span>
                  <span className="text-xs font-bold" style={{ color: (candidate.profileStrength ?? 0) >= 80 ? "var(--success)" : (candidate.profileStrength ?? 0) >= 50 ? "var(--warning)" : "var(--error)" }}>
                    {candidate.profileStrength ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="cd-progress-fill h-full rounded-full"
                    style={{
                      width: `${candidate.profileStrength ?? 0}%`,
                      background: (candidate.profileStrength ?? 0) >= 80 ? "var(--success)" : (candidate.profileStrength ?? 0) >= 50 ? "var(--warning)" : "var(--error)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Consents */}
          {candidate.candidateConsents && candidate.candidateConsents.length > 0 && (
            <div className="cd-section cd-card" style={stagger(4)} onMouseMove={cardGlow}>
              <div className="p-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Shield size={14} className="text-[var(--primary)]" /> Consents
                </h3>
                <div className="space-y-2">
                  {candidate.candidateConsents.map((consent) => (
                    <div key={consent.id} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${consent.granted ? "bg-[var(--success-light)]" : "bg-[var(--surface-2)]"}`}>
                        {consent.granted ? <CheckCircle2 size={12} className="text-[var(--success-dark)]" /> : <XCircle size={12} className="text-[var(--neutral-gray)]" />}
                      </div>
                      <span className="text-xs font-medium text-[var(--neutral-gray)]">
                        {consent.consentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Key dates */}
          <div className="cd-section cd-card" style={stagger(5)} onMouseMove={cardGlow}>
            <div className="p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <CalendarDays size={14} className="text-[var(--info)]" /> Key Dates
              </h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: "Created", value: formatDate(candidate.createdAt), color: undefined },
                  { label: "Last Updated", value: formatDate(candidate.updatedAt), color: undefined },
                  ...(candidate.approvedAt ? [{ label: "Approved", value: formatDate(candidate.approvedAt), color: "var(--success-dark)" }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[var(--neutral-gray)]">{item.label}</span>
                    <span className="font-semibold" style={item.color ? { color: item.color } : undefined}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────── */}
      <ActionModal
        open={showRejectModal} onClose={() => setShowRejectModal(false)}
        title="Reject Candidate" subtitle="This will notify the candidate"
        icon={<XCircle size={18} className="text-[var(--error)]" />} iconBg="var(--error-light)"
        accentGradient="linear-gradient(90deg, var(--error), var(--accent-red))"
        buttonLabel="Reject" buttonBg="var(--error)"
        value={rejectReason} onChange={setRejectReason} placeholder="Explain why this profile is being rejected\u2026"
        onSubmit={() => rejectCandidate.mutate(rejectReason)} isPending={rejectCandidate.isPending} disabled={!rejectReason.trim()}
      />

      <ActionModal
        open={showRequestUpdateModal} onClose={() => setShowRequestUpdateModal(false)}
        title="Request Profile Update" subtitle="Ask the candidate to improve their profile"
        icon={<RefreshCw size={18} className="text-[var(--warning-dark)]" />} iconBg="var(--warning-light)"
        accentGradient="linear-gradient(90deg, var(--warning), var(--accent-orange))"
        buttonLabel="Send Request" buttonBg="var(--warning)"
        value={updateNotes} onChange={setUpdateNotes} placeholder="What should the candidate update or improve\u2026"
        onSubmit={() => requestUpdate.mutate(updateNotes)} isPending={requestUpdate.isPending} disabled={!updateNotes.trim()}
      />
    </div>
  );
}
