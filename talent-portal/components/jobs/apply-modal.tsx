"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Briefcase,
  Building2,
  Upload,
  FileText,
  Loader2,
  Send,
} from "lucide-react";
import type { JobPost } from "@/types/job";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplyModalProps {
  job: JobPost;
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ApplicationData) => void | Promise<void>;
}

export interface ApplicationData {
  coverNote: string;
  cvFile: File | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplyModal({ job, isOpen, onClose, onApply }: ApplyModalProps) {
  const [coverNote, setCoverNote] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleClose]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setCoverNote("");
      setCvFile(null);
      setErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!coverNote.trim()) errs.coverNote = "Cover note is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await onApply({ coverNote, cvFile });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCvFile(file);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl">
        {/* Header */}
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="apply-modal-title"
                className="text-lg font-semibold text-[var(--foreground)]"
              >
                Apply for Position
              </h2>
              <div className="mt-1.5 flex items-center gap-3 text-sm text-[var(--neutral-gray)]">
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {job.title}
                </span>
                {job.employer && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {job.employer.companyName}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--foreground)] disabled:opacity-40"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="space-y-5">
            {/* Cover note */}
            <div>
              <label
                htmlFor="coverNote"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              >
                Cover Note *
              </label>
              <textarea
                id="coverNote"
                value={coverNote}
                onChange={(e) => {
                  setCoverNote(e.target.value);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.coverNote;
                    return next;
                  });
                }}
                placeholder="Introduce yourself and explain why you'd be a great fit..."
                rows={5}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              {errors.coverNote && (
                <p className="mt-1 text-xs text-[var(--error)]">
                  {errors.coverNote}
                </p>
              )}
            </div>

            {/* CV upload */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                CV / Resume (optional)
              </label>
              <div className="relative">
                {cvFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                    <FileText className="h-5 w-5 shrink-0 text-[var(--primary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {cvFile.name}
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)]">
                        {(cvFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCvFile(null)}
                      className="rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--error)]"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--surface-4)] px-4 py-6 text-sm text-[var(--neutral-gray)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]">
                    <Upload className="h-5 w-5" />
                    Click to upload your CV
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                PDF, DOC, or DOCX up to 5MB
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
