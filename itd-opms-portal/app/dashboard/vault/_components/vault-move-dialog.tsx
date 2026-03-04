"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Folder, FolderOpen, ChevronRight } from "lucide-react";
import { useFolders, useMoveDocument, type DocumentFolder } from "@/hooks/use-vault";
import { buildFolderTree } from "./vault-constants";

interface VaultMoveDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string | null;
}

export function VaultMoveDialog({ open, onClose, documentId }: VaultMoveDialogProps) {
  const { data: foldersData } = useFolders();
  const moveMutation = useMoveDocument();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const folders = useMemo<DocumentFolder[]>(() => {
    if (!foldersData) return [];
    return Array.isArray(foldersData) ? foldersData : [];
  }, [foldersData]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const handleMove = useCallback(() => {
    if (!documentId) return;
    moveMutation.mutate(
      { id: documentId, folderId: selectedFolderId },
      {
        onSuccess: () => {
          setSelectedFolderId(null);
          onClose();
        },
      },
    );
  }, [documentId, selectedFolderId, moveMutation, onClose]);

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
            className="w-full max-w-sm rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Move Document</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Root option */}
              <FolderPickerItem
                name="Root (no folder)"
                isSelected={selectedFolderId === null}
                onSelect={() => setSelectedFolderId(null)}
                depth={0}
              />

              {/* Folder tree */}
              {folderTree.map((folder) => (
                <FolderPickerNode
                  key={folder.id}
                  folder={folder}
                  selectedFolderId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  depth={0}
                />
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                disabled={moveMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {moveMutation.isPending ? "Moving..." : "Move Here"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FolderPickerItem({
  name,
  isSelected,
  onSelect,
  depth,
  color,
}: {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
  depth: number;
  color?: string | null;
}) {
  const Icon = isSelected ? FolderOpen : Folder;
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-1)]"
      style={{
        paddingLeft: `${8 + depth * 16}px`,
        backgroundColor: isSelected ? "var(--surface-2)" : "transparent",
        color: isSelected ? "var(--primary)" : "var(--text-primary)",
      }}
    >
      <Icon size={16} style={{ color: color || (isSelected ? "var(--primary)" : "var(--text-secondary)") }} />
      <span className="truncate">{name}</span>
    </button>
  );
}

function FolderPickerNode({
  folder,
  selectedFolderId,
  onSelect,
  depth,
}: {
  folder: DocumentFolder;
  selectedFolderId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div className="flex items-center">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 items-center justify-center"
            style={{ marginLeft: `${depth * 16}px` }}
          >
            <ChevronRight
              size={12}
              className="transition-transform text-[var(--text-tertiary)]"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
        )}
        <FolderPickerItem
          name={folder.name}
          isSelected={selectedFolderId === folder.id}
          onSelect={() => onSelect(folder.id)}
          depth={hasChildren ? 0 : depth + 1}
          color={folder.color}
        />
      </div>
      {hasChildren && expanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderPickerNode
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
