"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  DollarSign,
  Tag,
  Shield,
  Clock,
  Loader2,
  Trash2,
  History,
  AlertTriangle,
  Edit3,
  ArrowRight,
  UserCheck,
  UserX,
  Activity,
  ChevronRight,
} from "lucide-react";
import {
  useAsset,
  useAssetLifecycleEvents,
  useUpdateAsset,
  useDeleteAsset,
  useAssetTransition,
} from "@/hooks/use-cmdb";
import { useSearchUsers } from "@/hooks/use-system";
import { UserPicker } from "@/components/shared/pickers/user-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  maintenance: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  retired: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  disposed: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  procured: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  received: { bg: "rgba(20, 184, 166, 0.1)", text: "#14B8A6" },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  hardware: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  software: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  virtual: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  cloud: { bg: "rgba(14, 165, 233, 0.1)", text: "#0EA5E9" },
  network: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  peripheral: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

const EVENT_ICONS: Record<string, { icon: typeof Clock; color: string }> = {
  procured: { icon: DollarSign, color: "#3B82F6" },
  received: { icon: Package, color: "#14B8A6" },
  deployed: { icon: MapPin, color: "#10B981" },
  maintenance: { icon: AlertTriangle, color: "#F59E0B" },
  transferred: { icon: User, color: "#8B5CF6" },
  retired: { icon: Shield, color: "#6B7280" },
  disposed: { icon: Trash2, color: "#EF4444" },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  procured: ["received"],
  received: ["active"],
  active: ["maintenance", "retired"],
  maintenance: ["active", "retired"],
  retired: ["disposed"],
  disposed: [],
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  /* ---- Data hooks ---- */
  const { data: asset, isLoading } = useAsset(id);
  const { data: lifecycleEvents } = useAssetLifecycleEvents(id);
  const updateAsset = useUpdateAsset(id);
  const deleteAsset = useDeleteAsset();
  const transitionAsset = useAssetTransition(id);

  /* ---- User resolution ---- */
  const { data: allUsers } = useSearchUsers("");
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    (allUsers ?? []).forEach((u) => map.set(u.id, u.displayName));
    return map;
  }, [allUsers]);

  /* ---- Local state ---- */
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [editingCustodian, setEditingCustodian] = useState(false);
  const [pickerOwnerId, setPickerOwnerId] = useState<string | undefined>(undefined);
  const [pickerOwnerName, setPickerOwnerName] = useState("");
  const [pickerCustodianId, setPickerCustodianId] = useState<string | undefined>(undefined);
  const [pickerCustodianName, setPickerCustodianName] = useState("");

  const events = lifecycleEvents ?? [];

  /* ---- Handlers ---- */
  const handleDelete = useCallback(() => {
    deleteAsset.mutate(id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        router.push("/dashboard/cmdb/assets");
      },
    });
  }, [deleteAsset, id, router]);

  const handleTransition = useCallback(
    (newStatus: string) => {
      transitionAsset.mutate({ status: newStatus });
    },
    [transitionAsset],
  );

  const handleOwnerChange = useCallback(
    (userId: string | undefined, displayName: string) => {
      setPickerOwnerId(userId);
      setPickerOwnerName(displayName);
    },
    [],
  );

  const handleSaveOwner = useCallback(() => {
    updateAsset.mutate(
      { ownerId: pickerOwnerId ?? (null as unknown as undefined) },
      { onSuccess: () => setEditingOwner(false) },
    );
  }, [updateAsset, pickerOwnerId]);

  const handleRemoveOwner = useCallback(() => {
    updateAsset.mutate(
      { ownerId: null as unknown as undefined },
      { onSuccess: () => setEditingOwner(false) },
    );
  }, [updateAsset]);

  const handleCustodianChange = useCallback(
    (userId: string | undefined, displayName: string) => {
      setPickerCustodianId(userId);
      setPickerCustodianName(displayName);
    },
    [],
  );

  const handleSaveCustodian = useCallback(() => {
    updateAsset.mutate(
      { custodianId: pickerCustodianId ?? (null as unknown as undefined) },
      { onSuccess: () => setEditingCustodian(false) },
    );
  }, [updateAsset, pickerCustodianId]);

  const handleRemoveCustodian = useCallback(() => {
    updateAsset.mutate(
      { custodianId: null as unknown as undefined },
      { onSuccess: () => setEditingCustodian(false) },
    );
  }, [updateAsset]);

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--text-secondary)]">Asset not found.</p>
      </div>
    );
  }

  /* ---- Helpers ---- */

  const statusColor = STATUS_COLORS[asset.status] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
  };
  const typeColor = TYPE_COLORS[asset.type] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
  };

  const validNextStatuses = VALID_TRANSITIONS[asset.status] ?? [];

  const ownerName = asset.ownerId ? (userMap.get(asset.ownerId) ?? "Unknown") : null;
  const custodianName = asset.custodianId
    ? (userMap.get(asset.custodianId) ?? "Unknown")
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ================================================================ */}
      {/*  1. Hero Header                                                   */}
      {/* ================================================================ */}

      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/cmdb/assets")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Assets
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-[var(--text-secondary)]">
              {asset.assetTag}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
            >
              {asset.type}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
            >
              {asset.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {asset.name}
          </h1>
          {asset.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {asset.description}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Created {new Date(asset.createdAt).toLocaleString()} | Updated{" "}
            {new Date(asset.updatedAt).toLocaleString()}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/cmdb/assets/${id}/edit`)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-opacity hover:opacity-90"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/cmdb/assets/${id}/dispose`)}
            className="flex items-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition-opacity hover:opacity-90"
          >
            <AlertTriangle size={14} />
            Dispose
          </button>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/*  2. Status Transition Bar                                         */}
      {/* ================================================================ */}

      {validNextStatuses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Status Transition
            </h2>
          </div>
          <p className="mb-3 text-xs text-[var(--text-secondary)]">
            Current status:{" "}
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
            >
              {asset.status}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {validNextStatuses.map((nextStatus) => {
              const nextColor = STATUS_COLORS[nextStatus] ?? {
                bg: "var(--surface-2)",
                text: "var(--text-secondary)",
              };
              return (
                <button
                  key={nextStatus}
                  type="button"
                  disabled={transitionAsset.isPending}
                  onClick={() => handleTransition(nextStatus)}
                  className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition-all hover:shadow-sm disabled:opacity-50"
                  style={{
                    borderColor: nextColor.text,
                    color: nextColor.text,
                    backgroundColor: nextColor.bg,
                  }}
                >
                  <ChevronRight size={12} />
                  Transition to {nextStatus}
                  {transitionAsset.isPending && (
                    <Loader2 size={12} className="ml-1 animate-spin" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ================================================================ */}
      {/*  3. Dashboard Cards (4-column grid)                               */}
      {/* ================================================================ */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Status card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: statusColor.bg }}
            >
              <Activity size={16} style={{ color: statusColor.text }} />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Status</p>
          </div>
          <p
            className="text-lg font-bold capitalize"
            style={{ color: statusColor.text }}
          >
            {asset.status}
          </p>
        </div>

        {/* Owner card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
              <User size={16} className="text-[#8B5CF6]" />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Owner</p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {ownerName ?? "Unassigned"}
          </p>
        </div>

        {/* Custodian card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(14,165,233,0.1)]">
              <UserCheck size={16} className="text-[#0EA5E9]" />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Custodian</p>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {custodianName ?? "Unassigned"}
          </p>
        </div>

        {/* Purchase Cost card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.1)]">
              <DollarSign size={16} className="text-[#10B981]" />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Purchase Cost
            </p>
          </div>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {asset.purchaseCost != null
              ? `${asset.currency} ${asset.purchaseCost.toLocaleString()}`
              : "N/A"}
          </p>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/*  4. Asset Information Card                                        */}
      {/* ================================================================ */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Asset Information
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              Manufacturer
            </dt>
            <dd className="text-[var(--text-primary)]">
              {asset.manufacturer || "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Model</dt>
            <dd className="text-[var(--text-primary)]">{asset.model || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              Serial Number
            </dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {asset.serialNumber || "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Location</dt>
            <dd className="text-[var(--text-primary)]">
              {[asset.building, asset.floor, asset.room].filter(Boolean).join(", ") ||
                asset.location ||
                "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              Purchase Date
            </dt>
            <dd className="tabular-nums text-[var(--text-primary)]">
              {asset.purchaseDate
                ? new Date(asset.purchaseDate).toLocaleDateString()
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              Classification
            </dt>
            <dd className="capitalize text-[var(--text-primary)]">
              {asset.classification || "Not set"}
            </dd>
          </div>
        </dl>
      </motion.div>

      {/* ================================================================ */}
      {/*  5. Assignment Section (Owner & Custodian)                         */}
      {/* ================================================================ */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {/* Owner Assignment */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Owner</h2>
            </div>
            {!editingOwner && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPickerOwnerId(asset.ownerId);
                    setPickerOwnerName(ownerName ?? "");
                    setEditingOwner(true);
                  }}
                  className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Change
                </button>
                {asset.ownerId && (
                  <button
                    type="button"
                    onClick={handleRemoveOwner}
                    disabled={updateAsset.isPending}
                    className="flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <UserX size={12} />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          {editingOwner ? (
            <div className="space-y-3">
              <UserPicker
                placeholder="Search for owner..."
                value={pickerOwnerId}
                displayValue={pickerOwnerName}
                onChange={handleOwnerChange}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveOwner}
                  disabled={updateAsset.isPending}
                  className="rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {updateAsset.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOwner(false)}
                  className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {asset.ownerId ? (
                <>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                    {(ownerName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {ownerName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate font-mono">
                      {asset.ownerId}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No owner assigned
                </p>
              )}
            </div>
          )}
        </div>

        {/* Custodian Assignment */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Custodian
              </h2>
            </div>
            {!editingCustodian && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPickerCustodianId(asset.custodianId);
                    setPickerCustodianName(custodianName ?? "");
                    setEditingCustodian(true);
                  }}
                  className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Change
                </button>
                {asset.custodianId && (
                  <button
                    type="button"
                    onClick={handleRemoveCustodian}
                    disabled={updateAsset.isPending}
                    className="flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <UserX size={12} />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          {editingCustodian ? (
            <div className="space-y-3">
              <UserPicker
                placeholder="Search for custodian..."
                value={pickerCustodianId}
                displayValue={pickerCustodianName}
                onChange={handleCustodianChange}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustodian}
                  disabled={updateAsset.isPending}
                  className="rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {updateAsset.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCustodian(false)}
                  className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {asset.custodianId ? (
                <>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                    {(custodianName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {custodianName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate font-mono">
                      {asset.custodianId}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No custodian assigned
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/*  6. Tags & Custom Attributes                                      */}
      {/* ================================================================ */}

      {asset.tags && asset.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {asset.attributes && Object.keys(asset.attributes).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Custom Attributes
          </h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(asset.attributes).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium text-[var(--text-secondary)] capitalize">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="text-[var(--text-primary)]">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      )}

      {/* ================================================================ */}
      {/*  7. Lifecycle Timeline                                            */}
      {/* ================================================================ */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Lifecycle Timeline
            </h2>
          </div>
          <span className="text-xs text-[var(--text-secondary)] tabular-nums">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <History size={24} className="text-[var(--text-secondary)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              No lifecycle events recorded yet.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />

            <div className="space-y-4">
              {events.map((event) => {
                const eventConfig = EVENT_ICONS[event.eventType] ?? {
                  icon: Clock,
                  color: "var(--text-secondary)",
                };
                const EventIcon = eventConfig.icon;
                const performedByName =
                  userMap.get(event.performedBy) ?? event.performedBy.slice(0, 8) + "...";
                return (
                  <div key={event.id} className="relative flex gap-4 pl-0">
                    <div
                      className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--surface-0)]"
                      style={{ backgroundColor: `${eventConfig.color}20` }}
                    >
                      <EventIcon size={14} style={{ color: eventConfig.color }} />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        by {performedByName}
                      </p>
                      {event.details && Object.keys(event.details).length > 0 && (
                        <div className="mt-1 rounded-lg bg-[var(--surface-1)] p-2">
                          {Object.entries(event.details).map(([key, value]) => (
                            <p
                              key={key}
                              className="text-xs text-[var(--text-secondary)]"
                            >
                              <span className="font-medium capitalize">
                                {key.replace(/_/g, " ")}:
                              </span>{" "}
                              {String(value)}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)] tabular-nums">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ================================================================ */}
      {/*  8. Delete Confirmation Dialog                                    */}
      {/* ================================================================ */}

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Asset"
        message={`Are you sure you want to delete "${asset.name}" (${asset.assetTag})? This action cannot be undone and will permanently remove the asset and its lifecycle history.`}
        confirmLabel="Delete Asset"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteAsset.isPending}
      />
    </div>
  );
}
