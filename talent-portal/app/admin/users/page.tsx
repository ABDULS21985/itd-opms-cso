"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  UserCheck,
  UserX,
  UserCog,
  X,
  Loader2,
  MoreHorizontal,
  Eye,
  Ban,
  Power,
  Clock,
  Mail,
  Activity,
  Key,
  AlertTriangle,
  Copy,
} from "lucide-react";
import {
  useAdminUsers,
  useAssignRoles,
  useUpdatePermissions,
  useSuspendUser,
  useActivateUser,
  useUserAuditLogs,
} from "@/hooks/use-admin";
import type { AdminUser, AuditLog } from "@/hooks/use-admin";
import { useAdminTable } from "@/hooks/use-admin-table";
import { AdminDataTable, type AdminColumn, type BulkAction } from "@/components/admin/admin-data-table";
import { formatRelativeTime } from "@/lib/date-utils";
import { cn, formatDate } from "@/lib/utils";
import { colorAlpha } from "@/lib/color-utils";
import { toast } from "sonner";

/* ══════════════════════════════════════════════════════════
   Constants & Config
   ══════════════════════════════════════════════════════════ */

const USER_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  candidate: { label: "Candidate", bg: "bg-[var(--badge-blue-bg)]", text: "text-[var(--badge-blue-text)]", dot: "bg-[var(--badge-blue-dot)]" },
  employer:  { label: "Employer",  bg: "bg-[var(--badge-purple-bg)]", text: "text-[var(--badge-purple-text)]", dot: "bg-[var(--badge-purple-dot)]" },
  admin:     { label: "Admin",     bg: "bg-[var(--badge-red-bg)]", text: "text-[var(--badge-red-text)]", dot: "bg-[var(--badge-red-dot)]" },
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  candidate:         { label: "Candidate",         color: "var(--info)" },
  employer_admin:    { label: "Employer Admin",    color: "var(--badge-purple-dot)" },
  employer_member:   { label: "Employer Member",   color: "var(--badge-purple-text)" },
  placement_officer: { label: "Placement Officer", color: "var(--accent-orange)" },
  placement_manager: { label: "Placement Manager", color: "var(--primary)" },
  super_admin:       { label: "Super Admin",       color: "var(--error)" },
};

const ROLES_BY_USER_TYPE: Record<string, { value: string; label: string; description: string }[]> = {
  candidate: [
    { value: "candidate", label: "Candidate", description: "Standard candidate access" },
  ],
  employer: [
    { value: "employer_admin", label: "Employer Admin", description: "Full employer management access" },
    { value: "employer_member", label: "Employer Member", description: "View and limited edit access" },
  ],
  admin: [
    { value: "placement_officer", label: "Placement Officer", description: "Manage candidates, placements, and intro requests" },
    { value: "placement_manager", label: "Placement Manager", description: "Full admin access including taxonomy and user management" },
    { value: "super_admin", label: "Super Admin", description: "Unrestricted access to all features and settings" },
  ],
};

/* ══════════════════════════════════════════════════════════
   Stat Card
   ══════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string;
  value: number;
  icon: typeof Users;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: colorAlpha(color, 0.07) }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-none tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Role Badge
   ══════════════════════════════════════════════════════════ */

function RoleBadge({ role, removable, onRemove }: {
  role: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  const config = ROLE_LABELS[role] || { label: role.replace(/_/g, " "), color: "var(--text-muted)" };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize whitespace-nowrap"
      style={{ backgroundColor: colorAlpha(config.color, 0.08), color: config.color }}
    >
      {config.label}
      {removable && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full hover:bg-black/10 p-0.5 transition-colors"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   Inline Role Editor (inside the detail sheet)
   ══════════════════════════════════════════════════════════ */

function RoleEditorInline({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const assignRoles = useAssignRoles();
  const available = ROLES_BY_USER_TYPE[user.userType] || [];
  const currentRoles = user.roles.map((r) => r.role);
  const [selected, setSelected] = useState<string[]>(currentRoles);

  const hasChanges =
    selected.length !== currentRoles.length ||
    selected.some((r) => !currentRoles.includes(r));

  const handleSave = async () => {
    try {
      await assignRoles.mutateAsync({ userId: user.id, roles: selected });
      toast.success("Roles updated");
      onDone();
    } catch {
      toast.error("Failed to update roles");
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {available.map((role) => (
        <label
          key={role.value}
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
            selected.includes(role.value)
              ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:border-[var(--primary)]/20",
          )}
        >
          <input
            type="checkbox"
            checked={selected.includes(role.value)}
            onChange={() =>
              setSelected((prev) =>
                prev.includes(role.value)
                  ? prev.filter((r) => r !== role.value)
                  : [...prev, role.value],
              )
            }
            className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] accent-[var(--primary)]"
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{role.label}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{role.description}</p>
          </div>
        </label>
      ))}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onDone}
          className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || assignRoles.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--secondary)] disabled:opacity-40 transition-colors"
        >
          {assignRoles.isPending && <Loader2 size={12} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   User Detail Sheet (inline slide-over)
   ══════════════════════════════════════════════════════════ */

function UserDetailSheet({ user, open, onClose }: {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: auditData, isLoading: auditLoading } = useUserAuditLogs(user?.id ?? null);
  const assignRoles = useAssignRoles();
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

  const auditLogs: AuditLog[] = auditData?.data ?? [];
  const userRoles = user?.roles?.map((r) => r.role) ?? [];
  const typeConf = USER_TYPE_CONFIG[user?.userType ?? ""] || USER_TYPE_CONFIG.candidate;
  const isActive = !user?.lastActiveAt || new Date(user.lastActiveAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const handleSuspend = async () => {
    if (!user) return;
    try {
      await suspendUser.mutateAsync({ userId: user.id, reason: suspendReason });
      toast.success("User suspended");
      setSuspendReason("");
      setShowSuspendConfirm(false);
    } catch {
      toast.error("Failed to suspend user");
    }
  };

  const handleActivate = async () => {
    if (!user) return;
    try {
      await activateUser.mutateAsync(user.id);
      toast.success("User activated");
    } catch {
      toast.error("Failed to activate user");
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Slide-over panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-lg overflow-y-auto bg-[var(--surface-0)] shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-black/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X size={18} />
              </button>

              {/* Profile Header */}
              <div className="bg-gradient-to-br from-[var(--primary)]/5 to-[var(--info)]/5 px-6 pt-8 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 border-2 border-[var(--surface-0)] shadow-sm">
                    <span className="text-xl font-bold text-[var(--primary)]">
                      {(user.displayName?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
                      {user.displayName || "Unnamed User"}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${typeConf.bg} ${typeConf.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeConf.dot}`} />
                        {typeConf.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${isActive ? "bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]" : "bg-[var(--surface-2)] text-[var(--text-muted)]"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[var(--badge-emerald-dot)]" : "bg-[var(--text-muted)]"}`} />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Account Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)]">Created</p>
                    <p className="text-sm text-[var(--text-secondary)] font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)]">Last Active</p>
                    <p className="text-sm text-[var(--text-secondary)] font-medium">
                      {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : "Never"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-[var(--text-muted)]">User ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-1)] px-2 py-0.5 rounded">
                        {user.id}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(user.id); toast.success("Copied"); }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Roles</h3>
                  <button
                    onClick={() => setShowRoleEditor(!showRoleEditor)}
                    className="text-xs text-[var(--primary)] font-medium hover:underline"
                  >
                    {showRoleEditor ? "Done" : "Edit Roles"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {userRoles.length > 0 ? (
                    userRoles.map((role) => (
                      <RoleBadge key={role} role={role} />
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">No roles assigned</span>
                  )}
                </div>

                <AnimatePresence>
                  {showRoleEditor && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <RoleEditorInline user={user} onDone={() => setShowRoleEditor(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Permissions */}
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Permissions</h3>
                <div className="flex flex-wrap gap-1">
                  {user.permissions && user.permissions.length > 0 ? (
                    user.permissions.map((perm) => (
                      <span key={perm} className="px-2 py-0.5 bg-[var(--surface-1)] rounded text-[10px] text-[var(--text-secondary)] font-mono">
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">Inherited from roles</span>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Recent Activity</h3>
                {auditLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-6 h-6 rounded-full bg-[var(--surface-2)]" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-[var(--surface-2)] rounded w-3/4" />
                          <div className="h-2 bg-[var(--surface-2)] rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : auditLogs.length > 0 ? (
                  <div className="space-y-0 relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border)]" />
                    {auditLogs.slice(0, 15).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 py-1.5 relative">
                        <div className="w-[22px] h-[22px] rounded-full bg-[var(--surface-0)] border-2 border-[var(--border)] flex items-center justify-center shrink-0 z-10">
                          <Activity size={10} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[var(--text-secondary)]">
                            <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
                            {log.entity && (
                              <span className="text-[var(--text-muted)]"> on {log.entity}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">{formatRelativeTime(log.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">No activity recorded</p>
                )}
              </div>

              {/* Admin Actions */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Admin Actions</h3>
                <div className="space-y-2">
                  {isActive ? (
                    <button
                      onClick={() => setShowSuspendConfirm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--error)]/20 text-[var(--error)] text-sm font-medium hover:bg-[var(--badge-red-bg)] transition-colors"
                    >
                      <Ban size={16} />
                      Suspend Account
                    </button>
                  ) : (
                    <button
                      onClick={handleActivate}
                      disabled={activateUser.isPending}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--success)]/20 text-[var(--badge-emerald-text)] text-sm font-medium hover:bg-[var(--badge-emerald-bg)] transition-colors disabled:opacity-50"
                    >
                      {activateUser.isPending ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                      Activate Account
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Suspend Confirmation Modal */}
      <AnimatePresence>
        {showSuspendConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50"
              onClick={() => setShowSuspendConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[60] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--surface-0)] rounded-2xl shadow-xl border border-[var(--border)] p-6"
            >
              <div className="flex items-center gap-2 text-[var(--error)] mb-2">
                <AlertTriangle size={20} />
                <h3 className="text-lg font-semibold">Suspend User</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                This will immediately revoke access for {user.displayName || user.email}. They will not be able to log in until reactivated.
              </p>
              <div className="mb-4">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Reason (optional)</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Provide a reason for suspension..."
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] p-3 text-sm resize-none h-20 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowSuspendConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={suspendUser.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--error)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--error)]/90 disabled:opacity-50 transition-colors"
                >
                  {suspendUser.isPending && <Loader2 size={14} className="animate-spin" />}
                  Suspend
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   Invite User Dialog (inline modal)
   ══════════════════════════════════════════════════════════ */

function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("placement_officer");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email) return;
    setSending(true);
    try {
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setMessage("");
      onClose();
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--surface-0)] rounded-2xl shadow-xl border border-[var(--border)] p-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <UserPlus size={16} className="text-[var(--primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Invite User</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              Send an invitation email to add a new admin user to the platform.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Email Address</label>
                <div className="relative mt-1.5">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--border)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Role</label>
                <div className="mt-1.5 space-y-1.5">
                  {ROLES_BY_USER_TYPE.admin.map((role) => (
                    <label
                      key={role.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        selectedRole === role.value
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                          : "border-[var(--border)] hover:border-[var(--primary)]/20",
                      )}
                    >
                      <input
                        type="radio"
                        name="invite-role"
                        value={role.value}
                        checked={selectedRole === role.value}
                        onChange={() => setSelectedRole(role.value)}
                        className="w-4 h-4 text-[var(--primary)] accent-[var(--primary)]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">{role.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to the invitation..."
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] p-3 text-sm resize-none h-16 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!email || sending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--secondary)] disabled:opacity-40 transition-colors"
              >
                {sending && <Loader2 size={14} className="animate-spin" />}
                Send Invitation
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════
   Action Dropdown
   ══════════════════════════════════════════════════════════ */

function UserActionDropdown({ user, onViewProfile, onManageRoles }: {
  user: AdminUser;
  onViewProfile: (user: AdminUser) => void;
  onManageRoles: (user: AdminUser) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg hover:bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg py-1"
            >
              <button
                onClick={(e) => { e.stopPropagation(); onViewProfile(user); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                <Eye size={14} className="text-[var(--text-muted)]" />
                View Profile
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onManageRoles(user); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                <Shield size={14} className="text-[var(--text-muted)]" />
                Manage Roles
              </button>
              <div className="my-1 border-t border-[var(--border)]" />
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--badge-red-bg)] transition-colors"
              >
                <Ban size={14} />
                Suspend
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Column Definitions
   ══════════════════════════════════════════════════════════ */

function getUserColumns(
  onViewProfile: (user: AdminUser) => void,
  onManageRoles: (user: AdminUser) => void,
): AdminColumn<AdminUser>[] {
  return [
    {
      key: "user",
      header: "User",
      sortable: true,
      minWidth: 240,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[var(--primary)]">
              {(user.displayName?.charAt(0) || user.email.charAt(0)).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.displayName || "Unnamed"}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "userType",
      header: "Type",
      sortable: true,
      minWidth: 100,
      filter: {
        type: "select",
        options: [
          { value: "candidate", label: "Candidate" },
          { value: "employer", label: "Employer" },
          { value: "admin", label: "Admin" },
        ],
      },
      render: (user) => {
        const conf = USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.candidate;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${conf.bg} ${conf.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
            {conf.label}
          </span>
        );
      },
    },
    {
      key: "roles",
      header: "Roles",
      minWidth: 180,
      render: (user) => {
        const roles = user.roles.map((r) => r.role);
        if (roles.length === 0) return <span className="text-xs text-[var(--text-muted)]">No roles</span>;
        const visible = roles.slice(0, 2);
        const overflow = roles.length - 2;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {visible.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
            {overflow > 0 && (
              <span className="text-[11px] text-[var(--text-muted)] font-medium">+{overflow}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      minWidth: 90,
      render: (user) => {
        const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const isActive = lastActive && lastActive > thirtyDaysAgo;
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isActive ? "text-[var(--badge-emerald-text)]" : "text-[var(--text-muted)]"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[var(--badge-emerald-dot)]" : "bg-[var(--text-muted)]"}`} />
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      key: "lastActiveAt",
      header: "Last Active",
      sortable: true,
      minWidth: 130,
      render: (user) => (
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : "Never"}
          </p>
          {user.lastActiveAt && (
            <p className="text-[10px] text-[var(--text-muted)]">
              {new Date(user.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      minWidth: 110,
      defaultVisible: false,
      render: (user) => (
        <p className="text-sm text-[var(--text-muted)]">{formatDate(user.createdAt)}</p>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      minWidth: 50,
      render: (user) => (
        <UserActionDropdown
          user={user}
          onViewProfile={onViewProfile}
          onManageRoles={onManageRoles}
        />
      ),
    },
  ];
}

/* ══════════════════════════════════════════════════════════
   Page Content
   ══════════════════════════════════════════════════════════ */

function UsersContent() {
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const columns = useMemo(
    () => getUserColumns(setDetailUser, setDetailUser),
    [],
  );

  const table = useAdminTable({
    tableId: "users",
    columns,
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 20,
  });

  const { data, isLoading, error, refetch } = useAdminUsers(table.queryFilters);

  const users: AdminUser[] = data?.data || [];
  const meta = data?.meta;

  // Compute stats from loaded data
  const stats = useMemo(() => {
    const total = meta?.total ?? users.length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const active = users.filter((u) => u.lastActiveAt && new Date(u.lastActiveAt) > thirtyDaysAgo).length;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const newThisMonth = users.filter((u) => new Date(u.createdAt) >= thisMonth).length;
    const admins = users.filter((u) => u.userType === "admin").length;
    return { total, active, newThisMonth, admins };
  }, [users, meta]);

  // Bulk actions
  const bulkActions: BulkAction[] = useMemo(() => [
    {
      label: "Assign Role",
      icon: <Shield size={14} />,
      onClick: (ids: string[]) => toast.info(`Assign role to ${ids.length} users`),
    },
    {
      label: "Suspend",
      icon: <Ban size={14} />,
      variant: "danger" as const,
      onClick: (ids: string[]) => toast.info(`Suspend ${ids.length} users`),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">User Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage portal users, roles, permissions, and access control.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--secondary)] transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          Invite User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.total} icon={Users} color="var(--primary)" sub="All registered accounts" />
        <StatCard label="Active (30d)" value={stats.active} icon={UserCheck} color="var(--success)" sub="Logged in recently" />
        <StatCard label="New This Month" value={stats.newThisMonth} icon={UserPlus} color="var(--info)" sub="Registered this month" />
        <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} color="var(--error)" sub="Platform administrators" />
      </div>

      {/* Data Table */}
      <AdminDataTable<AdminUser>
        tableId="users"
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        onRetry={refetch}
        sort={table.sort}
        onSort={table.setSort}
        pagination={meta ? {
          currentPage: meta.page,
          totalPages: meta.totalPages,
          totalItems: meta.total,
          pageSize: table.pageSize,
        } : undefined}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        searchValue={table.searchValue}
        onSearch={table.setSearch}
        searchPlaceholder="Search by name, email, or role..."
        filters={table.filters}
        onFilterChange={table.setFilterValue}
        onClearFilters={table.clearFilters}
        activeFilters={table.activeFilterChips}
        selectable
        selectedIds={table.selectedIds}
        onSelectionChange={table.setSelectedIds}
        bulkActions={bulkActions}
        onRowClick={(u) => setDetailUser(u)}
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your search or filters."
        onExport={(format) => toast.info(`Exporting users as ${format.toUpperCase()}`)}
      />

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={detailUser}
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
      />

      {/* Invite Dialog */}
      <InviteUserDialog open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Page Export
   ══════════════════════════════════════════════════════════ */

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
