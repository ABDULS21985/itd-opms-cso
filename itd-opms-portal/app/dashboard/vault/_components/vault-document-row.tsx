"use client";

import { motion } from "framer-motion";
import { Lock, Download, Trash2 } from "lucide-react";
import type { VaultDocument } from "@/hooks/use-vault";
import { ClassificationBadge } from "./classification-badge";
import { StatusBadge } from "./status-badge";
import { getFileIcon, getFileIconColor, formatDate, formatFileSize } from "./vault-constants";

interface VaultDocumentRowProps {
  doc: VaultDocument;
  index: number;
  onSelect: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export function VaultDocumentRow({ doc, index, onSelect, onDownload, onDelete }: VaultDocumentRowProps) {
  const Icon = getFileIcon(doc.contentType);
  const iconColor = getFileIconColor(doc.contentType);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      onClick={() => onSelect(doc.id)}
      className="group grid cursor-pointer grid-cols-12 gap-4 border-b px-4 py-3 transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <Icon size={18} style={{ color: iconColor }} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{doc.title}</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {doc.fileName}
            {doc.lockedBy && <Lock size={10} className="ml-1 inline text-[var(--text-tertiary)]" />}
          </p>
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-1.5">
        <ClassificationBadge classification={doc.classification} />
      </div>
      <div className="col-span-1 flex items-center">
        <StatusBadge status={doc.status} />
      </div>
      <div className="col-span-1 flex items-center text-xs text-[var(--text-secondary)]">
        {formatFileSize(doc.sizeBytes)}
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-1">
        {doc.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="inline-flex rounded px-1.5 py-0.5 text-xs"
            style={{ backgroundColor: "var(--surface-2)", color: "var(--text-secondary)" }}
          >
            {tag}
          </span>
        ))}
        {doc.tags.length > 2 && (
          <span className="text-xs text-[var(--text-tertiary)]">+{doc.tags.length - 2}</span>
        )}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-1">
        <span className="text-xs text-[var(--text-secondary)] mr-auto">{formatDate(doc.updatedAt)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(doc.id); }}
          className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-2)]"
          title="Download"
        >
          <Download size={14} className="text-[var(--text-secondary)]" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
          className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-2)]"
          title="Delete"
        >
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>
    </motion.div>
  );
}
