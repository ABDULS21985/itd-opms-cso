"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  Plus,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useAccessReviewCampaigns,
  useAccessReviewEntries,
  useRecordAccessReviewDecision,
} from "@/hooks/use-grc";
import type { AccessReviewCampaign, AccessReviewEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCompletionColor(rate: number): string {
  if (rate >= 80) return "#10B981";
  if (rate >= 50) return "#F59E0B";
  if (rate >= 25) return "#F97316";
  return "#EF4444";
}

/* ------------------------------------------------------------------ */
/*  Campaign Card                                                      */
/* ------------------------------------------------------------------ */

function CampaignCard({
  campaign,
  expanded,
  onToggle,
}: {
  campaign: AccessReviewCampaign;
  expanded: boolean;
  onToggle: () => void;
}) {
  const completionColor = getCompletionColor(campaign.completionRate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-5 transition-colors hover:bg-[var(--surface-1)]/50"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {campaign.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={campaign.status} />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: completionColor }}
            >
              {Math.round(campaign.completionRate)}%
            </span>
          </div>
        </div>

        {campaign.scope && (
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
            {campaign.scope}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-3">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {campaign.reviewerIds.length} reviewer
            {campaign.reviewerIds.length !== 1 ? "s" : ""}
          </span>
          {campaign.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Due: {formatDate(campaign.dueDate)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(campaign.completionRate, 100)}%`,
              backgroundColor: completionColor,
            }}
          />
        </div>
      </button>

      {/* Expanded entries */}
      {expanded && (
        <CampaignEntries campaignId={campaign.id} />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Campaign Entries (expanded view)                                    */
/* ------------------------------------------------------------------ */

function CampaignEntries({ campaignId }: { campaignId: string }) {
  const { data: entries, isLoading } = useAccessReviewEntries(campaignId);
  const recordDecision = useRecordAccessReviewDecision(campaignId);

  if (isLoading) {
    return (
      <div className="border-t border-[var(--border)] p-4 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const entryList = entries ?? [];

  if (entryList.length === 0) {
    return (
      <div className="border-t border-[var(--border)] p-4 text-center">
        <p className="text-xs text-[var(--text-secondary)]">
          No entries in this campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)]">
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[var(--surface-0)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">
                User
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">
                Role
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">
                Decision
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--text-secondary)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {entryList.map((entry: AccessReviewEntry) => (
              <tr
                key={entry.id}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <td className="px-4 py-2.5 text-xs text-[var(--text-primary)]">
                  {entry.userId.slice(0, 8)}...
                </td>
                <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">
                  {entry.roleId ? entry.roleId.slice(0, 8) + "..." : "--"}
                </td>
                <td className="px-4 py-2.5">
                  {entry.decision ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.decision === "approved"
                          ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                          : entry.decision === "revoked"
                            ? "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"
                            : "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                      }`}
                    >
                      {entry.decision === "approved" ? (
                        <CheckCircle size={10} />
                      ) : entry.decision === "revoked" ? (
                        <XCircle size={10} />
                      ) : (
                        <Clock size={10} />
                      )}
                      {entry.decision}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!entry.decision && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          recordDecision.mutate({
                            entryId: entry.id,
                            decision: "approved",
                          })
                        }
                        disabled={recordDecision.isPending}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#10B981] hover:bg-[rgba(16,185,129,0.1)] transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={10} />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          recordDecision.mutate({
                            entryId: entry.id,
                            decision: "revoked",
                          })
                        }
                        disabled={recordDecision.isPending}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50"
                      >
                        <XCircle size={10} />
                        Revoke
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccessReviewsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useAccessReviewCampaigns(
    page,
    20,
    status || undefined,
  );

  const campaigns = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
            <Eye size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Access Reviews
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Periodic access certification and entitlement review campaigns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/grc/access-reviews?action=new")
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Campaign
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Campaign List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
            <Eye
              size={40}
              className="mx-auto text-[var(--text-secondary)] mb-3"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              No access review campaigns
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Start a new campaign to review user access entitlements.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/grc/access-reviews?action=new")
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                expanded={expandedId === campaign.id}
                onToggle={() =>
                  setExpandedId(
                    expandedId === campaign.id ? null : campaign.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-secondary)]">
            Showing {campaigns.length} of {meta.totalItems} campaigns
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-[var(--text-secondary)] tabular-nums">
              {page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.min(meta.totalPages, p + 1))
              }
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
