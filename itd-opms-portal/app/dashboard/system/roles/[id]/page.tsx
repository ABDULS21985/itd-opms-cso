"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Lock,
  Save,
  Trash2,
  Users,
  Calendar,
  KeyRound,
  Check,
  Pencil,
  Loader2,
} from "lucide-react";
import {
  useRole,
  useUpdateRole,
  useDeleteRole,
  usePermissionCatalog,
} from "@/hooks/use-system";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { PermissionCatalog } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Convert a raw permission string like "governance.policies.create" into a readable label. */
function formatPermissionLabel(perm: string): string {
  const parts = perm.split(".");
  // Drop the module prefix (first part), keep the rest and capitalize
  const actionParts = parts.slice(1);
  return actionParts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" - ");
}

/** Capitalize a module name, e.g. "governance" -> "Governance", "itsm" -> "ITSM". */
function formatModuleName(module: string): string {
  const upperAcronyms = ["itsm", "cmdb", "grc", "hr", "kb"];
  if (upperAcronyms.includes(module.toLowerCase())) {
    return module.toUpperCase();
  }
  return module.charAt(0).toUpperCase() + module.slice(1);
}

/* ------------------------------------------------------------------ */
/*  Permission Checkbox                                                */
/* ------------------------------------------------------------------ */

function PermissionToggle({
  checked,
  disabled,
  label,
  permKey,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  permKey: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:bg-[var(--surface-1)]"
      }`}
      title={permKey}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200 ${
            checked
              ? "border-[var(--primary)] bg-[var(--primary)]"
              : "border-[var(--border)] bg-[var(--surface-0)]"
          }`}
        >
          {checked && (
            <Check size={12} className="text-white" strokeWidth={3} />
          )}
        </div>
      </div>
      <div className="min-w-0">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </span>
        <p className="text-xs text-[var(--neutral-gray)] mt-0.5 font-mono leading-relaxed">
          {permKey}
        </p>
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Permission Module Group                                            */
/* ------------------------------------------------------------------ */

function PermissionModuleGroup({
  group,
  selectedPermissions,
  disabled,
  onToggle,
}: {
  group: PermissionCatalog;
  selectedPermissions: Set<string>;
  disabled: boolean;
  onToggle: (key: string, checked: boolean) => void;
}) {
  const selectedInModule = group.permissions.filter((p) =>
    selectedPermissions.has(p),
  ).length;
  const allSelected =
    group.permissions.length > 0 &&
    selectedInModule === group.permissions.length;

  function handleToggleAll() {
    if (disabled) return;
    const shouldSelect = !allSelected;
    for (const perm of group.permissions) {
      onToggle(perm, shouldSelect);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
      {/* Module Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
          >
            <KeyRound size={14} style={{ color: "#6366F1" }} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {formatModuleName(group.module)}
          </h3>
          <span className="text-xs text-[var(--neutral-gray)]">
            {selectedInModule}/{group.permissions.length}
          </span>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-xs font-medium text-[var(--primary)] transition-colors hover:text-[var(--secondary)]"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-3">
        {group.permissions.map((perm) => (
          <PermissionToggle
            key={perm}
            checked={selectedPermissions.has(perm)}
            disabled={disabled}
            label={formatPermissionLabel(perm)}
            permKey={perm}
            onChange={(checked) => onToggle(perm, checked)}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: role, isLoading } = useRole(id);
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog();
  const updateRoleMutation = useUpdateRole(id);
  const deleteRoleMutation = useDeleteRole();

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  // Initialize permissions from role data
  useEffect(() => {
    if (role) {
      setSelectedPermissions(new Set(role.permissions));
      setDescriptionDraft(role.description || "");
      setHasChanges(false);
    }
  }, [role]);

  const handleTogglePermission = useCallback(
    (key: string, checked: boolean) => {
      setSelectedPermissions((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
      setHasChanges(true);
    },
    [],
  );

  function handleSave() {
    if (!role) return;
    const body: { permissions?: string[]; description?: string } = {
      permissions: Array.from(selectedPermissions),
    };
    // Include description if it was edited
    if (descriptionDraft !== (role.description || "")) {
      body.description = descriptionDraft;
    }
    updateRoleMutation.mutate(body, {
      onSuccess: () => {
        setHasChanges(false);
        setEditingDescription(false);
      },
    });
  }

  function handleSaveDescription() {
    if (!role) return;
    updateRoleMutation.mutate(
      { description: descriptionDraft },
      {
        onSuccess: () => {
          setEditingDescription(false);
        },
      },
    );
  }

  function handleDelete() {
    if (!role) return;
    deleteRoleMutation.mutate(role.id, {
      onSuccess: () => {
        router.push("/dashboard/system/roles");
      },
    });
  }

  /* Loading state */
  if (isLoading || catalogLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={24}
            className="animate-spin text-[var(--primary)]"
          />
          <p className="text-sm text-[var(--neutral-gray)]">Loading role...</p>
        </div>
      </div>
    );
  }

  /* Not found */
  if (!role) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-secondary)]">Role not found.</p>
        <Link
          href="/dashboard/system/roles"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} /> Back to Roles
        </Link>
      </div>
    );
  }

  const isSystem = role.isSystem;

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/dashboard/system/roles"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Roles
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: isSystem
                ? "rgba(99, 102, 241, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
            }}
          >
            <Shield
              size={20}
              style={{ color: isSystem ? "#6366F1" : "#10B981" }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {role.name}
              </h1>
              {isSystem ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-1)] px-2.5 py-0.5 text-xs font-medium text-[var(--neutral-gray)]">
                  <Lock size={10} />
                  System Role
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[rgba(16,185,129,0.1)] px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
                  Custom
                </span>
              )}
            </div>

            {/* Inline editable description */}
            {!isSystem && editingDescription ? (
              <div className="flex items-start gap-2 mt-1">
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={2}
                  className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                  placeholder="Add a description..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveDescription}
                  disabled={updateRoleMutation.isPending}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDescription(false);
                    setDescriptionDraft(role.description || "");
                  }}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group/desc">
                <p className="text-sm text-[var(--text-secondary)]">
                  {role.description || "No description provided."}
                </p>
                {!isSystem && (
                  <button
                    type="button"
                    onClick={() => setEditingDescription(true)}
                    className="rounded p-1 text-[var(--neutral-gray)] opacity-0 transition-opacity group-hover/desc:opacity-100 hover:text-[var(--primary)]"
                    aria-label="Edit description"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSystem && (
            <>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[rgba(239,68,68,0.05)]"
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || updateRoleMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {updateRoleMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Role Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Type</p>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {isSystem ? "System Role" : "Custom Role"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={12} className="text-[var(--text-secondary)]" />
                <p className="text-xs text-[var(--text-secondary)]">Users</p>
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {role.userCount}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <KeyRound size={12} className="text-[var(--text-secondary)]" />
                <p className="text-xs text-[var(--text-secondary)]">
                  Permissions
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {selectedPermissions.size}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={12} className="text-[var(--text-secondary)]" />
                <p className="text-xs text-[var(--text-secondary)]">Created</p>
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {formatDate(role.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Permissions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Permissions by Module
          </h2>
          {isSystem && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--neutral-gray)]">
              <Lock size={10} />
              Read-only (system role)
            </span>
          )}
        </div>

        {catalog && catalog.length > 0 ? (
          <div className="space-y-4">
            {catalog.map((group: PermissionCatalog) => (
              <PermissionModuleGroup
                key={group.module}
                group={group}
                selectedPermissions={selectedPermissions}
                disabled={isSystem}
                onToggle={handleTogglePermission}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-8 text-center">
            <p className="text-sm text-[var(--neutral-gray)]">
              No permission catalog available.
            </p>
          </div>
        )}
      </motion.div>

      {/* Sticky save bar when changes exist */}
      {!isSystem && hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="sticky bottom-4 z-20"
        >
          <div className="flex items-center justify-between rounded-xl border border-[var(--primary)]/30 bg-[var(--surface-0)] p-4 shadow-lg">
            <p className="text-sm text-[var(--text-secondary)]">
              You have unsaved permission changes.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (role) {
                    setSelectedPermissions(new Set(role.permissions));
                    setHasChanges(false);
                  }
                }}
                className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateRoleMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users with this role */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <Users size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Users with this Role
            </h2>
            <span className="inline-flex items-center rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
              {role.userCount}
            </span>
          </div>
          <p className="text-sm text-[var(--neutral-gray)] leading-relaxed">
            Users assigned to this role can be managed in{" "}
            <Link
              href="/dashboard/system/users"
              className="font-medium text-[var(--primary)] hover:underline"
            >
              User Management
            </Link>
            .
          </p>
        </div>
      </motion.div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${role.name}"? This action cannot be undone. Users assigned to this role will lose the associated permissions.`}
        confirmLabel="Delete Role"
        variant="danger"
        loading={deleteRoleMutation.isPending}
      />
    </div>
  );
}
