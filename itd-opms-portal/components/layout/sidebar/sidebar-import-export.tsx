"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Upload,
  Share2,
  FileJson,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type SidebarLayoutState,
  validateImportedLayout,
  exportLayoutToFile,
  encodeLayoutToBase64,
} from "@/lib/sidebar-layout-utils";

interface SidebarImportExportProps {
  open: boolean;
  onClose: () => void;
  currentLayout: SidebarLayoutState;
  onImport: (layout: SidebarLayoutState) => void;
}

export function SidebarImportExport({
  open,
  onClose,
  currentLayout,
  onImport,
}: SidebarImportExportProps) {
  const [preview, setPreview] = useState<SidebarLayoutState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    exportLayoutToFile(currentLayout);
    toast("Layout exported successfully");
  }, [currentLayout]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          if (validateImportedLayout(json)) {
            setPreview(json);
            setError(null);
          } else {
            setError("Invalid layout file. Expected version 1 format.");
            setPreview(null);
          }
        } catch {
          setError("Failed to parse JSON file.");
          setPreview(null);
        }
      };
      reader.readAsText(file);

      // Reset input
      e.target.value = "";
    },
    [],
  );

  const handleApplyImport = useCallback(() => {
    if (!preview) return;
    onImport(preview);
    setPreview(null);
    toast("Layout imported successfully");
    onClose();
  }, [preview, onImport, onClose]);

  const handleShare = useCallback(() => {
    const encoded = encodeLayoutToBase64(currentLayout);
    const url = `${window.location.origin}/dashboard?sidebar-layout=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast("Share URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [currentLayout]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[90vw] max-w-md"
          >
            <div className="bg-[#031A0B] border border-[#1B7340]/20 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B7340]/15">
                <h2 className="text-base font-semibold text-white">
                  Import / Export Layout
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Export */}
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-[#1B7340]/15 text-white hover:bg-white/10 transition-colors"
                >
                  <Download
                    size={18}
                    className="text-[#2D9B58] flex-shrink-0"
                  />
                  <div className="text-left">
                    <span className="text-sm font-medium block">
                      Export Layout
                    </span>
                    <span className="text-xs text-gray-400">
                      Download your current layout as JSON
                    </span>
                  </div>
                </button>

                {/* Import */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-[#1B7340]/15 text-white hover:bg-white/10 transition-colors"
                >
                  <Upload
                    size={18}
                    className="text-[#2D9B58] flex-shrink-0"
                  />
                  <div className="text-left">
                    <span className="text-sm font-medium block">
                      Import Layout
                    </span>
                    <span className="text-xs text-gray-400">
                      Load a layout from a JSON file
                    </span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-[#1B7340]/15 text-white hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <Check
                      size={18}
                      className="text-emerald-400 flex-shrink-0"
                    />
                  ) : (
                    <Share2
                      size={18}
                      className="text-[#2D9B58] flex-shrink-0"
                    />
                  )}
                  <div className="text-left">
                    <span className="text-sm font-medium block">
                      {copied ? "Copied!" : "Share Layout"}
                    </span>
                    <span className="text-xs text-gray-400">
                      Copy a shareable URL to clipboard
                    </span>
                  </div>
                </button>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                {/* Import preview */}
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-xl bg-white/5 border border-[#1B7340]/20 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <FileJson size={16} className="text-[#2D9B58]" />
                      Preview
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-300">
                      <div className="flex justify-between">
                        <span>Sections:</span>
                        <span className="text-white">
                          {preview.sectionOrder.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hidden items:</span>
                        <span className="text-white">
                          {preview.hiddenItems.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hidden sections:</span>
                        <span className="text-white">
                          {preview.hiddenSections.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Width:</span>
                        <span className="text-white">
                          {preview.sidebarWidth}px
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleApplyImport}
                      className="w-full py-2 rounded-lg bg-[#1B7340]/20 text-[#2D9B58] text-sm font-medium hover:bg-[#1B7340]/30 transition-colors"
                    >
                      Apply Layout
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
