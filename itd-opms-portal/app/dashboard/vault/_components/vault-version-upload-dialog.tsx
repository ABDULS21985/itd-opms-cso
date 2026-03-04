"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useUploadVersion } from "@/hooks/use-vault";
import { DocumentUpload } from "@/components/shared/document-upload";

interface VaultVersionUploadDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string | null;
}

export function VaultVersionUploadDialog({
  open,
  onClose,
  documentId,
}: VaultVersionUploadDialogProps) {
  const uploadMutation = useUploadVersion(documentId || undefined);

  const handleUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0 || !documentId) return;
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      uploadMutation.mutate(formData, { onSuccess: onClose });
    },
    [documentId, uploadMutation, onClose],
  );

  return (
    <AnimatePresence>
      {open && documentId && (
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
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Upload New Version
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Upload a new version of this document. The previous version will be preserved in the version history.
            </p>

            <DocumentUpload onUpload={handleUpload} loading={uploadMutation.isPending} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
