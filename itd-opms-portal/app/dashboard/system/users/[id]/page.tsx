"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Users,
  Clock,
  Monitor,
  Plus,
  Trash2,
  Search,
  Calendar,
  UserCheck,
  LogOut,
  Globe,
  Building2,
  Layers,
  X,
  Mail,
  Briefcase,
  MapPin,
  Phone,
  Hash,
  Activity,
  Fingerprint,
  ShieldCheck,
  ArrowRightLeft,
  Wifi,
  WifiOff,
  Smartphone,
  Laptop,
  ChevronRight,
  KeyRound,
  CircleDot,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { OrgUnitPicker } from "@/components/shared/pickers";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useUser,
  useDeactivateUser,
  useReactivateUser,
  useAssignRole,
  useRevokeRole,
  useCreateDelegation,
  useRevokeDelegation,
  useRoles,
  useAuditTimeline,
  useUserSessions,
  useRevokeSession,
  useSearchUsers,
} from "@/hooks/use-system";
import type { RoleDetail, RoleBinding, Delegation, ActiveSession } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "roles", label: "Roles", icon: ShieldCheck, color: "var(--primary)" },
  { key: "delegations", label: "Delegations", icon: ArrowRightLeft, color: "var(--info)" },
  { key: "activity", label: "Activity", icon: Activity, color: "var(--warning)" },
  { key: "sessions", label: "Sessions", icon: Monitor, color: "var(--success)" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const SCOPE_TYPES = [
  { value: "global", label: "Global", icon: Globe },
  { value: "division", label: "Division", icon: Building2 },
  { value: "unit", label: "Unit", icon: Layers },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function memberSince(dateStr?: string | null): string {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) return "This month";
  if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years}y ${rem}m`;
}

/* ------------------------------------------------------------------ */
/*  Staggered animation variants                                       */
/* ------------------------------------------------------------------ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;

  /* ---- Data hooks ---- */
  const { data: user, isLoading } = useUser(id);
  const { data: rolesData } = useRoles();
  const allRoles: RoleDetail[] = rolesData ?? [];
  const { data: timelineData } = useAuditTimeline("user", id);
  const timeline = (timelineData ?? []) as Array<{
    id: string;
    action: string;
    actorEmail?: string;
    actorDisplayName?: string;
    changes?: Record<string, unknown>;
    createdAt: string;
  }>;
  const { data: userSessions } = useUserSessions(id);
  const sessions: ActiveSession[] = userSessions ?? [];

  /* ---- Mutations ---- */
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();
  const assignRole = useAssignRole(id);
  const revokeRole = useRevokeRole(id);
  const createDelegation = useCreateDelegation(id);
  const revokeDelegation = useRevokeDelegation(id);
  const revokeSession = useRevokeSession();

  /* ---- Local state ---- */
  const [activeTab, setActiveTab] = useState<TabKey>("roles");
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);

  // Assign role dialog
  const [showAssignRole, setShowAssignRole] = useState(false);
  const [roleForm, setRoleForm] = useState({
    roleId: "",
    scopeType: "global",
    scopeId: "",
    expiresAt: "",
  });
  const [scopeDisplay, setScopeDisplay] = useState("");

  // Revoke role confirm
  const [revokeRoleTarget, setRevokeRoleTarget] = useState<{
    bindingId: string;
    roleName: string;
  } | null>(null);

  // Create delegation dialog
  const [showCreateDelegation, setShowCreateDelegation] = useState(false);
  const [delegationForm, setDelegationForm] = useState({
    delegateeId: "",
    roleId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [delegateeSearch, setDelegateeSearch] = useState("");
  const { data: searchUsersData } = useSearchUsers(delegateeSearch);
  const searchedUsers = (searchUsersData ?? []) as Array<{
    id: string;
    email: string;
    displayName: string;
  }>;

  // Revoke delegation confirm
  const [revokeDelegationTarget, setRevokeDelegationTarget] = useState<{
    delegationId: string;
    roleName: string;
  } | null>(null);

  // Revoke session confirm
  const [revokeSessionTarget, setRevokeSessionTarget] = useState<string | null>(null);

  /* ---- Tab badge counts ---- */
  const tabCounts = useMemo(
    () => ({
      roles: user?.roles?.length ?? 0,
      delegations: user?.delegations?.length ?? 0,
      activity: timeline.length,
      sessions: sessions.length,
    }),
    [user, timeline, sessions],
  );

  /* ---- Breadcrumbs ---- */
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Users", href: "/dashboard/system/users" },
    { label: user?.displayName || "User Details", href: `/dashboard/system/users/${id}` },
  ]);

  /* ---- Handlers ---- */

  function handleDeactivate() {
    deactivateUser.mutate(id, {
      onSuccess: () => setShowDeactivateConfirm(false),
    });
  }

  function handleReactivate() {
    reactivateUser.mutate(id, {
      onSuccess: () => setShowReactivateConfirm(false),
    });
  }

  function handleAssignRole() {
    if (!roleForm.roleId) return;
    assignRole.mutate(
      {
        roleId: roleForm.roleId,
        scopeType: roleForm.scopeType || "global",
        scopeId: roleForm.scopeId || undefined,
        expiresAt: roleForm.expiresAt || undefined,
      },
      {
        onSuccess: () => {
          setShowAssignRole(false);
          setRoleForm({ roleId: "", scopeType: "global", scopeId: "", expiresAt: "" });
          setScopeDisplay("");
        },
      },
    );
  }

  function handleRevokeRole() {
    if (!revokeRoleTarget) return;
    revokeRole.mutate(revokeRoleTarget.bindingId, {
      onSuccess: () => setRevokeRoleTarget(null),
    });
  }

  function handleCreateDelegation() {
    if (!delegationForm.delegateeId || !delegationForm.roleId) return;
    createDelegation.mutate(
      {
        delegateId: delegationForm.delegateeId,
        roleId: delegationForm.roleId,
        startsAt: delegationForm.startDate,
        endsAt: delegationForm.endDate,
        reason: delegationForm.reason || "",
      },
      {
        onSuccess: () => {
          setShowCreateDelegation(false);
          setDelegationForm({
            delegateeId: "",
            roleId: "",
            startDate: "",
            endDate: "",
            reason: "",
          });
          setDelegateeSearch("");
        },
      },
    );
  }

  function handleRevokeDelegation() {
    if (!revokeDelegationTarget) return;
    revokeDelegation.mutate(revokeDelegationTarget.delegationId, {
      onSuccess: () => setRevokeDelegationTarget(null),
    });
  }

  function handleRevokeSession() {
    if (!revokeSessionTarget) return;
    revokeSession.mutate(revokeSessionTarget, {
      onSuccess: () => setRevokeSessionTarget(null),
    });
  }

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[var(--surface-3)] border-t-[var(--primary)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-[var(--primary)]/10" />
            </div>
          </div>
          <p className="text-sm font-medium text-[var(--text-muted)]">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--error)]/10">
          <Users size={28} className="text-[var(--error)]" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">User not found</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">The requested user profile could not be located.</p>
        </div>
        <Link
          href="/dashboard/system/users"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <ArrowLeft size={16} />
          Back to Users
        </Link>
      </div>
    );
  }

  const isActive = user.isActive;
  const roles = user.roles ?? [];
  const delegations = user.delegations ?? [];

  /* ---- Render ---- */

  return (
    <PermissionGate permission="system.manage">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Back Button */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/system/users"
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Users
          </Link>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  HERO PROFILE CARD                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
        >
          {/* Gradient Banner */}
          <div className="relative h-32 sm:h-36" style={{ background: "linear-gradient(135deg, #1B7340 0%, #0E5A2D 40%, #164e3a 100%)" }}>
            {/* Decorative pattern overlay */}
            <div className="absolute inset-0 opacity-[0.07]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            {/* Gold accent stripe */}
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent, #A8893D 30%, #8B6F2E 70%, transparent)" }} />

            {/* Status indicator on banner */}
            <div className="absolute right-5 top-5">
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm ${
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-red-500/20 text-red-100"
              }`}>
                <div className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-300 animate-pulse" : "bg-red-400"}`} />
                {isActive ? "Active" : "Inactive"}
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="relative px-6 pb-6">
            {/* Avatar - overlapping the banner */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4 -mt-10 sm:-mt-12">
                <div className="relative">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.displayName}
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg ring-4 ring-[var(--surface-0)] sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg ring-4 ring-[var(--surface-0)] sm:h-24 sm:w-24 sm:text-3xl"
                      style={{ background: "linear-gradient(135deg, #1B7340 0%, #22c55e 100%)" }}
                    >
                      {getInitials(user.displayName)}
                    </div>
                  )}
                  {/* Online indicator */}
                  <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-[var(--surface-0)] ${isActive ? "bg-[var(--success)]" : "bg-[var(--surface-4)]"}`} />
                </div>
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                    {user.displayName}
                  </h1>
                  <p className="text-sm text-[var(--text-muted)]">{user.jobTitle || "Staff"}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:pb-1">
                {isActive ? (
                  <button
                    type="button"
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="rounded-xl border border-[var(--error)]/30 px-4 py-2 text-sm font-medium text-[var(--error)] transition-all hover:bg-[var(--error)]/5 hover:border-[var(--error)]/50"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReactivateConfirm(true)}
                    className="rounded-xl border border-[var(--success)]/30 px-4 py-2 text-sm font-medium text-[var(--success)] transition-all hover:bg-[var(--success)]/5 hover:border-[var(--success)]/50"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>

            {/* User Metadata Grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <MetadataItem icon={Mail} label="Email" value={user.email} />
              <MetadataItem icon={Building2} label="Department" value={user.department || "--"} />
              <MetadataItem icon={MapPin} label="Office" value={user.office || "--"} />
              <MetadataItem icon={Clock} label="Last Login" value={user.lastLoginAt ? timeAgo(user.lastLoginAt) : "Never"} />
              <MetadataItem icon={Calendar} label="Member Since" value={memberSince(user.createdAt)} />
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  QUICK STATS ROW                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={ShieldCheck}
            label="Roles"
            value={roles.length}
            color="var(--primary)"
            bgColor="var(--primary)"
          />
          <StatCard
            icon={ArrowRightLeft}
            label="Delegations"
            value={delegations.length}
            color="var(--info)"
            bgColor="var(--info)"
          />
          <StatCard
            icon={Activity}
            label="Events"
            value={timeline.length}
            color="var(--warning)"
            bgColor="var(--warning)"
          />
          <StatCard
            icon={Wifi}
            label="Sessions"
            value={sessions.length}
            color="var(--success)"
            bgColor="var(--success)"
          />
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  TAB NAVIGATION                                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <motion.div
          variants={itemVariants}
          className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={16} style={isSelected ? { color: tab.color } : undefined} />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    isSelected
                      ? "text-white"
                      : "bg-[var(--surface-3)] text-[var(--text-muted)]"
                  }`} style={isSelected ? { backgroundColor: tab.color } : undefined}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  TAB CONTENT                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "roles" && (
              <RolesTab
                roles={roles}
                allRoles={allRoles}
                onAssign={() => setShowAssignRole(true)}
                onRevoke={(bindingId, roleName) => setRevokeRoleTarget({ bindingId, roleName })}
              />
            )}
            {activeTab === "delegations" && (
              <DelegationsTab
                delegations={delegations}
                onCreate={() => setShowCreateDelegation(true)}
                onRevoke={(delegationId, roleName) => setRevokeDelegationTarget({ delegationId, roleName })}
              />
            )}
            {activeTab === "activity" && <ActivityTab timeline={timeline} />}
            {activeTab === "sessions" && (
              <SessionsTab
                sessions={sessions}
                onRevoke={(sessionId) => setRevokeSessionTarget(sessionId)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ---- Dialogs ---- */}

        <ConfirmDialog
          open={showDeactivateConfirm}
          onClose={() => setShowDeactivateConfirm(false)}
          onConfirm={handleDeactivate}
          title="Deactivate User"
          message={`Are you sure you want to deactivate ${user.displayName}? They will lose access to the platform immediately.`}
          confirmLabel="Deactivate"
          variant="danger"
          loading={deactivateUser.isPending}
        />
        <ConfirmDialog
          open={showReactivateConfirm}
          onClose={() => setShowReactivateConfirm(false)}
          onConfirm={handleReactivate}
          title="Reactivate User"
          message={`Are you sure you want to reactivate ${user.displayName}? Their previous roles and permissions will be restored.`}
          confirmLabel="Reactivate"
          variant="default"
          loading={reactivateUser.isPending}
        />
        <ConfirmDialog
          open={!!revokeRoleTarget}
          onClose={() => setRevokeRoleTarget(null)}
          onConfirm={handleRevokeRole}
          title="Revoke Role"
          message={`Are you sure you want to revoke the "${revokeRoleTarget?.roleName}" role from this user?`}
          confirmLabel="Revoke"
          variant="danger"
          loading={revokeRole.isPending}
        />
        <ConfirmDialog
          open={!!revokeDelegationTarget}
          onClose={() => setRevokeDelegationTarget(null)}
          onConfirm={handleRevokeDelegation}
          title="Revoke Delegation"
          message={`Are you sure you want to revoke the "${revokeDelegationTarget?.roleName}" delegation?`}
          confirmLabel="Revoke"
          variant="danger"
          loading={revokeDelegation.isPending}
        />
        <ConfirmDialog
          open={!!revokeSessionTarget}
          onClose={() => setRevokeSessionTarget(null)}
          onConfirm={handleRevokeSession}
          title="Force Logout"
          message="Are you sure you want to terminate this session? The user will be logged out immediately."
          confirmLabel="Force Logout"
          variant="danger"
          loading={revokeSession.isPending}
        />

        {/* Assign Role Dialog */}
        <DialogOverlay open={showAssignRole} onClose={() => setShowAssignRole(false)}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Assign Role</h2>
          <p className="mb-5 text-sm text-[var(--text-muted)]">Assign a role to {user.displayName}</p>

          <div className="space-y-4">
            <FormField label="Role" required>
              <select
                value={roleForm.roleId}
                onChange={(e) => setRoleForm((f) => ({ ...f, roleId: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">Select a role...</option>
                {allRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Scope Type">
              <div className="flex gap-2">
                {SCOPE_TYPES.map((s) => {
                  const ScopeIcon = s.icon;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setRoleForm((f) => ({ ...f, scopeType: s.value }))}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                        roleForm.scopeType === s.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-1)]"
                      }`}
                    >
                      <ScopeIcon size={14} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </FormField>

            {roleForm.scopeType !== "global" && (
              <OrgUnitPicker
                label="Scope"
                required
                placeholder="Search organizational units..."
                value={roleForm.scopeId || undefined}
                displayValue={scopeDisplay}
                onChange={(orgUnitId, name) => {
                  setRoleForm((f) => ({ ...f, scopeId: orgUnitId ?? "" }));
                  setScopeDisplay(name);
                }}
              />
            )}

            <FormField label="Expires At" hint="optional">
              <input
                type="date"
                value={roleForm.expiresAt}
                onChange={(e) => setRoleForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </FormField>
          </div>

          <DialogActions
            onCancel={() => setShowAssignRole(false)}
            onConfirm={handleAssignRole}
            disabled={!roleForm.roleId || assignRole.isPending}
            loading={assignRole.isPending}
            label="Assign Role"
          />
        </DialogOverlay>

        {/* Create Delegation Dialog */}
        <DialogOverlay open={showCreateDelegation} onClose={() => setShowCreateDelegation(false)}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Create Delegation</h2>
          <p className="mb-5 text-sm text-[var(--text-muted)]">Delegate a role from {user.displayName} to another user</p>

          <div className="space-y-4">
            <FormField label="Delegatee" required>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={delegateeSearch}
                  onChange={(e) => {
                    setDelegateeSearch(e.target.value);
                    setDelegationForm((f) => ({ ...f, delegateeId: "" }));
                  }}
                  placeholder="Search users by name or email..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              {delegateeSearch.length >= 2 && searchedUsers.length > 0 && !delegationForm.delegateeId && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg">
                  {searchedUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setDelegationForm((f) => ({ ...f, delegateeId: u.id }));
                        setDelegateeSearch(u.displayName);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #1B7340 0%, #22c55e 100%)" }}
                      >
                        {getInitials(u.displayName)}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{u.displayName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {delegationForm.delegateeId && (
                <p className="mt-1 text-xs text-[var(--success)]">
                  <UserCheck size={12} className="mr-1 inline" />
                  User selected
                </p>
              )}
            </FormField>

            <FormField label="Role" required>
              <select
                value={delegationForm.roleId}
                onChange={(e) => setDelegationForm((f) => ({ ...f, roleId: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">Select a role...</option>
                {allRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date" required>
                <input
                  type="date"
                  value={delegationForm.startDate}
                  onChange={(e) => setDelegationForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </FormField>
              <FormField label="End Date" required>
                <input
                  type="date"
                  value={delegationForm.endDate}
                  onChange={(e) => setDelegationForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </FormField>
            </div>

            <FormField label="Reason" hint="optional">
              <textarea
                value={delegationForm.reason}
                onChange={(e) => setDelegationForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Why is this delegation needed?"
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </FormField>
          </div>

          <DialogActions
            onCancel={() => setShowCreateDelegation(false)}
            onConfirm={handleCreateDelegation}
            disabled={
              !delegationForm.delegateeId ||
              !delegationForm.roleId ||
              !delegationForm.startDate ||
              !delegationForm.endDate ||
              createDelegation.isPending
            }
            loading={createDelegation.isPending}
            label="Create Delegation"
          />
        </DialogOverlay>
      </motion.div>
    </PermissionGate>
  );
}

/* ================================================================== */
/*  Shared Sub-Components                                              */
/* ================================================================== */

function MetadataItem({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-1)] px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-0)]">
        <Icon size={14} className="text-[var(--text-muted)]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        <p className="truncate text-xs font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: typeof Shield;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: `color-mix(in srgb, ${bgColor} 12%, transparent)` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
          <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
        </div>
      </div>
      {/* Decorative corner accent */}
      <div className="absolute -right-3 -top-3 h-12 w-12 rounded-full opacity-[0.04]" style={{ backgroundColor: color }} />
    </div>
  );
}

function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
        {label} {required && <span className="text-[var(--error)]">*</span>}
        {hint && <span className="ml-1 font-normal text-[var(--text-muted)]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function DialogOverlay({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

function DialogActions({
  onCancel,
  onConfirm,
  disabled,
  loading,
  label,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  disabled: boolean;
  loading: boolean;
  label: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Processing...
          </span>
        ) : (
          label
        )}
      </button>
    </div>
  );
}

function TabSectionHeader({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  action,
}: {
  icon: typeof Shield;
  iconColor: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}
        >
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
        <Icon size={24} className="text-[var(--neutral-gray)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

/* ================================================================== */
/*  Tab Components                                                      */
/* ================================================================== */

/* ---- Roles Tab ---- */

function RolesTab({
  roles,
  allRoles,
  onAssign,
  onRevoke,
}: {
  roles: RoleBinding[];
  allRoles: RoleDetail[];
  onAssign: () => void;
  onRevoke: (bindingId: string, roleName: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
      <TabSectionHeader
        icon={ShieldCheck}
        iconColor="var(--primary)"
        title="Role Bindings"
        subtitle={`${roles.length} role${roles.length !== 1 ? "s" : ""} assigned`}
        action={
          <button
            type="button"
            onClick={onAssign}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-md"
          >
            <Plus size={14} />
            Assign Role
          </button>
        }
      />

      {roles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No roles assigned"
          description="Assign a role to grant this user permissions across the platform."
        />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {roles.map((rb, idx) => {
            const roleDetail = allRoles.find((r) => r.id === rb.roleId);
            const isExpired = rb.expiresAt && new Date(rb.expiresAt) < new Date();
            return (
              <motion.div
                key={rb.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--surface-1)]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                    <KeyRound size={16} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{rb.roleName}</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--text-muted)]">
                        {rb.scopeType === "global" && <Globe size={9} />}
                        {rb.scopeType === "division" && <Building2 size={9} />}
                        {rb.scopeType === "unit" && <Layers size={9} />}
                        {rb.scopeType}
                      </span>
                      {isExpired && (
                        <span className="rounded-full bg-[var(--error)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--error)]">
                          EXPIRED
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      {roleDetail?.description && (
                        <span className="line-clamp-1">{roleDetail.description}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                      {rb.grantedBy && (
                        <span className="flex items-center gap-1">
                          <Fingerprint size={10} />
                          {rb.grantedBy.slice(0, 8)}...
                        </span>
                      )}
                      {rb.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          Expires {formatDate(rb.expiresAt)}
                        </span>
                      )}
                      {!rb.expiresAt && (
                        <span className="flex items-center gap-1 text-[var(--success)]">
                          <Zap size={10} />
                          Permanent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRevoke(rb.id, rb.roleName)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium text-[var(--error)] transition-all hover:border-[var(--error)]/20 hover:bg-[var(--error)]/5"
                >
                  <Trash2 size={12} />
                  Revoke
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- Delegations Tab ---- */

function DelegationsTab({
  delegations,
  onCreate,
  onRevoke,
}: {
  delegations: Delegation[];
  onCreate: () => void;
  onRevoke: (delegationId: string, roleName: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
      <TabSectionHeader
        icon={ArrowRightLeft}
        iconColor="var(--info)"
        title="Delegations"
        subtitle={`${delegations.length} delegation${delegations.length !== 1 ? "s" : ""}`}
        action={
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-md"
          >
            <Plus size={14} />
            Create Delegation
          </button>
        }
      />

      {delegations.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No delegations"
          description="Create a delegation to temporarily transfer permissions to another user."
        />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {delegations.map((d, idx) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--surface-1)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--info)]/10">
                  <ArrowRightLeft size={16} className="text-[var(--info)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {d.roleName || d.roleId.slice(0, 8) + "..."}
                    </p>
                    <StatusBadge status={d.isActive ? "active" : "expired"} />
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <span className="font-medium">{d.delegatorName || d.delegatorId.slice(0, 8)}</span>
                    <ChevronRight size={10} />
                    <span className="font-medium">{d.delegateName || d.delegateId.slice(0, 8)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(d.startsAt)} - {formatDate(d.endsAt)}
                    </span>
                    {d.reason && (
                      <span className="line-clamp-1 max-w-[200px]">&middot; {d.reason}</span>
                    )}
                  </div>
                </div>
              </div>
              {d.isActive && (
                <button
                  type="button"
                  onClick={() => onRevoke(d.id, d.roleName || "Unknown Role")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium text-[var(--error)] transition-all hover:border-[var(--error)]/20 hover:bg-[var(--error)]/5"
                >
                  <Trash2 size={12} />
                  Revoke
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Activity Tab ---- */

function ActivityTab({
  timeline,
}: {
  timeline: Array<{
    id: string;
    action: string;
    actorEmail?: string;
    changes?: Record<string, unknown>;
    createdAt: string;
  }>;
}) {
  const actionColors: Record<string, { bg: string; dot: string; icon: string }> = {
    created: { bg: "var(--success)", dot: "var(--success)", icon: "var(--success)" },
    updated: { bg: "var(--info)", dot: "var(--info)", icon: "var(--info)" },
    deleted: { bg: "var(--error)", dot: "var(--error)", icon: "var(--error)" },
    deactivated: { bg: "var(--warning)", dot: "var(--warning)", icon: "var(--warning)" },
    activated: { bg: "var(--success)", dot: "var(--success)", icon: "var(--success)" },
    login: { bg: "var(--primary)", dot: "var(--primary)", icon: "var(--primary)" },
  };

  function getActionColor(action: string) {
    const key = Object.keys(actionColors).find((k) => action.toLowerCase().includes(k));
    return actionColors[key ?? "updated"] ?? actionColors.updated;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
      <TabSectionHeader
        icon={Activity}
        iconColor="var(--warning)"
        title="Activity Timeline"
        subtitle={`${timeline.length} event${timeline.length !== 1 ? "s" : ""} recorded`}
      />

      {timeline.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity recorded"
          description="User actions and system events will appear here as they occur."
        />
      ) : (
        <div className="px-6 py-5">
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-[var(--primary)]/40 via-[var(--border)] to-transparent" />

            {timeline.map((event, idx) => {
              const changesStr = event.changes ? Object.keys(event.changes).join(", ") : null;
              const colors = getActionColor(event.action);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className="relative flex gap-4 py-3"
                >
                  {/* Dot */}
                  <div className="relative z-10 mt-1 flex h-[31px] w-[31px] shrink-0 items-center justify-center">
                    <div
                      className="flex h-[31px] w-[31px] items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${colors.bg} 12%, transparent)`,
                      }}
                    >
                      <CircleDot size={13} style={{ color: colors.dot }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 transition-colors hover:bg-[var(--surface-0)]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium capitalize text-[var(--text-primary)]">
                          {event.action.replace(/_/g, " ")}
                        </p>
                        {event.actorEmail && (
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">by {event.actorEmail}</p>
                        )}
                        {changesStr && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.keys(event.changes!).map((field) => (
                              <span
                                key={field}
                                className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                        {timeAgo(event.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Sessions Tab ---- */

function SessionsTab({
  sessions,
  onRevoke,
}: {
  sessions: ActiveSession[];
  onRevoke: (sessionId: string) => void;
}) {
  function getDeviceIcon(device?: string | null) {
    if (!device) return Laptop;
    const d = String(device).toLowerCase();
    if (d.includes("mobile") || d.includes("phone") || d.includes("android") || d.includes("iphone")) return Smartphone;
    return Laptop;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
      <TabSectionHeader
        icon={Monitor}
        iconColor="var(--success)"
        title="Active Sessions"
        subtitle={`${sessions.length} active session${sessions.length !== 1 ? "s" : ""}`}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={WifiOff}
          title="No active sessions"
          description="This user has no active sessions at the moment."
        />
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {sessions.map((session, idx) => {
            const DeviceIcon = getDeviceIcon(session.deviceInfo?.device as string | null);
            const isRecent = session.lastActive && (Date.now() - new Date(session.lastActive).getTime()) < 300000;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Active indicator bar */}
                <div className={`absolute left-0 top-0 h-full w-1 ${isRecent ? "bg-[var(--success)]" : "bg-[var(--surface-3)]"}`} />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isRecent ? "bg-[var(--success)]/10" : "bg-[var(--surface-2)]"}`}>
                      <DeviceIcon size={20} className={isRecent ? "text-[var(--success)]" : "text-[var(--neutral-gray)]"} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {(session.deviceInfo?.browser as string) ?? "Unknown Browser"}
                        </p>
                        {isRecent && (
                          <span className="flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)]" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {(session.deviceInfo?.os as string) ?? "Unknown OS"}
                        {session.deviceInfo?.device ? ` - ${String(session.deviceInfo.device)}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRevoke(session.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--error)] opacity-0 transition-all group-hover:opacity-100 hover:border-[var(--error)]/20 hover:bg-[var(--error)]/5"
                  >
                    <LogOut size={12} />
                    End
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SessionDetail label="IP Address" value={session.ipAddress || "--"} icon={Hash} />
                  <SessionDetail label="Last Active" value={timeAgo(session.lastActive)} icon={Clock} />
                  <SessionDetail label="Created" value={formatDateTime(session.createdAt)} icon={Calendar} />
                  {session.location && (
                    <SessionDetail label="Location" value={session.location} icon={MapPin} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionDetail({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={11} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        <p className="text-xs font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
