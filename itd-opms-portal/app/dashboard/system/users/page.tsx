"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  X,
  UserCheck,
  UserX,
  Clock,
  Shield,
  SlidersHorizontal,
  UserPlus,
  ChevronDown,
  Activity,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useUsers,
  useDeactivateUser,
  useRoles,
  useCreateUser,
} from "@/hooks/use-system";
import type { UserDetail } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  global_admin: { bg: "rgba(239, 68, 68, 0.10)", text: "#DC2626", glow: "rgba(239, 68, 68, 0.20)" },
  tenant_admin: { bg: "rgba(217, 70, 239, 0.10)", text: "#9333EA", glow: "rgba(217, 70, 239, 0.20)" },
  itd_director: { bg: "rgba(59, 130, 246, 0.10)", text: "#2563EB", glow: "rgba(59, 130, 246, 0.20)" },
  director: { bg: "rgba(59, 130, 246, 0.10)", text: "#2563EB", glow: "rgba(59, 130, 246, 0.20)" },
  head_of_division: { bg: "rgba(6, 182, 212, 0.10)", text: "#0891B2", glow: "rgba(6, 182, 212, 0.20)" },
  head_of_office: { bg: "rgba(20, 184, 166, 0.10)", text: "#0D9488", glow: "rgba(20, 184, 166, 0.20)" },
  manager: { bg: "rgba(16, 185, 129, 0.10)", text: "#059669", glow: "rgba(16, 185, 129, 0.20)" },
  team_lead: { bg: "rgba(245, 158, 11, 0.10)", text: "#D97706", glow: "rgba(245, 158, 11, 0.20)" },
  staff: { bg: "rgba(99, 102, 241, 0.10)", text: "#4F46E5", glow: "rgba(99, 102, 241, 0.20)" },
  analyst: { bg: "rgba(99, 102, 241, 0.10)", text: "#4F46E5", glow: "rgba(99, 102, 241, 0.20)" },
  viewer: { bg: "rgba(107, 114, 128, 0.10)", text: "#6B7280", glow: "rgba(107, 114, 128, 0.20)" },
};

function getRoleBadgeColor(role: string): { bg: string; text: string; glow: string } {
  return (
    ROLE_BADGE_COLORS[role.toLowerCase()] ?? {
      bg: "rgba(107, 114, 128, 0.08)",
      text: "var(--neutral-gray)",
      glow: "rgba(107, 114, 128, 0.15)",
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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

function getUserStatus(user: UserDetail): string {
  return user.isActive ? "active" : "inactive";
}

function getUserRoleNames(user: UserDetail): string[] {
  if (!user.roles || user.roles.length === 0) return [];
  return user.roles.map((r) => r.roleName);
}

function getInitialGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg, #10B981, #059669)",
    "linear-gradient(135deg, #3B82F6, #2563EB)",
    "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    "linear-gradient(135deg, #F59E0B, #D97706)",
    "linear-gradient(135deg, #EC4899, #DB2777)",
    "linear-gradient(135deg, #06B6D4, #0891B2)",
    "linear-gradient(135deg, #14B8A6, #0D9488)",
    "linear-gradient(135deg, #F97316, #EA580C)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  delay,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary)]/20"
    >
      {/* Decorative gradient blob */}
      <div
        className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.12]"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--neutral-gray)]">{subtitle}</p>
          )}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}14` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Filter Chip                                                 */
/* ------------------------------------------------------------------ */

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-1 text-xs font-medium text-[var(--primary)]"
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/10"
      >
        <X size={10} />
      </button>
    </motion.span>
  );
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
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Deactivate dialog
  const [deactivateTarget, setDeactivateTarget] = useState<UserDetail | null>(null);

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
  const { data, isLoading } = useUsers(page, pageSize, {
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

  /* ---- Stats derived from meta ---- */
  const totalUsers = meta?.totalItems ?? 0;
  const activeCount = useMemo(
    () => users.filter((u) => u.isActive).length,
    [users],
  );
  const inactiveCount = useMemo(
    () => users.filter((u) => !u.isActive).length,
    [users],
  );
  const recentLoginCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    return users.filter((u) => u.lastLoginAt && new Date(u.lastLoginAt).getTime() > cutoff).length;
  }, [users]);

  /* ---- Derive role filter options from roles query ---- */
  const roleOptions = useMemo(() => {
    if (!rolesData) return [];
    const roles = Array.isArray(rolesData) ? rolesData : [];
    return roles.map((r) => ({
      value: r.name,
      label: r.name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    }));
  }, [rolesData]);

  /* ---- Active filter count ---- */
  const activeFilterCount = [roleFilter, statusFilter, departmentFilter].filter(Boolean).length;

  /* ---- Page size change ---- */
  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    [],
  );

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

  /* ---- Clear all filters ---- */
  function clearAllFilters() {
    setRoleFilter("");
    setStatusFilter("");
    setDepartmentFilter("");
    setSearchInput("");
    setPage(1);
  }

  /* ---- Columns ---- */
  const columns: Column<UserDetail>[] = [
    {
      key: "displayName",
      header: "User",
      sortable: true,
      className: "min-w-[280px]",
      render: (item) => {
        const initials = item.displayName
          ? item.displayName
              .split(" ")
              .map((n) => n.charAt(0))
              .slice(0, 2)
              .join("")
              .toUpperCase()
          : "?";
        return (
          <div className="flex items-center gap-3">
            {item.photoUrl ? (
              <img
                src={item.photoUrl}
                alt={item.displayName}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--surface-2)]"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                style={{ background: getInitialGradient(item.displayName || item.email) }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
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
      render: (item) =>
        item.department ? (
          <span className="inline-flex items-center rounded-lg bg-[var(--surface-1)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {item.department}
          </span>
        ) : (
          <span className="text-xs text-[var(--neutral-gray)]">&mdash;</span>
        ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (item) => {
        const roleNames = getUserRoleNames(item);
        if (roleNames.length === 0) {
          return (
            <span className="text-xs italic text-[var(--neutral-gray)]">
              No roles assigned
            </span>
          );
        }
        const visible = roleNames.slice(0, 2);
        const remaining = roleNames.length - 2;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {visible.map((role) => {
              const color = getRoleBadgeColor(role);
              return (
                <span
                  key={role}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize transition-shadow hover:shadow-sm"
                  style={{
                    backgroundColor: color.bg,
                    color: color.text,
                    boxShadow: `0 0 0 0px ${color.glow}`,
                  }}
                >
                  {role.replace(/_/g, " ")}
                </span>
              );
            })}
            {remaining > 0 && (
              <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--neutral-gray)]">
                +{remaining}
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
      header: "Last Active",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5">
          {item.lastLoginAt ? (
            <>
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    Date.now() - new Date(item.lastLoginAt).getTime() < 24 * 60 * 60 * 1000
                      ? "#10B981"
                      : Date.now() - new Date(item.lastLoginAt).getTime() < 7 * 24 * 60 * 60 * 1000
                        ? "#F59E0B"
                        : "#9CA3AF",
                }}
              />
              <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
                {formatRelativeTime(item.lastLoginAt)}
              </span>
            </>
          ) : (
            <span className="text-xs italic text-[var(--neutral-gray)]">Never</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "center",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/system/users/${item.id}`);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-sm transition-all hover:shadow-md hover:border-[var(--primary)]/30 hover:text-[var(--primary)]"
        >
          <Eye size={13} />
          View
        </button>
      ),
    },
  ];

  /* ---- Render ---- */

  return (
    <PermissionGate permission="system.manage">
      <div className="space-y-6">
        {/* ─── Page Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
              style={{
                background: "linear-gradient(135deg, rgba(27,115,64,0.15), rgba(27,115,64,0.05))",
                border: "1px solid rgba(27,115,64,0.1)",
              }}
            >
              <Users size={22} style={{ color: "#1B7340" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                User Management
              </h1>
              <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                Manage users, roles, permissions and access control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:opacity-90 active:scale-[0.98]"
            >
              <UserPlus size={16} />
              Add User
            </button>
          </div>
        </motion.div>

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={totalUsers}
            subtitle={meta ? `Across ${departments.length || 1} department${departments.length !== 1 ? "s" : ""}` : undefined}
            color="#3B82F6"
            delay={0.05}
          />
          <StatCard
            icon={UserCheck}
            label="Active"
            value={activeCount}
            subtitle={totalUsers > 0 ? `${Math.round((activeCount / Math.max(users.length, 1)) * 100)}% of current page` : undefined}
            color="#10B981"
            delay={0.1}
          />
          <StatCard
            icon={UserX}
            label="Inactive"
            value={inactiveCount}
            subtitle={inactiveCount > 0 ? "Require attention" : "None at the moment"}
            color="#EF4444"
            delay={0.15}
          />
          <StatCard
            icon={Activity}
            label="Active This Week"
            value={recentLoginCount}
            subtitle="Logged in within 7 days"
            color="#8B5CF6"
            delay={0.2}
          />
        </div>

        {/* ─── Search & Filter Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, or department..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] shadow-sm transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:shadow-md"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${
                showFilters || activeFilterCount > 0
                  ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 shadow-sm">
                  <div className="flex flex-wrap gap-4">
                    {/* Role filter */}
                    <div className="min-w-[180px]">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Role
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(e) => {
                          setRoleFilter(e.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
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
                    <div className="min-w-[160px]">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Department filter */}
                    <div className="min-w-[180px]">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Department
                      </label>
                      <select
                        value={departmentFilter}
                        onChange={(e) => {
                          setDepartmentFilter(e.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
                      >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Active filter chips + clear all */}
                  {activeFilterCount > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]">
                      <AnimatePresence>
                        {roleFilter && (
                          <FilterChip
                            label={`Role: ${roleFilter.replace(/_/g, " ")}`}
                            onClear={() => { setRoleFilter(""); setPage(1); }}
                          />
                        )}
                        {statusFilter && (
                          <FilterChip
                            label={`Status: ${statusFilter}`}
                            onClear={() => { setStatusFilter(""); setPage(1); }}
                          />
                        )}
                        {departmentFilter && (
                          <FilterChip
                            label={`Dept: ${departmentFilter}`}
                            onClear={() => { setDepartmentFilter(""); setPage(1); }}
                          />
                        )}
                      </AnimatePresence>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="ml-auto text-xs font-medium text-[var(--error)] hover:underline transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ─── Data Table ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <DataTable
            columns={columns}
            data={users}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyTitle="No users found"
            emptyDescription={
              activeFilterCount > 0 || debouncedSearch
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Get started by adding your first user."
            }
            emptyAction={
              activeFilterCount > 0 || debouncedSearch ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  <X size={14} />
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} />
                  Add User
                </button>
              )
            }
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
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                    onPageSizeChange: handlePageSizeChange,
                  }
                : undefined
            }
          />
        </motion.div>

        {/* ─── Deactivate Confirmation ─── */}
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

        {/* ─── Create User Modal ─── */}
        <AnimatePresence>
          {showCreateDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowCreateDialog(false)}
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "rgba(27,115,64,0.1)" }}
                  >
                    <UserPlus size={18} style={{ color: "#1B7340" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      Add New User
                    </h2>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      Create a new user account with basic information
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateDialog(false)}
                    className="ml-auto rounded-xl p-2 hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <X size={18} className="text-[var(--neutral-gray)]" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1.5">
                      Email <span className="text-[var(--error)]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="user@cbn.gov.ng"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1.5">
                      Display Name <span className="text-[var(--error)]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.displayName}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          displayName: e.target.value,
                        }))
                      }
                      placeholder="Full Name"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1.5">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={createForm.jobTitle}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            jobTitle: e.target.value,
                          }))
                        }
                        placeholder="e.g. Staff"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1.5">
                        Department
                      </label>
                      <input
                        type="text"
                        value={createForm.department}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            department: e.target.value,
                          }))
                        }
                        placeholder="e.g. AMD"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1.5">
                        Office
                      </label>
                      <input
                        type="text"
                        value={createForm.office}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            office: e.target.value,
                          }))
                        }
                        placeholder="e.g. BISO"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-1.5">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={createForm.phone}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="+234..."
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setShowCreateDialog(false)}
                      className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        createMutation.isPending ||
                        !createForm.email ||
                        !createForm.displayName
                      }
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {createMutation.isPending ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} />
                          Create User
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PermissionGate>
  );
}
