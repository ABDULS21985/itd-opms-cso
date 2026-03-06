"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { DataTable } from "@/components/shared/data-table";
import type { Column, BulkAction } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import {
  useCatalogItems,
  useCatalogCategories,
  useCreateCatalogItem,
  useUpdateCatalogItem,
  useDeleteCatalogItem,
  useSLAPolicies,
} from "@/hooks/use-itsm";
import type { CatalogItem } from "@/types";

/* ------------------------------------------------------------------ */
/*  Status cycling helper                                              */
/* ------------------------------------------------------------------ */

const STATUS_CYCLE: Record<string, string> = {
  active: "inactive",
  inactive: "deprecated",
  deprecated: "active",
};

/* ------------------------------------------------------------------ */
/*  Form state                                                         */
/* ------------------------------------------------------------------ */

interface ItemFormState {
  name: string;
  description: string;
  categoryId: string;
  estimatedDelivery: string;
  status: string;
  approvalRequired: boolean;
  slaPolicyId: string;
  entitlementRoles: string;
}

const emptyForm: ItemFormState = {
  name: "",
  description: "",
  categoryId: "",
  estimatedDelivery: "",
  status: "active",
  approvalRequired: false,
  slaPolicyId: "",
  entitlementRoles: "",
};

function formFromItem(item: CatalogItem): ItemFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    categoryId: item.categoryId ?? "",
    estimatedDelivery: item.estimatedDelivery ?? "",
    status: item.status,
    approvalRequired: item.approvalRequired,
    slaPolicyId: item.slaPolicyId ?? "",
    entitlementRoles: (item.entitlementRoles ?? []).join(", "),
  };
}

/* ------------------------------------------------------------------ */
/*  Status options                                                     */
/* ------------------------------------------------------------------ */

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "deprecated", label: "Deprecated" },
];

/* ------------------------------------------------------------------ */
/*  ItemsTab                                                           */
/* ------------------------------------------------------------------ */

export function ItemsTab() {
  const queryClient = useQueryClient();

  /* ---- Filters ---- */
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  /* ---- Pagination & sort ---- */
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({ key: "name", direction: "asc" });
  const limit = 20;

  /* ---- Data queries ---- */
  const { data: itemsResponse, isLoading } = useCatalogItems(
    page,
    limit,
    categoryFilter || undefined,
    statusFilter || undefined,
  );
  const { data: categories } = useCatalogCategories();
  const { data: slaPoliciesResponse } = useSLAPolicies(1, 100);

  const items = itemsResponse?.data ?? [];
  const meta = itemsResponse?.meta;
  const categoryList = categories ?? [];
  const slaPolicies = slaPoliciesResponse?.data ?? [];

  /* ---- Category lookup map ---- */
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categoryList.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categoryList]);

  /* ---- Selection ---- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ---- Panel state ---- */
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  /* ---- Confirm dialog state ---- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);

  /* ---- Mutations ---- */
  const createItem = useCreateCatalogItem();
  const updateItem = useUpdateCatalogItem(editingItem?.id);
  const deleteItem = useDeleteCatalogItem();

  /* ---- Invalidate catalog item queries ---- */
  const invalidateCatalogItems = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
    queryClient.invalidateQueries({ queryKey: ["catalog-items-entitled"] });
  }, [queryClient]);

  /* ---- Panel helpers ---- */
  const openCreatePanel = useCallback(() => {
    setPanelMode("create");
    setEditingItem(null);
    setForm(emptyForm);
    setFormErrors({});
    setPanelOpen(true);
  }, []);

  const openEditPanel = useCallback((item: CatalogItem) => {
    setPanelMode("edit");
    setEditingItem(item);
    setForm(formFromItem(item));
    setFormErrors({});
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setEditingItem(null);
    setFormErrors({});
  }, []);

  const updateField = useCallback(
    <K extends keyof ItemFormState>(field: K, value: ItemFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  /* ---- Validate ---- */
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form.name]);

  /* ---- Save (create / edit) ---- */
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    setSaving(true);

    const body: Partial<CatalogItem> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId || undefined,
      estimatedDelivery: form.estimatedDelivery.trim() || undefined,
      status: form.status,
      approvalRequired: form.approvalRequired,
      slaPolicyId: form.slaPolicyId || undefined,
      entitlementRoles: form.entitlementRoles
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    };

    try {
      if (panelMode === "create") {
        await createItem.mutateAsync(body);
      } else {
        await updateItem.mutateAsync(body);
      }
      closePanel();
    } finally {
      setSaving(false);
    }
  }, [validateForm, form, panelMode, createItem, updateItem, closePanel]);

  /* ---- Inline status toggle ---- */
  const handleInlineStatusToggle = useCallback(
    async (item: CatalogItem) => {
      const nextStatus = STATUS_CYCLE[item.status] ?? "active";
      try {
        await apiClient.put(`/itsm/catalog/items/${item.id}`, {
          status: nextStatus,
        });
        toast.success(`Status changed to ${nextStatus}`);
        invalidateCatalogItems();
      } catch {
        toast.error("Failed to update status");
      }
    },
    [invalidateCatalogItems],
  );

  /* ---- Bulk status update ---- */
  const handleBulkStatusUpdate = useCallback(
    async (ids: string[], newStatus: string) => {
      try {
        await Promise.all(
          ids.map((id) =>
            apiClient.put(`/itsm/catalog/items/${id}`, { status: newStatus }),
          ),
        );
        toast.success(`${ids.length} item(s) updated to ${newStatus}`);
        setSelectedIds(new Set());
        invalidateCatalogItems();
      } catch {
        toast.error("Failed to update some items");
      }
    },
    [invalidateCatalogItems],
  );

  /* ---- Delete ---- */
  const handleBulkDelete = useCallback((ids: string[]) => {
    setIdsToDelete(ids);
    setConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    setConfirmLoading(true);
    try {
      await Promise.all(idsToDelete.map((id) => deleteItem.mutateAsync(id)));
      setSelectedIds(new Set());
      setConfirmOpen(false);
      setIdsToDelete([]);
    } finally {
      setConfirmLoading(false);
    }
  }, [idsToDelete, deleteItem]);

  /* ---- Columns ---- */
  const columns: Column<CatalogItem>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        sortable: true,
        className: "min-w-[200px]",
        render: (item: CatalogItem) => (
          <div className="flex flex-col">
            <span className="font-medium text-[var(--text-primary)]">
              {item.name}
            </span>
            {item.description && (
              <span className="text-xs text-[var(--neutral-gray)] line-clamp-1 mt-0.5">
                {item.description}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (item: CatalogItem) => (
          <span className="text-sm text-[var(--text-secondary)]">
            {item.categoryId
              ? categoryMap.get(item.categoryId) ?? "Unknown"
              : "--"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (item: CatalogItem) => (
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleInlineStatusToggle(item);
              }}
              className="rounded-md p-1 text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
              title={`Cycle to ${STATUS_CYCLE[item.status] ?? "active"}`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
      {
        key: "approval",
        header: "Approval",
        align: "center" as const,
        render: (item: CatalogItem) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              item.approvalRequired
                ? "bg-[var(--warning)]/10 text-[var(--warning-dark)]"
                : "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
            )}
          >
            {item.approvalRequired ? "Yes" : "No"}
          </span>
        ),
      },
      {
        key: "version",
        header: "Version",
        align: "center" as const,
        render: (item: CatalogItem) => (
          <span className="text-sm tabular-nums text-[var(--text-secondary)]">
            v{item.version}
          </span>
        ),
      },
      {
        key: "updatedAt",
        header: "Last Updated",
        sortable: true,
        render: (item: CatalogItem) => (
          <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
            {formatDate(item.updatedAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right" as const,
        render: (item: CatalogItem) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditPanel(item);
              }}
              className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
              title="Edit item"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBulkDelete([item.id]);
              }}
              className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--error)]/10 hover:text-[var(--error)] transition-colors"
              title="Delete item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [categoryMap, handleInlineStatusToggle, openEditPanel, handleBulkDelete],
  );

  /* ---- Bulk actions ---- */
  const bulkActions: BulkAction[] = useMemo(
    () => [
      {
        id: "activate",
        label: "Activate",
        icon: CheckCircle2,
        onExecute: (ids: string[]) => handleBulkStatusUpdate(ids, "active"),
      },
      {
        id: "deactivate",
        label: "Deactivate",
        icon: XCircle,
        onExecute: (ids: string[]) => handleBulkStatusUpdate(ids, "inactive"),
      },
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "danger" as const,
        onExecute: (ids: string[]) => handleBulkDelete(ids),
      },
    ],
    [handleBulkStatusUpdate, handleBulkDelete],
  );

  /* ---- Select options ---- */
  const categoryOptions = useMemo(
    () => categoryList.map((cat) => ({ value: cat.id, label: cat.name })),
    [categoryList],
  );

  const slaPolicyOptions = useMemo(
    () => slaPolicies.map((sla) => ({ value: sla.id, label: sla.name })),
    [slaPolicies],
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-4">
      {/* ---- Header bar ---- */}
      <div className="flex items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-[var(--neutral-gray)]">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={openCreatePanel}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--secondary)]"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* ---- Data table ---- */}
      <DataTable<CatalogItem>
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        sort={sort}
        onSort={setSort}
        selectable
        bulkActions={bulkActions}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyTitle="No catalog items found"
        emptyDescription="Create your first service catalog item to get started."
        emptyAction={
          <button
            type="button"
            onClick={openCreatePanel}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--secondary)]"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
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

      {/* ---- Slide-over panel ---- */}
      <AnimatePresence>
        {panelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={closePanel}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-[var(--border)] bg-[var(--surface-0)] shadow-2xl"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {panelMode === "create"
                    ? "Add Catalog Item"
                    : "Edit Catalog Item"}
                </h2>
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-lg p-1.5 text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Panel body (scrollable) */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Name */}
                <FormField
                  label="Name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                  placeholder="e.g. New Laptop Request"
                  error={formErrors.name}
                  required
                />

                {/* Description */}
                <FormField
                  label="Description"
                  name="description"
                  type="textarea"
                  value={form.description}
                  onChange={(v) => updateField("description", v)}
                  placeholder="Describe this catalog item..."
                  rows={4}
                />

                {/* Category */}
                <FormField
                  label="Category"
                  name="categoryId"
                  type="select"
                  value={form.categoryId}
                  onChange={(v) => updateField("categoryId", v)}
                  placeholder="Select a category"
                  options={categoryOptions}
                />

                {/* Estimated Delivery */}
                <FormField
                  label="Estimated Delivery"
                  name="estimatedDelivery"
                  type="text"
                  value={form.estimatedDelivery}
                  onChange={(v) => updateField("estimatedDelivery", v)}
                  placeholder="e.g. 2-3 business days"
                  description="Approximate fulfillment time shown to requesters."
                />

                {/* Status */}
                <FormField
                  label="Status"
                  name="status"
                  type="select"
                  value={form.status}
                  onChange={(v) => updateField("status", v)}
                  options={statusOptions}
                />

                {/* Approval Required */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Approval Required
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("approvalRequired", !form.approvalRequired)
                    }
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      form.approvalRequired
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]",
                    )}
                  >
                    {form.approvalRequired ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {form.approvalRequired
                      ? "Approval Required"
                      : "No Approval Needed"}
                  </button>
                  <p className="text-xs text-[var(--neutral-gray)] mt-1">
                    When enabled, requests will require manager approval before
                    fulfillment.
                  </p>
                </div>

                {/* SLA Policy */}
                <FormField
                  label="SLA Policy"
                  name="slaPolicyId"
                  type="select"
                  value={form.slaPolicyId}
                  onChange={(v) => updateField("slaPolicyId", v)}
                  placeholder="Select an SLA policy"
                  options={slaPolicyOptions}
                  description="Defines response and resolution time targets."
                />

                {/* Entitlement Roles */}
                <FormField
                  label="Entitlement Roles"
                  name="entitlementRoles"
                  type="text"
                  value={form.entitlementRoles}
                  onChange={(v) => updateField("entitlementRoles", v)}
                  placeholder="e.g. engineer, manager, hr-admin"
                  description="Comma-separated list of roles that can request this item."
                />
              </div>

              {/* Panel footer */}
              <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={saving}
                  className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--secondary)] disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {panelMode === "create" ? "Create Item" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Confirm delete dialog ---- */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setIdsToDelete([]);
        }}
        onConfirm={confirmDelete}
        title="Delete Catalog Item(s)"
        message={`Are you sure you want to delete ${idsToDelete.length} item(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={confirmLoading}
      />
    </div>
  );
}
