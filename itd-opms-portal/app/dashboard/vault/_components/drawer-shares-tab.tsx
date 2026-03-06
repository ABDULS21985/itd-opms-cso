"use client";

import { Share2, X, Clock } from "lucide-react";
import { useDocumentShares, useRevokeShare, type DocumentShare } from "@/hooks/use-vault";
import { formatDateTime } from "./vault-constants";

interface DrawerSharesTabProps {
  documentId: string;
  onAddShare: () => void;
}

export function DrawerSharesTab({ documentId, onAddShare }: DrawerSharesTabProps) {
  const { data: shares, isLoading } = useDocumentShares(documentId);
  const revokeMutation = useRevokeShare(documentId);

  const list: DocumentShare[] = Array.isArray(shares) ? shares : [];
  const activeShares = list.filter((s) => !s.revokedAt);
  const revokedShares = list.filter((s) => !!s.revokedAt);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onAddShare}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--surface-1)]"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        <Share2 size={14} />
        Share Document
      </button>

      {activeShares.length === 0 && revokedShares.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
          Not shared with anyone.
        </p>
      )}

      {activeShares.map((share) => (
        <ShareRow
          key={share.id}
          share={share}
          onRevoke={() => revokeMutation.mutate(share.id)}
          isRevoking={revokeMutation.isPending}
        />
      ))}

      {revokedShares.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] pt-2">
            Revoked
          </p>
          {revokedShares.map((share) => (
            <ShareRow key={share.id} share={share} revoked />
          ))}
        </>
      )}
    </div>
  );
}

function ShareRow({
  share,
  onRevoke,
  isRevoking,
  revoked,
}: {
  share: DocumentShare;
  onRevoke?: () => void;
  isRevoking?: boolean;
  revoked?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${revoked ? "opacity-50" : ""}`}
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--surface-2)" }}
      >
        <Share2 size={14} className="text-[var(--text-secondary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {share.sharedWithName || share.sharedWithRole || "Unknown"}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {share.permission} &middot; by {share.sharedByName} &middot;{" "}
          {formatDateTime(share.createdAt)}
        </p>
        {share.expiresAt && (
          <p className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
            <Clock size={10} /> Expires {formatDateTime(share.expiresAt)}
          </p>
        )}
      </div>
      {!revoked && onRevoke && (
        <button
          onClick={onRevoke}
          disabled={isRevoking}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          title="Revoke share"
        >
          <X size={14} className="text-red-500" />
        </button>
      )}
    </div>
  );
}
