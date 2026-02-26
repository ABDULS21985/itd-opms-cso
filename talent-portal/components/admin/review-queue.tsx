"use client";

import { type ReactNode } from "react";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Inbox,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewColumn<T = any> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

interface ReviewQueueProps<T = any> {
  items: T[];
  columns: ReviewColumn<T>[];
  onAction: (id: string, action: "approve" | "reject" | "request_update") => void;
  emptyMessage?: string;
  keyExtractor?: (item: T) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewQueue<T extends { id: string }>({
  items,
  columns,
  onAction,
  emptyMessage = "No items to review",
  keyExtractor = (item) => item.id,
}: ReviewQueueProps<T>) {
  const alignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] ${alignClass(col.align)} ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                      <Inbox className="h-6 w-6 text-[var(--neutral-gray)]" />
                    </div>
                    <p className="text-sm text-[var(--neutral-gray)]">
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const id = keyExtractor(item);
                return (
                  <tr
                    key={id}
                    className="border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--surface-1)]"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 ${alignClass(col.align)} ${col.className ?? ""}`}
                      >
                        {col.render(item)}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAction(id, "approve")}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--success)] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--success-dark)]"
                          title="Approve"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(id, "reject")}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--error)] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--error-dark)]"
                          title="Reject"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(id, "request_update")}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)]"
                          title="Request Update"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
