"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileText,
  FolderOpen,
  FolderPlus,
  LockKeyhole,
  Shield,
  Sparkles,
  Upload,
} from "lucide-react";
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
  useVaultStats,
  type VaultDocument,
  type DocumentFolder,
} from "@/hooks/use-vault";
import { apiClient } from "@/lib/api-client";
import { EmptyState } from "@/components/shared/empty-state";

import {
  classificationLabel,
  formatFileSize,
  statusLabel,
} from "./_components/vault-constants";
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

function formatVaultDate(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function MetricCard({
  label,
  value,
  helper,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  helper: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: `${color}22`,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}14, transparent 30%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color }}>
        {loading ? <LoadingValue /> : value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function MixRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[var(--surface-1)] px-4 py-3">
      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
      <span
        className="rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{
          backgroundColor: `${color}18`,
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function getVaultPulse(totalDocuments: number, attentionCount: number) {
  if (totalDocuments === 0) {
    return {
      label: "Ready to build",
      badgeClass:
        "border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      description:
        "No vault inventory is live yet, so the immediate priority is standing up folders, classifications, and the first governed upload flows.",
    };
  }

  if (attentionCount >= Math.max(3, Math.ceil(totalDocuments * 0.2))) {
    return {
      label: "Needs review",
      badgeClass:
        "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description:
        "Several documents are sitting in review, expired, or rejected states, so the vault needs active governance rather than passive storage.",
    };
  }

  if (attentionCount > 0) {
    return {
      label: "Active oversight",
      badgeClass:
        "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description:
        "The vault is healthy overall, but a few documents still need owners to resolve review or lifecycle issues.",
    };
  }

  return {
    label: "Well governed",
    badgeClass:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description:
      "Document control, classification, and lifecycle posture are in a stable range with little visible operational friction.",
  };
}

export default function VaultPage() {
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classification, setClassification] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [moveDocId, setMoveDocId] = useState<string | null>(null);
  const [versionUploadDocId, setVersionUploadDocId] = useState<string | null>(
    null,
  );

  const { data: docsResponse, isLoading: docsLoading } = useDocuments({
    page,
    limit: 20,
    folderId: selectedFolderId || undefined,
    classification: classification || undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });

  const { data: foldersData } = useFolders();
  const { data: statsData, isLoading: statsLoading } = useVaultStats();

  const deleteMutation = useDeleteDocument();
  const lockMutation = useLockDocument();
  const unlockMutation = useUnlockDocument();
  const archiveMutation = useArchiveDocument();
  const restoreMutation = useRestoreDocument();

  const documents: VaultDocument[] = useMemo(() => {
    if (!docsResponse) return [];
    if (Array.isArray(docsResponse)) return docsResponse;
    if ("data" in docsResponse && Array.isArray(docsResponse.data)) {
      return docsResponse.data;
    }
    return [];
  }, [docsResponse]);

  const documentMeta = useMemo(() => {
    if (!docsResponse || Array.isArray(docsResponse)) return undefined;
    if ("meta" in docsResponse) return docsResponse.meta;
    return undefined;
  }, [docsResponse]);

  const totalPages = documentMeta?.totalPages ?? 1;
  const totalVisibleResults = documentMeta?.totalItems ?? documents.length;

  const folders = useMemo<DocumentFolder[]>(() => {
    if (!foldersData) return [];
    return Array.isArray(foldersData) ? foldersData : [];
  }, [foldersData]);

  const currentFolder = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const activeFiltersCount = [
    selectedFolderId,
    searchQuery.trim(),
    classification,
    statusFilter,
  ].filter(Boolean).length;

  const visibleLockedCount = documents.filter((doc) =>
    Boolean(doc.lockedBy),
  ).length;
  const visibleConfidentialCount = documents.filter(
    (doc) => doc.confidential || doc.accessLevel === "confidential",
  ).length;
  const visibleAttentionCount = documents.filter((doc) =>
    ["under_review", "expired", "rejected"].includes(doc.status),
  ).length;
  const visibleExpiringSoonCount = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    const diffMs = new Date(doc.expiryDate).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  const globalAttentionCount = useMemo(() => {
    if (!statsData?.byStatus) return visibleAttentionCount;
    return ["under_review", "expired", "rejected"].reduce(
      (sum, key) => sum + (statsData.byStatus[key] ?? 0),
      0,
    );
  }, [statsData?.byStatus, visibleAttentionCount]);

  const classificationMix = useMemo(() => {
    const counts = documents.reduce<Record<string, number>>((acc, doc) => {
      acc[doc.classification] = (acc[doc.classification] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [documents]);

  const statusMix = useMemo(() => {
    const counts = documents.reduce<Record<string, number>>((acc, doc) => {
      acc[doc.status] = (acc[doc.status] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [documents]);

  const spotlightDocuments = useMemo(() => {
    const attentionDocs = documents.filter((doc) =>
      ["under_review", "expired", "rejected"].includes(doc.status),
    );
    const source = attentionDocs.length > 0 ? attentionDocs : documents;

    return [...source]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 4);
  }, [documents]);

  const latestDocument = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0],
    [documents],
  );

  const vaultPulse = getVaultPulse(
    statsData?.totalDocuments ?? documents.length,
    globalAttentionCount,
  );

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
      if (!window.confirm("Are you sure you want to delete this document?")) {
        return;
      }

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

  const handleResetView = useCallback(() => {
    setSelectedFolderId(null);
    setSearchQuery("");
    setClassification("");
    setStatusFilter("");
    setPage(1);
  }, []);

  const handleReviewAttention = useCallback(() => {
    if ((statsData?.byStatus?.expired ?? 0) > 0) {
      setStatusFilter("expired");
    } else if ((statsData?.byStatus?.under_review ?? 0) > 0) {
      setStatusFilter("under_review");
    } else if ((statsData?.byStatus?.rejected ?? 0) > 0) {
      setStatusFilter("rejected");
    } else {
      setStatusFilter("under_review");
    }
    setPage(1);
  }, [statsData?.byStatus]);

  return (
    <div className="flex h-full min-h-0 gap-0">
      <VaultFolderSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleFolderSelect}
        onNewFolder={() => setShowNewFolderDialog(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "rgba(14, 165, 233, 0.16)",
                backgroundImage:
                  "radial-gradient(circle at 12% 18%, rgba(14,165,233,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(16,185,129,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                boxShadow: "0 28px 90px -58px rgba(14, 165, 233, 0.28)",
              }}
            >
              <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${vaultPulse.badgeClass}`}
                    >
                      <Sparkles size={14} />
                      {vaultPulse.label}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                      <Shield size={14} className="text-[#0EA5E9]" />
                      Secure document vault
                    </span>
                  </div>

                  <div className="max-w-3xl">
                    <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                      Document vault
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                      Controlled storage, classification, and document lifecycle
                      operations in a stronger command center so teams can see
                      what is governed, what is at risk, and what needs action
                      now.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setShowUploadDialog(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <Upload size={16} />
                      Upload Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewFolderDialog(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <FolderPlus size={16} />
                      New Folder
                    </button>
                    <button
                      type="button"
                      onClick={handleReviewAttention}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <AlertTriangle size={16} />
                      Review watchlist
                    </button>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetView}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                      >
                        Reset view
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-[28px] border p-5"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.74)",
                    borderColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(18px)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Vault pulse
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Governance telemetry
                      </h2>
                    </div>
                    <Activity size={20} className="text-[var(--primary)]" />
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                    {vaultPulse.description}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Watchlist
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                        {statsLoading ? (
                          <LoadingValue width="w-16" />
                        ) : (
                          globalAttentionCount
                        )}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Locked in view
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                        {docsLoading ? (
                          <LoadingValue width="w-16" />
                        ) : (
                          visibleLockedCount
                        )}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Confidential in view
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                        {docsLoading ? (
                          <LoadingValue width="w-16" />
                        ) : (
                          visibleConfidentialCount
                        )}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Scope
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                        {currentFolder?.name ?? "All documents"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Documents in vault"
                value={statsData?.totalDocuments ?? documents.length}
                helper="Total controlled inventory currently managed by the vault."
                color="#0EA5E9"
                loading={statsLoading}
              />
              <MetricCard
                label="Storage footprint"
                value={formatFileSize(statsData?.totalSizeBytes ?? 0)}
                helper="Current storage consumed by governed vault content."
                color="#10B981"
                loading={statsLoading}
              />
              <MetricCard
                label="Folder structure"
                value={statsData?.totalFolders ?? folders.length}
                helper="Folder lanes available for teams, records, and operational grouping."
                color="#2563EB"
                loading={statsLoading}
              />
              <MetricCard
                label="Uploaded this week"
                value={statsData?.recentUploads ?? 0}
                helper="Recent intake velocity across the current vault environment."
                color="#D97706"
                loading={statsLoading}
              />
            </div>

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

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3">
              <VaultBreadcrumbs
                selectedFolderId={selectedFolderId}
                folders={folders}
                onNavigate={handleFolderSelect}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <section className="space-y-4">
                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Document workspace
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Live document board
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        Browsing {currentFolder?.name ?? "all documents"} with{" "}
                        {totalVisibleResults} result
                        {totalVisibleResults !== 1 ? "s" : ""} across the
                        current vault lens.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <FolderOpen size={14} />
                        {currentFolder?.name ?? "All documents"}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <LockKeyhole size={14} />
                        {viewMode} view
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <Clock3 size={14} />
                        {activeFiltersCount} active filter
                        {activeFiltersCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {activeFiltersCount > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedFolderId && currentFolder && (
                        <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                          Folder: {currentFolder.name}
                        </span>
                      )}
                      {classification && (
                        <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                          Classification: {classificationLabel(classification)}
                        </span>
                      )}
                      {statusFilter && (
                        <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                          Status: {statusLabel(statusFilter)}
                        </span>
                      )}
                      {searchQuery.trim() && (
                        <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                          Search: {searchQuery.trim()}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-6">
                    {docsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((index) => (
                          <div
                            key={index}
                            className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]"
                          />
                        ))}
                      </div>
                    ) : documents.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="No documents found"
                        description={
                          searchQuery ||
                          classification ||
                          statusFilter ||
                          selectedFolderId
                            ? "Try a different search query, reset the current lens, or switch to another folder scope."
                            : "Upload your first document to establish the vault workspace and start governing document flows."
                        }
                        action={
                          <button
                            type="button"
                            onClick={() => setShowUploadDialog(true)}
                            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
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
                  </div>

                  {documents.length > 0 && (
                    <div className="mt-6">
                      <VaultPagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                      />
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-5">
                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Scope telemetry
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Access posture
                      </h2>
                    </div>
                    <Shield size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Current scope
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        {currentFolder?.name ?? "All documents"}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Latest activity
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        {latestDocument
                          ? `${latestDocument.title} updated ${formatVaultDate(latestDocument.updatedAt)}`
                          : "No document activity yet"}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--surface-1)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Expiring soon
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        {visibleExpiringSoonCount} document
                        {visibleExpiringSoonCount !== 1 ? "s" : ""} within 30
                        days
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Spotlight
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Document spotlight
                      </h2>
                    </div>
                    <ArrowRight size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {spotlightDocuments.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[var(--border)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
                        Content highlighted here will appear once the vault has
                        at least one document in scope.
                      </div>
                    ) : (
                      spotlightDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelectedDocId(doc.id)}
                          className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4 text-left transition-colors hover:bg-[var(--surface-1)]"
                        >
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {doc.title}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {classificationLabel(doc.classification)} •{" "}
                            {statusLabel(doc.status)}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                            {doc.description ||
                              "Open the document drawer to inspect metadata, history, and access."}
                          </p>
                          <p className="mt-3 text-xs font-medium text-[var(--text-tertiary)]">
                            Updated {formatVaultDate(doc.updatedAt)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-5 lg:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Coverage
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                        Classification coverage
                      </h2>
                    </div>
                    <Clock3 size={20} className="text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {classificationMix.length === 0 ? (
                      <div className="rounded-[22px] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
                        No visible classifications yet.
                      </div>
                    ) : (
                      classificationMix.map(([label, value], index) => (
                        <MixRow
                          key={label}
                          label={classificationLabel(label)}
                          value={value}
                          color={
                            ["#0EA5E9", "#10B981", "#D97706", "#2563EB"][
                              index
                            ] ?? "#6B7280"
                          }
                        />
                      ))
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Status mix
                    </p>
                    {statusMix.length === 0 ? (
                      <div className="rounded-[22px] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
                        No visible status mix yet.
                      </div>
                    ) : (
                      statusMix.map(([label, value], index) => (
                        <MixRow
                          key={label}
                          label={statusLabel(label)}
                          value={value}
                          color={
                            ["#10B981", "#D97706", "#DC2626", "#6366F1"][
                              index
                            ] ?? "#6B7280"
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

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
