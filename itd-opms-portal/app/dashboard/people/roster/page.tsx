"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Users,
  Search,
  Filter,
  LayoutGrid,
  LayoutList,
  Plus,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Clock,
  CheckCircle,
  FileText,
  Loader2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  UserCheck,
  UserX,
  Globe,
  Download,
  X,
  CalendarOff,
  CalendarPlus,
  Eye,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { useUsers, useUserStats } from "@/hooks/use-system";
import {
  useRosters,
  useCreateRoster,
  useLeaveRecords,
  useCreateLeaveRecord,
  useUpdateLeaveRecordStatus,
} from "@/hooks/use-people";
import { useAuth } from "@/hooks/use-auth";
import { DataTable, type Column, type SortState } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import type { UserDetail, Roster, LeaveRecord } from "@/types";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const TABS = [
  { id: "directory", label: "Directory", icon: Users },
  { id: "leave", label: "Leave Tracker", icon: CalendarOff },
  { id: "rosters", label: "Shift Rosters", icon: CalendarDays },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_COPY: Record<
  TabId,
  {
    eyebrow: string;
    title: string;
    description: string;
    accent: string;
    focus: string;
  }
> = {
  directory: {
    eyebrow: "People Operations Workspace",
    title: "People Directory",
    description:
      "Browse the workforce, inspect employee context, and move between directory intelligence and staffing decisions without leaving the page.",
    accent: "#1B7340",
    focus: "Directory intelligence",
  },
  leave: {
    eyebrow: "People Operations Workspace",
    title: "Leave Tracker",
    description:
      "Review pending leave demand, approve requests faster, and keep staffing impact visible before the schedule drifts.",
    accent: "#D97706",
    focus: "Absence control",
  },
  rosters: {
    eyebrow: "People Operations Workspace",
    title: "Team Rosters",
    description:
      "Run shift coverage, monitor published schedules, and keep roster execution anchored to real staffing pressure across the team.",
    accent: "#2563EB",
    focus: "Coverage command",
  },
};

const DEPARTMENTS = [
  { value: "", label: "All Departments" },
  { value: "IT Operations", label: "IT Operations" },
  { value: "Software Development", label: "Software Development" },
  { value: "Cybersecurity", label: "Cybersecurity" },
  { value: "Infrastructure", label: "Infrastructure" },
  { value: "Data Management", label: "Data Management" },
  { value: "Project Management", label: "Project Management" },
  { value: "Business Analysis", label: "Business Analysis" },
  { value: "Quality Assurance", label: "Quality Assurance" },
  { value: "Network Engineering", label: "Network Engineering" },
  { value: "Help Desk", label: "Help Desk" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const LEAVE_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const LEAVE_TYPES = [
  { value: "", label: "All Types" },
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "compassionate", label: "Compassionate" },
  { value: "maternity", label: "Maternity" },
  { value: "paternity", label: "Paternity" },
  { value: "study", label: "Study Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

const ROSTER_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  inactive: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  pending: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  approved: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  rejected: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  draft: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  published: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  archived: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  director: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  "head of division": { bg: "rgba(6, 182, 212, 0.1)", text: "#06B6D4" },
  supervisor: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  auditor: { bg: "rgba(236, 72, 153, 0.1)", text: "#EC4899" },
  "service desk": { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
};

/* ================================================================== */
/*  Helper – User Avatar                                               */
/* ================================================================== */

function UserAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colorIndex =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;
  const colors = [
    { bg: "rgba(27, 115, 64, 0.12)", text: "#1B7340" },
    { bg: "rgba(59, 130, 246, 0.12)", text: "#3B82F6" },
    { bg: "rgba(139, 92, 246, 0.12)", text: "#8B5CF6" },
    { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B" },
    { bg: "rgba(236, 72, 153, 0.12)", text: "#EC4899" },
    { bg: "rgba(6, 182, 212, 0.12)", text: "#06B6D4" },
  ];
  const color = colors[colorIndex];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold ring-2 ring-white shrink-0`}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {initials}
    </div>
  );
}

/* ================================================================== */
/*  Helper – Status Pill                                               */
/* ================================================================== */

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: style.text }}
      />
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ================================================================== */
/*  Helper – Role Badge                                                */
/* ================================================================== */

function RoleBadge({ role }: { role: string }) {
  const key = role.toLowerCase();
  const color = ROLE_COLORS[key] ?? { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" };
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {role}
    </span>
  );
}

/* ================================================================== */
/*  KPI Stat Card                                                      */
/* ================================================================== */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  loading,
  helper,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading?: boolean;
  helper?: string;
}) {
  return (
    <div
      className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm"
      style={{
        backgroundImage: `radial-gradient(circle at 100% 0%, ${color}18, transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {label}
          </p>
          {loading ? (
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
          ) : (
            <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color }}>
              {value ?? 0}
            </p>
          )}
          {helper && (
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {helper}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkspaceJumpButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 ${active ? "text-white shadow-lg" : "text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"}`}
      style={{
        borderColor: active ? "transparent" : "rgba(255,255,255,0.62)",
        backgroundColor: active ? "var(--primary)" : "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(18px)",
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function LoadingValue({ width = "w-14" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

/* ================================================================== */
/*  Directory – Grid Card                                              */
/* ================================================================== */

function EmployeeCard({
  user,
  onViewProfile,
}: {
  user: UserDetail;
  onViewProfile: (u: UserDetail) => void;
}) {
  const primaryRole = user.roles?.[0]?.roleName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-4">
        <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="lg" />
        <StatusPill status={user.isActive ? "active" : "inactive"} />
      </div>

      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
        {user.displayName}
      </h3>
      {user.jobTitle && (
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
          {user.jobTitle}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {user.department && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Building2 size={12} className="shrink-0" />
            <span className="truncate">{user.department}</span>
          </div>
        )}
        {user.office && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{user.office}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Mail size={12} className="shrink-0" />
          <span className="truncate">{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Phone size={12} className="shrink-0" />
            <span className="truncate">{user.phone}</span>
          </div>
        )}
      </div>

      {primaryRole && (
        <div className="mt-3 flex flex-wrap gap-1">
          <RoleBadge role={primaryRole} />
          {user.roles.length > 1 && (
            <span className="text-[10px] text-[var(--text-secondary)] self-center">
              +{user.roles.length - 1}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-2">
        <button
          type="button"
          onClick={() => onViewProfile(user)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <Eye size={13} />
          View
        </button>
        <a
          href={`mailto:${user.email}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Mail size={13} />
          Email
        </a>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Employee Profile Drawer                                            */
/* ================================================================== */

function ProfileDrawer({
  user,
  onClose,
}: {
  user: UserDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!user) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [user, onClose]);

  return (
    <AnimatePresence>
      {user && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--surface-0)] border-l border-[var(--border)] shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-0)] px-6 py-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Employee Profile
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4 mb-6">
                <UserAvatar
                  name={user.displayName}
                  photoUrl={user.photoUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">
                    {user.displayName}
                  </h3>
                  {user.jobTitle && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {user.jobTitle}
                    </p>
                  )}
                  <StatusPill status={user.isActive ? "active" : "inactive"} />
                </div>
              </div>

              {/* Info Sections */}
              <div className="space-y-5">
                {/* Contact */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                    Contact
                  </h4>
                  <div className="space-y-2.5">
                    <InfoRow icon={Mail} label="Email" value={user.email} />
                    {user.phone && (
                      <InfoRow icon={Phone} label="Phone" value={user.phone} />
                    )}
                  </div>
                </div>

                {/* Organization */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                    Organization
                  </h4>
                  <div className="space-y-2.5">
                    {user.department && (
                      <InfoRow
                        icon={Building2}
                        label="Department"
                        value={user.department}
                      />
                    )}
                    {user.unit && (
                      <InfoRow
                        icon={Briefcase}
                        label="Unit"
                        value={user.unit}
                      />
                    )}
                    {user.office && (
                      <InfoRow
                        icon={MapPin}
                        label="Office"
                        value={user.office}
                      />
                    )}
                    <InfoRow
                      icon={Globe}
                      label="Tenant"
                      value={user.tenantName}
                    />
                  </div>
                </div>

                {/* Roles */}
                {user.roles && user.roles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                      Roles
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles
                        .filter((r) => r.isActive)
                        .map((rb) => (
                          <RoleBadge key={rb.id} role={rb.roleName} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Delegations */}
                {user.delegations && user.delegations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                      Active Delegations
                    </h4>
                    <div className="space-y-2">
                      {user.delegations
                        .filter((d) => d.isActive)
                        .map((d) => (
                          <div
                            key={d.id}
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 text-xs"
                          >
                            <p className="font-medium text-[var(--text-primary)]">
                              {d.roleName}
                            </p>
                            <p className="text-[var(--text-secondary)] mt-0.5">
                              From {d.delegatorName} &middot;{" "}
                              {new Date(d.startsAt).toLocaleDateString()} &ndash;{" "}
                              {new Date(d.endsAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                    Account
                  </h4>
                  <div className="space-y-2.5">
                    {user.lastLoginAt && (
                      <InfoRow
                        icon={Clock}
                        label="Last Login"
                        value={new Date(user.lastLoginAt).toLocaleString()}
                      />
                    )}
                    <InfoRow
                      icon={CalendarDays}
                      label="Created"
                      value={new Date(user.createdAt).toLocaleDateString()}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-[var(--border)] flex gap-3">
                <a
                  href={`mailto:${user.email}`}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Mail size={16} />
                  Send Email
                </a>
                {user.phone && (
                  <a
                    href={`tel:${user.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <Phone size={16} />
                    Call
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        size={14}
        className="mt-0.5 shrink-0 text-[var(--text-secondary)]"
      />
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
        <p className="text-sm text-[var(--text-primary)] break-all">{value}</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Leave Request Modal                                                */
/* ================================================================== */

function LeaveRequestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const createLeave = useCreateLeaveRecord();
  const [form, setForm] = useState({
    leaveType: "annual",
    startDate: "",
    endDate: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!form.startDate || !form.endDate) {
      toast.error("Please fill in start and end dates");
      return;
    }
    createLeave.mutate(
      {
        userId: user?.id ?? "",
        leaveType: form.leaveType,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setForm({ leaveType: "annual", startDate: "", endDate: "", notes: "" });
          onClose();
        },
      },
    );
  };

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Submit Leave Request
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <FormField
              label="Leave Type"
              name="leaveType"
              type="select"
              value={form.leaveType}
              onChange={(val) =>
                setForm((f) => ({ ...f, leaveType: val }))
              }
              options={LEAVE_TYPES.filter((t) => t.value !== "")}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Start Date"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={(val) =>
                  setForm((f) => ({ ...f, startDate: val }))
                }
                required
              />
              <FormField
                label="End Date"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={(val) =>
                  setForm((f) => ({ ...f, endDate: val }))
                }
                required
              />
            </div>
            <FormField
              label="Notes"
              name="notes"
              type="textarea"
              value={form.notes}
              onChange={(val) =>
                setForm((f) => ({ ...f, notes: val }))
              }
              placeholder="Optional notes for the approver..."
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createLeave.isPending}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {createLeave.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Submit Request
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ================================================================== */
/*  Roster – Shift Table                                               */
/* ================================================================== */

function ShiftTable({ shifts }: { shifts: unknown[] }) {
  if (!shifts || shifts.length === 0) {
    return (
      <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
        No shifts defined for this roster.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Day / Date
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Shift
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Staff
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {shifts.map((shift, index) => {
            const s = shift as Record<string, unknown>;
            return (
              <tr
                key={index}
                className="hover:bg-[var(--surface-2)] transition-colors"
              >
                <td className="px-3 py-2 text-xs text-[var(--text-primary)]">
                  {String(s.day ?? s.date ?? `Shift ${index + 1}`)}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-primary)]">
                  {String(s.shift ?? s.name ?? "--")}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                  {String(s.staff ?? s.userId ?? s.assignee ?? "--")}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-secondary)] tabular-nums">
                  {s.startTime && s.endTime
                    ? `${String(s.startTime)} - ${String(s.endTime)}`
                    : String(s.time ?? "--")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/*  Roster Card                                                        */
/* ================================================================== */

function RosterCard({
  roster,
  expanded,
  onToggle,
}: {
  roster: Roster;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = STATUS_STYLES[roster.status] ?? STATUS_STYLES.draft;
  const shiftCount = roster.shifts?.length ?? 0;
  const periodDays =
    Math.ceil(
      (new Date(roster.periodEnd).getTime() -
        new Date(roster.periodStart).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)]"
      style={{
        backgroundImage: `radial-gradient(circle at 100% 0%, ${statusStyle.text}16, transparent 32%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left transition-colors hover:bg-[var(--surface-1)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                }}
              >
                {roster.status === "published" ? (
                  <CheckCircle size={12} />
                ) : roster.status === "draft" ? (
                  <FileText size={12} />
                ) : (
                  <Clock size={12} />
                )}
                {roster.status}
              </span>
              {roster.teamId && (
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Team {roster.teamId.slice(0, 8)}...
                </span>
              )}
            </div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {roster.name}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)] tabular-nums">
              {new Date(roster.periodStart).toLocaleDateString()} -{" "}
              {new Date(roster.periodEnd).toLocaleDateString()}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[rgba(37,99,235,0.06)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Shifts
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--text-primary)] tabular-nums">
                  {shiftCount}
                </p>
              </div>
              <div className="rounded-2xl bg-[rgba(27,115,64,0.06)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Window
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--text-primary)] tabular-nums">
                  {periodDays} days
                </p>
              </div>
              <div className="rounded-2xl bg-[rgba(245,158,11,0.06)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Updated
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                  {new Date(roster.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          <div className="ml-4 flex items-center gap-3">
            {expanded ? (
              <ChevronUp size={16} className="text-[var(--text-secondary)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--text-secondary)]" />
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[var(--border)] bg-[var(--surface-1)] p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Shift Schedule
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                {shiftCount} shift{shiftCount !== 1 ? "s" : ""} defined
              </span>
            </div>
            <p className="mb-4 text-sm leading-6 text-[var(--text-secondary)]">
              Review the actual coverage block below before publishing or
              refreshing assignments.
            </p>
            <ShiftTable shifts={roster.shifts ?? []} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================== */
/*  Tab: Directory                                                     */
/* ================================================================== */

function DirectoryTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "displayName", direction: "asc" });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  const { data, isLoading } = useUsers(page, 20, {
    search: debouncedSearch || undefined,
    department: department || undefined,
    status: status || undefined,
    sortBy: sort.direction ? sort.key : undefined,
    sortOrder: sort.direction ?? undefined,
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  const columns: Column<UserDetail>[] = useMemo(
    () => [
      {
        key: "displayName",
        header: "Employee",
        sortable: true,
        className: "min-w-[220px]",
        render: (u) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={u.displayName} photoUrl={u.photoUrl} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {u.displayName}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {u.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "jobTitle",
        header: "Job Title",
        sortable: true,
        render: (u) => (
          <span className="text-sm text-[var(--text-primary)]">
            {u.jobTitle ?? "--"}
          </span>
        ),
      },
      {
        key: "department",
        header: "Department",
        sortable: true,
        render: (u) => (
          <div className="flex items-center gap-1.5">
            <Building2 size={13} className="text-[var(--text-secondary)] shrink-0" />
            <span className="text-sm text-[var(--text-primary)]">
              {u.department ?? "--"}
            </span>
          </div>
        ),
      },
      {
        key: "office",
        header: "Office",
        render: (u) => (
          <span className="text-sm text-[var(--text-secondary)]">
            {u.office ?? "--"}
          </span>
        ),
      },
      {
        key: "roles",
        header: "Roles",
        render: (u) => {
          const activeRoles = u.roles?.filter((r) => r.isActive) ?? [];
          if (activeRoles.length === 0)
            return (
              <span className="text-xs text-[var(--text-secondary)]">--</span>
            );
          return (
            <div className="flex flex-wrap gap-1">
              <RoleBadge role={activeRoles[0].roleName} />
              {activeRoles.length > 1 && (
                <span className="text-[10px] text-[var(--text-secondary)] self-center">
                  +{activeRoles.length - 1}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "isActive",
        header: "Status",
        sortable: true,
        render: (u) => (
          <StatusPill status={u.isActive ? "active" : "inactive"} />
        ),
      },
      {
        key: "lastLoginAt",
        header: "Last Login",
        sortable: true,
        render: (u) => (
          <span className="text-xs text-[var(--text-secondary)] tabular-nums">
            {u.lastLoginAt
              ? new Date(u.lastLoginAt).toLocaleDateString()
              : "Never"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (u) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(u);
            }}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            title="View profile"
          >
            <ArrowUpRight size={15} />
          </button>
        ),
      },
    ],
    [],
  );

  const activeFilterCount = [department, status].filter(Boolean).length;

  return (
    <>
      {/* Search & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            type="text"
            placeholder="Search employees by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2.5 transition-colors ${viewMode === "table" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"}`}
              title="Table view"
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"}`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDepartment("");
                  setStatus("");
                  setPage(1);
                }}
                className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
              >
                <X size={12} />
                Clear filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table View */}
      {viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          loading={isLoading}
          sort={sort}
          onSort={setSort}
          emptyTitle="No employees found"
          emptyDescription={
            debouncedSearch
              ? `No results for "${debouncedSearch}". Try a different search term.`
              : "No employees match the current filters."
          }
          onRowClick={(u) => setSelectedUser(u)}
          pagination={
            meta
              ? {
                  currentPage: page,
                  totalPages: meta.totalPages,
                  totalItems: meta.totalItems,
                  pageSize: meta.pageSize,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      ) : (
        /* Grid View */
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 animate-pulse"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-14 w-14 rounded-full bg-[var(--surface-2)]" />
                    <div className="h-5 w-14 rounded-full bg-[var(--surface-2)]" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-[var(--surface-2)] mb-2" />
                  <div className="h-3 w-1/2 rounded bg-[var(--surface-2)]" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full rounded bg-[var(--surface-2)]" />
                    <div className="h-3 w-2/3 rounded bg-[var(--surface-2)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
              <Users
                size={24}
                className="mx-auto text-[var(--text-secondary)] mb-2"
              />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No employees found
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {debouncedSearch
                  ? `No results for "${debouncedSearch}".`
                  : "No employees match the current filters."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {users.map((u) => (
                <EmployeeCard
                  key={u.id}
                  user={u}
                  onViewProfile={setSelectedUser}
                />
              ))}
            </div>
          )}

          {/* Grid Pagination */}
          {meta && meta.totalPages > 1 && !isLoading && users.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 shadow-sm">
              <p className="text-sm text-[var(--text-secondary)]">
                {meta.totalItems} result{meta.totalItems !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                  {page} / {meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Profile Drawer */}
      <ProfileDrawer
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
}

/* ================================================================== */
/*  Tab: Leave Tracker                                                 */
/* ================================================================== */

function LeaveTrackerTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "approved" | "rejected";
  } | null>(null);

  const { data, isLoading } = useLeaveRecords(
    page,
    20,
    undefined,
    statusFilter || undefined,
    typeFilter || undefined,
  );
  const updateStatus = useUpdateLeaveRecordStatus();

  const leaves = data?.data ?? [];
  const meta = data?.meta;

  const handleStatusUpdate = () => {
    if (!confirmAction) return;
    updateStatus.mutate(
      { id: confirmAction.id, status: confirmAction.action },
      {
        onSuccess: () => setConfirmAction(null),
      },
    );
  };

  const leaveColumns: Column<LeaveRecord>[] = useMemo(
    () => [
      {
        key: "userId",
        header: "Employee",
        render: (l) => (
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {l.userId.length > 12 ? `${l.userId.slice(0, 12)}...` : l.userId}
          </span>
        ),
      },
      {
        key: "leaveType",
        header: "Type",
        sortable: true,
        render: (l) => (
          <span className="inline-flex rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-primary)] capitalize">
            {l.leaveType.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        key: "startDate",
        header: "Start",
        sortable: true,
        render: (l) => (
          <span className="text-sm text-[var(--text-primary)] tabular-nums">
            {new Date(l.startDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "endDate",
        header: "End",
        sortable: true,
        render: (l) => (
          <span className="text-sm text-[var(--text-primary)] tabular-nums">
            {new Date(l.endDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "duration",
        header: "Days",
        align: "center",
        render: (l) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const days =
            Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            ) + 1;
          return (
            <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
              {days}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (l) => <StatusPill status={l.status} />,
      },
      {
        key: "notes",
        header: "Notes",
        render: (l) => (
          <span className="text-xs text-[var(--text-secondary)] truncate block max-w-[200px]">
            {l.notes ?? "--"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (l) =>
          l.status === "pending" ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ id: l.id, action: "approved" });
                }}
                className="rounded-lg p-1.5 text-[#10B981] transition-colors hover:bg-[rgba(16,185,129,0.1)]"
                title="Approve"
              >
                <CheckCircle size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ id: l.id, action: "rejected" });
                }}
                className="rounded-lg p-1.5 text-[#EF4444] transition-colors hover:bg-[rgba(239,68,68,0.1)]"
                title="Reject"
              >
                <X size={16} />
              </button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <CalendarPlus size={16} />
          Request Leave
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {LEAVE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Leave Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Table */}
      <DataTable
        columns={leaveColumns}
        data={leaves}
        keyExtractor={(l) => l.id}
        loading={isLoading}
        emptyTitle="No leave records found"
        emptyDescription="Leave requests will appear here once submitted."
        pagination={
          meta
            ? {
                currentPage: page,
                totalPages: meta.totalPages,
                totalItems: meta.totalItems,
                pageSize: meta.pageSize,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Leave Request Modal */}
      <LeaveRequestModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />

      {/* Confirm Approve/Reject */}
      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.action === "approved"
            ? "Approve Leave Request"
            : "Reject Leave Request"
        }
        message={
          confirmAction?.action === "approved"
            ? "Are you sure you want to approve this leave request?"
            : "Are you sure you want to reject this leave request?"
        }
        confirmLabel={
          confirmAction?.action === "approved" ? "Approve" : "Reject"
        }
        variant={confirmAction?.action === "rejected" ? "danger" : "default"}
        loading={updateStatus.isPending}
        onConfirm={handleStatusUpdate}
        onClose={() => setConfirmAction(null)}
      />
    </>
  );
}

/* ================================================================== */
/*  Tab: Shift Rosters                                                 */
/* ================================================================== */

function ShiftRostersTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useRosters(
    page,
    20,
    undefined,
    statusFilter || undefined,
  );

  const rosters = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Coverage board
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Shift roster execution
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Published and draft schedules live together here so coverage gaps
            are visible before they become operational surprises.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Create Roster
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROSTER_STATUSES.map((statusOption) => {
          const isActive = statusOption.value === statusFilter;
          return (
            <button
              key={statusOption.label}
              type="button"
              onClick={() => {
                setStatusFilter(statusOption.value);
                setPage(1);
              }}
              className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
              style={{
                borderColor: isActive ? "var(--primary)" : "var(--border)",
                backgroundColor: isActive
                  ? "rgba(27, 115, 64, 0.12)"
                  : "var(--surface-0)",
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              {statusOption.label}
            </button>
          );
        })}
      </div>

      {/* Roster Cards */}
      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-[30px] bg-[var(--surface-1)]"
            />
          ))}
        </div>
      ) : rosters.length === 0 ? (
        <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
          <CalendarDays
            size={24}
            className="mx-auto text-[var(--text-secondary)] mb-2"
          />
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            No rosters found
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            Create a roster to start managing team schedules.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rosters.map((roster) => (
            <RosterCard
              key={roster.id}
              roster={roster}
              expanded={expandedId === roster.id}
              onToggle={() =>
                setExpandedId(expandedId === roster.id ? null : roster.id)
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            Page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function PeopleDirectoryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("rosters");
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: pendingLeave, isLoading: leaveLoading } = useLeaveRecords(
    1,
    1,
    undefined,
    "pending",
  );
  const { data: rostersData, isLoading: rostersLoading } = useRosters(
    1,
    1,
    undefined,
    "published",
  );
  const activeTabCopy = TAB_COPY[activeTab];

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border p-6 lg:p-8"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "rgba(27, 115, 64, 0.14)",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(27,115,64,0.16), transparent 32%), radial-gradient(circle at 88% 16%, rgba(37,99,235,0.14), transparent 28%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
          boxShadow: "0 28px 90px -58px rgba(27, 115, 64, 0.28)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                <Users size={14} />
                {activeTabCopy.eyebrow}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-sm">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: activeTabCopy.accent }}
                />
                {activeTabCopy.focus}
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">
                {activeTabCopy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)] lg:text-lg">
                {activeTabCopy.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <WorkspaceJumpButton
                icon={CalendarDays}
                label="Shift Rosters"
                active={activeTab === "rosters"}
                onClick={() => setActiveTab("rosters")}
              />
              <WorkspaceJumpButton
                icon={CalendarOff}
                label="Leave Tracker"
                active={activeTab === "leave"}
                onClick={() => setActiveTab("leave")}
              />
              <WorkspaceJumpButton
                icon={Users}
                label="Directory"
                active={activeTab === "directory"}
                onClick={() => setActiveTab("directory")}
              />
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.74)",
              borderColor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Operational pulse
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Workforce signals
                </h2>
              </div>
              <Activity size={20} className="text-[var(--primary)]" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Online now
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? <LoadingValue width="w-14" /> : userStats?.onlineNow ?? 0}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  New this month
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {statsLoading ? <LoadingValue width="w-14" /> : userStats?.newThisMonth ?? 0}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Pending leave
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {leaveLoading ? <LoadingValue width="w-14" /> : pendingLeave?.meta?.totalItems ?? 0}
                </p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-0)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Published rosters
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {rostersLoading ? <LoadingValue width="w-14" /> : rostersData?.meta?.totalItems ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          label="Total Employees"
          value={userStats?.totalUsers}
          icon={Users}
          color="#1B7340"
          bgColor="rgba(27, 115, 64, 0.1)"
          loading={statsLoading}
          helper="Total workforce records in the directory."
        />
        <StatCard
          label="Active"
          value={userStats?.activeUsers}
          icon={UserCheck}
          color="#10B981"
          bgColor="rgba(16, 185, 129, 0.1)"
          loading={statsLoading}
          helper="Enabled staff currently available for assignment."
        />
        <StatCard
          label="Pending Leave"
          value={pendingLeave?.meta?.totalItems}
          icon={CalendarOff}
          color="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.1)"
          loading={leaveLoading}
          helper="Requests waiting on review or staffing action."
        />
        <StatCard
          label="Published Rosters"
          value={rostersData?.meta?.totalItems}
          icon={CalendarDays}
          color="#2563EB"
          bgColor="rgba(37, 99, 235, 0.1)"
          loading={rostersLoading}
          helper="Live schedules currently visible to the team."
        />
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-3 md:grid-cols-3"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const tabCopy = TAB_COPY[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: isActive ? tabCopy.accent : "var(--border)",
                backgroundColor: isActive ? `${tabCopy.accent}10` : "var(--surface-0)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: isActive ? `${tabCopy.accent}18` : "var(--surface-1)",
                    color: isActive ? tabCopy.accent : "var(--text-secondary)",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: isActive ? tabCopy.accent : "var(--text-primary)",
                    }}
                  >
                    {tab.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {tabCopy.description}
                  </p>
                </div>
              </div>
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-x-0 top-0 h-1 rounded-t-[28px]"
                  style={{ backgroundColor: tabCopy.accent }}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
        id="people-workspace"
      >
        {activeTab === "directory" && <DirectoryTab />}
        {activeTab === "leave" && <LeaveTrackerTab />}
        {activeTab === "rosters" && <ShiftRostersTab />}
      </motion.div>
    </div>
  );
}
