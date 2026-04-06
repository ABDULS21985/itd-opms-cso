import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  type LucideIcon,
} from "lucide-react";
import type { DocumentFolder } from "@/hooks/use-vault";

/* ================================================================== */
/*  Option lists                                                       */
/* ================================================================== */

export const CLASSIFICATIONS = [
  { value: "", label: "All Classifications" },
  { value: "audit_evidence", label: "Audit Evidence" },
  { value: "operational", label: "Operational" },
  { value: "configuration", label: "Configuration" },
  { value: "policy", label: "Policy" },
  { value: "report", label: "Report" },
  { value: "transient", label: "Transient" },
] as const;

export const ACCESS_LEVELS = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "restricted", label: "Restricted" },
  { value: "confidential", label: "Confidential" },
] as const;

export const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
  { value: "expired", label: "Expired" },
  { value: "deleted", label: "Deleted" },
  { value: "restored", label: "Restored" },
] as const;

export const PERMISSIONS = [
  { value: "view", label: "View" },
  { value: "download", label: "Download" },
  { value: "edit", label: "Edit" },
  { value: "share", label: "Share" },
  { value: "approve", label: "Approve" },
] as const;

export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "deleted"],
  active: ["under_review", "archived", "deleted"],
  under_review: ["approved", "rejected", "active"],
  approved: ["active", "archived"],
  rejected: ["active", "draft", "deleted"],
  archived: ["restored"],
  expired: ["restored", "deleted"],
  deleted: ["restored"],
  restored: ["active", "draft"],
};

/* ================================================================== */
/*  Color maps                                                         */
/* ================================================================== */

export const CLASSIFICATION_COLORS: Record<string, { text: string; bg: string }> = {
  audit_evidence: { text: "#7C3AED", bg: "rgba(124, 58, 237, 0.1)" },
  operational: { text: "#2563EB", bg: "rgba(37, 99, 235, 0.1)" },
  configuration: { text: "#059669", bg: "rgba(5, 150, 105, 0.1)" },
  policy: { text: "#D97706", bg: "rgba(217, 119, 6, 0.1)" },
  report: { text: "#DC2626", bg: "rgba(220, 38, 38, 0.1)" },
  transient: { text: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" },
};

export const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  draft: { text: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" },
  active: { text: "#059669", bg: "rgba(5, 150, 105, 0.1)" },
  under_review: { text: "#D97706", bg: "rgba(217, 119, 6, 0.1)" },
  approved: { text: "#2563EB", bg: "rgba(37, 99, 235, 0.1)" },
  rejected: { text: "#DC2626", bg: "rgba(220, 38, 38, 0.1)" },
  archived: { text: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" },
  expired: { text: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  deleted: { text: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
  restored: { text: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
};

/* ================================================================== */
/*  Format helpers                                                     */
/* ================================================================== */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

/* ================================================================== */
/*  File icon helpers                                                  */
/* ================================================================== */

export function getFileIcon(contentType: string): LucideIcon {
  if (contentType === "application/pdf") return FileText;
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "text/csv"
  )
    return FileSpreadsheet;
  if (contentType.startsWith("image/")) return FileImage;
  return File;
}

export function getFileIconColor(contentType: string): string {
  if (contentType === "application/pdf") return "#EF4444";
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "text/csv"
  )
    return "#059669";
  if (contentType.startsWith("image/")) return "#8B5CF6";
  if (contentType.includes("word")) return "#2563EB";
  if (contentType.includes("presentation") || contentType.includes("powerpoint"))
    return "#F59E0B";
  return "#6B7280";
}

/* ================================================================== */
/*  Folder tree builder                                                */
/* ================================================================== */

export function buildFolderTree(folders: DocumentFolder[]): DocumentFolder[] {
  const map = new Map<string, DocumentFolder>();
  const roots: DocumentFolder[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/* ================================================================== */
/*  Status label helpers                                               */
/* ================================================================== */

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function classificationLabel(classification: string): string {
  return classification.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
