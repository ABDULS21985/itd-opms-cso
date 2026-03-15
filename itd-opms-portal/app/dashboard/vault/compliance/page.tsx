"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Archive,
  Lock,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/shared/permission-gate";
import {
  useExpiringSoonDocuments,
  useExpiredDocuments,
  useRetentionReport,
  type ComplianceDocument,
} from "@/hooks/use-vault";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type Tab = "expiring" | "expired" | "retention";

const TABS: { key: Tab; label: string; icon: typeof Clock }[] = [
  { key: "expiring", label: "Expiring Soon", icon: Clock },
  { key: "expired", label: "Expired", icon: AlertTriangle },
  { key: "retention", label: "Retention Report", icon: Archive },
];

const CLASSIFICATION_COLORS: Record<string, string> = {
  public: "#10B981",
  internal: "#3B82F6",
  confidential: "#F59E0B",
  restricted: "#EF4444",
};

/* ------------------------------------------------------------------ */
/*  Compliance Document Row                                            */
/* ------------------------------------------------------------------ */

function ComplianceDocRow({ doc }: { doc: ComplianceDocument }) {
  const now = new Date();
  const expiryDate = doc.expiryDate ? new Date(doc.expiryDate) : null;
  const daysToExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      className="flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
        style={{ backgroundColor: "rgba(99, 102, 241, 0.08)" }}
      >
        <FileText size={16} style={{ color: "#6366F1" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {doc.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            style={{
              backgroundColor: `${CLASSIFICATION_COLORS[doc.classification] ?? "#6366F1"}18`,
              color: CLASSIFICATION_COLORS[doc.classification] ?? "#6366F1",
            }}
          >
            {doc.classification}
          </span>
          {doc.ownerName && (
            <span className="text-xs text-[var(--text-tertiary)]">{doc.ownerName}</span>
          )}
        </div>
      </div>

      {expiryDate && (
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1.5 justify-end">
            <Calendar size={13} className="text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {expiryDate.toLocaleDateString()}
            </span>
          </div>
          {daysToExpiry !== null && (
            <span
              className={cn(
                "text-xs font-medium",
                daysToExpiry < 0
                  ? "text-red-500"
                  : daysToExpiry <= 7
                    ? "text-orange-500"
                    : daysToExpiry <= 30
                      ? "text-yellow-500"
                      : "text-[var(--text-tertiary)]",
              )}
            >
              {daysToExpiry < 0
                ? `${Math.abs(daysToExpiry)}d overdue`
                : daysToExpiry === 0
                  ? "Expires today"
                  : `${daysToExpiry}d remaining`}
            </span>
          )}
        </div>
      )}

      <ChevronRight size={16} className="text-[var(--text-tertiary)] shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expiring Tab                                                       */
/* ------------------------------------------------------------------ */

function ExpiringTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useExpiringSoonDocuments(page, 20);

  const docs: ComplianceDocument[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-16">
        <Clock size={32} className="text-[var(--text-tertiary)] mb-3" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">No documents expiring soon</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Documents with expiry dates within 90 days will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => (
        <ComplianceDocRow key={doc.id} doc={doc} />
      ))}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-[var(--text-tertiary)]">{meta.totalItems} documents</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[var(--text-tertiary)]">{page} / {meta.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expired Tab                                                        */
/* ------------------------------------------------------------------ */

function ExpiredTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useExpiredDocuments(page, 20);

  const docs: ComplianceDocument[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-16">
        <AlertTriangle size={32} className="text-[var(--text-tertiary)] mb-3" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">No expired documents</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Documents past their expiry date will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => (
        <ComplianceDocRow key={doc.id} doc={doc} />
      ))}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-[var(--text-tertiary)]">{meta.totalItems} documents</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[var(--text-tertiary)]">{page} / {meta.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Retention Report Tab                                               */
/* ------------------------------------------------------------------ */

function RetentionTab() {
  const { data: report, isLoading } = useRetentionReport();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  if (!report) return null;

  const metrics = [
    {
      label: "Total with Expiry",
      value: report.totalWithExpiry,
      icon: Calendar,
      color: "#6366F1",
      bg: "rgba(99,102,241,0.08)",
    },
    {
      label: "Currently Expired",
      value: report.expiredCount,
      icon: AlertTriangle,
      color: "#EF4444",
      bg: "rgba(239,68,68,0.08)",
    },
    {
      label: "Expiring in 30 Days",
      value: report.expiringSoon30Days,
      icon: Clock,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      label: "Under Retention Policy",
      value: report.totalWithRetention,
      icon: Archive,
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
    },
    {
      label: "Retention Active",
      value: report.retentionActiveCount,
      icon: ShieldAlert,
      color: "#10B981",
      bg: "rgba(16,185,129,0.08)",
    },
    {
      label: "On Legal Hold",
      value: report.legalHoldCount,
      icon: Lock,
      color: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-4 rounded-xl border p-5"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: m.bg }}
            >
              <m.icon size={18} style={{ color: m.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{m.value.toLocaleString()}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Summary</h3>
        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          <p>
            <span className="font-medium text-[var(--text-primary)]">{report.expiredCount}</span> document
            {report.expiredCount !== 1 ? "s" : ""} have passed their expiry date and may require review
            or archiving.
          </p>
          <p>
            <span className="font-medium text-[var(--text-primary)]">{report.expiringSoon30Days}</span>{" "}
            document{report.expiringSoon30Days !== 1 ? "s" : ""} will expire within the next 30 days.
          </p>
          {report.legalHoldCount > 0 && (
            <p>
              <span className="font-medium text-[var(--text-primary)]">{report.legalHoldCount}</span>{" "}
              document{report.legalHoldCount !== 1 ? "s" : ""} are under legal hold and cannot be
              deleted or modified.
            </p>
          )}
          {report.retentionExpiredCount > 0 && (
            <p className="text-orange-600">
              <span className="font-medium">{report.retentionExpiredCount}</span> document
              {report.retentionExpiredCount !== 1 ? "s" : ""} have exceeded their retention period and
              should be reviewed for disposition.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VaultCompliancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("expiring");

  return (
    <PermissionGate permission="documents.admin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="space-y-6 pb-8"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          >
            <ShieldAlert size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Document Compliance
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Review documents approaching or past expiry, and manage retention policies.
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]",
                )}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "expiring" && <ExpiringTab />}
            {activeTab === "expired" && <ExpiredTab />}
            {activeTab === "retention" && <RetentionTab />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PermissionGate>
  );
}
