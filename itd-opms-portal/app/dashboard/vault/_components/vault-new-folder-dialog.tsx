"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCreateFolder, useFolders } from "@/hooks/use-vault";

interface VaultNewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  parentFolderId: string | null;
}

export function VaultNewFolderDialog({ open, onClose, parentFolderId }: VaultNewFolderDialogProps) {
  const createMutation = useCreateFolder();
  const { data: foldersData } = useFolders();
  const folders = Array.isArray(foldersData) ? foldersData : [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setColor("#3B82F6");
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createMutation.mutate(
      {
        name: name.trim(),
        parentId: parentFolderId || undefined,
        description: description || undefined,
        color,
      },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
      },
    );
  }, [name, description, color, parentFolderId, createMutation, resetForm, onClose]);

  const parentFolder = parentFolderId ? folders.find((f) => f.id === parentFolderId) : null;

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
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Folder</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Folder Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter folder name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-1)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-1)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-lg border"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">{color}</span>
                </div>
              </div>

              {parentFolder && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  Creating inside: <span className="font-medium">{parentFolder.name}</span>
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim() || createMutation.isPending}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {createMutation.isPending ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
