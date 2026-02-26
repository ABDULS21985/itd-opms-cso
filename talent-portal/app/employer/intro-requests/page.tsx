"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Users,
  Clock,
  CheckCircle2,
  CheckCheck,
  XCircle,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  Loader2,
  Search,
  ChevronRight,
  Briefcase,
  Calendar,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEmployerIntroRequests } from "@/hooks/use-intro-requests";
import type { IntroRequest } from "@/types/intro-request";

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; icon: typeof Clock }
> = {
  pending: { label: "Pending Review", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]", dot: "bg-[var(--warning)]", icon: Clock },
  approved: { label: "Sent to Candidate", bg: "bg-[var(--info-light)]", text: "text-[var(--info-dark)]", dot: "bg-[var(--info)]", icon: ArrowRight },
  more_info_needed: { label: "More Info Needed", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]", dot: "bg-[var(--warning)]", icon: AlertCircle },
  scheduled: { label: "Scheduled", bg: "bg-[var(--info-light)]", text: "text-[var(--info-dark)]", dot: "bg-[var(--info)]", icon: Calendar },
  completed: { label: "Completed", bg: "bg-[var(--success-light)]", text: "text-[var(--success-dark)]", dot: "bg-[var(--success)]", icon: CheckCheck },
  declined: { label: "Declined", bg: "bg-[var(--error-light)]", text: "text-[var(--error-dark)]", dot: "bg-[var(--error)]", icon: XCircle },
};

const candidateResponseConfig: Record<
  string,
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  accepted: { label: "Accepted", bg: "bg-[var(--success-light)]", text: "text-[var(--success-dark)]", icon: CheckCircle2 },
  declined: { label: "Declined", bg: "bg-[var(--error-light)]", text: "text-[var(--error-dark)]", icon: XCircle },
  pending: { label: "Awaiting Response", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]", icon: Clock },
};

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
] as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, count, icon: Icon, color }: { label: string; count: number; icon: typeof Mail; color: string }) {
  return (
    <div className="relative overflow-hidden bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-4 hover:shadow-md transition-all">
      <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full opacity-[0.06]" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">{count}</p>
          <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────────────────────────────────────

function StatusTimeline({ request }: { request: IntroRequest }) {
  const events: { label: string; date: string | null; color: string }[] = [
    { label: "Request Created", date: request.createdAt, color: "var(--neutral-gray)" },
    { label: "Admin Review", date: request.handledAt, color: "var(--primary)" },
    ...(request.candidateRespondedAt
      ? [{ label: `Candidate ${request.candidateResponse === "accepted" ? "Accepted" : request.candidateResponse === "declined" ? "Declined" : "Responded"}`, date: request.candidateRespondedAt, color: request.candidateResponse === "accepted" ? "var(--success)" : request.candidateResponse === "declined" ? "var(--error)" : "var(--warning)" }]
      : []),
    ...(request.status === "completed" ? [{ label: "Completed", date: request.updatedAt, color: "var(--success)" }] : []),
  ];

  return (
    <div className="space-y-0">
      {events.map((ev, idx) => (
        <div key={idx} className="flex gap-3 py-2">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ev.date ? ev.color : "var(--surface-3)" }} />
            {idx < events.length - 1 && <div className="flex-1 w-px bg-[var(--border)] mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">{ev.label}</p>
            {ev.date && <p className="text-xs text-[var(--neutral-gray)] mt-0.5">{formatDate(ev.date)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expandable Row Detail
// ─────────────────────────────────────────────────────────────────────────────

function ExpandedDetail({ request }: { request: IntroRequest }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="px-6 py-5 bg-[var(--surface-2)]/30 border-t border-[var(--border)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Details */}
          <div className="space-y-4">
            {request.roleDescription && (
              <div>
                <p className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Role Description</p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{request.roleDescription}</p>
              </div>
            )}
            {request.notesToPlacementUnit && (
              <div>
                <p className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Message to Placement Unit</p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--surface-1)] rounded-xl px-4 py-3 border border-[var(--border)]">
                  {request.notesToPlacementUnit}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-[var(--neutral-gray)]">
              {request.workMode && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase size={11} /> {request.workMode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              )}
              {request.locationExpectation && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {request.locationExpectation}
                </span>
              )}
              {request.desiredStartDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} /> Start: {formatDateShort(request.desiredStartDate)}
                </span>
              )}
            </div>
            {request.candidateResponse && (
              <div>
                <p className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Candidate Response</p>
                {(() => {
                  const rc = candidateResponseConfig[request.candidateResponse] ?? candidateResponseConfig.pending;
                  const RcIcon = rc.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${rc.bg} ${rc.text}`}>
                      <RcIcon size={12} /> {rc.label}
                    </span>
                  );
                })()}
              </div>
            )}
            {request.adminNotes && (
              <div>
                <p className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Admin Notes</p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{request.adminNotes}</p>
              </div>
            )}
            {request.declineReason && (
              <div>
                <p className="text-xs font-bold text-[var(--error)] uppercase tracking-wider mb-1">Decline Reason</p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{request.declineReason}</p>
              </div>
            )}
          </div>
          {/* Right: Timeline */}
          <div>
            <p className="text-xs font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-2">Timeline</p>
            <StatusTimeline request={request} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════════════

export default function EmployerIntroRequestsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useEmployerIntroRequests({
    status: filter !== "all" ? filter : undefined,
  });

  const allRequests: IntroRequest[] = data?.data ?? [];

  const requests = useMemo(() => {
    if (!search) return allRequests;
    const q = search.toLowerCase();
    return allRequests.filter(
      (r) =>
        (r.candidate?.fullName ?? "").toLowerCase().includes(q) ||
        (r.roleTitle ?? "").toLowerCase().includes(q),
    );
  }, [allRequests, search]);

  const stats = useMemo(() => ({
    total: allRequests.length,
    pending: allRequests.filter((r) => r.status === "pending").length,
    approved: allRequests.filter((r) => r.status === "approved" || r.status === "scheduled").length,
    completed: allRequests.filter((r) => r.status === "completed").length,
    declined: allRequests.filter((r) => r.status === "declined").length,
  }), [allRequests]);

  // ── Loading / Error ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-[var(--surface-1)] rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Failed to load intro requests</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">Something went wrong. Please try again later.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Intro Requests</h1>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">Track introductions you have initiated with candidates.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total" count={stats.total} icon={Mail} color="var(--primary)" />
        <StatCard label="Pending" count={stats.pending} icon={Clock} color="var(--warning)" />
        <StatCard label="Approved" count={stats.approved} icon={CheckCircle2} color="var(--info)" />
        <StatCard label="Completed" count={stats.completed} icon={CheckCheck} color="var(--success)" />
        <StatCard label="Declined" count={stats.declined} icon={XCircle} color="var(--error)" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate or role..."
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-1)]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-[#C4A35A]/10 text-[#C4A35A] font-semibold"
                  : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {tab.label}
              {tab.value !== "all" && (
                <span className="ml-1.5 text-[10px] font-bold">
                  {tab.value === "pending" ? stats.pending :
                   tab.value === "approved" ? stats.approved :
                   tab.value === "completed" ? stats.completed :
                   stats.declined}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      {requests.length === 0 ? (
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-14 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C4A35A]/10 flex items-center justify-center mb-5">
            <Mail size={28} className="text-[#C4A35A]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">No introduction requests yet</h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">
            {search || filter !== "all"
              ? "No requests match your current filters."
              : "Browse talent to get started."}
          </p>
          {!search && filter === "all" && (
            <Link
              href="/employer/candidates"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:shadow-lg transition-all"
              style={{ background: "linear-gradient(135deg, #C4A35A, #A8893D)" }}
            >
              <Users size={16} /> Browse Talent
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="w-8 px-4 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Requested For</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Sent</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request, i) => {
                  const config = statusConfig[request.status] ?? statusConfig.pending;
                  const StatusIcon = config.icon;
                  const candidateName = request.candidate?.fullName ?? "Unknown";
                  const isExpanded = expandedId === request.id;

                  return (
                    <motion.tbody
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                    >
                      <tr
                        className={`transition-colors cursor-pointer ${
                          isExpanded ? "bg-[var(--surface-2)]/30" : "hover:bg-[var(--surface-2)]/30"
                        } border-b border-[var(--border)]`}
                        onClick={() => setExpandedId(isExpanded ? null : request.id)}
                      >
                        <td className="px-4 py-3.5">
                          <ChevronRight
                            size={14}
                            className={`text-[var(--neutral-gray)] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {request.candidate?.photoUrl ? (
                              <img
                                src={request.candidate.photoUrl}
                                alt={candidateName}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-[var(--border)]"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-[var(--primary)]">
                                  {candidateName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{candidateName}</p>
                              <p className="text-xs text-[var(--neutral-gray)] truncate">
                                {request.candidate?.primaryTrack?.name ?? (request.candidate as any)?.tracks?.[0]?.name ?? ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-[var(--text-primary)] truncate max-w-[200px]">{request.roleTitle}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text}`}>
                            <StatusIcon size={12} />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-[var(--neutral-gray)]">{formatDateShort(request.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : request.id)}
                              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
                              title="View details"
                            >
                              <MessageSquare size={15} />
                            </button>
                            {request.candidate && (
                              <Link
                                href={`/talents/${(request.candidate as any).slug ?? request.candidateId}`}
                                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[#C4A35A] transition-colors"
                                title="View profile"
                              >
                                <ExternalLink size={15} />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <ExpandedDetail request={request} />
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </motion.tbody>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
