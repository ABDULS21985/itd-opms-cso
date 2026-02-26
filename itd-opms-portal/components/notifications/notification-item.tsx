"use client";

import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Mail,
  MessageSquare,
  Shield,
  ShieldAlert,
  FileText,
  GitPullRequest,
  Server,
  Database,
  Users,
  UserCheck,
  Settings,
  TrendingUp,
  Target,
  Bell,
  XCircle,
  Wrench,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

/* ------------------------------------------------------------------ */
/*  Type-based icon & color system (matches OPMS domain events)       */
/* ------------------------------------------------------------------ */

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // ITSM
  "itsm.incident.created": AlertCircle,
  "itsm.incident.resolved": CheckCircle,
  "itsm.incident.escalated": AlertTriangle,
  "itsm.sla.breached": ShieldAlert,
  "itsm.change.approved": CheckCircle,
  "itsm.change.rejected": XCircle,
  "itsm.change.scheduled": Clock,
  "itsm.service.updated": Wrench,

  // Governance
  "governance.policy.published": FileText,
  "governance.policy.review_due": Clock,
  "governance.okr.updated": Target,
  "governance.okr.completed": TrendingUp,
  "governance.raci.assigned": Users,
  "governance.approval.pending": GitPullRequest,
  "governance.approval.completed": CheckCircle,

  // CMDB
  "cmdb.asset.created": Server,
  "cmdb.asset.decommissioned": XCircle,
  "cmdb.license.expiring": AlertTriangle,
  "cmdb.config.changed": Database,

  // GRC
  "grc.risk.identified": ShieldAlert,
  "grc.risk.mitigated": Shield,
  "grc.audit.scheduled": Clock,
  "grc.compliance.alert": AlertCircle,

  // People / Directory
  "directory.user.provisioned": UserCheck,
  "directory.sync.completed": Users,

  // Notification system
  "notification.email": Mail,
  "notification.teams": MessageSquare,
  "system.alert": AlertCircle,
  "admin.feedback": MessageSquare,

  // Catch-all defaults by prefix
  itsm: Wrench,
  governance: FileText,
  cmdb: Server,
  grc: Shield,
  notification: Mail,
  system: Settings,
};

const TYPE_COLORS: Record<string, string> = {
  // ITSM
  "itsm.incident.created": "text-amber-500",
  "itsm.incident.resolved": "text-emerald-500",
  "itsm.incident.escalated": "text-[var(--error)]",
  "itsm.sla.breached": "text-[var(--error)]",
  "itsm.change.approved": "text-emerald-500",
  "itsm.change.rejected": "text-[var(--error)]",
  "itsm.change.scheduled": "text-[var(--info)]",
  "itsm.service.updated": "text-[var(--primary)]",

  // Governance
  "governance.policy.published": "text-[var(--primary)]",
  "governance.policy.review_due": "text-amber-500",
  "governance.okr.updated": "text-[var(--info)]",
  "governance.okr.completed": "text-emerald-500",
  "governance.raci.assigned": "text-[var(--primary)]",
  "governance.approval.pending": "text-amber-500",
  "governance.approval.completed": "text-emerald-500",

  // CMDB
  "cmdb.asset.created": "text-[var(--primary)]",
  "cmdb.asset.decommissioned": "text-[var(--neutral-gray)]",
  "cmdb.license.expiring": "text-amber-500",
  "cmdb.config.changed": "text-[var(--info)]",

  // GRC
  "grc.risk.identified": "text-[var(--error)]",
  "grc.risk.mitigated": "text-emerald-500",
  "grc.audit.scheduled": "text-[var(--info)]",
  "grc.compliance.alert": "text-amber-500",

  // People / Directory
  "directory.user.provisioned": "text-[var(--primary)]",
  "directory.sync.completed": "text-emerald-500",

  // System
  "notification.email": "text-[var(--primary)]",
  "notification.teams": "text-[var(--info)]",
  "system.alert": "text-amber-500",
  "admin.feedback": "text-[var(--neutral-gray)]",

  // Catch-all defaults by prefix
  itsm: "text-[var(--primary)]",
  governance: "text-[var(--primary)]",
  cmdb: "text-[var(--info)]",
  grc: "text-amber-500",
  notification: "text-[var(--primary)]",
  system: "text-[var(--neutral-gray)]",
};

function resolveIconAndColor(type: string) {
  // Try exact match first
  if (TYPE_ICONS[type]) {
    return {
      Icon: TYPE_ICONS[type],
      color: TYPE_COLORS[type] || "text-[var(--neutral-gray)]",
    };
  }
  // Try prefix match (e.g. "itsm.incident.created" → "itsm")
  const prefix = type.split(".")[0];
  return {
    Icon: TYPE_ICONS[prefix] || Bell,
    color: TYPE_COLORS[prefix] || "text-[var(--neutral-gray)]",
  };
}

/* ------------------------------------------------------------------ */
/*  Notification Item                                                  */
/* ------------------------------------------------------------------ */

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const { Icon, color } = resolveIconAndColor(notification.type);

  return (
    <button
      onClick={onMarkRead}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--surface-1)] transition-colors ${
        !notification.isRead ? "bg-[var(--primary)]/5" : ""
      }`}
    >
      {/* Icon container */}
      <div
        className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          !notification.isRead
            ? "bg-[var(--surface-0)] shadow-sm"
            : "bg-[var(--surface-1)]"
        }`}
      >
        <Icon size={16} className={color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm truncate ${
              !notification.isRead
                ? "font-semibold text-[var(--text-primary)]"
                : "font-medium text-[var(--neutral-gray)]"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-[11px] text-[var(--neutral-gray)] flex-shrink-0 whitespace-nowrap">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-[var(--neutral-gray)] mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Unread indicator dot (right side) */}
      {!notification.isRead && (
        <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[var(--primary)]" />
      )}
    </button>
  );
}
