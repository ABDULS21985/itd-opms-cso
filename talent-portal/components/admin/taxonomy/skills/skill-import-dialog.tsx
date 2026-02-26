"use client";

import { useRef, useState } from "react";
import { X, Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBulkImportSkills } from "@/hooks/use-taxonomy";
import type { CsvImportResult } from "@/types/taxonomy";
import { cn } from "@/lib/utils";

interface SkillImportDialogProps {
  open: boolean;
  onClose: () => void;
}

type Step = "upload" | "preview" | "results";

interface ParsedSkill {
  name: string;
  category?: string;
}

export function SkillImportDialog({ open, onClose }: SkillImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [skills, setSkills] = useState<ParsedSkill[]>([]);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const bulkImport = useBulkImportSkills();

  if (!open) return null;

  const stepTitle: Record<Step, string> = {
    upload: "Upload CSV",
    preview: "Preview Skills",
    results: "Import Results",
  };

  function reset() {
    setStep("upload");
    setSkills([]);
    setResult(null);
    bulkImport.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error("CSV file is empty");
      return;
    }

    let startIndex = 0;
    const firstCols = lines[0].split(",").map((c) => c.trim().toLowerCase());
    if (firstCols[0] === "name") startIndex = 1;

    const parsed: ParsedSkill[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const name = cols[0];
      if (!name) continue;
      parsed.push({ name, category: cols[1] || undefined });
    }

    if (parsed.length === 0) {
      toast.error("No valid skills found in CSV");
      return;
    }

    setSkills(parsed);
    setStep("preview");
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => parseCsv(e.target?.result as string);
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    bulkImport.mutate(skills, {
      onSuccess: (data) => {
        setResult(data);
        setStep("results");
        toast.success(`${data.imported} skill${data.imported !== 1 ? "s" : ""} imported`);
      },
      onError: () => {
        toast.error("Import failed. Please try again.");
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--surface-0)] p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{stepTitle[step]}</h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
              dragOver
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-1)]",
            )}
          >
            <Upload size={32} className="text-[var(--neutral-gray)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Drop a CSV file here or click to browse
            </p>
            <p className="text-xs text-[var(--neutral-gray)]">
              Expected columns: name, category (optional)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <FileText size={16} className="text-[var(--primary)]" />
              <span className="font-medium">{skills.length} skill{skills.length !== 1 ? "s" : ""} ready to import</span>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--surface-1)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[var(--neutral-gray)]">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--neutral-gray)]">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {skills.slice(0, 20).map((s, i) => (
                    <tr key={i} className="hover:bg-[var(--surface-1)] transition-colors">
                      <td className="px-3 py-2 text-[var(--text-primary)]">{s.name}</td>
                      <td className="px-3 py-2 text-[var(--neutral-gray)]">{s.category ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {skills.length > 20 && (
                <p className="px-3 py-2 text-xs text-[var(--neutral-gray)] bg-[var(--surface-1)]">
                  ...and {skills.length - 20} more
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setStep("upload"); setSkills([]); }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={bulkImport.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
              >
                {bulkImport.isPending && <Loader2 size={14} className="animate-spin" />}
                Import
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === "results" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-[var(--success)]" />
                <span className="font-medium text-[var(--text-primary)]">{result.imported} imported</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle size={16} className="text-amber-500" />
                  <span className="font-medium text-[var(--neutral-gray)]">{result.skipped} skipped</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 p-3 space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-[var(--error)]">
                    <span className="font-medium">{err.name}:</span> {err.message}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={handleClose}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--secondary)] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
