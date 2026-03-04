"use client";

import { Upload } from "lucide-react";
import type { VaultDocument } from "@/hooks/use-vault";
import { formatFileSize, formatDateTime } from "./vault-constants";

interface DrawerVersionsTabProps {
  versions: VaultDocument[] | undefined;
  isLoading: boolean;
  onUploadVersion: () => void;
}

export function DrawerVersionsTab({ versions, isLoading, onUploadVersion }: DrawerVersionsTabProps) {
  const list = Array.isArray(versions) ? versions : [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onUploadVersion}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--surface-1)]"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        <Upload size={14} />
        Upload New Version
      </button>

      {list.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
          No version history available.
        </p>
      ) : (
        list.map((ver) => (
          <div
            key={ver.id}
            className="flex items-center gap-3 rounded-lg border p-3"
            style={{
              borderColor: ver.isLatest ? "var(--primary)" : "var(--border)",
              backgroundColor: ver.isLatest ? "rgba(59, 130, 246, 0.04)" : "var(--surface-0)",
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <span className="text-xs font-bold text-[var(--text-primary)]">v{ver.version}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {ver.fileName}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {ver.uploaderName} &middot; {formatDateTime(ver.createdAt)} &middot;{" "}
                {formatFileSize(ver.sizeBytes)}
              </p>
            </div>
            {ver.isLatest && (
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "var(--primary)" }}
              >
                Latest
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
