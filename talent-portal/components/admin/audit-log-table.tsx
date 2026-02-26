"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  FileText,
  Inbox,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}

interface AuditLogTableProps {
  logs: AuditLog[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getActionColor(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("approve"))
    return "bg-[var(--success-light)] text-[var(--success-dark)]";
  if (lower.includes("delete") || lower.includes("reject") || lower.includes("suspend"))
    return "bg-[var(--error-light)] text-[var(--error-dark)]";
  if (lower.includes("update") || lower.includes("edit"))
    return "bg-[var(--warning-light)] text-[var(--warning-dark)]";
  return "bg-[var(--info-light)] text-[var(--info-dark)]";
}

// ---------------------------------------------------------------------------
// JSON Diff viewer
// ---------------------------------------------------------------------------

function JsonDiff({
  previous,
  current,
}: {
  previous: Record<string, unknown> | null;
  current: Record<string, unknown> | null;
}) {
  if (!previous && !current) {
    return (
      <p className="text-xs text-[var(--neutral-gray)]">No data available</p>
    );
  }

  const allKeys = new Set([
    ...Object.keys(previous ?? {}),
    ...Object.keys(current ?? {}),
  ]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {/* Previous */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
          Previous
        </p>
        <pre className="overflow-x-auto rounded-lg bg-[var(--error-light)] p-3 text-[11px] leading-relaxed text-[var(--error-dark)]">
          {previous ? JSON.stringify(previous, null, 2) : "null"}
        </pre>
      </div>
      {/* New */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
          New
        </p>
        <pre className="overflow-x-auto rounded-lg bg-[var(--success-light)] p-3 text-[11px] leading-relaxed text-[var(--success-dark)]">
          {current ? JSON.stringify(current, null, 2) : "null"}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
              <th className="w-8 px-2 py-3" />
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Timestamp
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Actor
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Action
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Entity
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Entity ID
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                      <Inbox className="h-6 w-6 text-[var(--neutral-gray)]" />
                    </div>
                    <p className="text-sm text-[var(--neutral-gray)]">
                      No audit logs found
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const hasDiff = log.previousValues || log.newValues;

                return (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => hasDiff && toggleExpand(log.id)}
                      className={`border-b border-[var(--border)] transition-colors last:border-b-0 ${
                        hasDiff
                          ? "cursor-pointer hover:bg-[var(--surface-1)]"
                          : ""
                      } ${isExpanded ? "bg-[var(--surface-1)]" : ""}`}
                    >
                      <td className="px-2 py-3.5 text-center">
                        {hasDiff &&
                          (isExpanded ? (
                            <ChevronDown className="mx-auto h-4 w-4 text-[var(--neutral-gray)]" />
                          ) : (
                            <ChevronRight className="mx-auto h-4 w-4 text-[var(--neutral-gray)]" />
                          ))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10">
                            <User className="h-3 w-3 text-[var(--primary)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-[var(--foreground)]">
                              {log.actorName}
                            </p>
                            <p className="truncate text-[10px] text-[var(--neutral-gray)]">
                              {log.actorEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${getActionColor(log.action)}`}
                        >
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--foreground)]">
                          <FileText className="h-3 w-3 text-[var(--neutral-gray)]" />
                          {log.entityType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--foreground)]">
                          {log.entityId}
                        </code>
                      </td>
                      <td className="max-w-[200px] px-4 py-3.5">
                        <p className="truncate text-xs text-[var(--neutral-gray)]">
                          {log.reason ?? "-"}
                        </p>
                      </td>
                    </tr>

                    {/* Expanded diff */}
                    {isExpanded && hasDiff && (
                      <tr key={`${log.id}-diff`}>
                        <td
                          colSpan={7}
                          className="border-b border-[var(--border)] bg-[var(--surface-1)] px-6 py-4"
                        >
                          <JsonDiff
                            previous={log.previousValues}
                            current={log.newValues}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
