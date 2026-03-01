"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  X,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import { useUsers, useDeactivateUser, useRoles, useCreateUser } from "@/hooks/use-system";
import type { UserDetail } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  global_admin: { bg: "rgba(239, 68, 68, 0.12)", text: "#DC2626" },
  tenant_admin: { bg: "rgba(217, 70, 239, 0.12)", text: "#9333EA" },
  director: { bg: "rgba(59, 130, 246, 0.12)", text: "#2563EB" },
  manager: { bg: "rgba(16, 185, 129, 0.12)", text: "#059669" },
  team_lead: { bg: "rgba(245, 158, 11, 0.12)", text: "#D97706" },
  analyst: { bg: "rgba(99, 102, 241, 0.12)", text: "#4F46E5" },
  viewer: { bg: "rgba(107, 114, 128, 0.12)", text: "#6B7280" },
};

function getRoleBadgeColor(role: string): { bg: string; text: string } {
  return (
    ROLE_BADGE_COLORS[role.toLowerCase()] ?? {
      bg: "rgba(107, 114, 128, 0.1)",
      text: "var(--neutral-gray)",
    }
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUserStatus(user: UserDetail): string {
  return user.isActive ? "active" : "inactive";
}

function getUserRoleNames(user: UserDetail): string[] {
  if (!user.roles || user.roles.length === 0) return [];
  return user.roles.map((r) => r.roleName);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  const router = useRouter();

  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Users", href: "/dashboard/system/users" },
  ]);

  /* ---- State ---- */
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Deactivate dialog
  const [deactivateTarget, setDeactivateTarget] = useState<UserDetail | null>(
    null,
  );

  // Create user dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    displayName: "",
    jobTitle: "",
    department: "",
    office: "",
    phone: "",
  });

  /* ---- Debounce search input (300ms) ---- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ---- Data fetching ---- */
  const { data, isLoading } = useUsers(page, 20, {
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    department: departmentFilter || undefined,
  });
  const { data: rolesData } = useRoles();
  const deactivateMutation = useDeactivateUser();
  const createMutation = useCreateUser();

  const users = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Derive unique departments from current result set ---- */
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    users.forEach((u) => {
      if (u.department) deptSet.add(u.department);
    });
    return Array.from(deptSet).sort();
  }, [users]);

  /* ---- Derive role filter options from roles query ---- */
  const roleOptions = useMemo(() => {
    if (!rolesData) return [];
    const roles = Array.isArray(rolesData) ? rolesData : [];
    return roles.map((r) => ({
      value: r.name,
      label: r.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [rolesData]);

  /* ---- Deactivate handler ---- */
  function handleDeactivateConfirm() {
    if (!deactivateTarget) return;
    deactivateMutation.mutate(deactivateTarget.id, {
      onSettled: () => setDeactivateTarget(null),
    });
  }

  /* ---- Create user handler ---- */
  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.email || !createForm.displayName) return;
    createMutation.mutate(
      {
        email: createForm.email,
        displayName: createForm.displayName,
        jobTitle: createForm.jobTitle || undefined,
        department: createForm.department || undefined,
        office: createForm.office || undefined,
        phone: createForm.phone || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setCreateForm({ email: "", displayName: "", jobTitle: "", department: "", office: "", phone: "" });
        },
      },
    );
  }

  /* ---- Columns ---- */

  const columns: Column<UserDetail>[] = [
    {
      key: "displayName",
      header: "User",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => {
        const initials = item.displayName
          ? item.displayName.charAt(0).toUpperCase()
          : "?";
        return (
          <div className="flex items-center gap-3">
            {item.photoUrl ? (
              <img
                src={item.photoUrl}
                alt={item.displayName}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #10B981, #059669)",
                }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {item.displayName}
              </p>
              <p className="text-xs text-[var(--neutral-gray)] truncate">
                {item.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)]">
          {item.department || "\u2014"}
        </span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (item) => {
        const roleNames = getUserRoleNames(item);
        if (roleNames.length === 0) {
          return (
            <span className="text-xs text-[var(--neutral-gray)]">No roles</span>
          );
        }
        const visible = roleNames.slice(0, 2);
        const remaining = roleNames.length - 2;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((role) => {
              const color = getRoleBadgeColor(role);
              return (
                <span
                  key={role}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                  style={{
                    backgroundColor: color.bg,
                    color: color.text,
                  }}
                >
                  {role.replace(/_/g, " ")}
                </span>
              );
            })}
            {remaining > 0 && (
              <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--neutral-gray)]">
                +{remaining} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={getUserStatus(item)} />,
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      sortable: true,
      render: (item) => (
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
          {item.lastLoginAt ? formatDate(item.lastLoginAt) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/system/users/${item.id}`);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <Eye size={12} />
          View
        </button>
      ),
    },
  ];

  /* ---- Render ---- */

  return (
    <PermissionGate permission="system.manage">
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <Users size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              User Management
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              {meta
                ? `${meta.totalItems} user${meta.totalItems !== 1 ? "s" : ""} total`
                : "Manage users, roles, and access"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-3"
      >
        {/* Search Input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            {/* Role filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">All Roles</option>
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
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
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Department filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No users found"
          emptyDescription="Adjust your filters or add a new user to get started."
          onRowClick={(item) =>
            router.push(`/dashboard/system/users/${item.id}`)
          }
          pagination={
            meta
              ? {
                  currentPage: meta.page,
                  totalPages: meta.totalPages,
                  totalItems: meta.totalItems,
                  pageSize: meta.pageSize,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </motion.div>

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivateConfirm}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deactivateTarget?.displayName ?? "this user"}? They will lose access to the platform until reactivated.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deactivateMutation.isPending}
      />
      {/* Create User Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add New User</h2>
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="rounded-lg p-1 hover:bg-[var(--surface-1)] transition-colors"
              >
                <X size={18} className="text-[var(--neutral-gray)]" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@cbn.gov.ng"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Full Name"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1">Job Title</label>
                  <input
                    type="text"
                    value={createForm.jobTitle}
                    onChange={(e) => setCreateForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    placeholder="e.g. Staff"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1">Department</label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. AMD"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1">Office</label>
                  <input
                    type="text"
                    value={createForm.office}
                    onChange={(e) => setCreateForm((f) => ({ ...f, office: e.target.value }))}
                    placeholder="e.g. BISO"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1">Phone</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+234..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !createForm.email || !createForm.displayName}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
