"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { DocumentFolder } from "@/hooks/use-vault";

interface VaultBreadcrumbsProps {
  selectedFolderId: string | null;
  folders: DocumentFolder[];
  onNavigate: (folderId: string | null) => void;
}

export function VaultBreadcrumbs({
  selectedFolderId,
  folders,
  onNavigate,
}: VaultBreadcrumbsProps) {
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "All Documents" },
    ];
    if (!selectedFolderId) return crumbs;

    const folder = folders.find((f) => f.id === selectedFolderId);
    if (folder) {
      const parts = folder.path.split("/").filter(Boolean);
      let currentPath = "";
      for (const part of parts) {
        currentPath += "/" + part;
        const matchFolder = folders.find((f) => f.path === currentPath);
        if (matchFolder) {
          crumbs.push({ id: matchFolder.id, name: matchFolder.name });
        }
      }
    }
    return crumbs;
  }, [selectedFolderId, folders]);

  return (
    <div
      className="flex items-center gap-1 border-b px-6 py-2"
      style={{ borderColor: "var(--border)" }}
    >
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id ?? "root"} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight size={12} className="text-[var(--text-tertiary)]" />
          )}
          <button
            onClick={() => onNavigate(crumb.id)}
            className="rounded px-1.5 py-0.5 text-xs font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{
              color:
                index === breadcrumbs.length - 1
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
            }}
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}
