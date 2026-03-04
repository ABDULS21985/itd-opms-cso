"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  FileWarning,
  ArrowDownToLine,
  Info,
} from "lucide-react";
import {
  useValidateProjectImport,
  useCommitProjectImport,
} from "@/hooks/use-planning";
import type {
  ValidateImportResponse,
  CommitImportResponse,
  ImportRow,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089/api/v1";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "upload" | "preview" | "importing" | "result";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("opms-token");
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function downloadTemplate(format: "xlsx" | "csv") {
  const response = await fetch(
    `${API_BASE_URL}/planning/projects/import/template?format=${format}`,
    {
      headers: getAuthHeaders(),
      credentials: "include",
    },
  );
  if (!response.ok) throw new Error("Failed to download template");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project-import-template.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadErrorReport(batchId: string) {
  const response = await fetch(
    `${API_BASE_URL}/planning/projects/import/batches/${batchId}/error-report`,
    {
      headers: getAuthHeaders(),
      credentials: "include",
    },
  );
  if (!response.ok) throw new Error("Failed to download error report");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-errors-${batchId.slice(0, 8)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BulkUploadModal({ open, onClose }: BulkUploadModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidateImportResponse | null>(null);
  const [importResult, setImportResult] =
    useState<CommitImportResponse | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateMutation = useValidateProjectImport();
  const commitMutation = useCommitProjectImport();

  const PREVIEW_PAGE_SIZE = 20;

  const reset = useCallback(() => {
    setStep("upload");
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setPreviewPage(1);
    validateMutation.reset();
    commitMutation.reset();
  }, [validateMutation, commitMutation]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFileSelect = useCallback(
    (file: File) => {
      const ext = file.name.toLowerCase();
      if (!ext.endsWith(".xlsx") && !ext.endsWith(".csv")) {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      setSelectedFile(file);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleValidate = useCallback(async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);

    validateMutation.mutate(formData, {
      onSuccess: (data) => {
        setValidationResult(data);
        setStep("preview");
      },
    });
  }, [selectedFile, validateMutation]);

  const handleCommit = useCallback(async () => {
    if (!validationResult) return;
    setStep("importing");

    commitMutation.mutate(validationResult.batchId, {
      onSuccess: (data) => {
        setImportResult(data);
        setStep("result");
      },
      onError: () => {
        setStep("preview");
      },
    });
  }, [validationResult, commitMutation]);

  if (!open) return null;

  // Paginated preview rows.
  const previewRows = validationResult?.rows ?? [];
  const totalPreviewPages = Math.ceil(
    previewRows.length / PREVIEW_PAGE_SIZE,
  );
  const paginatedRows = previewRows.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE,
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-[var(--surface-0)] shadow-2xl border border-[var(--border)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
                  <Upload size={18} style={{ color: "#1B7340" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    Bulk Upload Projects
                  </h2>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    {step === "upload" && "Upload a CSV or Excel file"}
                    {step === "preview" && "Review validation results"}
                    {step === "importing" && "Importing projects..."}
                    {step === "result" && "Import complete"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                {/* STEP 1: Upload */}
                {step === "upload" && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    {/* Download Template */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                      <div className="flex items-start gap-3">
                        <Info
                          size={16}
                          className="mt-0.5 text-[var(--primary)] shrink-0"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                            Start by downloading the import template
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)] mb-3">
                            Fill in the template with your project data. Required
                            fields are marked in the template. Dates must be in
                            YYYY-MM-DD format.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => downloadTemplate("xlsx")}
                              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                            >
                              <ArrowDownToLine size={14} />
                              Excel Template (.xlsx)
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadTemplate("csv")}
                              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                            >
                              <ArrowDownToLine size={14} />
                              CSV Template (.csv)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200"
                      style={{
                        borderColor: dragOver
                          ? "var(--primary)"
                          : selectedFile
                            ? "#22C55E"
                            : "var(--border)",
                        backgroundColor: dragOver
                          ? "rgba(27, 115, 64, 0.05)"
                          : selectedFile
                            ? "rgba(34, 197, 94, 0.03)"
                            : "var(--surface-1)",
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />

                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileSpreadsheet
                            size={36}
                            className="text-[#22C55E]"
                          />
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)]">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                            className="mt-1 text-xs text-[var(--error)] hover:underline"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload
                            size={36}
                            className="text-[var(--neutral-gray)]"
                          />
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            Drop your file here or click to browse
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)]">
                            Accepted formats: .xlsx, .csv (max 10 MB, max 500
                            rows)
                          </p>
                        </div>
                      )}
                    </div>

                    {validateMutation.isError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                        <AlertCircle
                          size={16}
                          className="text-[var(--error)] mt-0.5 shrink-0"
                        />
                        <p className="text-sm text-[var(--error)]">
                          {(validateMutation.error as Error)?.message ||
                            "Failed to validate file"}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: Preview */}
                {step === "preview" && validationResult && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <SummaryCard
                        label="Total Rows"
                        value={validationResult.totalRows}
                        color="var(--primary)"
                      />
                      <SummaryCard
                        label="Valid"
                        value={validationResult.validRows}
                        color="#22C55E"
                      />
                      <SummaryCard
                        label="Errors"
                        value={validationResult.invalidRows}
                        color="#EF4444"
                      />
                    </div>

                    {validationResult.invalidRows > 0 && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                        <FileWarning
                          size={16}
                          className="text-amber-600 mt-0.5 shrink-0"
                        />
                        <p className="text-sm text-amber-800">
                          {validationResult.invalidRows} row
                          {validationResult.invalidRows !== 1 ? "s" : ""} failed
                          validation and will be skipped. Only the{" "}
                          {validationResult.validRows} valid row
                          {validationResult.validRows !== 1 ? "s" : ""} will be
                          imported.
                        </p>
                      </div>
                    )}

                    {validationResult.validRows === 0 && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                        <AlertCircle
                          size={16}
                          className="text-[var(--error)] mt-0.5 shrink-0"
                        />
                        <p className="text-sm text-[var(--error)]">
                          No valid rows to import. Please fix the errors and
                          re-upload.
                        </p>
                      </div>
                    )}

                    {/* Preview table */}
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[var(--surface-1)]">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)] w-10">
                                #
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)] w-10">
                                Status
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">
                                Code
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">
                                Title
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">
                                Portfolio
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">
                                Division
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">
                                Priority
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--neutral-gray)]">
                                Issues
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedRows.map((row: ImportRow) => (
                              <tr
                                key={row.rowNumber}
                                className="border-t border-[var(--border)]"
                                style={{
                                  backgroundColor: row.isValid
                                    ? undefined
                                    : "rgba(239, 68, 68, 0.03)",
                                }}
                              >
                                <td className="px-3 py-2 text-xs text-[var(--neutral-gray)] tabular-nums">
                                  {row.rowNumber}
                                </td>
                                <td className="px-3 py-2">
                                  {row.isValid ? (
                                    <CheckCircle2
                                      size={16}
                                      className="text-[#22C55E]"
                                    />
                                  ) : (
                                    <AlertCircle
                                      size={16}
                                      className="text-[var(--error)]"
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">
                                  {row.code || "—"}
                                </td>
                                <td className="px-3 py-2 text-xs max-w-[200px] truncate">
                                  {row.title || "—"}
                                </td>
                                <td className="px-3 py-2 text-xs truncate">
                                  {row.portfolioName || "—"}
                                </td>
                                <td className="px-3 py-2 text-xs truncate">
                                  {row.divisionName || "—"}
                                </td>
                                <td className="px-3 py-2 text-xs capitalize">
                                  {row.priority || "medium"}
                                </td>
                                <td className="px-3 py-2">
                                  {row.errors && row.errors.length > 0 && (
                                    <div className="space-y-0.5">
                                      {row.errors.map((e, idx) => (
                                        <p
                                          key={idx}
                                          className="text-[10px] text-[var(--error)] leading-tight"
                                        >
                                          <span className="font-medium">
                                            {e.column}:
                                          </span>{" "}
                                          {e.message}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {totalPreviewPages > 1 && (
                        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 bg-[var(--surface-1)]">
                          <span className="text-xs text-[var(--neutral-gray)]">
                            Showing {(previewPage - 1) * PREVIEW_PAGE_SIZE + 1}-
                            {Math.min(
                              previewPage * PREVIEW_PAGE_SIZE,
                              previewRows.length,
                            )}{" "}
                            of {previewRows.length}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPage((p) => Math.max(1, p - 1))
                              }
                              disabled={previewPage <= 1}
                              className="px-2 py-1 rounded text-xs border border-[var(--border)] disabled:opacity-40"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPage((p) =>
                                  Math.min(totalPreviewPages, p + 1),
                                )
                              }
                              disabled={previewPage >= totalPreviewPages}
                              className="px-2 py-1 rounded text-xs border border-[var(--border)] disabled:opacity-40"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Importing */}
                {step === "importing" && (
                  <motion.div
                    key="importing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <Loader2
                      size={32}
                      className="animate-spin text-[var(--primary)] mb-4"
                    />
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Importing projects...
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)] mt-1">
                      This may take a moment. Do not close this window.
                    </p>
                  </motion.div>
                )}

                {/* STEP 4: Result */}
                {step === "result" && importResult && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-col items-center py-6">
                      {importResult.importedRows > 0 ? (
                        <CheckCircle2 size={48} className="text-[#22C55E]" />
                      ) : (
                        <AlertCircle size={48} className="text-[var(--error)]" />
                      )}
                      <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                        {importResult.importedRows > 0
                          ? "Import Successful"
                          : "Import Failed"}
                      </h3>
                      <p className="text-sm text-[var(--neutral-gray)] mt-1">
                        Batch ID: {importResult.batchId.slice(0, 8)}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <SummaryCard
                        label="Total Rows"
                        value={importResult.totalRows}
                        color="var(--primary)"
                      />
                      <SummaryCard
                        label="Imported"
                        value={importResult.importedRows}
                        color="#22C55E"
                      />
                      <SummaryCard
                        label="Failed"
                        value={importResult.failedRows}
                        color="#EF4444"
                      />
                    </div>

                    {importResult.failedRows > 0 && (
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            downloadErrorReport(importResult.batchId)
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                        >
                          <Download size={14} />
                          Download Error Report
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-1)]">
              <div>
                {step === "preview" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("upload");
                      setValidationResult(null);
                    }}
                    className="flex items-center gap-1 text-sm text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
                >
                  {step === "result" ? "Close" : "Cancel"}
                </button>

                {step === "upload" && (
                  <button
                    type="button"
                    onClick={handleValidate}
                    disabled={!selectedFile || validateMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {validateMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        Validate
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                )}

                {step === "preview" &&
                  validationResult &&
                  validationResult.validRows > 0 && (
                    <button
                      type="button"
                      onClick={handleCommit}
                      disabled={commitMutation.isPending}
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      Import {validationResult.validRows} Project
                      {validationResult.validRows !== 1 ? "s" : ""}
                      <ChevronRight size={14} />
                    </button>
                  )}

                {step === "result" && (
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Upload Another
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 text-center">
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
      <p className="text-xs text-[var(--neutral-gray)] mt-1">{label}</p>
    </div>
  );
}
