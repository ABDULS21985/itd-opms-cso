"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Folder, FolderPlus, Share2, ShieldAlert } from "lucide-react";
import { useFolders, useVaultStats, type DocumentFolder } from "@/hooks/use-vault";
import { buildFolderTree, formatFileSize } from "./vault-constants";
import { FolderTreeItem } from "./folder-tree-item";

interface VaultFolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onNewFolder: () => void;
}

export function VaultFolderSidebar({
  selectedFolderId,
  onSelectFolder,
  onNewFolder,
}: VaultFolderSidebarProps) {
  const { data: foldersData, isLoading } = useFolders();
  const { data: statsData } = useVaultStats();
  const pathname = usePathname();

  const folders = useMemo<DocumentFolder[]>(() => {
    if (!foldersData) return [];
    return Array.isArray(foldersData) ? foldersData : [];
  }, [foldersData]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="hidden w-60 flex-shrink-0 border-r lg:block"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Folders</h2>
          <button
            onClick={onNewFolder}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]"
            title="New Folder"
          >
            <FolderPlus size={14} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Quick Views */}
        <div className="border-b px-2 py-2 space-y-0.5" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/dashboard/vault/shared-with-me"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
            style={{
              backgroundColor: pathname === "/dashboard/vault/shared-with-me" ? "var(--surface-2)" : "transparent",
              color: pathname === "/dashboard/vault/shared-with-me" ? "var(--primary)" : "var(--text-secondary)",
            }}
          >
            <Share2 size={14} />
            <span className="flex-1">Shared With Me</span>
          </Link>
          <Link
            href="/dashboard/vault/compliance"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
            style={{
              backgroundColor: pathname === "/dashboard/vault/compliance" ? "var(--surface-2)" : "transparent",
              color: pathname === "/dashboard/vault/compliance" ? "var(--primary)" : "var(--text-secondary)",
            }}
          >
            <ShieldAlert size={14} />
            <span className="flex-1">Compliance</span>
          </Link>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => onSelectFolder(null)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
            style={{
              backgroundColor:
                pathname === "/dashboard/vault" && selectedFolderId === null
                  ? "var(--surface-2)"
                  : "transparent",
              color:
                pathname === "/dashboard/vault" && selectedFolderId === null
                  ? "var(--primary)"
                  : "var(--text-primary)",
            }}
          >
            <span className="w-4" />
            <Folder size={16} className="text-[var(--text-secondary)]" />
            <span className="flex-1">All Documents</span>
          </button>

          {isLoading ? (
            <div className="space-y-2 px-2 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 animate-pulse rounded-md bg-[var(--surface-2)]" />
              ))}
            </div>
          ) : (
            folderTree.map((folder) => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                selectedFolderId={selectedFolderId}
                onSelect={onSelectFolder}
              />
            ))
          )}
        </div>

        {/* Stats */}
        {statsData && (
          <div className="border-t px-4 py-3 space-y-1" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs text-[var(--text-tertiary)]">
              {statsData.totalDocuments} documents &middot; {formatFileSize(statsData.totalSizeBytes)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {statsData.totalFolders} folders &middot; {statsData.recentUploads} uploaded this week
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
