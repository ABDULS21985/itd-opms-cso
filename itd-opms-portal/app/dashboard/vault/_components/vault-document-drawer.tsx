"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, History, Clock, Share2, MessageSquare, GitBranch } from "lucide-react";
import {
  useDocument,
  useDocumentVersions,
  useDocumentAccessLog,
  type VaultDocument,
  type DocumentAccessLogEntry,
} from "@/hooks/use-vault";
import { DrawerDetailsTab } from "./drawer-details-tab";
import { DrawerVersionsTab } from "./drawer-versions-tab";
import { DrawerAccessLogTab } from "./drawer-access-log-tab";
import { DrawerSharesTab } from "./drawer-shares-tab";
import { DrawerCommentsTab } from "./drawer-comments-tab";
import { DrawerLifecycleTab } from "./drawer-lifecycle-tab";

type DrawerTab = "details" | "versions" | "access" | "shares" | "comments" | "lifecycle";

const TABS: { key: DrawerTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "details", label: "Details", icon: Eye },
  { key: "versions", label: "Versions", icon: History },
  { key: "access", label: "Access", icon: Clock },
  { key: "shares", label: "Shares", icon: Share2 },
  { key: "comments", label: "Comments", icon: MessageSquare },
  { key: "lifecycle", label: "Lifecycle", icon: GitBranch },
];

interface VaultDocumentDrawerProps {
  documentId: string | null;
  currentUserId?: string;
  onClose: () => void;
  onDownload: (id: string) => void;
  onLock: (id: string) => void;
  onUnlock: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onMove: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onUploadVersion: (id: string) => void;
}

export function VaultDocumentDrawer({
  documentId,
  currentUserId,
  onClose,
  onDownload,
  onLock,
  onUnlock,
  onDelete,
  onShare,
  onMove,
  onArchive,
  onRestore,
  onUploadVersion,
}: VaultDocumentDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("details");

  const { data: selectedDoc } = useDocument(documentId || undefined);
  const { data: versions, isLoading: versionsLoading } = useDocumentVersions(
    documentId && activeTab === "versions" ? documentId : undefined,
  );
  const { data: accessLogResponse, isLoading: accessLogLoading } = useDocumentAccessLog(
    documentId && activeTab === "access" ? documentId : undefined,
  );

  const accessLog = useMemo<DocumentAccessLogEntry[]>(() => {
    if (!accessLogResponse) return [];
    if (Array.isArray(accessLogResponse)) return accessLogResponse;
    if ((accessLogResponse as any).data) return (accessLogResponse as any).data;
    return [];
  }, [accessLogResponse]);

  return (
    <AnimatePresence>
      {documentId && selectedDoc && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 420, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0 overflow-hidden border-l"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
        >
          <div className="flex h-full w-[420px] flex-col">
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate pr-2">
                {selectedDoc.title}
              </h3>
              <button
                onClick={onClose}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex overflow-x-auto border-b"
              style={{ borderColor: "var(--border)" }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    color: activeTab === tab.key ? "var(--primary)" : "var(--text-secondary)",
                    borderBottom:
                      activeTab === tab.key
                        ? "2px solid var(--primary)"
                        : "2px solid transparent",
                  }}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "details" && (
                <DrawerDetailsTab
                  doc={selectedDoc}
                  currentUserId={currentUserId}
                  onDownload={onDownload}
                  onLock={onLock}
                  onUnlock={onUnlock}
                  onDelete={onDelete}
                  onShare={() => onShare(selectedDoc.id)}
                  onMove={() => onMove(selectedDoc.id)}
                  onArchive={onArchive}
                  onRestore={onRestore}
                />
              )}
              {activeTab === "versions" && (
                <DrawerVersionsTab
                  versions={versions}
                  isLoading={versionsLoading}
                  onUploadVersion={() => onUploadVersion(selectedDoc.id)}
                />
              )}
              {activeTab === "access" && (
                <DrawerAccessLogTab entries={accessLog} isLoading={accessLogLoading} />
              )}
              {activeTab === "shares" && (
                <DrawerSharesTab
                  documentId={selectedDoc.id}
                  onAddShare={() => onShare(selectedDoc.id)}
                />
              )}
              {activeTab === "comments" && (
                <DrawerCommentsTab documentId={selectedDoc.id} />
              )}
              {activeTab === "lifecycle" && (
                <DrawerLifecycleTab doc={selectedDoc} />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
