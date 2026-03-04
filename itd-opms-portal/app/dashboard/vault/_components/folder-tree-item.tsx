"use client";

import { useState } from "react";
import { Folder, FolderOpen, ChevronRight } from "lucide-react";
import type { DocumentFolder } from "@/hooks/use-vault";

interface FolderTreeItemProps {
  folder: DocumentFolder;
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  depth?: number;
}

export function FolderTreeItem({
  folder,
  selectedFolderId,
  onSelect,
  depth = 0,
}: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;
  const FolderIcon = isSelected ? FolderOpen : Folder;

  return (
    <div>
      <button
        onClick={() => onSelect(folder.id)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
        style={{
          paddingLeft: `${8 + depth * 16}px`,
          backgroundColor: isSelected ? "var(--surface-2)" : "transparent",
          color: isSelected ? "var(--primary)" : "var(--text-primary)",
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-4 w-4 items-center justify-center"
          >
            <ChevronRight
              size={12}
              className="transition-transform"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <FolderIcon
          size={16}
          style={{
            color: folder.color || (isSelected ? "var(--primary)" : "var(--text-secondary)"),
          }}
        />
        <span className="flex-1 truncate">{folder.name}</span>
        {folder.documentCount > 0 && (
          <span className="text-xs text-[var(--text-tertiary)]">{folder.documentCount}</span>
        )}
      </button>
      {hasChildren && expanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
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
