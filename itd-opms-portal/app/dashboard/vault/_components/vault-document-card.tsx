"use client";

import { motion } from "framer-motion";
import { Lock, Download } from "lucide-react";
import type { VaultDocument } from "@/hooks/use-vault";
import { ClassificationBadge } from "./classification-badge";
import { StatusBadge } from "./status-badge";
import { getFileIcon, getFileIconColor, formatDate, formatFileSize } from "./vault-constants";

interface VaultDocumentCardProps {
  doc: VaultDocument;
  index: number;
  onSelect: (id: string) => void;
  onDownload: (id: string) => void;
}

export function VaultDocumentCard({ doc, index, onSelect, onDownload }: VaultDocumentCardProps) {
  const Icon = getFileIcon(doc.contentType);
  const iconColor = getFileIconColor(doc.contentType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect(doc.id)}
      className="group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        <div className="flex items-center gap-1">
          {doc.lockedBy && <Lock size={14} className="text-[var(--text-tertiary)]" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(doc.id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-2)]"
          >
            <Download size={14} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
        {doc.title}
      </h3>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <ClassificationBadge classification={doc.classification} />
        {doc.status !== "active" && <StatusBadge status={doc.status} />}
        {doc.version > 1 && (
          <span className="text-xs text-[var(--text-tertiary)]">v{doc.version}</span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <span>{formatDate(doc.createdAt)}</span>
        <span>{formatFileSize(doc.sizeBytes)}</span>
      </div>
    </motion.div>
  );
}
