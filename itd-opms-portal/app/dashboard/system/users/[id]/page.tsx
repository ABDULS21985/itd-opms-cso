"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  { key: "roles", label: "Roles", icon: Shield },
  { key: "delegations", label: "Delegations", icon: Users },
  { key: "activity", label: "Activity", icon: Clock },
  { key: "sessions", label: "Sessions", icon: Monitor },
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
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-[var(--text-muted)]">User not found.</p>
        <Link
          href="/dashboard/system/users"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  const isActive = user.isActive;

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/system/users"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={16} />
        Back to Users
      </Link>

      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #1B7340 0%, #22c55e 100%)",
              }}
            >
              {getInitials(user.displayName)}
            </div>

            {/* Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {user.displayName}
                </h1>
                <StatusBadge
                  status={isActive ? "active" : "inactive"}
                  variant={isActive ? "success" : "error"}
                />
              </div>
              <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                {user.department && (
                  <span className="text-xs text-[var(--neutral-gray)]">
                    <Building2 size={12} className="mr-1 inline" />
                    {user.department}
                  </span>
                )}
                {user.jobTitle && (
                  <span className="text-xs text-[var(--neutral-gray)]">
                    {user.jobTitle}
                  </span>
                )}
                {user.lastLoginAt && (
                  <span className="text-xs text-[var(--neutral-gray)]">
                    <Clock size={12} className="mr-1 inline" />
                    Last login: {formatDateTime(user.lastLoginAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {isActive ? (
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(true)}
                className="rounded-xl border border-[var(--error)]/30 px-4 py-2 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/5"
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowReactivateConfirm(true)}
                className="rounded-xl border border-[var(--success)]/30 px-4 py-2 text-sm font-medium text-[var(--success)] transition-colors hover:bg-[var(--success)]/5"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
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
              roles={user.roles ?? []}
              allRoles={allRoles}
              onAssign={() => setShowAssignRole(true)}
              onRevoke={(bindingId, roleName) =>
                setRevokeRoleTarget({ bindingId, roleName })
              }
            />
          )}
          {activeTab === "delegations" && (
            <DelegationsTab
              delegations={user.delegations ?? []}
              onCreate={() => setShowCreateDelegation(true)}
              onRevoke={(delegationId, roleName) =>
                setRevokeDelegationTarget({ delegationId, roleName })
              }
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

      {/* Deactivate User Confirm */}
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

      {/* Reactivate User Confirm */}
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

      {/* Revoke Role Confirm */}
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

      {/* Revoke Delegation Confirm */}
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

      {/* Revoke Session Confirm */}
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
      {showAssignRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAssignRole(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowAssignRole(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
            </button>

            <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
              Assign Role
            </h2>
            <p className="mb-5 text-sm text-[var(--text-muted)]">
              Assign a role to {user.displayName}
            </p>

            <div className="space-y-4">
              {/* Role Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                  Role *
                </label>
                <select
                  value={roleForm.roleId}
                  onChange={(e) =>
                    setRoleForm((f) => ({ ...f, roleId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="">Select a role...</option>
                  {allRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Type */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                  Scope Type
                </label>
                <div className="flex gap-2">
                  {SCOPE_TYPES.map((s) => {
                    const ScopeIcon = s.icon;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() =>
                          setRoleForm((f) => ({ ...f, scopeType: s.value }))
                        }
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          roleForm.scopeType === s.value
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-1)]"
                        }`}
                      >
                        <ScopeIcon size={14} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope ID */}
              {roleForm.scopeType !== "global" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                    Scope ID
                  </label>
                  <input
                    type="text"
                    value={roleForm.scopeId}
                    onChange={(e) =>
                      setRoleForm((f) => ({ ...f, scopeId: e.target.value }))
                    }
                    placeholder={`Enter ${roleForm.scopeType} ID...`}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              )}

              {/* Expiry Date */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                  Expires At (optional)
                </label>
                <input
                  type="date"
                  value={roleForm.expiresAt}
                  onChange={(e) =>
                    setRoleForm((f) => ({ ...f, expiresAt: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssignRole(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignRole}
                disabled={!roleForm.roleId || assignRole.isPending}
                className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
              >
                {assignRole.isPending ? "Assigning..." : "Assign Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Delegation Dialog */}
      {showCreateDelegation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateDelegation(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowCreateDelegation(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
            </button>

            <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
              Create Delegation
            </h2>
            <p className="mb-5 text-sm text-[var(--text-muted)]">
              Delegate a role from {user.displayName} to another user
            </p>

            <div className="space-y-4">
              {/* Delegatee Search */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                  Delegatee *
                </label>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
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
                          setDelegationForm((f) => ({
                            ...f,
                            delegateeId: u.id,
                          }));
                          setDelegateeSearch(u.displayName);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-1)]"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, #1B7340 0%, #22c55e 100%)",
                          }}
                        >
                          {getInitials(u.displayName)}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {u.displayName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {u.email}
                          </p>
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
              </div>

              {/* Role Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                  Role *
                </label>
                <select
                  value={delegationForm.roleId}
                  onChange={(e) =>
                    setDelegationForm((f) => ({
                      ...f,
                      roleId: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="">Select a role...</option>
                  {allRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={delegationForm.startDate}
                    onChange={(e) =>
                      setDelegationForm((f) => ({
                        ...f,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={delegationForm.endDate}
                    onChange={(e) =>
                      setDelegationForm((f) => ({
                        ...f,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--neutral-gray)]">
                  Reason (optional)
                </label>
                <textarea
                  value={delegationForm.reason}
                  onChange={(e) =>
                    setDelegationForm((f) => ({
                      ...f,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Why is this delegation needed?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateDelegation(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDelegation}
                disabled={
                  !delegationForm.delegateeId ||
                  !delegationForm.roleId ||
                  !delegationForm.startDate ||
                  !delegationForm.endDate ||
                  createDelegation.isPending
                }
                className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
              >
                {createDelegation.isPending
                  ? "Creating..."
                  : "Create Delegation"}
              </button>
            </div>
          </div>
        </div>
      )}
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
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Role Bindings
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {roles.length} role{roles.length !== 1 ? "s" : ""} assigned
          </p>
        </div>
        <button
          type="button"
          onClick={onAssign}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Assign Role
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)]">
            <Shield size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No roles assigned
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Assign a role to grant this user permissions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Granted By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Expiry
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {roles.map((rb) => {
                const roleDetail = allRoles.find((r) => r.id === rb.roleId);
                const isExpired =
                  rb.expiresAt && new Date(rb.expiresAt) < new Date();
                return (
                  <tr
                    key={rb.id}
                    className="transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                          <Shield size={14} className="text-[var(--primary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {rb.roleName}
                          </p>
                          {roleDetail?.description && (
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                              {roleDetail.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-primary)]">
                        {rb.scopeType === "global" && <Globe size={10} />}
                        {rb.scopeType === "division" && (
                          <Building2 size={10} />
                        )}
                        {rb.scopeType === "unit" && <Layers size={10} />}
                        {rb.scopeType}
                        {rb.scopeId && (
                          <span className="text-[var(--text-muted)]">
                            ({rb.scopeId.slice(0, 8)}...)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-[var(--text-muted)]">
                      {rb.grantedBy ? rb.grantedBy.slice(0, 8) + "..." : "--"}
                    </td>
                    <td className="px-6 py-3.5">
                      {rb.expiresAt ? (
                        <span
                          className={`text-sm ${isExpired ? "text-[var(--error)]" : "text-[var(--text-muted)]"}`}
                        >
                          <Calendar
                            size={12}
                            className="mr-1 inline"
                          />
                          {formatDate(rb.expiresAt)}
                          {isExpired && " (expired)"}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">
                          No expiry
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onRevoke(rb.id, rb.roleName)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/5"
                      >
                        <Trash2 size={12} />
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Delegations
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {delegations.length} delegation
            {delegations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Create Delegation
        </button>
      </div>

      {delegations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)]">
            <Users size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No delegations
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Create a delegation to temporarily transfer permissions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Delegator / Delegatee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {delegations.map((d) => (
                  <tr
                    key={d.id}
                    className="transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <td className="px-6 py-3.5">
                      <div className="space-y-0.5">
                        <p className="text-sm text-[var(--text-primary)]">
                          <span className="text-xs text-[var(--text-muted)]">
                            From:{" "}
                          </span>
                          {d.delegatorName || d.delegatorId.slice(0, 8) + "..."}
                        </p>
                        <p className="text-sm text-[var(--text-primary)]">
                          <span className="text-xs text-[var(--text-muted)]">
                            To:{" "}
                          </span>
                          {d.delegateName || d.delegateId.slice(0, 8) + "..."}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {d.roleName || d.roleId.slice(0, 8) + "..."}
                      </span>
                      {d.reason && (
                        <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-1">
                          {d.reason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="space-y-0.5 text-sm text-[var(--text-muted)]">
                        <p>{formatDate(d.startsAt)}</p>
                        <p>{formatDate(d.endsAt)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={d.isActive ? "active" : "expired"} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {d.isActive && (
                        <button
                          type="button"
                          onClick={() =>
                            onRevoke(d.id, d.roleName || "Unknown Role")
                          }
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/5"
                        >
                          <Trash2 size={12} />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Activity Timeline
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          {timeline.length} event{timeline.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      {timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)]">
            <Clock size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No activity recorded
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            User actions will appear here as they occur.
          </p>
        </div>
      ) : (
        <div className="px-6 py-4">
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute bottom-4 left-[7px] top-4 w-px bg-[var(--border)]" />

            {timeline.map((event, idx) => {
              const changesStr = event.changes
                ? Object.keys(event.changes).join(", ")
                : null;

              return (
                <div key={event.id} className="relative flex gap-4 py-3">
                  {/* Dot */}
                  <div className="relative z-10 mt-1.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center">
                    <div
                      className={`h-[9px] w-[9px] rounded-full ${
                        idx === 0
                          ? "bg-[var(--primary)] ring-2 ring-[var(--primary)]/20"
                          : "bg-[var(--neutral-gray)]"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium capitalize text-[var(--text-primary)]">
                          {event.action.replace(/_/g, " ")}
                        </p>
                        {event.actorEmail && (
                          <p className="text-xs text-[var(--text-muted)]">
                            by {event.actorEmail}
                          </p>
                        )}
                        {changesStr && (
                          <p className="mt-0.5 text-xs text-[var(--neutral-gray)]">
                            Changed: {changesStr}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">
                        {timeAgo(event.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Active Sessions
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)]">
            <Monitor size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No active sessions
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            This user has no active sessions at the moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)]">
                    <Monitor
                      size={18}
                      className="text-[var(--neutral-gray)]"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {(session.deviceInfo?.browser as string) ?? "Unknown Browser"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {(session.deviceInfo?.os as string) ?? "Unknown OS"}
                      {session.deviceInfo?.device
                        ? ` - ${String(session.deviceInfo.device)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRevoke(session.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/5"
                >
                  <LogOut size={12} />
                  Force Logout
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    IP Address
                  </p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-[var(--text-primary)]">
                    {session.ipAddress || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Last Active
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--text-primary)]">
                    {timeAgo(session.lastActive)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Created</p>
                  <p className="mt-0.5 text-sm text-[var(--text-primary)]">
                    {formatDateTime(session.createdAt)}
                  </p>
                </div>
                {session.location && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Location
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--text-primary)]">
                      {session.location}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
