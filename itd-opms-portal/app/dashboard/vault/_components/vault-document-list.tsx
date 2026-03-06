"use client";

import { motion } from "framer-motion";
import type { VaultDocument } from "@/hooks/use-vault";
import { VaultDocumentRow } from "./vault-document-row";

interface VaultDocumentListProps {
  documents: VaultDocument[];
  onSelect: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export function VaultDocumentList({
  documents,
  onSelect,
  onDownload,
  onDelete,
}: VaultDocumentListProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Table Header */}
      <div
        className="grid grid-cols-12 gap-4 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-tertiary)",
          backgroundColor: "var(--surface-1)",
        }}
      >
        <div className="col-span-4">Name</div>
        <div className="col-span-2">Classification</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-2">Tags</div>
        <div className="col-span-2 text-right">Modified</div>
      </div>

      {/* Rows */}
      {documents.map((doc, index) => (
        <VaultDocumentRow
          key={doc.id}
          doc={doc}
          index={index}
          onSelect={onSelect}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </motion.div>
  );
}
