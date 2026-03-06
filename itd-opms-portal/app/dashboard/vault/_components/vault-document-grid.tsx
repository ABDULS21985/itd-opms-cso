"use client";

import { motion } from "framer-motion";
import type { VaultDocument } from "@/hooks/use-vault";
import { VaultDocumentCard } from "./vault-document-card";

interface VaultDocumentGridProps {
  documents: VaultDocument[];
  onSelect: (id: string) => void;
  onDownload: (id: string) => void;
}

export function VaultDocumentGrid({ documents, onSelect, onDownload }: VaultDocumentGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {documents.map((doc, index) => (
        <VaultDocumentCard
          key={doc.id}
          doc={doc}
          index={index}
          onSelect={onSelect}
          onDownload={onDownload}
        />
      ))}
    </motion.div>
  );
}
