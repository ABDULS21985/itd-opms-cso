"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  File,
  FileSpreadsheet,
  FileImage,
  Presentation,
  FileArchive,
  Upload,
  Download,
  Edit3,
  Trash2,
  Search,
  X,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useProjectDocuments,
  useProjectDocumentCategories,
  useUploadProjectDocument,
  useUpdateProjectDocument,
  useDeleteProjectDocument,
  useDownloadProjectDocument,
} from "@/hooks/use-planning";
import type { ProjectDocument } from "@/types";

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface ProjectDocumentsProps {
  projectId: string;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const CATEGORY_LABELS: Record<string, string> = {
  project_charter: "Project Charter",
  project_approval: "Approval",
  business_case: "Business Case",
  business_requirements: "Requirements",
  solution_architecture: "Architecture",
  solution_design: "Design",
  solution_brief: "Brief",
  technical_specification: "Tech Spec",
  test_plan: "Test Plan",
  test_results: "Test Results",
  user_manual: "User Manual",
  training_material: "Training",
  deployment_guide: "Deployment",
  meeting_minutes: "Minutes",
  status_report: "Status Report",
  risk_register: "Risk Register",
  change_request: "Change Request",
  sign_off: "Sign-Off",
  closure_report: "Closure",
  other: "Other",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const ACCEPTED_FILE_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.csv,.zip";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const PAGE_LIMIT = 12;

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function getFileIcon(contentType: string): LucideIcon {
  if (contentType.includes("pdf")) return FileText;
  if (contentType.includes("spreadsheet") || contentType.includes("excel"))
    return FileSpreadsheet;
  if (contentType.includes("image")) return FileImage;
  if (contentType.includes("presentation") || contentType.includes("powerpoint"))
    return Presentation;
  if (contentType.includes("zip") || contentType.includes("archive"))
    return FileArchive;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    project_charter:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    project_approval:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    business_case:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    business_requirements:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    solution_architecture:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    solution_design:
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    solution_brief:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    technical_specification:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    test_plan:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    test_results:
      "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
    user_manual:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    training_material:
      "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
    deployment_guide:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    meeting_minutes:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
    status_report:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    risk_register:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    change_request:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    sign_off:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    closure_report:
      "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300",
    other:
      "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  };
  return colors[category] || colors.other;
}

function getFileIconColor(contentType: string): string {
  if (contentType.includes("pdf")) return "text-red-500";
  if (contentType.includes("spreadsheet") || contentType.includes("excel"))
    return "text-green-600";
  if (contentType.includes("image")) return "text-purple-500";
  if (contentType.includes("presentation") || contentType.includes("powerpoint"))
    return "text-orange-500";
  if (contentType.includes("zip") || contentType.includes("archive"))
    return "text-amber-600";
  return "text-[var(--neutral-gray)]";
}

/* ================================================================== */
/*  Skeleton                                                           */
/* ================================================================== */

function DocumentCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--surface-2)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--surface-2)]" />
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-16 rounded-full bg-[var(--surface-2)]" />
            <div className="h-5 w-10 rounded bg-[var(--surface-2)]" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-12 rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-20 rounded bg-[var(--surface-2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3"
        >
          <div className="h-8 w-8 rounded-lg bg-[var(--surface-2)]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-48 rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-32 rounded bg-[var(--surface-2)]" />
          </div>
          <div className="h-5 w-16 rounded-full bg-[var(--surface-2)]" />
          <div className="h-3 w-10 rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-14 rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-20 rounded bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  /* ---- View & filter state ---- */
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  /* ---- Upload form state ---- */
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Edit form state ---- */
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editDescription, setEditDescription] = useState("");

  /* ---- Delete state ---- */
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  /* ---- Debounce search ---- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ---- Data fetching ---- */
  const {
    data: documentsResponse,
    isLoading: isLoadingDocs,
  } = useProjectDocuments(
    projectId,
    page,
    PAGE_LIMIT,
    activeCategory,
    undefined,
    debouncedSearch || undefined,
  );

  const { data: categoryCounts } = useProjectDocumentCategories(projectId);

  const documents = documentsResponse?.data ?? [];
  const totalDocs = documentsResponse?.total ?? 0;
  const totalPages = Math.ceil(totalDocs / PAGE_LIMIT);

  /* ---- Mutations ---- */
  const uploadMutation = useUploadProjectDocument(projectId);
  const updateMutation = useUpdateProjectDocument(projectId, editingDocId ?? "");
  const deleteMutation = useDeleteProjectDocument(projectId);
  const downloadMutation = useDownloadProjectDocument(projectId);

  /* ---- Upload handlers ---- */
  const validateFiles = useCallback((files: File[]): File[] => {
    const valid: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the 50 MB size limit.`);
      } else {
        valid.push(file);
      }
    }
    return valid;
  }, []);

  const handleFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const validated = validateFiles(Array.from(files));
      if (validated.length > 0) {
        setUploadFiles(validated);
        // Pre-fill title from first file name (strip extension)
        const firstName = validated[0].name;
        const nameWithoutExt = firstName.replace(/\.[^/.]+$/, "");
        setUploadTitle(nameWithoutExt);
        setShowUploadForm(true);
      }
    },
    [validateFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected],
  );

  const resetUploadForm = useCallback(() => {
    setUploadFiles([]);
    setUploadTitle("");
    setUploadCategory("other");
    setUploadDescription("");
    setUploadLabel("");
    setShowUploadForm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleUploadSubmit = useCallback(async () => {
    if (uploadFiles.length === 0) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    // Upload each file sequentially
    for (const file of uploadFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", uploadTitle.trim());
      formData.append("category", uploadCategory);
      if (uploadDescription.trim()) {
        formData.append("description", uploadDescription.trim());
      }
      if (uploadLabel.trim()) {
        formData.append("label", uploadLabel.trim());
      }

      try {
        await uploadMutation.mutateAsync(formData);
      } catch {
        // Error handling is done by the hook via toast
        return;
      }
    }

    resetUploadForm();
  }, [
    uploadFiles,
    uploadTitle,
    uploadCategory,
    uploadDescription,
    uploadLabel,
    uploadMutation,
    resetUploadForm,
  ]);

  /* ---- Edit handlers ---- */
  const startEdit = useCallback((doc: ProjectDocument) => {
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditLabel(doc.label ?? "");
    setEditVersion(doc.version);
    setEditDescription(doc.description ?? "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingDocId(null);
    setEditTitle("");
    setEditCategory("");
    setEditLabel("");
    setEditVersion("");
    setEditDescription("");
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (!editingDocId) return;
    if (!editTitle.trim()) {
      toast.error("Title is required.");
      return;
    }
    updateMutation.mutate(
      {
        title: editTitle.trim(),
        category: editCategory,
        label: editLabel.trim() || undefined,
        version: editVersion.trim(),
        description: editDescription.trim() || undefined,
      } as Partial<ProjectDocument>,
      {
        onSuccess: () => cancelEdit(),
      },
    );
  }, [
    editingDocId,
    editTitle,
    editCategory,
    editLabel,
    editVersion,
    editDescription,
    updateMutation,
    cancelEdit,
  ]);

  /* ---- Derived state ---- */
  const hasFilters = !!activeCategory || !!debouncedSearch;
  const showEmpty = !isLoadingDocs && documents.length === 0;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div>
      {/* ---- Section header ---- */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-[var(--primary)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Project Documents
          </h3>
          {totalDocs > 0 && (
            <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
              {totalDocs}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Grid / List toggle */}
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded-lg p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
            }`}
            title="Grid view"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-lg p-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
            }`}
            title="List view"
          >
            <List size={16} />
          </button>

          {/* Upload button */}
          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      {/* ---- Category filter tabs ---- */}
      {categoryCounts && categoryCounts.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            type="button"
            onClick={() => {
              setActiveCategory(undefined);
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !activeCategory
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
            }`}
          >
            All
          </button>
          {categoryCounts.map((c) => (
            <button
              type="button"
              key={c.category}
              onClick={() => {
                setActiveCategory(
                  activeCategory === c.category ? undefined : c.category,
                );
                setPage(1);
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === c.category
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {CATEGORY_LABELS[c.category] || c.category} ({c.count})
            </button>
          ))}
        </div>
      )}

      {/* ---- Search bar ---- */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-8 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setDebouncedSearch("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ---- Upload form ---- */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Upload Document
                </h4>
                <button
                  type="button"
                  onClick={resetUploadForm}
                  className="rounded-lg p-1 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drop zone */}
              {uploadFiles.length === 0 ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
                    isDragging
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-1)]/50"
                  }`}
                >
                  <div
                    className={`rounded-xl p-3 transition-colors ${
                      isDragging
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    }`}
                  >
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Drag & drop files here or click to browse
                    </p>
                    <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                      PDF, Word, Excel, PowerPoint, Images, CSV, ZIP (max 50 MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected files preview */}
                  <div className="flex flex-wrap gap-2">
                    {uploadFiles.map((file, idx) => {
                      const FileIcon = getFileIcon(file.type);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5"
                        >
                          <FileIcon
                            size={14}
                            className={getFileIconColor(file.type)}
                          />
                          <span className="max-w-[180px] truncate text-xs font-medium text-[var(--text-primary)]">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-[var(--neutral-gray)]">
                            {formatFileSize(file.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = uploadFiles.filter(
                                (_, i) => i !== idx,
                              );
                              setUploadFiles(next);
                              if (next.length === 0) {
                                setUploadTitle("");
                              }
                            }}
                            className="ml-1 rounded p-0.5 text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--neutral-gray)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors"
                    >
                      <Plus size={12} />
                      Add more
                    </button>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Title */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Title <span className="text-[var(--error)]">*</span>
                      </label>
                      <input
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Document title"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Category
                      </label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Label */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Label
                      </label>
                      <input
                        type="text"
                        value={uploadLabel}
                        onChange={(e) => setUploadLabel(e.target.value)}
                        placeholder="Optional label (e.g., Draft, Final)"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Description
                      </label>
                      <textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Brief description of the document"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Submit row */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={resetUploadForm}
                      disabled={uploadMutation.isPending}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadSubmit}
                      disabled={uploadMutation.isPending || !uploadTitle.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          Upload{uploadFiles.length > 1 ? ` (${uploadFiles.length})` : ""}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Loading state ---- */}
      {isLoadingDocs && (
        viewMode === "grid" ? (
          <DocumentCardSkeleton count={6} />
        ) : (
          <DocumentListSkeleton count={5} />
        )
      )}

      {/* ---- Empty state ---- */}
      {showEmpty && !hasFilters && (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload project documents like charters, requirements, architecture designs, and more."
          action={
            <button
              type="button"
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              <Upload size={16} />
              Upload Document
            </button>
          }
        />
      )}

      {showEmpty && hasFilters && (
        <EmptyState
          icon={Search}
          title="No documents found"
          description="Try adjusting your search or filter to find what you are looking for."
          action={
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setDebouncedSearch("");
                setActiveCategory(undefined);
                setPage(1);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <X size={14} />
              Clear Filters
            </button>
          }
        />
      )}

      {/* ---- Grid view ---- */}
      {!isLoadingDocs && documents.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc, index) => {
            const FileIcon = getFileIcon(doc.contentType);
            const iconColor = getFileIconColor(doc.contentType);
            const isEditing = editingDocId === doc.id;

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                layout
                className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-shadow hover:shadow-md"
              >
                {/* Normal card content */}
                <AnimatePresence mode="wait">
                  {!isEditing ? (
                    <motion.div
                      key="view"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* File icon + title */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="shrink-0 rounded-lg bg-[var(--surface-1)] p-2">
                          <FileIcon size={20} className={iconColor} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {doc.title}
                          </p>
                          <p className="truncate text-xs text-[var(--neutral-gray)]">
                            {doc.fileName}
                          </p>
                        </div>
                      </div>

                      {/* Category badge + version + label */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getCategoryColor(doc.category)}`}
                        >
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </span>
                        <span className="text-[10px] text-[var(--neutral-gray)]">
                          v{doc.version}
                        </span>
                        {doc.label && (
                          <span className="text-[10px] text-[var(--neutral-gray)]">
                            &bull; {doc.label}
                          </span>
                        )}
                      </div>

                      {/* Description (if present) */}
                      {doc.description && (
                        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[var(--neutral-gray)]">
                          {doc.description}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center justify-between text-[11px] text-[var(--neutral-gray)]">
                        <span>{formatFileSize(doc.sizeBytes)}</span>
                        <span>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {doc.uploaderName && (
                        <p className="mt-1 text-[11px] text-[var(--neutral-gray)]">
                          by {doc.uploaderName}
                        </p>
                      )}

                      {/* Action buttons (visible on hover) */}
                      <div className="mt-3 flex items-center gap-1 border-t border-[var(--border)] pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => downloadMutation.mutate(doc.id)}
                          title="Download"
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--primary)] transition-colors"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(doc)}
                          title="Edit"
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--info)] transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDocId(doc.id)}
                          title="Delete"
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--error)] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Inline edit form */
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                          Category
                        </label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                            Label
                          </label>
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="e.g., Draft"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                            Version
                          </label>
                          <input
                            type="text"
                            value={editVersion}
                            onChange={(e) => setEditVersion(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                          Description
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={updateMutation.isPending}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleEditSubmit}
                          disabled={
                            updateMutation.isPending || !editTitle.trim()
                          }
                          className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                        >
                          {updateMutation.isPending ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---- List view ---- */}
      {!isLoadingDocs && documents.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {documents.map((doc, index) => {
            const FileIcon = getFileIcon(doc.contentType);
            const iconColor = getFileIconColor(doc.contentType);
            const isEditing = editingDocId === doc.id;

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                layout
              >
                <AnimatePresence mode="wait">
                  {!isEditing ? (
                    <motion.div
                      key="view"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 transition-shadow hover:shadow-sm"
                    >
                      {/* Icon */}
                      <div className="shrink-0 rounded-lg bg-[var(--surface-1)] p-2">
                        <FileIcon size={16} className={iconColor} />
                      </div>

                      {/* Title + filename */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {doc.title}
                        </p>
                        <p className="truncate text-xs text-[var(--neutral-gray)]">
                          {doc.fileName}
                        </p>
                      </div>

                      {/* Category badge */}
                      <span
                        className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block ${getCategoryColor(doc.category)}`}
                      >
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </span>

                      {/* Version */}
                      <span className="hidden shrink-0 text-xs text-[var(--neutral-gray)] md:inline-block">
                        v{doc.version}
                      </span>

                      {/* Size */}
                      <span className="hidden shrink-0 text-xs text-[var(--neutral-gray)] lg:inline-block">
                        {formatFileSize(doc.sizeBytes)}
                      </span>

                      {/* Date */}
                      <span className="hidden shrink-0 text-xs text-[var(--neutral-gray)] md:inline-block">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => downloadMutation.mutate(doc.id)}
                          title="Download"
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--primary)] transition-colors"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(doc)}
                          title="Edit"
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--info)] transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDocId(doc.id)}
                          title="Delete"
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--error)] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Inline edit form (list) */
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="rounded-xl border-2 border-[var(--primary)]/30 bg-[var(--surface-0)] p-4"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                            Title
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                            Category
                          </label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                            Label
                          </label>
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="e.g., Draft"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                            Version
                          </label>
                          <input
                            type="text"
                            value={editVersion}
                            onChange={(e) => setEditVersion(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                          Description
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors"
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={updateMutation.isPending}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleEditSubmit}
                          disabled={
                            updateMutation.isPending || !editTitle.trim()
                          }
                          className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                        >
                          {updateMutation.isPending ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---- Pagination ---- */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[var(--neutral-gray)]">
            Showing {(page - 1) * PAGE_LIMIT + 1}
            {" - "}
            {Math.min(page * PAGE_LIMIT, totalDocs)} of {totalDocs} documents
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs font-medium text-[var(--text-primary)] tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation dialog ---- */}
      <ConfirmDialog
        open={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={() => {
          if (deleteDocId) {
            deleteMutation.mutate(deleteDocId);
            setDeleteDocId(null);
          }
        }}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
