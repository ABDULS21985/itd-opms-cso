"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, AlertCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DocumentUploadProps {
  onUpload: (files: File[], metadata: Record<string, any>) => void;
  loading?: boolean;
  accept?: string;
  maxSize?: number; // bytes, default 50MB
  multiple?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DocumentUpload({
  onUpload,
  loading = false,
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  multiple = false,
}: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errs: string[] = [];

      for (const file of files) {
        if (file.size > maxSize) {
          errs.push(`"${file.name}" exceeds the maximum size of ${formatFileSize(maxSize)}`);
          continue;
        }

        if (!ACCEPTED_TYPES.includes(file.type) && !accept) {
          errs.push(`"${file.name}" has an unsupported file type (${file.type || "unknown"})`);
          continue;
        }

        valid.push(file);
      }

      return { valid, errors: errs };
    },
    [maxSize, accept],
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      const { valid, errors: validationErrors } = validateFiles(files);

      setErrors(validationErrors);

      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...valid]);
      } else {
        setSelectedFiles(valid.slice(0, 1));
      }
    },
    [multiple, validateFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be selected again.
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFiles],
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(() => {
    if (selectedFiles.length === 0) return;
    onUpload(selectedFiles, {});
  }, [selectedFiles, onUpload]);

  const acceptStr =
    accept ||
    ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.zip";

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200"
        style={{
          borderColor: dragOver ? "var(--primary)" : "var(--border)",
          backgroundColor: dragOver ? "rgba(59, 130, 246, 0.05)" : "var(--surface-1)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <motion.div
          animate={{ scale: dragOver ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: dragOver
                ? "rgba(59, 130, 246, 0.15)"
                : "var(--surface-2)",
            }}
          >
            <Upload
              size={24}
              style={{
                color: dragOver ? "var(--primary)" : "var(--neutral-gray)",
              }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {dragOver ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              or click to browse files (max {formatFileSize(maxSize)})
            </p>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            PDF, Word, Excel, PowerPoint, Images, Text, CSV, ZIP
          </p>
        </motion.div>
      </div>

      {/* Validation errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {errors.map((err, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  color: "#EF4444",
                }}
              >
                <AlertCircle size={14} />
                <span>{err}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected files list */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            {selectedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <FileText size={16} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {getFileExtension(file.name)} &middot; {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]"
                >
                  <X size={14} className="text-[var(--text-secondary)]" />
                </button>
              </motion.div>
            ))}

            <button
              type="button"
              onClick={handleUpload}
              disabled={loading || selectedFiles.length === 0}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--primary)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Uploading...
                </span>
              ) : (
                `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}`
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
