"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Database,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api-client";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ExportColumn,
} from "@/lib/export-utils";
import { toast } from "sonner";

interface ExportDropdownProps<T> {
  data: T[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  serverExportUrl?: string;
  serverExportParams?: Record<string, string>;
}

async function downloadServerExport(
  url: string,
  params?: Record<string, string>,
  filename?: string,
) {
  try {
    const queryString = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    const token =
      typeof window !== "undefined" ? localStorage.getItem("opms-token") : null;

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${url}${queryString}`, {
      headers,
      credentials: "include",
    });

    if (!response.ok) throw new Error("Export failed");

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    toast.success("Export downloaded");
  } catch {
    toast.error("Failed to download export");
  }
}

export function ExportDropdown<T extends Record<string, any>>({
  data,
  columns,
  filename,
  title,
  serverExportUrl,
  serverExportParams,
}: ExportDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const items = [
    {
      label: "Export as CSV",
      icon: FileSpreadsheet,
      action: () => {
        exportToCSV(data, columns, filename);
        toast.success("CSV exported");
        setOpen(false);
      },
    },
    {
      label: "Export as Excel",
      icon: FileSpreadsheet,
      action: () => {
        exportToExcel(data, columns, filename);
        toast.success("Excel exported");
        setOpen(false);
      },
    },
    {
      label: "Export as PDF",
      icon: FileText,
      action: () => {
        exportToPDF(data, columns, title || filename);
        setOpen(false);
      },
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-52 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-1"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                <item.icon size={15} className="text-[var(--neutral-gray)]" />
                {item.label}
              </button>
            ))}

            {serverExportUrl && (
              <>
                <div className="h-px bg-[var(--border)] mx-1 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    downloadServerExport(
                      serverExportUrl,
                      serverExportParams,
                      `${filename}-full.csv`,
                    );
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  <Database
                    size={15}
                    className="text-[var(--neutral-gray)]"
                  />
                  Export All (CSV)
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
