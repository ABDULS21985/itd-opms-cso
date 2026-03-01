"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Edit,
  GitCompare,
  ShieldCheck,
  Clock,
  Loader2,
  Send,
  CheckCircle,
  Globe,
  Archive,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  usePolicy,
  usePolicyVersions,
  useSubmitPolicy,
  useApprovePolicy,
  usePublishPolicy,
  useRetirePolicy,
} from "@/hooks/use-governance";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: policy, isLoading } = usePolicy(id);
  const { data: versions } = usePolicyVersions(id);

  const submitPolicy = useSubmitPolicy();
  const approvePolicy = useApprovePolicy();
  const publishPolicy = usePublishPolicy();
  const retirePolicy = useRetirePolicy();

  const isActing =
    submitPolicy.isPending ||
    approvePolicy.isPending ||
    publishPolicy.isPending ||
    retirePolicy.isPending;

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading policy...
          </p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">Policy not found.</p>
      </div>
    );
  }

  /* ---- Status actions ---- */

  function renderStatusActions() {
    if (!policy) return null;
    const s = policy.status.toLowerCase();

    if (s === "draft") {
      return (
        <button
          type="button"
          disabled={isActing}
          onClick={() => submitPolicy.mutate(policy.id)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitPolicy.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Submit for Review
        </button>
      );
    }

    if (s === "in_review") {
      return (
        <button
          type="button"
          disabled={isActing}
          onClick={() => approvePolicy.mutate(policy.id)}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {approvePolicy.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle size={16} />
          )}
          Approve
        </button>
      );
    }

    if (s === "approved") {
      return (
        <button
          type="button"
          disabled={isActing}
          onClick={() => publishPolicy.mutate(policy.id)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {publishPolicy.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Globe size={16} />
          )}
          Publish
        </button>
      );
    }

    if (s === "published") {
      return (
        <button
          type="button"
          disabled={isActing}
          onClick={() => retirePolicy.mutate(policy.id)}
          className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {retirePolicy.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Archive size={16} />
          )}
          Retire
        </button>
      );
    }

    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/governance/policies")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Policies
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <FileText size={24} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {policy.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={policy.status} />
              <span className="text-xs text-[var(--neutral-gray)]">
                v{policy.version}
              </span>
              {policy.category && (
                <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                  {policy.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {renderStatusActions()}
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/governance/policies/${id}/edit`)
            }
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/governance/policies/${id}/diff`)
            }
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <GitCompare size={16} />
            View Diff
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/governance/policies/${id}/attestations`,
              )
            }
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <ShieldCheck size={16} />
            Attestations
          </button>
        </div>
      </motion.div>

      {/* Detail Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Effective Date
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {policy.effectiveDate
              ? new Date(policy.effectiveDate).toLocaleDateString()
              : "Not set"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Review Date
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {policy.reviewDate
              ? new Date(policy.reviewDate).toLocaleDateString()
              : "Not set"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Expiry Date
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {policy.expiryDate
              ? new Date(policy.expiryDate).toLocaleDateString()
              : "Not set"}
          </p>
        </div>
      </motion.div>

      {/* Description */}
      {policy.description && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            Description
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {policy.description}
          </p>
        </motion.div>
      )}

      {/* Tags */}
      {policy.tags && policy.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.17 }}
          className="flex flex-wrap gap-2"
        >
          {policy.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Policy Content
        </h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
          {policy.content}
        </div>
      </motion.div>

      {/* Version History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Version History
        </h2>
        {!versions || versions.length === 0 ? (
          <p className="text-sm text-[var(--neutral-gray)]">
            No version history yet.
          </p>
        ) : (
          <div className="space-y-3">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                  <Clock size={16} className="text-[var(--neutral-gray)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Version {v.version}
                    </span>
                    <span className="text-xs text-[var(--neutral-gray)]">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {v.title}
                  </p>
                  {v.changesSummary && (
                    <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                      {v.changesSummary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Metadata
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Scope Type
            </dt>
            <dd className="capitalize text-[var(--text-primary)]">
              {policy.scopeType}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Owner ID
            </dt>
            <dd className="text-[var(--text-primary)]">
              {policy.ownerId || "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Created By
            </dt>
            <dd className="text-[var(--text-primary)]">{policy.createdBy}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Last Updated
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(policy.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}
