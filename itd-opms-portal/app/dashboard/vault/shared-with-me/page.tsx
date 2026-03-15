"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Share2,
  FileText,
  Download,
  Eye,
  Calendar,
  Loader2,
} from "lucide-react";
import { useSharedWithMe, type SharedWithMeDocument } from "@/hooks/use-vault";
import { VaultFolderSidebar } from "../_components/vault-folder-sidebar";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PERMISSION_COLORS: Record<string, string> = {
  read: "#3B82F6",
  edit: "#8B5CF6",
  comment: "#10B981",
  download: "#F59E0B",
};

/* ------------------------------------------------------------------ */
/*  Shared Document Row                                                */
/* ------------------------------------------------------------------ */

function SharedDocumentRow({
  doc,
  onDownload,
}: {
  doc: SharedWithMeDocument;
  onDownload: (id: string) => void;
}) {
  const sharedAt = new Date(doc.sharedAt);
  const expiresAt = doc.shareExpiresAt ? new Date(doc.shareExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;

  return (
    <div
      className="flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
        style={{ backgroundColor: "rgba(99, 102, 241, 0.08)" }}
      >
        <FileText size={18} style={{ color: "#6366F1" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{doc.title}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            style={{
              backgroundColor: `${PERMISSION_COLORS[doc.sharePermission] ?? "#6B7280"}18`,
              color: PERMISSION_COLORS[doc.sharePermission] ?? "#6B7280",
            }}
          >
            {doc.sharePermission}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            Shared by {doc.sharedBy}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
            <Calendar size={11} />
            {sharedAt.toLocaleDateString()}
          </span>
          {expiresAt && (
            <span
              className={`text-xs font-medium ${isExpired ? "text-red-500" : "text-orange-500"}`}
            >
              {isExpired
                ? `Expired ${expiresAt.toLocaleDateString()}`
                : `Expires ${expiresAt.toLocaleDateString()}`}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {(doc.sharePermission === "download" || doc.sharePermission === "edit") && (
          <button
            onClick={() => onDownload(doc.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            title="Download"
          >
            <Download size={15} className="text-[var(--text-secondary)]" />
          </button>
        )}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
          title="Preview"
        >
          <Eye size={15} className="text-[var(--text-secondary)]" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SharedWithMePage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSharedWithMe(page, 20);

  const docs: SharedWithMeDocument[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  const handleDownload = useCallback(async (docId: string) => {
    try {
      const result = await apiClient.get<{ url: string; fileName: string }>(
        `/vault/documents/${docId}/download`,
      );
      window.open(result.url, "_blank");
    } catch {
      toast.error("Failed to get download URL");
    }
  }, []);

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar */}
      <VaultFolderSidebar
        selectedFolderId={null}
        onSelectFolder={() => {}}
        onNewFolder={() => {}}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
            >
              <Share2 size={20} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Shared With Me</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Documents that others have shared with you.
              </p>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-24">
              <Share2 size={32} className="text-[var(--text-tertiary)] mb-3" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No shared documents
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                When someone shares a document with you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <SharedDocumentRow key={doc.id} doc={doc} onDownload={handleDownload} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-tertiary)]">{meta.totalItems} documents</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[var(--text-tertiary)] tabular-nums">
                  {page} / {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
