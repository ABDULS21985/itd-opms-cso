"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Folder,
  FolderOpen,
  Upload,
  Download,
  Lock,
  Unlock,
  Trash2,
  Eye,
  Share2,
  Grid3X3,
  List,
  Search,
  ChevronRight,
  X,
  Clock,
  Shield,
  Tag,
  FolderPlus,
  History,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useDocuments,
  useDocument,
  useUploadDocument,
  useDeleteDocument,
  useLockDocument,
  useUnlockDocument,
  useFolders,
  useCreateFolder,
  useDeleteFolder,
  useVaultStats,
  useDocumentVersions,
  useDocumentAccessLog,
  type VaultDocument,
  type DocumentFolder,
} from "@/hooks/use-vault";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/shared/document-upload";
import { EmptyState } from "@/components/shared/empty-state";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const CLASSIFICATIONS = [
  { value: "", label: "All Classifications" },
  { value: "audit_evidence", label: "Audit Evidence" },
  { value: "operational", label: "Operational" },
  { value: "configuration", label: "Configuration" },
  { value: "policy", label: "Policy" },
  { value: "report", label: "Report" },
  { value: "transient", label: "Transient" },
];

const ACCESS_LEVELS = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "restricted", label: "Restricted" },
  { value: "confidential", label: "Confidential" },
];

const CLASSIFICATION_COLORS: Record<string, { text: string; bg: string }> = {
  audit_evidence: { text: "#7C3AED", bg: "rgba(124, 58, 237, 0.1)" },
  operational: { text: "#2563EB", bg: "rgba(37, 99, 235, 0.1)" },
  configuration: { text: "#059669", bg: "rgba(5, 150, 105, 0.1)" },
  policy: { text: "#D97706", bg: "rgba(217, 119, 6, 0.1)" },
  report: { text: "#DC2626", bg: "rgba(220, 38, 38, 0.1)" },
  transient: { text: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" },
};

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFileIcon(contentType: string): LucideIcon {
  if (contentType === "application/pdf") return FileText;
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "text/csv"
  )
    return FileSpreadsheet;
  if (contentType.startsWith("image/")) return FileImage;
  return File;
}

function getFileIconColor(contentType: string): string {
  if (contentType === "application/pdf") return "#EF4444";
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "text/csv"
  )
    return "#059669";
  if (contentType.startsWith("image/")) return "#8B5CF6";
  if (contentType.includes("word")) return "#2563EB";
  if (contentType.includes("presentation") || contentType.includes("powerpoint"))
    return "#F59E0B";
  return "#6B7280";
}

function buildFolderTree(folders: DocumentFolder[]): DocumentFolder[] {
  const map = new Map<string, DocumentFolder>();
  const roots: DocumentFolder[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function ClassificationBadge({ classification }: { classification: string }) {
  const colors = CLASSIFICATION_COLORS[classification] || {
    text: "#6B7280",
    bg: "rgba(107, 114, 128, 0.1)",
  };
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: colors.text, backgroundColor: colors.bg }}
    >
      {classification.replace("_", " ")}
    </span>
  );
}

function FolderTreeItem({
  folder,
  selectedFolderId,
  onSelect,
  depth = 0,
}: {
  folder: DocumentFolder;
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;
  const FolderIcon = isSelected ? FolderOpen : Folder;

  return (
    <div>
      <button
        onClick={() => onSelect(folder.id)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
        style={{
          paddingLeft: `${8 + depth * 16}px`,
          backgroundColor: isSelected ? "var(--surface-2)" : "transparent",
          color: isSelected ? "var(--primary)" : "var(--text-primary)",
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-4 w-4 items-center justify-center"
          >
            <ChevronRight
              size={12}
              className="transition-transform"
              style={{
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <FolderIcon
          size={16}
          style={{
            color: folder.color || (isSelected ? "var(--primary)" : "var(--text-secondary)"),
          }}
        />
        <span className="flex-1 truncate">{folder.name}</span>
        {folder.documentCount > 0 && (
          <span className="text-xs text-[var(--text-tertiary)]">
            {folder.documentCount}
          </span>
        )}
      </button>
      {hasChildren && expanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function VaultPage() {
  const { user } = useAuth();

  // ── State ────────────────────────────────────
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classification, setClassification] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"details" | "versions" | "access">("details");

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadClassification, setUploadClassification] = useState("operational");
  const [uploadAccessLevel, setUploadAccessLevel] = useState("internal");
  const [uploadTags, setUploadTags] = useState("");

  // New folder form state
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3B82F6");

  // ── Queries ──────────────────────────────────
  const { data: docsResponse, isLoading: docsLoading } = useDocuments({
    page,
    limit: 20,
    folderId: selectedFolderId || undefined,
    classification: classification || undefined,
    search: searchQuery || undefined,
  });

  const { data: foldersData, isLoading: foldersLoading } = useFolders();
  const { data: statsData } = useVaultStats();
  const { data: selectedDoc } = useDocument(selectedDocId || undefined);
  const { data: versions } = useDocumentVersions(
    selectedDocId && drawerTab === "versions" ? selectedDocId : undefined,
  );
  const { data: accessLogResponse } = useDocumentAccessLog(
    selectedDocId && drawerTab === "access" ? selectedDocId : undefined,
  );

  // ── Mutations ────────────────────────────────
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const lockMutation = useLockDocument();
  const unlockMutation = useUnlockDocument();
  const createFolderMutation = useCreateFolder();
  const _deleteFolderMutation = useDeleteFolder();

  // ── Derived ──────────────────────────────────
  const documents: VaultDocument[] = useMemo(() => {
    if (!docsResponse) return [];
    if (Array.isArray(docsResponse)) return docsResponse;
    if ((docsResponse as any).data) return (docsResponse as any).data;
    return [];
  }, [docsResponse]);

  const totalPages = useMemo(() => {
    if (!docsResponse) return 1;
    if ((docsResponse as any).meta?.totalPages)
      return (docsResponse as any).meta.totalPages;
    return 1;
  }, [docsResponse]);

  const folders = useMemo<DocumentFolder[]>(() => {
    if (!foldersData) return [];
    return Array.isArray(foldersData) ? foldersData : [];
  }, [foldersData]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const accessLog = useMemo(() => {
    if (!accessLogResponse) return [];
    if (Array.isArray(accessLogResponse)) return accessLogResponse;
    if ((accessLogResponse as any).data) return (accessLogResponse as any).data;
    return [];
  }, [accessLogResponse]);

  const breadcrumbs = useMemo(() => {
    if (!selectedFolderId) return [{ id: null, name: "All Documents" }];
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "All Documents" },
    ];
    const folder = folders.find((f) => f.id === selectedFolderId);
    if (folder) {
      // Build path from folder.path
      const parts = folder.path.split("/").filter(Boolean);
      let currentPath = "";
      for (const part of parts) {
        currentPath += "/" + part;
        const matchFolder = folders.find((f) => f.path === currentPath);
        if (matchFolder) {
          crumbs.push({ id: matchFolder.id, name: matchFolder.name });
        }
      }
    }
    return crumbs;
  }, [selectedFolderId, folders]);

  // ── Handlers ─────────────────────────────────
  const handleUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", uploadTitle || file.name);
      formData.append("description", uploadDescription);
      formData.append("classification", uploadClassification);
      formData.append("accessLevel", uploadAccessLevel);
      if (uploadTags) {
        formData.append("tags", uploadTags);
      }
      if (selectedFolderId) {
        formData.append("folderId", selectedFolderId);
      }

      uploadMutation.mutate(formData, {
        onSuccess: () => {
          setShowUploadModal(false);
          setUploadTitle("");
          setUploadDescription("");
          setUploadClassification("operational");
          setUploadAccessLevel("internal");
          setUploadTags("");
        },
      });
    },
    [
      uploadTitle,
      uploadDescription,
      uploadClassification,
      uploadAccessLevel,
      uploadTags,
      selectedFolderId,
      uploadMutation,
    ],
  );

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(
      {
        name: newFolderName.trim(),
        parentId: selectedFolderId || undefined,
        description: newFolderDescription || undefined,
        color: newFolderColor,
      },
      {
        onSuccess: () => {
          setShowNewFolderModal(false);
          setNewFolderName("");
          setNewFolderDescription("");
          setNewFolderColor("#3B82F6");
        },
      },
    );
  }, [
    newFolderName,
    newFolderDescription,
    newFolderColor,
    selectedFolderId,
    createFolderMutation,
  ]);

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

  // ── Render ───────────────────────────────────
  return (
    <div className="flex h-full gap-0">
      {/* ── Left Sidebar: Folder Tree ─────────── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden w-60 flex-shrink-0 border-r lg:block"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-0)",
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Folders</h2>
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]"
              title="New Folder"
            >
              <FolderPlus size={14} className="text-[var(--text-secondary)]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {/* All Documents root item */}
            <button
              onClick={() => {
                setSelectedFolderId(null);
                setPage(1);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
              style={{
                backgroundColor:
                  selectedFolderId === null ? "var(--surface-2)" : "transparent",
                color:
                  selectedFolderId === null
                    ? "var(--primary)"
                    : "var(--text-primary)",
              }}
            >
              <span className="w-4" />
              <Folder size={16} className="text-[var(--text-secondary)]" />
              <span className="flex-1">All Documents</span>
            </button>

            {/* Folder tree */}
            {foldersLoading ? (
              <div className="space-y-2 px-2 pt-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-7 animate-pulse rounded-md bg-[var(--surface-2)]"
                  />
                ))}
              </div>
            ) : (
              folderTree.map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  selectedFolderId={selectedFolderId}
                  onSelect={(id) => {
                    setSelectedFolderId(id);
                    setPage(1);
                  }}
                />
              ))
            )}
          </div>

          {/* Stats at bottom */}
          {statsData && (
            <div
              className="border-t px-4 py-3 space-y-1"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-xs text-[var(--text-tertiary)]">
                {statsData.totalDocuments} documents &middot;{" "}
                {formatFileSize(statsData.totalSizeBytes)}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {statsData.totalFolders} folders &middot;{" "}
                {statsData.recentUploads} uploaded this week
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Main Content ──────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border-b px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            >
              <Shield size={20} style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Document Vault
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Secure document storage and management
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div
              className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 min-w-[200px]"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
              }}
            >
              <Search size={16} className="text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  <X size={14} className="text-[var(--text-tertiary)]" />
                </button>
              )}
            </div>

            {/* Classification filter */}
            <select
              value={classification}
              onChange={(e) => {
                setClassification(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div
              className="flex items-center rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => setViewMode("grid")}
                className="flex h-9 w-9 items-center justify-center rounded-l-lg transition-colors"
                style={{
                  backgroundColor:
                    viewMode === "grid" ? "var(--surface-2)" : "transparent",
                }}
              >
                <Grid3X3
                  size={16}
                  style={{
                    color:
                      viewMode === "grid"
                        ? "var(--primary)"
                        : "var(--text-tertiary)",
                  }}
                />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="flex h-9 w-9 items-center justify-center rounded-r-lg transition-colors"
                style={{
                  backgroundColor:
                    viewMode === "list" ? "var(--surface-2)" : "transparent",
                }}
              >
                <List
                  size={16}
                  style={{
                    color:
                      viewMode === "list"
                        ? "var(--primary)"
                        : "var(--text-tertiary)",
                  }}
                />
              </button>
            </div>

            {/* New Folder button */}
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <FolderPlus size={16} />
              <span className="hidden sm:inline">New Folder</span>
            </button>

            {/* Upload button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Upload size={16} />
              Upload
            </button>
          </div>
        </motion.div>

        {/* Breadcrumbs */}
        <div
          className="flex items-center gap-1 border-b px-6 py-2"
          style={{ borderColor: "var(--border)" }}
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id ?? "root"} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  size={12}
                  className="text-[var(--text-tertiary)]"
                />
              )}
              <button
                onClick={() => {
                  setSelectedFolderId(crumb.id);
                  setPage(1);
                }}
                className="rounded px-1.5 py-0.5 text-xs font-medium transition-colors hover:bg-[var(--surface-2)]"
                style={{
                  color:
                    index === breadcrumbs.length - 1
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Document Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {docsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]"
                />
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
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <Upload size={16} />
                  Upload Document
                </button>
              }
            />
          ) : viewMode === "grid" ? (
            /* Grid View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {documents.map((doc, index) => {
                const Icon = getFileIcon(doc.contentType);
                const iconColor = getFileIconColor(doc.contentType);
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setDrawerTab("details");
                    }}
                    className="group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md"
                    style={{
                      backgroundColor: "var(--surface-0)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${iconColor}15`,
                        }}
                      >
                        <Icon size={20} style={{ color: iconColor }} />
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.lockedBy && (
                          <Lock
                            size={14}
                            className="text-[var(--text-tertiary)]"
                          />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc.id);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-2)]"
                        >
                          <Download
                            size={14}
                            className="text-[var(--text-secondary)]"
                          />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <ClassificationBadge
                        classification={doc.classification}
                      />
                      {doc.version > 1 && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          v{doc.version}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                      <span>{formatDate(doc.createdAt)}</span>
                      <span>{formatFileSize(doc.sizeBytes)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            /* List View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border"
              style={{ borderColor: "var(--border)" }}
            >
              {/* Table Header */}
              <div
                className="grid grid-cols-12 gap-4 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-tertiary)",
                  backgroundColor: "var(--surface-1)",
                }}
              >
                <div className="col-span-4">Name</div>
                <div className="col-span-2">Classification</div>
                <div className="col-span-1">Size</div>
                <div className="col-span-2">Tags</div>
                <div className="col-span-2">Modified</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Table Rows */}
              {documents.map((doc, index) => {
                const Icon = getFileIcon(doc.contentType);
                const iconColor = getFileIconColor(doc.contentType);
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setDrawerTab("details");
                    }}
                    className="group grid cursor-pointer grid-cols-12 gap-4 border-b px-4 py-3 transition-colors hover:bg-[var(--surface-1)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <Icon
                        size={18}
                        style={{ color: iconColor }}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {doc.title}
                        </p>
                        <p className="truncate text-xs text-[var(--text-tertiary)]">
                          {doc.fileName}
                          {doc.lockedBy && (
                            <Lock
                              size={10}
                              className="ml-1 inline text-[var(--text-tertiary)]"
                            />
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <ClassificationBadge
                        classification={doc.classification}
                      />
                    </div>
                    <div className="col-span-1 flex items-center text-xs text-[var(--text-secondary)]">
                      {formatFileSize(doc.sizeBytes)}
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center gap-1">
                      {doc.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: "var(--surface-2)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags.length > 2 && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          +{doc.tags.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center text-xs text-[var(--text-secondary)]">
                      {formatDate(doc.updatedAt)}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc.id);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-2)]"
                        title="Download"
                      >
                        <Download size={14} className="text-[var(--text-secondary)]" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-2)]"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Previous
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Document Detail Drawer ────────────── */}
      <AnimatePresence>
        {selectedDocId && selectedDoc && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 overflow-hidden border-l"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-0)",
            }}
          >
            <div className="flex h-full w-[400px] flex-col">
              {/* Drawer Header */}
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: "var(--border)" }}
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate pr-2">
                  {selectedDoc.title}
                </h3>
                <button
                  onClick={() => setSelectedDocId(null)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]"
                >
                  <X size={16} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Tabs */}
              <div
                className="flex border-b"
                style={{ borderColor: "var(--border)" }}
              >
                {(
                  [
                    { key: "details", label: "Details", icon: Eye },
                    { key: "versions", label: "Versions", icon: History },
                    { key: "access", label: "Access Log", icon: Clock },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDrawerTab(tab.key)}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
                    style={{
                      color:
                        drawerTab === tab.key
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                      borderBottom:
                        drawerTab === tab.key
                          ? "2px solid var(--primary)"
                          : "2px solid transparent",
                    }}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {drawerTab === "details" && (
                  <div className="space-y-5">
                    {/* File Info */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const Icon = getFileIcon(selectedDoc.contentType);
                          const iconColor = getFileIconColor(selectedDoc.contentType);
                          return (
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-xl"
                              style={{ backgroundColor: `${iconColor}15` }}
                            >
                              <Icon size={24} style={{ color: iconColor }} />
                            </div>
                          );
                        })()}
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {selectedDoc.fileName}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {formatFileSize(selectedDoc.sizeBytes)} &middot; Version{" "}
                            {selectedDoc.version}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedDoc.description && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                          Description
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {selectedDoc.description}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Metadata
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: "Classification", value: selectedDoc.classification.replace("_", " ") },
                          { label: "Access Level", value: selectedDoc.accessLevel },
                          { label: "Uploaded By", value: selectedDoc.uploaderName },
                          { label: "Created", value: formatDateTime(selectedDoc.createdAt) },
                          { label: "Updated", value: formatDateTime(selectedDoc.updatedAt) },
                          { label: "Folder", value: selectedDoc.folderName || "Root" },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-[var(--text-tertiary)]">
                              {item.label}
                            </span>
                            <span className="font-medium text-[var(--text-primary)]">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedDoc.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                              style={{
                                backgroundColor: "var(--surface-2)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <Tag size={10} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lock status */}
                    {selectedDoc.lockedBy && (
                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                        style={{
                          backgroundColor: "rgba(245, 158, 11, 0.08)",
                          color: "#F59E0B",
                        }}
                      >
                        <Lock size={14} />
                        <span>
                          Locked by {selectedDoc.lockedByName || "unknown"}{" "}
                          {selectedDoc.lockedAt &&
                            "since " + formatDateTime(selectedDoc.lockedAt)}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Actions
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleDownload(selectedDoc.id)}
                          className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-2)]"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Download size={14} />
                          Download
                        </button>
                        {selectedDoc.lockedBy ? (
                          selectedDoc.lockedBy === user?.id ? (
                            <button
                              onClick={() =>
                                unlockMutation.mutate(selectedDoc.id)
                              }
                              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-2)]"
                              style={{
                                borderColor: "var(--border)",
                                color: "var(--text-primary)",
                              }}
                            >
                              <Unlock size={14} />
                              Unlock
                            </button>
                          ) : (
                            <button
                              disabled
                              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium opacity-50"
                              style={{
                                borderColor: "var(--border)",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              <Lock size={14} />
                              Locked
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() =>
                              lockMutation.mutate(selectedDoc.id)
                            }
                            className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-2)]"
                            style={{
                              borderColor: "var(--border)",
                              color: "var(--text-primary)",
                            }}
                          >
                            <Lock size={14} />
                            Lock
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(selectedDoc.id)}
                          className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            // TODO: implement share modal
                            toast.info("Share functionality coming soon");
                          }}
                          className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-2)]"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Share2 size={14} />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === "versions" && (
                  <div className="space-y-3">
                    {!versions || (Array.isArray(versions) && versions.length === 0) ? (
                      <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
                        No version history available.
                      </p>
                    ) : (
                      (Array.isArray(versions) ? versions : []).map(
                        (ver: VaultDocument) => (
                          <div
                            key={ver.id}
                            className="flex items-center gap-3 rounded-lg border p-3"
                            style={{
                              borderColor:
                                ver.isLatest
                                  ? "var(--primary)"
                                  : "var(--border)",
                              backgroundColor: ver.isLatest
                                ? "rgba(59, 130, 246, 0.04)"
                                : "var(--surface-0)",
                            }}
                          >
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: "var(--surface-2)",
                              }}
                            >
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                v{ver.version}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {ver.fileName}
                              </p>
                              <p className="text-xs text-[var(--text-tertiary)]">
                                {ver.uploaderName} &middot;{" "}
                                {formatDateTime(ver.createdAt)} &middot;{" "}
                                {formatFileSize(ver.sizeBytes)}
                              </p>
                            </div>
                            {ver.isLatest && (
                              <span
                                className="rounded px-1.5 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                                  color: "var(--primary)",
                                }}
                              >
                                Latest
                              </span>
                            )}
                          </div>
                        ),
                      )
                    )}
                  </div>
                )}

                {drawerTab === "access" && (
                  <div className="space-y-2">
                    {accessLog.length === 0 ? (
                      <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
                        No access log entries.
                      </p>
                    ) : (
                      accessLog.map((entry: any) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 rounded-lg border p-3"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface-0)",
                          }}
                        >
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: "var(--surface-2)",
                            }}
                          >
                            <Eye
                              size={14}
                              className="text-[var(--text-secondary)]"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--text-primary)]">
                              <span className="font-medium">
                                {entry.userName}
                              </span>{" "}
                              {entry.action}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {formatDateTime(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload Modal ──────────────────────── */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border p-6 shadow-xl"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Upload Document
                </h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                >
                  <X size={18} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Document title (uses filename if empty)"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Description
                  </label>
                  <textarea
                    placeholder="Optional description"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)] resize-none"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Classification */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                      Classification
                    </label>
                    <select
                      value={uploadClassification}
                      onChange={(e) => setUploadClassification(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{
                        backgroundColor: "var(--surface-1)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {CLASSIFICATIONS.filter((c) => c.value !== "").map(
                        (c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  {/* Access Level */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                      Access Level
                    </label>
                    <select
                      value={uploadAccessLevel}
                      onChange={(e) => setUploadAccessLevel(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{
                        backgroundColor: "var(--surface-1)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {ACCESS_LEVELS.map((al) => (
                        <option key={al.value} value={al.value}>
                          {al.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., audit, policy, 2026"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                {/* File Upload */}
                <DocumentUpload
                  onUpload={handleUpload}
                  loading={uploadMutation.isPending}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Folder Modal ──────────────────── */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowNewFolderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Create Folder
                </h2>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                >
                  <X size={18} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Folder Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(e) => setNewFolderColor(e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-lg border"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {newFolderColor}
                    </span>
                  </div>
                </div>

                {selectedFolderId && (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Creating inside:{" "}
                    <span className="font-medium">
                      {folders.find((f) => f.id === selectedFolderId)?.name ||
                        "Unknown folder"}
                    </span>
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowNewFolderModal(false)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={
                      !newFolderName.trim() || createFolderMutation.isPending
                    }
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {createFolderMutation.isPending
                      ? "Creating..."
                      : "Create Folder"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
