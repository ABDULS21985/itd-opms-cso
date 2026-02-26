"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  currentFile?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File | string): boolean {
  if (typeof file === "string") {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file);
  }
  return file.type.startsWith("image/");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUpload({
  accept,
  maxSize = 5 * 1024 * 1024, // 5MB default
  onUpload,
  label = "Upload a file",
  currentFile,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentFile ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!currentFile);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      setError(null);

      // Validate size
      if (selectedFile.size > maxSize) {
        setError(
          `File too large. Maximum size is ${formatFileSize(maxSize)}.`,
        );
        return;
      }

      setFile(selectedFile);
      setUploaded(false);

      // Preview for images
      if (isImageFile(selectedFile)) {
        const reader = new FileReader();
        reader.onload = (e) =>
          setPreview(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }

      // Upload
      setUploading(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const url = await onUpload(selectedFile);
        setPreview(url);
        setUploaded(true);
        setProgress(100);
      } catch (err: any) {
        setError(err?.message ?? "Upload failed. Please try again.");
        setFile(null);
        setPreview(null);
      } finally {
        clearInterval(progressInterval);
        setUploading(false);
      }
    },
    [maxSize, onUpload],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  }

  function handleRemove() {
    setFile(null);
    setPreview(null);
    setUploaded(false);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="w-full">
      {/* Current file / preview */}
      {(file || preview) && !uploading ? (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
          {/* Preview */}
          {preview && isImageFile(preview) ? (
            <img
              src={preview}
              alt="Preview"
              className="h-14 w-14 shrink-0 rounded-lg object-cover ring-2 ring-[var(--surface-3)]"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]">
              <FileText className="h-6 w-6 text-[var(--neutral-gray)]" />
            </div>
          )}

          {/* File info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {file?.name ?? "Current file"}
            </p>
            {file && (
              <p className="text-xs text-[var(--neutral-gray)]">
                {formatFileSize(file.size)}
              </p>
            )}
            {uploaded && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--success)]">
                <CheckCircle className="h-3 w-3" />
                Uploaded
              </p>
            )}
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--error)]"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : uploading ? (
        /* Upload progress */
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--primary)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Uploading...
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragOver
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--surface-4)] hover:border-[var(--primary)] hover:bg-[var(--surface-1)]"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <Upload className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--neutral-gray)]">
                Drag and drop or click to browse
              </p>
            </div>
            <p className="text-[10px] text-[var(--neutral-gray)]">
              Max size: {formatFileSize(maxSize)}
              {accept && ` | Accepted: ${accept}`}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}
