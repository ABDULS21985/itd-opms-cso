"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, GitCompare, Loader2 } from "lucide-react";
import { usePolicyVersions, usePolicyDiff } from "@/hooks/use-governance";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PolicyDiffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: versions, isLoading: versionsLoading } =
    usePolicyVersions(id);

  const [v1, setV1] = useState<number | undefined>(undefined);
  const [v2, setV2] = useState<number | undefined>(undefined);

  const {
    data: diff,
    isLoading: diffLoading,
    isFetching: diffFetching,
  } = usePolicyDiff(id, v1, v2);

  const canCompare = v1 !== undefined && v2 !== undefined && v1 !== v2;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
            <GitCompare size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Version Comparison
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Compare two versions of this policy side by side
            </p>
          </div>
        </div>
      </motion.div>

      {/* Version selectors */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex-1 min-w-[140px]">
          <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
            From Version (older)
          </label>
          <select
            value={v1 ?? ""}
            onChange={(e) =>
              setV1(e.target.value ? Number(e.target.value) : undefined)
            }
            disabled={versionsLoading}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">Select version...</option>
            {versions?.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version} &mdash; {v.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
            To Version (newer)
          </label>
          <select
            value={v2 ?? ""}
            onChange={(e) =>
              setV2(e.target.value ? Number(e.target.value) : undefined)
            }
            disabled={versionsLoading}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">Select version...</option>
            {versions?.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version} &mdash; {v.title}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Diff display */}
      {!canCompare && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-16">
          <GitCompare
            size={32}
            className="mb-3 text-[var(--neutral-gray)]/40"
          />
          <p className="text-sm font-medium text-[var(--neutral-gray)]">
            Select two different versions to compare
          </p>
        </div>
      )}

      {canCompare && (diffLoading || diffFetching) && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
        </div>
      )}

      {canCompare && diff && !diffLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Title diff */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Title
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="mb-1 text-xs font-medium text-red-600">
                  v{diff.v1} (old)
                </p>
                <p className="text-sm text-red-900">{diff.oldTitle}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="mb-1 text-xs font-medium text-green-600">
                  v{diff.v2} (new)
                </p>
                <p className="text-sm text-green-900">{diff.newTitle}</p>
              </div>
            </div>
          </div>

          {/* Content diff */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Content
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 overflow-auto max-h-[500px]">
                <p className="mb-2 text-xs font-medium text-red-600">
                  v{diff.v1} (old)
                </p>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-red-900 font-mono">
                  {diff.oldContent}
                </pre>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 overflow-auto max-h-[500px]">
                <p className="mb-2 text-xs font-medium text-green-600">
                  v{diff.v2} (new)
                </p>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-green-900 font-mono">
                  {diff.newContent}
                </pre>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
