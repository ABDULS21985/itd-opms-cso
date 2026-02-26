"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Upload,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  File,
  Cloud,
  RefreshCw,
  Star,
  HardDrive,
  FileUp,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@digibit/ui/components";
import { useMyProfile, useUploadDocument } from "@/hooks/use-candidates";
import { apiClient } from "@/lib/api-client";
import { DocumentType } from "@/types/candidate";
import type { CandidateDocument } from "@/types/candidate";
import { toast } from "sonner";
import { AnimatedCard, AnimatedCardGrid } from "@/components/shared/animated-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TALENT_API_URL || "http://localhost:4002/api/v1";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function getFileTypeInfo(fileName: string) {
  const ext = getFileExtension(fileName);
  switch (ext) {
    case "pdf":
      return {
        icon: FileText,
        bg: "bg-[var(--error)]/10",
        color: "text-[var(--error)]",
        badgeBg: "bg-[var(--error)]/15",
        badgeColor: "text-[var(--error)]",
        label: "PDF",
      };
    case "doc":
    case "docx":
      return {
        icon: File,
        bg: "bg-[var(--info)]/10",
        color: "text-[var(--info)]",
        badgeBg: "bg-[var(--info)]/15",
        badgeColor: "text-[var(--info)]",
        label: "DOCX",
      };
    default:
      return {
        icon: File,
        bg: "bg-[var(--surface-1)]",
        color: "text-[var(--neutral-gray)]",
        badgeBg: "bg-[var(--surface-2)]",
        badgeColor: "text-[var(--foreground)]",
        label: ext.toUpperCase() || "FILE",
      };
  }
}

/** Blob-based fetch for CV generation (apiClient doesn't support blob responses) */
async function fetchCVBlob(): Promise<Blob> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_BASE_URL}/me/cv/generate`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to generate CV");
  return res.blob();
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// UploadZone
// ---------------------------------------------------------------------------

function UploadZone({
  onUpload,
  isUploading,
  uploadSuccess,
  uploadError,
  onRetry,
}: {
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadSuccess: boolean;
  uploadError: string | null;
  onRetry: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div>
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        animate={isDragging ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all overflow-hidden",
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--primary)]/20 bg-[var(--surface-1)] hover:border-[var(--primary)]/40",
          isUploading && "pointer-events-none",
        )}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-4"
            >
              <Loader2
                size={40}
                className="text-[var(--primary)] animate-spin"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Uploading your document...
                </p>
                <p className="text-xs text-[var(--neutral-gray)] mt-1">
                  Please wait while we process your file
                </p>
              </div>
              {/* Animated stripe progress bar */}
              <div className="w-full max-w-xs h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "repeating-linear-gradient(45deg, var(--primary), var(--primary) 10px, rgba(30,77,183,0.7) 10px, rgba(30,77,183,0.7) 20px)",
                    backgroundSize: "200% 100%",
                  }}
                  initial={{ width: "0%" }}
                  animate={{
                    width: "85%",
                    backgroundPosition: ["0% 0%", "200% 0%"],
                  }}
                  transition={{
                    width: { duration: 2, ease: "easeOut" },
                    backgroundPosition: {
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }}
                />
              </div>
            </motion.div>
          ) : uploadSuccess ? (
            <motion.div
              key="success"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring" as const,
                  stiffness: 300,
                  damping: 20,
                }}
                className="w-14 h-14 rounded-full bg-[var(--success)]/10 flex items-center justify-center"
              >
                <CheckCircle2 size={28} className="text-[var(--success)]" />
              </motion.div>
              <p className="text-sm font-semibold text-[var(--success)]">
                Upload complete!
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={
                  isDragging
                    ? {
                        y: [0, -6, 0],
                        transition: { duration: 0.8, repeat: Infinity },
                      }
                    : { y: 0 }
                }
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
                  isDragging
                    ? "bg-[var(--primary)]/10"
                    : "bg-[var(--surface-2)]",
                )}
              >
                <Cloud
                  size={28}
                  className={cn(
                    "transition-colors",
                    isDragging
                      ? "text-[var(--primary)]"
                      : "text-[var(--neutral-gray)]",
                  )}
                />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {isDragging
                    ? "Drop your file here"
                    : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-[var(--neutral-gray)] mt-1">
                  PDF, DOC, DOCX — Max 5MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </motion.div>

      {/* Upload error banner */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              x: [0, -4, 4, -4, 4, -2, 2, 0],
            }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--error)]/5 border border-[var(--error)]/20">
              <AlertCircle
                size={16}
                className="text-[var(--error)] shrink-0"
              />
              <p className="text-sm text-[var(--error)] flex-1">
                {uploadError}
              </p>
              <button
                onClick={onRetry}
                className="text-xs font-medium text-[var(--error)] hover:underline shrink-0"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentCard
// ---------------------------------------------------------------------------

function DocumentCard({
  doc,
  index,
  isPrimary,
  onPreview,
  onDelete,
  onSetPrimary,
}: {
  doc: CandidateDocument;
  index: number;
  isPrimary: boolean;
  onPreview: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
}) {
  const info = getFileTypeInfo(doc.fileName);
  const Icon = info.icon;

  return (
    <AnimatedCard
      index={index}
      className={cn("p-4", isPrimary && "border-[var(--primary)] border-2")}
    >
      <div className="flex items-start gap-3">
        {/* File type icon */}
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            info.bg,
          )}
        >
          <Icon size={20} className={info.color} />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {doc.fileName}
            </p>
            {isPrimary && (
              <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-0 text-[10px] px-1.5 py-0 shrink-0">
                Primary
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                info.badgeBg,
                info.badgeColor,
              )}
            >
              {info.label}
            </span>
            <span className="text-xs text-[var(--neutral-gray)]">
              {formatFileSize(doc.fileSize)}
            </span>
            <span className="text-xs text-[var(--neutral-gray)]">·</span>
            <span className="text-xs text-[var(--neutral-gray)]">
              {timeAgo(doc.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Eye size={13} /> Preview
        </button>
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Download size={13} /> Download
        </a>
        {!isPrimary && (
          <button
            onClick={onSetPrimary}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] transition-colors"
          >
            <Star size={13} /> Set Primary
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--error)]/5 hover:text-[var(--error)] transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </AnimatedCard>
  );
}

// ---------------------------------------------------------------------------
// FilePreviewDialog
// ---------------------------------------------------------------------------

function FilePreviewDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: CandidateDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!doc) return null;
  const info = getFileTypeInfo(doc.fileName);
  const isPdf = getFileExtension(doc.fileName) === "pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <info.icon size={18} className={info.color} />
            {doc.fileName}
          </DialogTitle>
          <DialogDescription>
            {info.label} · {formatFileSize(doc.fileSize)} · Uploaded{" "}
            {timeAgo(doc.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {isPdf ? (
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-1)]">
            <iframe
              src={doc.fileUrl}
              className="w-full h-[500px]"
              title={`Preview of ${doc.fileName}`}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                info.bg,
              )}
            >
              <info.icon size={28} className={info.color} />
            </div>
            <p className="text-sm text-[var(--neutral-gray)] mb-4">
              Preview not available for {info.label} files
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                <Download size={14} className="mr-1.5" />
                Download to view
              </a>
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <Download size={14} className="mr-1.5" />
              Download
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} className="mr-1.5" />
              Open in new tab
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// GeneratedCVShowcase
// ---------------------------------------------------------------------------

function GeneratedCVShowcase({
  generatedCV,
  profileName,
  isGenerating,
  onGenerate,
}: {
  generatedCV: CandidateDocument | null;
  profileName: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div
        className="relative rounded-2xl overflow-hidden p-8"
        style={{
          background:
            "var(--gradient-primary, linear-gradient(135deg, #1B7340 0%, #0E5A2D 50%, #0F2E6B 100%))",
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-0)]/15 backdrop-blur-sm flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--surface-0)]/15 text-white backdrop-blur-sm">
              AI Generated from Your Profile
            </span>
          </div>

          {generatedCV ? (
            <div className="space-y-4">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                  Latest Generated CV
                </p>
                <p className="text-white font-semibold text-lg">
                  {profileName?.replace(/\s+/g, "_") || "CV"}_Generated.pdf
                </p>
              </div>
              <div className="flex items-center gap-4 text-white/60 text-sm">
                <span>{formatFileSize(generatedCV.fileSize)}</span>
                <span>·</span>
                <span>Generated {timeAgo(generatedCV.createdAt)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white font-semibold text-lg">
                Generate your professional CV
              </p>
              <p className="text-white/60 text-sm max-w-md">
                We&apos;ll create a beautifully formatted PDF from your profile
                data, including your skills, experience, projects, and
                education.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6">
            <Button
              variant="glass"
              onClick={onGenerate}
              disabled={isGenerating}
              isLoading={isGenerating}
              leftIcon={!isGenerating ? <Download size={16} /> : undefined}
              className="bg-[var(--surface-0)] text-[var(--primary)] hover:bg-[var(--surface-0)]/90 border-0 font-semibold"
            >
              {isGenerating
                ? "Generating..."
                : generatedCV
                  ? "Download PDF"
                  : "Generate & Download"}
            </Button>
            {generatedCV && (
              <Button
                variant="ghost"
                onClick={onGenerate}
                disabled={isGenerating}
                leftIcon={<RefreshCw size={14} />}
                className="text-white/80 hover:text-white hover:bg-[var(--surface-0)]/10"
              >
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] p-4">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
          What&apos;s included in your generated CV?
        </p>
        <ul className="space-y-1.5">
          {[
            "Personal details & contact information",
            "Professional bio & summary",
            "Skills & technical proficiencies",
            "Project portfolio with descriptions",
            "Work experience & education",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-xs text-[var(--neutral-gray)]"
            >
              <CheckCircle2
                size={12}
                className="text-[var(--success)] shrink-0"
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--neutral-gray)] mt-3 pt-3 border-t border-[var(--border)]">
          Tip: Complete your profile for the best results. The more information
          you provide, the richer your generated CV will be.
        </p>
      </div>

      {/* Existing generated file card */}
      {generatedCV && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--error)]/10 flex items-center justify-center">
              <FileText size={20} className="text-[var(--error)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {generatedCV.fileName}
              </p>
              <p className="text-xs text-[var(--neutral-gray)]">
                {formatFileSize(generatedCV.fileSize)} ·{" "}
                {new Date(generatedCV.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <a
              href={generatedCV.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
              title="View"
            >
              <Eye size={16} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loaders
// ---------------------------------------------------------------------------

function DocumentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--surface-2)]" />
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
        <div className="h-7 w-16 rounded-lg bg-[var(--surface-2)]" />
        <div className="h-7 w-20 rounded-lg bg-[var(--surface-2)]" />
        <div className="h-7 w-20 rounded-lg bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CVManagementPage() {
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch,
  } = useMyProfile();
  const uploadDocument = useUploadDocument();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CandidateDocument | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CandidateDocument | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);

  const uploadedCVs = useMemo(
    () =>
      profile?.candidateDocuments?.filter(
        (doc) => doc.documentType === DocumentType.CV_UPLOADED,
      ) || [],
    [profile],
  );

  const generatedCV = useMemo(
    () =>
      profile?.candidateDocuments?.find(
        (doc) => doc.documentType === DocumentType.CV_GENERATED,
      ) || null,
    [profile],
  );

  const allDocuments = useMemo(
    () => profile?.candidateDocuments || [],
    [profile],
  );

  const totalStorage = useMemo(
    () => allDocuments.reduce((sum, doc) => sum + doc.fileSize, 0),
    [allDocuments],
  );

  // ── Handlers ──

  const handleGenerateCV = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blob = await fetchCVBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile?.fullName?.replace(/\s+/g, "_") || "CV"}_Generated.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      await refetch();
      toast.success("CV generated and downloaded!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate CV.";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [profile?.fullName, refetch]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploadSuccess(false);
      setLastUploadedFile(file);

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("File too large. Maximum size is 5MB.");
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError(
          "Invalid file type. Please upload a PDF or Word document.",
        );
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", DocumentType.CV_UPLOADED);

        await uploadDocument.mutateAsync(formData);
        await refetch();
        setUploadSuccess(true);
        toast.success("Document uploaded successfully!");
        setTimeout(() => setUploadSuccess(false), 2500);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Upload failed. Please try again.";
        setUploadError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadDocument, refetch],
  );

  const handleRetryUpload = useCallback(() => {
    setUploadError(null);
    if (lastUploadedFile) {
      handleFileUpload(lastUploadedFile);
    }
  }, [lastUploadedFile, handleFileUpload]);

  const handleDeleteDocument = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/me/documents/${deleteTarget.id}`);
      await refetch();
      toast.success("Document deleted.");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete document.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, refetch]);

  const handleSetPrimary = useCallback(
    async (docId: string) => {
      try {
        await apiClient.put(`/me/documents/${docId}`, { isCurrent: true });
        await refetch();
        toast.success("Primary CV updated.");
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update primary CV.";
        toast.error(message);
      }
    },
    [refetch],
  );

  // ── Loading ──

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            <div className="h-4 w-64 rounded-lg bg-[var(--surface-2)] animate-pulse mt-2" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
            <div className="h-6 w-24 rounded-full bg-[var(--surface-2)] animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-64 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
        </div>
      </div>
    );
  }

  // ── Error ──

  if (profileError) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
        <AlertCircle
          size={48}
          className="mx-auto text-[var(--error)] mb-4"
        />
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">
          Failed to load profile
        </h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">
          {profileError instanceof Error
            ? profileError.message
            : "Something went wrong."}
        </p>
        <Button onClick={() => refetch()} variant="default">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            CV &amp; Documents
          </h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
            Manage your professional documents and generate CVs from your
            profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-[var(--surface-2)] text-[var(--text-secondary)] border-0"
          >
            <File size={12} className="mr-1" />
            {allDocuments.length}{" "}
            {allDocuments.length === 1 ? "document" : "documents"}
          </Badge>
          {totalStorage > 0 && (
            <Badge
              variant="secondary"
              className="bg-[var(--surface-2)] text-[var(--text-secondary)] border-0"
            >
              <HardDrive size={12} className="mr-1" />
              {formatFileSize(totalStorage)}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1 h-auto">
          <TabsTrigger
            value="documents"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-[var(--surface-0)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-sm text-[var(--neutral-gray)]"
          >
            <FileUp size={15} className="mr-1.5" />
            My Documents
            {uploadedCVs.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold">
                {uploadedCVs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="generate"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-[var(--surface-0)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-sm text-[var(--neutral-gray)]"
          >
            <Sparkles size={15} className="mr-1.5" />
            Generate CV
            {generatedCV && (
              <CheckCircle2
                size={14}
                className="ml-1.5 text-[var(--success)]"
              />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ══════ My Documents Tab ══════ */}
        <TabsContent value="documents" className="mt-6">
          <div className="space-y-6">
            <UploadZone
              onUpload={handleFileUpload}
              isUploading={isUploading}
              uploadSuccess={uploadSuccess}
              uploadError={uploadError}
              onRetry={handleRetryUpload}
            />

            {uploadedCVs.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-3">
                  Uploaded Documents
                </p>
                <AnimatedCardGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {uploadedCVs.map((doc, index) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      index={index}
                      isPrimary={doc.isCurrent}
                      onPreview={() => setPreviewDoc(doc)}
                      onDelete={() => setDeleteTarget(doc)}
                      onSetPrimary={() => handleSetPrimary(doc.id)}
                    />
                  ))}
                </AnimatedCardGrid>
              </div>
            ) : (
              !isUploading && (
                <EmptyState
                  icon={Upload}
                  title="No documents yet"
                  description="Upload your CV or generate one from your profile to get started"
                  action={
                    <div className="flex items-center gap-3">
                      <Button
                        variant="default"
                        size="sm"
                        leftIcon={<Upload size={14} />}
                        onClick={() => {
                          const el =
                            document.querySelector<HTMLInputElement>(
                              'input[type="file"]',
                            );
                          el?.click();
                        }}
                      >
                        Upload CV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Sparkles size={14} />}
                        onClick={handleGenerateCV}
                        isLoading={isGenerating}
                      >
                        Generate from Profile
                      </Button>
                    </div>
                  }
                />
              )
            )}
          </div>
        </TabsContent>

        {/* ══════ Generate CV Tab ══════ */}
        <TabsContent value="generate" className="mt-6">
          <GeneratedCVShowcase
            generatedCV={generatedCV}
            profileName={profile?.fullName || ""}
            isGenerating={isGenerating}
            onGenerate={handleGenerateCV}
          />
        </TabsContent>
      </Tabs>

      {/* ══════ Delete Confirmation ══════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteDocument}
        title={`Delete ${deleteTarget?.fileName || "document"}?`}
        message="This action cannot be undone. The document will be permanently removed from your profile."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeleting}
      />

      {/* ══════ File Preview Dialog ══════ */}
      <FilePreviewDialog
        doc={previewDoc}
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      />
    </div>
  );
}
