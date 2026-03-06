"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  useDocuments,
  useFolders,
  useDeleteDocument,
  useLockDocument,
  useUnlockDocument,
  useArchiveDocument,
  useRestoreDocument,
  type VaultDocument,
  type DocumentFolder,
} from "@/hooks/use-vault";
import { apiClient } from "@/lib/api-client";
import { EmptyState } from "@/components/shared/empty-state";

import { VaultFolderSidebar } from "./_components/vault-folder-sidebar";
import { VaultToolbar } from "./_components/vault-toolbar";
import { VaultBreadcrumbs } from "./_components/vault-breadcrumbs";
import { VaultDocumentGrid } from "./_components/vault-document-grid";
import { VaultDocumentList } from "./_components/vault-document-list";
import { VaultPagination } from "./_components/vault-pagination";
import { VaultDocumentDrawer } from "./_components/vault-document-drawer";
import { VaultUploadDialog } from "./_components/vault-upload-dialog";
import { VaultNewFolderDialog } from "./_components/vault-new-folder-dialog";
import { VaultShareDialog } from "./_components/vault-share-dialog";
import { VaultMoveDialog } from "./_components/vault-move-dialog";
import { VaultVersionUploadDialog } from "./_components/vault-version-upload-dialog";

export default function VaultPage() {
  const { user } = useAuth();

  // ── Navigation & filter state ──────────────────
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classification, setClassification] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // ── Drawer state ───────────────────────────────
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // ── Dialog state ───────────────────────────────
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [moveDocId, setMoveDocId] = useState<string | null>(null);
  const [versionUploadDocId, setVersionUploadDocId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────
  const { data: docsResponse, isLoading: docsLoading } = useDocuments({
    page,
    limit: 20,
    folderId: selectedFolderId || undefined,
    classification: classification || undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });

  const { data: foldersData } = useFolders();

  // ── Mutations ──────────────────────────────────
  const deleteMutation = useDeleteDocument();
  const lockMutation = useLockDocument();
  const unlockMutation = useUnlockDocument();
  const archiveMutation = useArchiveDocument();
  const restoreMutation = useRestoreDocument();

  // ── Derived data ───────────────────────────────
  const documents: VaultDocument[] = useMemo(() => {
    if (!docsResponse) return [];
    if (Array.isArray(docsResponse)) return docsResponse;
    if ((docsResponse as any).data) return (docsResponse as any).data;
    return [];
  }, [docsResponse]);

  const totalPages = useMemo(() => {
    if (!docsResponse) return 1;
    if ((docsResponse as any).meta?.totalPages) return (docsResponse as any).meta.totalPages;
    return 1;
  }, [docsResponse]);

  const folders = useMemo<DocumentFolder[]>(() => {
    if (!foldersData) return [];
    return Array.isArray(foldersData) ? foldersData : [];
  }, [foldersData]);

  // ── Handlers ───────────────────────────────────
  const handleFolderSelect = useCallback((id: string | null) => {
    setSelectedFolderId(id);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleClassificationChange = useCallback((value: string) => {
    setClassification(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleDocSelect = useCallback((id: string) => {
    setSelectedDocId(id);
  }, []);

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

  const handleDelete = useCallback(
    (docId: string) => {
      if (!window.confirm("Are you sure you want to delete this document?")) return;
      deleteMutation.mutate(docId, {
        onSuccess: () => {
          if (selectedDocId === docId) setSelectedDocId(null);
        },
      });
    },
    [deleteMutation, selectedDocId],
  );

  const handleLock = useCallback(
    (id: string) => lockMutation.mutate(id),
    [lockMutation],
  );

  const handleUnlock = useCallback(
    (id: string) => unlockMutation.mutate(id),
    [unlockMutation],
  );

  const handleArchive = useCallback(
    (id: string) => {
      if (!window.confirm("Archive this document?")) return;
      archiveMutation.mutate(id);
    },
    [archiveMutation],
  );

  const handleRestore = useCallback(
    (id: string) => restoreMutation.mutate(id),
    [restoreMutation],
  );

  // ── Render ─────────────────────────────────────
  return (
    <div className="flex h-full gap-0">
      {/* Left Sidebar */}
      <VaultFolderSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleFolderSelect}
        onNewFolder={() => setShowNewFolderDialog(true)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <VaultToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          classification={classification}
          onClassificationChange={handleClassificationChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewFolder={() => setShowNewFolderDialog(true)}
          onUpload={() => setShowUploadDialog(true)}
        />

        <VaultBreadcrumbs
          selectedFolderId={selectedFolderId}
          folders={folders}
          onNavigate={handleFolderSelect}
        />

        {/* Document Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {docsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={
                searchQuery
                  ? "Try a different search query or clear the filters."
                  : "Upload your first document to get started."
              }
              action={
                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <Upload size={16} />
                  Upload Document
                </button>
              }
            />
          ) : viewMode === "grid" ? (
            <VaultDocumentGrid
              documents={documents}
              onSelect={handleDocSelect}
              onDownload={handleDownload}
            />
          ) : (
            <VaultDocumentList
              documents={documents}
              onSelect={handleDocSelect}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}

          <VaultPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Document Detail Drawer */}
      <VaultDocumentDrawer
        documentId={selectedDocId}
        currentUserId={user?.id}
        onClose={() => setSelectedDocId(null)}
        onDownload={handleDownload}
        onLock={handleLock}
        onUnlock={handleUnlock}
        onDelete={handleDelete}
        onShare={(id) => setShareDocId(id)}
        onMove={(id) => setMoveDocId(id)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onUploadVersion={(id) => setVersionUploadDocId(id)}
      />

      {/* Dialogs */}
      <VaultUploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        folderId={selectedFolderId}
      />
      <VaultNewFolderDialog
        open={showNewFolderDialog}
        onClose={() => setShowNewFolderDialog(false)}
        parentFolderId={selectedFolderId}
      />
      <VaultShareDialog
        open={!!shareDocId}
        onClose={() => setShareDocId(null)}
        documentId={shareDocId}
      />
      <VaultMoveDialog
        open={!!moveDocId}
        onClose={() => setMoveDocId(null)}
        documentId={moveDocId}
      />
      <VaultVersionUploadDialog
        open={!!versionUploadDocId}
        onClose={() => setVersionUploadDocId(null)}
        documentId={versionUploadDocId}
      />
    </div>
  );
}
