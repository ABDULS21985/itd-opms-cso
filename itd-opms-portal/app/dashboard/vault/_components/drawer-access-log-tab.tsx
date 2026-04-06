"use client";

import { Eye, Download, Lock, Unlock, Upload, Edit, Trash2, Share2 } from "lucide-react";
import type { DocumentAccessLogEntry } from "@/hooks/use-vault";
import { formatDateTime } from "./vault-constants";

const ACTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  view: Eye,
  download: Download,
  lock: Lock,
  unlock: Unlock,
  upload: Upload,
  edit: Edit,
  delete: Trash2,
  share: Share2,
};

interface DrawerAccessLogTabProps {
  entries: DocumentAccessLogEntry[];
  isLoading: boolean;
}

export function DrawerAccessLogTab({ entries, isLoading }: DrawerAccessLogTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
        No access log entries.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const ActionIcon = ACTION_ICONS[entry.action] || Eye;
        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-lg border p-3"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <ActionIcon size={14} className="text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)]">
                <span className="font-medium">{entry.userName}</span> {entry.action}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {formatDateTime(entry.createdAt)}
                {entry.ipAddress && <> &middot; {entry.ipAddress}</>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
