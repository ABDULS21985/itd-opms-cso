"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Lock,
  Trash2,
  Users,
  KeyRound,
  X,
} from "lucide-react";
import { useRoles, useCreateRole, useDeleteRole } from "@/hooks/use-system";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { RoleDetail } from "@/types";

/* ------------------------------------------------------------------ */
/*  Create Role Dialog                                                  */
/* ------------------------------------------------------------------ */

function CreateRoleDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() });
  }

  function handleClose() {
    if (loading) return;
    setName("");
    setDescription("");
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <Shield className="h-6 w-6 text-[var(--primary)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Create New Role
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Define a custom role with specific permissions.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="role-name"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Role Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Manager"
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="role-description"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Description
            </label>
            <textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's purpose..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
            >
              {loading ? (
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
                  Creating...
                </span>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Role
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Role Card                                                           */
/* ------------------------------------------------------------------ */

function RoleCard({
  role,
  onDelete,
  onClick,
}: {
  role: RoleDetail;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="group relative cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition-all duration-200 hover:shadow-md hover:border-[var(--primary)]/30"
      onClick={() => onClick(role.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: role.isSystem
                ? "rgba(99, 102, 241, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
            }}
          >
            <Shield
              size={20}
              style={{
                color: role.isSystem ? "#6366F1" : "#10B981",
              }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {role.name}
            </h3>
          </div>
        </div>

        {/* System / Custom badge */}
        {role.isSystem ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--neutral-gray)]">
            <Lock size={10} />
            System Role
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[rgba(16,185,129,0.1)] px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
            Custom
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--neutral-gray)] line-clamp-2 mb-4 min-h-[2.5rem]">
        {role.description || "No description provided."}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 border-t border-[var(--border)] pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <Users size={13} className="text-[var(--neutral-gray)]" />
          {role.userCount} {role.userCount === 1 ? "user" : "users"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <KeyRound size={13} className="text-[var(--neutral-gray)]" />
          {role.permissions.length}{" "}
          {role.permissions.length === 1 ? "permission" : "permissions"}
        </span>
      </div>

      {/* Delete button -- custom roles only */}
      {!role.isSystem && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(role.id);
          }}
          className="absolute right-3 bottom-3 rounded-lg p-1.5 text-[var(--neutral-gray)] opacity-0 transition-all duration-200 hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)] group-hover:opacity-100"
          aria-label={`Delete role ${role.name}`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RolesPage() {
  const router = useRouter();
  const { data: roles, isLoading } = useRoles();
  const createRoleMutation = useCreateRole();
  const deleteRoleMutation = useDeleteRole();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const roleToDelete = roles?.find((r: RoleDetail) => r.id === deleteTarget);

  function handleCreateSubmit(data: { name: string; description: string }) {
    createRoleMutation.mutate(
      {
        name: data.name,
        description: data.description || "",
        permissions: [],
      },
      {
        onSuccess: () => {
          setShowCreate(false);
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteRoleMutation.mutate(deleteTarget, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
          >
            <Shield size={20} style={{ color: "#6366F1" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Roles & Permissions
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage system and custom roles with their associated permissions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Create Role
        </button>
      </motion.div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded-md bg-[var(--surface-2)]" />
                </div>
                <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--surface-2)]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded-md bg-[var(--surface-2)]" />
                <div className="h-3 w-2/3 animate-pulse rounded-md bg-[var(--surface-2)]" />
              </div>
              <div className="border-t border-[var(--border)] pt-3 flex gap-4">
                <div className="h-3 w-16 animate-pulse rounded-md bg-[var(--surface-2)]" />
                <div className="h-3 w-24 animate-pulse rounded-md bg-[var(--surface-2)]" />
              </div>
            </div>
          ))}
        </div>
      ) : roles && roles.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {roles.map((role: RoleDetail) => (
              <RoleCard
                key={role.id}
                role={role}
                onDelete={(id) => setDeleteTarget(id)}
                onClick={(id) => router.push(`/dashboard/system/roles/${id}`)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-16"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--surface-2)] mb-4">
            <Shield size={24} className="text-[var(--neutral-gray)]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            No roles found
          </h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-4">
            Create your first custom role to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Create Role
          </button>
        </motion.div>
      )}

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateSubmit}
        loading={createRoleMutation.isPending}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${roleToDelete?.name ?? ""}"? This action cannot be undone. Users assigned to this role will lose the associated permissions.`}
        confirmLabel="Delete Role"
        variant="danger"
        loading={deleteRoleMutation.isPending}
      />
    </div>
  );
}
