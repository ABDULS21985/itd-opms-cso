"use client";

import { Download, Lock, Unlock, Trash2, Share2, FolderInput, Archive, RotateCcw } from "lucide-react";
import { Tag } from "lucide-react";
import type { VaultDocument } from "@/hooks/use-vault";
import { ClassificationBadge } from "./classification-badge";
import { StatusBadge } from "./status-badge";
import {
  getFileIcon,
  getFileIconColor,
  formatFileSize,
  formatDateTime,
  statusLabel,
} from "./vault-constants";

interface DrawerDetailsTabProps {
  doc: VaultDocument;
  currentUserId?: string;
  onDownload: (id: string) => void;
  onLock: (id: string) => void;
  onUnlock: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: () => void;
  onMove: () => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}

export function DrawerDetailsTab({
  doc,
  currentUserId,
  onDownload,
  onLock,
  onUnlock,
  onDelete,
  onShare,
  onMove,
  onArchive,
  onRestore,
}: DrawerDetailsTabProps) {
  const Icon = getFileIcon(doc.contentType);
  const iconColor = getFileIconColor(doc.contentType);
  const isLockedByMe = doc.lockedBy === currentUserId;
  const isDeleted = doc.status === "deleted";
  const isArchived = doc.status === "archived";

  return (
    <div className="space-y-5">
      {/* File Info */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon size={24} style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{doc.fileName}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {formatFileSize(doc.sizeBytes)} &middot; Version {doc.version}
          </p>
        </div>
      </div>

      {/* Description */}
      {doc.description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
            Description
          </p>
          <p className="text-sm text-[var(--text-secondary)]">{doc.description}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Metadata
        </p>
        <div className="space-y-2">
          {[
            { label: "Status", render: <StatusBadge status={doc.status} /> },
            { label: "Classification", render: <ClassificationBadge classification={doc.classification} /> },
            { label: "Access Level", value: doc.accessLevel },
            { label: "Uploaded By", value: doc.uploaderName },
            ...(doc.ownerName ? [{ label: "Owner", value: doc.ownerName }] : []),
            ...(doc.documentCode ? [{ label: "Document Code", value: doc.documentCode }] : []),
            { label: "Created", value: formatDateTime(doc.createdAt) },
            { label: "Updated", value: formatDateTime(doc.updatedAt) },
            { label: "Folder", value: doc.folderName || "Root" },
            ...(doc.effectiveDate ? [{ label: "Effective Date", value: formatDateTime(doc.effectiveDate) }] : []),
            ...(doc.expiryDate ? [{ label: "Expiry Date", value: formatDateTime(doc.expiryDate) }] : []),
            ...(doc.retentionUntil ? [{ label: "Retention Until", value: formatDateTime(doc.retentionUntil) }] : []),
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-tertiary)]">{item.label}</span>
              {"render" in item && item.render ? (
                item.render
              ) : (
                <span className="font-medium text-[var(--text-primary)]">
                  {(item as { label: string; value: string }).value}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Flags */}
        {(doc.confidential || doc.legalHold) && (
          <div className="flex gap-2 pt-1">
            {doc.confidential && (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ color: "#DC2626", backgroundColor: "rgba(220, 38, 38, 0.1)" }}
              >
                Confidential
              </span>
            )}
            {doc.legalHold && (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ color: "#7C3AED", backgroundColor: "rgba(124, 58, 237, 0.1)" }}
              >
                Legal Hold
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {doc.tags && doc.tags.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                style={{ backgroundColor: "var(--surface-2)", color: "var(--text-secondary)" }}
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lock status */}
      {doc.lockedBy && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: "rgba(245, 158, 11, 0.08)", color: "#F59E0B" }}
        >
          <Lock size={14} />
          <span>
            Locked by {doc.lockedByName || "unknown"}{" "}
            {doc.lockedAt && "since " + formatDateTime(doc.lockedAt)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton icon={Download} label="Download" onClick={() => onDownload(doc.id)} />

          {doc.lockedBy ? (
            isLockedByMe ? (
              <ActionButton icon={Unlock} label="Unlock" onClick={() => onUnlock(doc.id)} />
            ) : (
              <ActionButton icon={Lock} label="Locked" disabled />
            )
          ) : (
            <ActionButton icon={Lock} label="Lock" onClick={() => onLock(doc.id)} />
          )}

          {isDeleted ? (
            <ActionButton icon={RotateCcw} label="Restore" onClick={() => onRestore(doc.id)} />
          ) : (
            <ActionButton
              icon={Trash2}
              label="Delete"
              onClick={() => onDelete(doc.id)}
              variant="danger"
            />
          )}

          <ActionButton icon={Share2} label="Share" onClick={onShare} />
          <ActionButton icon={FolderInput} label="Move" onClick={onMove} />

          {!isArchived && !isDeleted && doc.status === "active" && (
            <ActionButton icon={Archive} label="Archive" onClick={() => onArchive(doc.id)} />
          )}
          {isArchived && (
            <ActionButton icon={RotateCcw} label="Restore" onClick={() => onRestore(doc.id)} />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--surface-2)]"
      } ${variant === "danger" ? "text-red-500 hover:bg-red-50" : ""}`}
      style={{
        borderColor: "var(--border)",
        color: variant === "danger" ? undefined : disabled ? "var(--text-tertiary)" : "var(--text-primary)",
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
