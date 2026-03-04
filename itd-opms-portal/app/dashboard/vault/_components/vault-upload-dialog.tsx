"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-vault";
import { DocumentUpload } from "@/components/shared/document-upload";
import { CLASSIFICATIONS, ACCESS_LEVELS } from "./vault-constants";

interface VaultUploadDialogProps {
  open: boolean;
  onClose: () => void;
  folderId: string | null;
}

export function VaultUploadDialog({ open, onClose, folderId }: VaultUploadDialogProps) {
  const uploadMutation = useUploadDocument();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classification, setClassification] = useState("operational");
  const [accessLevel, setAccessLevel] = useState("internal");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setClassification("operational");
    setAccessLevel("internal");
    setTags([]);
    setTagInput("");
  }, []);

  const handleAddTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const handleUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      formData.append("description", description);
      formData.append("classification", classification);
      formData.append("accessLevel", accessLevel);
      if (tags.length > 0) {
        formData.append("tags", tags.join(","));
      }
      if (folderId) {
        formData.append("folderId", folderId);
      }

      uploadMutation.mutate(formData, {
        onSuccess: () => {
          resetForm();
          onClose();
        },
      });
    },
    [title, description, classification, accessLevel, tags, folderId, uploadMutation, resetForm, onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upload Document</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Document title (uses filename if empty)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-1)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Description
                </label>
                <textarea
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)] resize-none"
                  style={{
                    backgroundColor: "var(--surface-1)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Classification */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Classification
                  </label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {CLASSIFICATIONS.filter((c) => c.value !== "").map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Access Level */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Access Level
                  </label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {ACCESS_LEVELS.map((al) => (
                      <option key={al.value} value={al.value}>
                        {al.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags as chips */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                      style={{ backgroundColor: "var(--surface-2)", color: "var(--text-secondary)" }}
                    >
                      {tag}
                      <button
                        onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                        className="hover:text-[var(--text-primary)]"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  onBlur={handleAddTag}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-1)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* File Upload */}
              <DocumentUpload onUpload={handleUpload} loading={uploadMutation.isPending} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
