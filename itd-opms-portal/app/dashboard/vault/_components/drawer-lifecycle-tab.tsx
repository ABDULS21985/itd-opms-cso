"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  useDocumentLifecycle,
  useTransitionStatus,
  type VaultDocument,
  type DocumentLifecycleEntry,
} from "@/hooks/use-vault";
import { StatusBadge } from "./status-badge";
import { VALID_TRANSITIONS, statusLabel, formatDateTime } from "./vault-constants";

interface DrawerLifecycleTabProps {
  doc: VaultDocument;
}

export function DrawerLifecycleTab({ doc }: DrawerLifecycleTabProps) {
  const { data: lifecycle, isLoading } = useDocumentLifecycle(doc.id);
  const transitionMutation = useTransitionStatus(doc.id);
  const [reason, setReason] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const entries: DocumentLifecycleEntry[] = Array.isArray(lifecycle) ? lifecycle : [];
  const allowedTransitions = VALID_TRANSITIONS[doc.status] || [];

  const handleTransition = () => {
    if (!selectedStatus) return;
    transitionMutation.mutate(
      { toStatus: selectedStatus, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setSelectedStatus("");
          setReason("");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
          Current Status
        </p>
        <StatusBadge status={doc.status} />
      </div>

      {/* Transition controls */}
      {allowedTransitions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Transition To
          </p>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: selectedStatus === status ? "var(--primary)" : "var(--border)",
                  backgroundColor: selectedStatus === status ? "rgba(59, 130, 246, 0.08)" : "transparent",
                  color: selectedStatus === status ? "var(--primary)" : "var(--text-primary)",
                }}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>
          {selectedStatus && (
            <div className="space-y-2 pt-1">
              <input
                type="text"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={handleTransition}
                disabled={transitionMutation.isPending}
                className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {transitionMutation.isPending ? "Updating..." : `Move to ${statusLabel(selectedStatus)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
          History
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--surface-2)]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
            No lifecycle transitions recorded.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 rounded-lg border p-3"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
              >
                <StatusBadge status={entry.fromStatus} />
                <ArrowRight size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <StatusBadge status={entry.toStatus} />
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {entry.changedByName}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
