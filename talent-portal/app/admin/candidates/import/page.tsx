"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ChevronDown,
  X,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

interface ColumnMapping {
  csvColumn: string;
  targetField: string;
}

const TARGET_FIELDS = [
  { value: "", label: "-- Skip --" },
  { value: "fullName", label: "Full Name" },
  { value: "contactEmail", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
  { value: "bio", label: "Bio" },
  { value: "primaryTrack", label: "Primary Track" },
  { value: "yearsOfExperience", label: "Years of Experience" },
  { value: "githubUrl", label: "GitHub URL" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
  { value: "portfolioUrl", label: "Portfolio URL" },
  { value: "skills", label: "Skills (comma-separated)" },
  { value: "availabilityStatus", label: "Availability" },
  { value: "preferredWorkMode", label: "Work Mode" },
];

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "results";

export default function BulkImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0) {
        toast.error("Could not parse CSV. Make sure it has a header row.");
        return;
      }

      setCsvHeaders(headers);
      setParsedData(rows);

      // Auto-map columns
      const mappings: ColumnMapping[] = headers.map((header) => {
        const lowerHeader = header.toLowerCase().replace(/[\s_-]/g, "");
        const match = TARGET_FIELDS.find((f) => {
          const lowerField = f.value.toLowerCase();
          return lowerHeader.includes(lowerField) || lowerField.includes(lowerHeader);
        });
        return {
          csvColumn: header,
          targetField: match?.value || "",
        };
      });

      setColumnMappings(mappings);
      setStep("mapping");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const updateMapping = (csvColumn: string, targetField: string) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.csvColumn === csvColumn ? { ...m, targetField } : m))
    );
  };

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);

    try {
      const mappedData = parsedData.map((row) => {
        const mapped: Record<string, string> = {};
        columnMappings.forEach((cm) => {
          if (cm.targetField) {
            mapped[cm.targetField] = row[cm.csvColumn];
          }
        });
        return mapped;
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      const result = await apiClient.post<ImportResult>("/admin/candidates/import", {
        candidates: mappedData,
        mappings: columnMappings.filter((m) => m.targetField),
      });

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setStep("results");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
      setStep("preview");
    }
  };

  const resetImport = () => {
    setStep("upload");
    setFileName("");
    setCsvHeaders([]);
    setParsedData([]);
    setColumnMappings([]);
    setImportProgress(0);
    setImportResult(null);
  };

  const activeMappings = columnMappings.filter((m) => m.targetField);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/candidates"
          className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Bulk Import Candidates
          </h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
            Upload a CSV file to import multiple candidates at once.
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "mapping", "preview", "results"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div className="w-8 h-0.5 bg-[var(--surface-3)]" />
            )}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
                step === s || (step === "importing" && s === "preview")
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : (["upload", "mapping", "preview", "results"].indexOf(step) >
                      ["upload", "mapping", "preview", "results"].indexOf(s) ||
                    step === "importing")
                  ? "text-[var(--success)]"
                  : "text-[var(--neutral-gray)]"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs">
                {i + 1}
              </span>
              <span className="hidden sm:inline capitalize">{s}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--surface-3)] bg-[var(--surface-1)] hover:border-[var(--primary)]/50"
            }`}
          >
            <FileSpreadsheet
              size={48}
              className={`mx-auto mb-4 ${
                isDragging ? "text-[var(--primary)]" : "text-[var(--surface-4)]"
              }`}
            />
            <p className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              {isDragging ? "Drop your file here" : "Upload CSV File"}
            </p>
            <p className="text-sm text-[var(--neutral-gray)] mb-4">
              Drag and drop your CSV file or click to browse
            </p>
            <p className="text-xs text-[var(--neutral-gray)]">
              Supported format: .csv (max 10MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
            />
          </div>

          <div className="mt-6 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
              CSV Format Guidelines
            </h3>
            <ul className="text-xs text-[var(--neutral-gray)] space-y-1">
              <li>- First row must be column headers</li>
              <li>- Required columns: Full Name, Email</li>
              <li>- Skills can be comma-separated within a single column</li>
              <li>- Ensure emails are unique per candidate</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step: Column Mapping */}
      {step === "mapping" && (
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] mb-1">
              Map Columns
            </h2>
            <p className="text-sm text-[var(--neutral-gray)]">
              Map your CSV columns to candidate fields. File: {fileName} ({parsedData.length} rows)
            </p>
          </div>

          <div className="space-y-3">
            {columnMappings.map((mapping) => (
              <div
                key={mapping.csvColumn}
                className="flex items-center gap-4 p-3 rounded-xl bg-[var(--surface-1)]"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {mapping.csvColumn}
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    Sample: {parsedData[0]?.[mapping.csvColumn] || "N/A"}
                  </p>
                </div>
                <ArrowRight size={16} className="text-[var(--neutral-gray)] shrink-0" />
                <div className="flex-1 relative">
                  <select
                    value={mapping.targetField}
                    onChange={(e) => updateMapping(mapping.csvColumn, e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors bg-[var(--surface-0)]"
                  >
                    {TARGET_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setStep("upload")}
              className="text-sm text-[var(--neutral-gray)] hover:text-[var(--text-primary)] font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setStep("preview")}
              disabled={activeMappings.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] disabled:opacity-60 transition-colors"
            >
              Preview Import <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] mb-1">Preview</h2>
            <p className="text-sm text-[var(--neutral-gray)]">
              Showing first 5 rows of {parsedData.length} total. {activeMappings.length} fields mapped.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-[var(--neutral-gray)] uppercase">
                    #
                  </th>
                  {activeMappings.map((m) => (
                    <th
                      key={m.targetField}
                      className="text-left px-4 py-2 text-xs font-semibold text-[var(--neutral-gray)] uppercase"
                    >
                      {TARGET_FIELDS.find((f) => f.value === m.targetField)?.label ||
                        m.targetField}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {parsedData.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-1)]">
                    <td className="px-4 py-2 text-[var(--neutral-gray)]">
                      {idx + 1}
                    </td>
                    {activeMappings.map((m) => (
                      <td
                        key={m.targetField}
                        className="px-4 py-2 text-[var(--text-primary)] max-w-[200px] truncate"
                      >
                        {row[m.csvColumn] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedData.length > 5 && (
            <p className="text-xs text-[var(--neutral-gray)] text-center">
              ...and {parsedData.length - 5} more rows
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setStep("mapping")}
              className="text-sm text-[var(--neutral-gray)] hover:text-[var(--text-primary)] font-medium"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] transition-colors"
            >
              <Upload size={16} /> Import {parsedData.length} Candidates
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
          <Loader2 size={48} className="mx-auto text-[var(--primary)] animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Importing Candidates...
          </h2>
          <p className="text-sm text-[var(--neutral-gray)] mb-6">
            Please do not close this page.
          </p>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="w-full h-3 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(importProgress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-[var(--neutral-gray)] mt-2">
              {Math.round(importProgress)}% complete
            </p>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === "results" && importResult && (
        <div className="space-y-6">
          <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6">
            <div className="text-center mb-6">
              <CheckCircle2
                size={48}
                className="mx-auto text-[var(--success)] mb-3"
              />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Import Complete
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[var(--success-light)] text-center">
                <p className="text-2xl font-bold text-[var(--success-dark)]">
                  {importResult.imported}
                </p>
                <p className="text-xs text-[var(--success-dark)] mt-1">
                  Successfully Imported
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--warning-light)] text-center">
                <p className="text-2xl font-bold text-[var(--warning-dark)]">
                  {importResult.skipped}
                </p>
                <p className="text-xs text-[var(--warning-dark)] mt-1">
                  Skipped (duplicates)
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--error-light)] text-center">
                <p className="text-2xl font-bold text-[var(--error-dark)]">
                  {importResult.errors.length}
                </p>
                <p className="text-xs text-[var(--error-dark)] mt-1">Errors</p>
              </div>
            </div>
          </div>

          {/* Error details */}
          {importResult.errors.length > 0 && (
            <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)]">
              <div className="p-4 px-6 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--error)]">
                  Error Details
                </h3>
              </div>
              <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                {importResult.errors.map((err, idx) => (
                  <div key={idx} className="p-3 px-6 text-sm">
                    <span className="font-medium text-[var(--text-primary)]">
                      Row {err.row}:
                    </span>{" "}
                    <span className="text-[var(--error)]">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={resetImport}
              className="text-sm text-[var(--neutral-gray)] hover:text-[var(--text-primary)] font-medium"
            >
              Import Another File
            </button>
            <Link
              href="/admin/candidates"
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] transition-colors"
            >
              View Candidates <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
