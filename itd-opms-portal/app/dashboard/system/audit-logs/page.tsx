"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText, Shield, Download, ChevronDown, ChevronRight, Search, Filter,
  X, Copy, Check, BarChart3, ArrowLeft, Loader2, Calendar, ChevronLeft,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { JsonDiff } from "@/components/shared/json-diff";
import {
  useAuditLogs, useAuditStats, useAuditTimeline,
  useVerifyIntegrity, useExportAuditLogs, useSearchUsers,
} from "@/hooks/use-system";
import type { AuditEventDetail } from "@/types";

/* ================================================================== */
/*  Constants & Helpers                                                 */
/* ================================================================== */

const ENTITY_TYPES = [
  "user","role","tenant","org_unit","ticket","asset","policy",
  "project","risk","audit","meeting","okr","kpi","work_item",
];
const ACTIONS = [
  "create","update","delete","approve","reject","login",
  "logout","assign","revoke","move","deactivate","reactivate",
];

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  create:     { bg: "rgba(34,197,94,0.12)",  text: "var(--success)" },
  update:     { bg: "rgba(59,130,246,0.12)",  text: "var(--info)" },
  delete:     { bg: "rgba(239,68,68,0.12)",   text: "var(--error)" },
  approve:    { bg: "rgba(34,197,94,0.12)",   text: "var(--success)" },
  reject:     { bg: "rgba(239,68,68,0.12)",   text: "var(--error)" },
  login:      { bg: "rgba(59,130,246,0.12)",  text: "var(--info)" },
  logout:     { bg: "rgba(107,114,128,0.12)", text: "var(--neutral-gray)" },
  assign:     { bg: "rgba(139,92,246,0.12)",  text: "#8B5CF6" },
  revoke:     { bg: "rgba(245,158,11,0.12)",  text: "var(--warning)" },
  move:       { bg: "rgba(99,102,241,0.12)",  text: "#6366F1" },
  deactivate: { bg: "rgba(245,158,11,0.12)",  text: "var(--warning)" },
  reactivate: { bg: "rgba(34,197,94,0.12)",   text: "var(--success)" },
};

function actionColor(a: string) {
  return ACTION_COLORS[a.toLowerCase()] ?? { bg: "rgba(107,114,128,0.1)", text: "var(--neutral-gray)" };
}

function relativeTime(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function absTime(d: string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const toISO = (d: Date) => d.toISOString().split("T")[0];
const today = () => toISO(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); };
const humanize = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Shared Recharts tooltip style */
const ttStyle = { backgroundColor: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
/** Shared input style props */
const inputSx = { borderColor: "var(--border)", backgroundColor: "var(--surface-1)", color: "var(--text-primary)" };
const cardSx = { backgroundColor: "var(--surface-0)", borderColor: "var(--border)" };

/* ================================================================== */
/*  Reusable small components                                           */
/* ================================================================== */

/** Horizontal bar chart card used in stats panel */
function HBarCard({ title, data, dataKey, nameKey, formatter }: {
  title: string; data: unknown[]; dataKey: string; nameKey: string;
  formatter?: (v: string) => string;
}) {
  return (
    <div className="rounded-xl border p-4" style={cardSx}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} allowDecimals={false} />
          <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
            width={100} tickFormatter={formatter} />
          <Tooltip contentStyle={ttStyle} />
          <Bar dataKey={dataKey} fill="var(--primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Action badge */
function ActionBadge({ action }: { action: string }) {
  const c = actionColor(action);
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}>{action}</span>
  );
}

/* ================================================================== */
/*  Page Component                                                      */
/* ================================================================== */

export default function AuditLogExplorerPage() {
  /* -- Filter state ------------------------------------------------ */
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [datePreset, setDatePreset] = useState<string>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorQuery, setActorQuery] = useState("");
  const [entityId, setEntityId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [applied, setApplied] = useState<Record<string, string | undefined>>({ dateFrom: daysAgo(30) });

  /* -- UI state ---------------------------------------------------- */
  const [showStats, setShowStats] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  /* -- Debounce search --------------------------------------------- */
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchInput), 400); return () => clearTimeout(t); }, [searchInput]);

  /* -- Date range from preset -------------------------------------- */
  const dateRange = useCallback((): Record<string, string | undefined> => {
    const t = today();
    if (datePreset === "today") return { dateFrom: t, dateTo: t };
    if (datePreset === "last7") return { dateFrom: daysAgo(7) };
    if (datePreset === "last30") return { dateFrom: daysAgo(30) };
    return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
  }, [datePreset, customFrom, customTo]);

  /* -- Apply / Clear ----------------------------------------------- */
  const handleApply = useCallback(() => {
    setApplied({
      ...dateRange(),
      actorId: actorId || undefined, entityType: entityType || undefined,
      entityId: entityId || undefined, action: action || undefined,
      search: debouncedSearch || undefined,
    });
    setPage(1);
  }, [dateRange, actorId, entityType, entityId, action, debouncedSearch]);

  const handleClear = useCallback(() => {
    setSearchInput(""); setDebouncedSearch(""); setDatePreset("last30");
    setCustomFrom(""); setCustomTo(""); setEntityType(""); setAction("");
    setActorId(""); setActorQuery(""); setEntityId("");
    setApplied({ dateFrom: daysAgo(30) }); setPage(1);
  }, []);

  /* -- Timeline mode ----------------------------------------------- */
  const isTimeline = !!applied.entityType && !!applied.entityId;
  const handleBackToList = useCallback(() => {
    setEntityType(""); setEntityId("");
    setApplied((p) => ({ ...p, entityType: undefined, entityId: undefined }));
  }, []);

  /* -- Data hooks -------------------------------------------------- */
  const { data: auditData, isLoading: logsLoading } = useAuditLogs(page, PAGE_SIZE, applied);
  const { data: stats, isLoading: statsLoading } = useAuditStats(applied.dateFrom, applied.dateTo);
  const { data: timelineData, isLoading: timelineLoading } = useAuditTimeline(
    isTimeline ? applied.entityType : undefined, isTimeline ? applied.entityId : undefined,
  );
  const verifyMut = useVerifyIntegrity();
  const exportMut = useExportAuditLogs();
  const { data: userResults } = useSearchUsers(actorQuery);

  /* -- Resolve paginated data -------------------------------------- */
  const events: AuditEventDetail[] = useMemo(() => {
    if (!auditData) return [];
    if (Array.isArray(auditData)) return auditData;
    if ("data" in auditData && Array.isArray(auditData.data)) return auditData.data;
    return [];
  }, [auditData]);
  const totalPages = useMemo(() => {
    if (!auditData || Array.isArray(auditData)) return 1;
    return auditData.meta?.totalPages ?? 1;
  }, [auditData]);
  const totalEvents = useMemo(() => {
    if (!auditData || Array.isArray(auditData)) return events.length;
    return auditData.meta?.totalItems ?? events.length;
  }, [auditData, events.length]);

  /* -- Clipboard --------------------------------------------------- */
  const copyId = useCallback((t: string) => {
    navigator.clipboard.writeText(t); setCopiedId(t);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  /* -- Close export on outside click ------------------------------- */
  useEffect(() => {
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  /* -- Handlers ---------------------------------------------------- */
  const handleVerify = useCallback(() => {
    verifyMut.mutate({ dateFrom: applied.dateFrom, dateTo: applied.dateTo }, {
      onSuccess: (r) => {
        r.failed === 0
          ? toast.success(`Integrity verified: ${r.verified} events, 0 failures`)
          : toast.error(`Integrity check: ${r.verified} verified, ${r.failed} failed`);
      },
    });
  }, [verifyMut, applied]);

  const handleExport = useCallback((fmt: "csv" | "json") => {
    setShowExportMenu(false); exportMut.mutate({ format: fmt, ...applied });
  }, [exportMut, applied]);

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */
  return (
    <div className="space-y-6 pb-8">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.1)" }}>
            <ScrollText size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Audit Log Explorer</h1>
            <p className="text-sm text-[var(--text-secondary)]">Browse, filter, and verify the immutable audit trail.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Verify Integrity */}
          <button onClick={handleVerify} disabled={verifyMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
            style={{ ...cardSx, color: "var(--text-primary)" }}>
            {verifyMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Verify Integrity
          </button>
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button onClick={() => setShowExportMenu((v) => !v)} disabled={exportMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              style={{ ...cardSx, color: "var(--text-primary)" }}>
              {exportMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border shadow-lg overflow-hidden" style={cardSx}>
                  {(["csv", "json"] as const).map((f) => (
                    <button key={f} onClick={() => handleExport(f)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-1)] transition-colors text-[var(--text-primary)]">
                      Export {f.toUpperCase()}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  Stats Panel (collapsible)                                    */}
      {/* ============================================================ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <button onClick={() => setShowStats((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline mb-3">
          <BarChart3 size={16} /> {showStats ? "Hide Stats" : "Show Stats"}
          <ChevronDown size={14} className={`transition-transform duration-200 ${showStats ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showStats && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              {/* Total events badge */}
              <div className="flex items-center gap-4 mb-4">
                <div className="inline-flex items-center gap-2 rounded-lg border px-4 py-2" style={cardSx}>
                  <span className="text-sm text-[var(--text-secondary)]">Total Events</span>
                  <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                    {statsLoading ? <span className="inline-block w-10 h-5 rounded bg-[var(--surface-2)] animate-pulse" /> : (stats?.totalEvents?.toLocaleString() ?? "--")}
                  </span>
                </div>
              </div>
              {/* Charts 2x2 grid */}
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4 animate-pulse" style={cardSx}>
                      <div className="h-4 w-32 rounded bg-[var(--surface-2)] mb-4" />
                      <div className="h-[180px] rounded bg-[var(--surface-2)]" />
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Events per day */}
                  <div className="rounded-xl border p-4" style={cardSx}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Events Per Day</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.eventsPerDay ?? []}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} tickFormatter={(v: string) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)" }} allowDecimals={false} />
                        <Tooltip contentStyle={ttStyle} />
                        <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <HBarCard title="Top Actors" data={(stats.topActors ?? []).slice(0, 5)} dataKey="count" nameKey="actorName" />
                  <HBarCard title="Top Entity Types" data={(stats.topEntities ?? []).slice(0, 5)} dataKey="count" nameKey="entityType" formatter={humanize} />
                  <HBarCard title="Top Actions" data={(stats.topActions ?? []).slice(0, 5)} dataKey="count" nameKey="action" formatter={humanize} />
                </div>
              ) : (
                <div className="rounded-xl border p-6 text-center text-sm text-[var(--neutral-gray)]" style={cardSx}>No stats available</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ============================================================ */}
      {/*  Filter Bar                                                   */}
      {/* ============================================================ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl border p-4 space-y-4" style={cardSx}>
        {/* Primary row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
            <input type="text" placeholder="Search audit logs..." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              style={inputSx} />
          </div>
          <div className="flex items-center gap-1.5">
            {([["today","Today"],["last7","Last 7 days"],["last30","Last 30 days"],["custom","Custom"]] as const).map(([v,l]) => (
              <button key={v} onClick={() => setDatePreset(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${datePreset === v ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleApply} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--primary)" }}>Apply</button>
            <button onClick={handleClear} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-1)]"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Clear</button>
          </div>
        </div>

        {/* Custom date inputs */}
        <AnimatePresence>
          {datePreset === "custom" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="flex items-center gap-3 pt-1">
                <Calendar size={14} className="text-[var(--text-secondary)]" />
                <label className="text-xs text-[var(--text-secondary)]">From</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border px-3 py-1.5 text-sm" style={inputSx} />
                <label className="text-xs text-[var(--text-secondary)]">To</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border px-3 py-1.5 text-sm" style={inputSx} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Filter size={14} /> Advanced Filters
          <ChevronDown size={12} className={`transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        {/* Advanced filters */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Entity type */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Entity Type</label>
                  <select value={entityType} onChange={(e) => setEntityType(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm" style={inputSx}>
                    <option value="">All types</option>
                    {ENTITY_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
                  </select>
                </div>
                {/* Action */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Action</label>
                  <select value={action} onChange={(e) => setAction(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm" style={inputSx}>
                    <option value="">All actions</option>
                    {ACTIONS.map((a) => <option key={a} value={a}>{humanize(a)}</option>)}
                  </select>
                </div>
                {/* Actor autocomplete */}
                <div className="relative">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Actor</label>
                  <input type="text" placeholder="Search by name..." value={actorQuery}
                    onChange={(e) => { setActorQuery(e.target.value); if (!e.target.value) setActorId(""); }}
                    className="w-full rounded-lg border px-3 py-2 text-sm" style={inputSx} />
                  {actorId && (
                    <button onClick={() => { setActorId(""); setActorQuery(""); }}
                      className="absolute right-2 top-[calc(50%+8px)] -translate-y-1/2 text-[var(--neutral-gray)] hover:text-[var(--text-primary)]">
                      <X size={14} />
                    </button>
                  )}
                  {actorQuery.length >= 2 && !actorId && userResults && userResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border shadow-lg max-h-40 overflow-y-auto" style={cardSx}>
                      {userResults.map((u) => (
                        <button key={u.id} onClick={() => { setActorId(u.id); setActorQuery(u.displayName || u.email); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-1)] transition-colors" style={{ color: "var(--text-primary)" }}>
                          <span className="font-medium">{u.displayName}</span>
                          {u.email && <span className="text-[var(--text-secondary)] ml-2 text-xs">{u.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Entity ID */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Entity ID</label>
                  <input type="text" placeholder="UUID or partial..." value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm font-mono" style={inputSx} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ============================================================ */}
      {/*  Results: Timeline or Table                                   */}
      {/* ============================================================ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        {isTimeline ? (
          /* ---------------------------------------------------------- */
          /*  Entity Timeline View                                      */
          /* ---------------------------------------------------------- */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={handleBackToList} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline">
                <ArrowLeft size={16} /> Back to list
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                Timeline for <span className="font-semibold text-[var(--text-primary)]">{humanize(applied.entityType!)}</span>
                {" "}&middot;{" "}
                <code className="text-xs font-mono bg-[var(--surface-2)] px-1.5 py-0.5 rounded">{applied.entityId!.slice(0, 8)}...</code>
              </span>
            </div>
            {timelineLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-3 h-3 rounded-full bg-[var(--surface-2)] animate-pulse mt-1.5" />
                    <div className="flex-1 rounded-xl border p-4 animate-pulse" style={cardSx}>
                      <div className="h-4 w-40 rounded bg-[var(--surface-2)] mb-2" />
                      <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timelineData && timelineData.length > 0 ? (
              <div className="relative ml-4">
                <div className="absolute left-[5px] top-2 bottom-2 w-0.5" style={{ backgroundColor: "var(--border)" }} />
                <div className="space-y-4">
                  {timelineData.map((ev) => {
                    const c = actionColor(ev.action);
                    return (
                      <div key={ev.id} className="relative flex gap-4">
                        <div className="relative z-10 mt-3 w-3 h-3 rounded-full shrink-0 border-2"
                          style={{ backgroundColor: c.text, borderColor: "var(--surface-0)" }} />
                        <div className="flex-1 rounded-xl border p-4" style={cardSx}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ActionBadge action={ev.action} />
                              <span className="text-sm font-medium text-[var(--text-primary)]">{ev.actorName}</span>
                            </div>
                            <span className="text-xs text-[var(--neutral-gray)] tabular-nums" title={absTime(ev.createdAt)}>
                              {relativeTime(ev.createdAt)}
                            </span>
                          </div>
                          <JsonDiff before={ev.previousState} after={ev.changes} className="mt-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-8 text-center text-sm text-[var(--neutral-gray)]" style={cardSx}>
                No timeline events found for this entity.
              </div>
            )}
          </div>
        ) : (
          /* ---------------------------------------------------------- */
          /*  Results Table                                              */
          /* ---------------------------------------------------------- */
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              {logsLoading ? "Loading..." : `${totalEvents.toLocaleString()} event${totalEvents !== 1 ? "s" : ""} found`}
            </p>
            <div className="rounded-xl border overflow-hidden" style={cardSx}>
              {logsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      {[16, 24, 16, 20, 20].map((w, j) => (
                        <div key={j} className={`h-4 w-${w} animate-pulse rounded bg-[var(--surface-2)]`} />
                      ))}
                      <div className="flex-1" />
                    </div>
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: "var(--border)" }}>
                        {["Timestamp","Actor","Action","Entity Type","Entity ID","IP Address"].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{h}</th>
                        ))}
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {events.map((ev) => {
                        const isExp = expandedRow === ev.id;
                        return (
                          <AnimatePresence key={ev.id}>
                            <tr className="hover:bg-[var(--surface-1)] transition-colors duration-150 cursor-pointer"
                              onClick={() => setExpandedRow(isExp ? null : ev.id)}>
                              <td className="px-4 py-3 text-xs text-[var(--neutral-gray)] tabular-nums whitespace-nowrap" title={absTime(ev.createdAt)}>
                                {relativeTime(ev.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-sm text-[var(--text-primary)] whitespace-nowrap">{ev.actorName}</td>
                              <td className="px-4 py-3"><ActionBadge action={ev.action} /></td>
                              <td className="px-4 py-3 text-sm text-[var(--text-primary)] whitespace-nowrap">{humanize(ev.entityType)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <code className="text-xs font-mono text-[var(--text-secondary)]">{ev.entityId.slice(0, 8)}</code>
                                  <button onClick={(e) => { e.stopPropagation(); copyId(ev.entityId); }}
                                    className="text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors" title="Copy full ID">
                                    {copiedId === ev.entityId ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-[var(--neutral-gray)] tabular-nums whitespace-nowrap">{ev.ipAddress}</td>
                              <td className="px-4 py-3">
                                {isExp ? <ChevronDown size={16} className="text-[var(--text-secondary)]" /> : <ChevronRight size={16} className="text-[var(--text-secondary)]" />}
                              </td>
                            </tr>
                            {/* Expanded detail */}
                            {isExp && (
                              <tr>
                                <td colSpan={7} className="px-0 py-0">
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                    <div className="px-6 py-4 space-y-3" style={{ backgroundColor: "var(--surface-1)" }}>
                                      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                                        <span><span className="font-medium">Role:</span> {ev.actorRole}</span>
                                        <span><span className="font-medium">Correlation:</span>{" "}
                                          <code className="font-mono bg-[var(--surface-2)] px-1 py-0.5 rounded">{ev.correlationId?.slice(0, 12) ?? "--"}</code>
                                        </span>
                                        <span><span className="font-medium">Checksum:</span>{" "}
                                          <code className="font-mono bg-[var(--surface-2)] px-1 py-0.5 rounded">{ev.checksum?.slice(0, 12) ?? "--"}</code>
                                        </span>
                                        <span><span className="font-medium">UA:</span>{" "}
                                          {ev.userAgent ? (ev.userAgent.length > 60 ? ev.userAgent.slice(0, 60) + "..." : ev.userAgent) : "--"}
                                        </span>
                                      </div>
                                      <JsonDiff before={ev.previousState} after={ev.changes} />
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-[var(--neutral-gray)]">No audit events found matching your filters.</div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-[var(--text-secondary)]">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
