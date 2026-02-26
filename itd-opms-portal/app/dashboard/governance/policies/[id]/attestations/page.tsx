"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Rocket,
  Loader2,
  X,
} from "lucide-react";
import {
  usePolicy,
  useAttestationStatus,
  useLaunchCampaign,
} from "@/hooks/use-governance";
import { FormField } from "@/components/shared/form-field";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AttestationDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: policy } = usePolicy(id);
  const { data: status, isLoading } = useAttestationStatus(id);
  const launchCampaign = useLaunchCampaign(id);

  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [campaignDueDate, setCampaignDueDate] = useState("");
  const [campaignScope, setCampaignScope] = useState("all_users");

  function handleLaunchCampaign() {
    if (!campaignDueDate) return;

    launchCampaign.mutate(
      {
        policyId: id,
        policyVersion: policy?.version ?? 1,
        targetScope: campaignScope,
        dueDate: campaignDueDate,
      },
      {
        onSuccess: () => {
          setShowLaunchModal(false);
          setCampaignDueDate("");
          setCampaignScope("all_users");
        },
      },
    );
  }

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading attestation data...
          </p>
        </div>
      </div>
    );
  }

  const completionRate = status?.completionRate ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/governance/policies/${id}`)
          }
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Policy
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Attestation Dashboard
              </h1>
              <p className="text-sm text-[var(--neutral-gray)]">
                {policy?.title ?? "Policy"} &mdash; v{policy?.version ?? 1}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLaunchModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Rocket size={16} />
            Launch Campaign
          </button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Total Users
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {status?.totalUsers ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Attested
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {status?.attestedCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Pending
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {status?.pendingCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
              Overdue
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {status?.overdueCount ?? 0}
          </p>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Completion Rate
          </h2>
          <span className="text-sm font-bold text-[var(--primary)] tabular-nums">
            {completionRate.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              backgroundColor:
                completionRate >= 80
                  ? "var(--success, #22c55e)"
                  : completionRate >= 50
                    ? "var(--warning, #f59e0b)"
                    : "var(--error, #ef4444)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--neutral-gray)]">
          <span>
            {status?.attestedCount ?? 0} of {status?.totalUsers ?? 0} users
            attested
          </span>
          <span>
            {status?.pendingCount ?? 0} pending, {status?.overdueCount ?? 0}{" "}
            overdue
          </span>
        </div>
      </motion.div>

      {/* Empty state when no data */}
      {!status || status.totalUsers === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-16"
        >
          <ShieldCheck
            size={32}
            className="mb-3 text-[var(--neutral-gray)]/40"
          />
          <p className="text-sm font-medium text-[var(--neutral-gray)]">
            No attestation campaigns yet
          </p>
          <p className="mt-1 text-xs text-[var(--neutral-gray)]/70">
            Launch a campaign to start tracking policy attestations
          </p>
        </motion.div>
      ) : null}

      {/* Launch Campaign Modal */}
      <AnimatePresence>
        {showLaunchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowLaunchModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Launch Attestation Campaign
                </h2>
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
                  className="rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <FormField
                  label="Target Scope"
                  name="campaignScope"
                  type="select"
                  value={campaignScope}
                  onChange={setCampaignScope}
                  options={[
                    { value: "all_users", label: "All Users" },
                    { value: "tenant_users", label: "Tenant Users Only" },
                    { value: "specific_users", label: "Specific Users" },
                  ]}
                />

                <FormField
                  label="Due Date"
                  name="campaignDueDate"
                  type="date"
                  value={campaignDueDate}
                  onChange={setCampaignDueDate}
                  required
                />

                <div className="rounded-xl bg-[var(--surface-1)] p-3">
                  <p className="text-xs text-[var(--neutral-gray)]">
                    Policy: <strong>{policy?.title}</strong>
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    Version: <strong>v{policy?.version ?? 1}</strong>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={!campaignDueDate || launchCampaign.isPending}
                  className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {launchCampaign.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Rocket size={16} />
                  )}
                  Launch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
