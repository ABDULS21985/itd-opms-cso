"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  GripVertical,
  Check,
  ToggleLeft,
  ToggleRight,
  Type,
  Hash,
  Calendar,
  List,
  Link,
  Mail,
  Phone,
  Users,
  FileText,
} from "lucide-react";
import {
  useCustomFieldDefinitions,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  useReorderCustomFieldDefinitions,
} from "@/hooks/use-custom-fields";
import type {
  CustomFieldDefinition,
  CreateCustomFieldDefinitionPayload,
  UpdateCustomFieldDefinitionPayload,
} from "@/hooks/use-custom-fields";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ENTITY_TABS = [
  { key: "ticket", label: "Tickets" },
  { key: "project", label: "Projects" },
  { key: "work_item", label: "Work Items" },
  { key: "asset", label: "Assets" },
  { key: "vendor", label: "Vendors" },
  { key: "contract", label: "Contracts" },
  { key: "risk", label: "Risks" },
] as const;

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "decimal", label: "Decimal" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-Select" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "user_reference", label: "User Reference" },
] as const;

function getFieldTypeIcon(type: string) {
  switch (type) {
    case "text":
      return Type;
    case "textarea":
      return FileText;
    case "number":
    case "decimal":
      return Hash;
    case "boolean":
      return ToggleLeft;
    case "date":
    case "datetime":
      return Calendar;
    case "select":
    case "multiselect":
      return List;
    case "url":
      return Link;
    case "email":
      return Mail;
    case "phone":
      return Phone;
    case "user_reference":
      return Users;
    default:
      return Type;
  }
}

/* ------------------------------------------------------------------ */
/*  Create / Edit Dialog                                                */
/* ------------------------------------------------------------------ */

interface FieldFormData {
  fieldLabel: string;
  fieldKey: string;
  fieldType: string;
  description: string;
  isRequired: boolean;
  isFilterable: boolean;
  isVisibleInList: boolean;
  displayOrder: number;
  defaultValue: string;
  validationRulesJson: string;
}

const emptyFormData: FieldFormData = {
  fieldLabel: "",
  fieldKey: "",
  fieldType: "text",
  description: "",
  isRequired: false,
  isFilterable: false,
  isVisibleInList: false,
  displayOrder: 0,
  defaultValue: "",
  validationRulesJson: "{}",
};

function FieldDialog({
  open,
  onClose,
  onSubmit,
  loading,
  editField,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FieldFormData) => void;
  loading: boolean;
  editField?: CustomFieldDefinition | null;
}) {
  const [form, setForm] = useState<FieldFormData>(emptyFormData);

  // Reset form when dialog opens.
  const prevOpenRef = useState(false);
  if (open && !prevOpenRef[0]) {
    if (editField) {
      setForm({
        fieldLabel: editField.fieldLabel,
        fieldKey: editField.fieldKey,
        fieldType: editField.fieldType,
        description: editField.description || "",
        isRequired: editField.isRequired,
        isFilterable: editField.isFilterable,
        isVisibleInList: editField.isVisibleInList,
        displayOrder: editField.displayOrder,
        defaultValue: editField.defaultValue || "",
        validationRulesJson: JSON.stringify(
          editField.validationRules || {},
          null,
          2,
        ),
      });
    } else {
      setForm(emptyFormData);
    }
  }
  prevOpenRef[0] = open;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fieldLabel.trim()) return;
    if (!form.fieldType) return;
    onSubmit(form);
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  function updateField<K extends keyof FieldFormData>(
    key: K,
    value: FieldFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!open) return null;

  const isEditing = !!editField;

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
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
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
          <Settings className="h-6 w-6 text-[var(--primary)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {isEditing ? "Edit Custom Field" : "Create Custom Field"}
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          {isEditing
            ? "Update the properties of this custom field."
            : "Define a new custom field for this entity type."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Field Label */}
          <div>
            <label
              htmlFor="cf-label"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Field Label <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="cf-label"
              type="text"
              value={form.fieldLabel}
              onChange={(e) => updateField("fieldLabel", e.target.value)}
              placeholder="e.g. Purchase Order Number"
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Field Key */}
          {!isEditing && (
            <div>
              <label
                htmlFor="cf-key"
                className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
              >
                Field Key{" "}
                <span className="text-xs text-[var(--neutral-gray)]">
                  (auto-generated if empty)
                </span>
              </label>
              <input
                id="cf-key"
                type="text"
                value={form.fieldKey}
                onChange={(e) => updateField("fieldKey", e.target.value)}
                placeholder="e.g. purchase_order_number"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 font-mono"
              />
            </div>
          )}

          {/* Field Type */}
          <div>
            <label
              htmlFor="cf-type"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Field Type <span className="text-[var(--error)]">*</span>
            </label>
            <select
              id="cf-type"
              value={form.fieldType}
              onChange={(e) => updateField("fieldType", e.target.value)}
              disabled={isEditing}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="cf-description"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Description
            </label>
            <textarea
              id="cf-description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief description of this field..."
              rows={2}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
          </div>

          {/* Default Value */}
          <div>
            <label
              htmlFor="cf-default"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Default Value
            </label>
            <input
              id="cf-default"
              type="text"
              value={form.defaultValue}
              onChange={(e) => updateField("defaultValue", e.target.value)}
              placeholder="Optional default value"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Display Order */}
          <div>
            <label
              htmlFor="cf-order"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Display Order
            </label>
            <input
              id="cf-order"
              type="number"
              value={form.displayOrder}
              onChange={(e) =>
                updateField("displayOrder", parseInt(e.target.value) || 0)
              }
              min={0}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Validation Rules JSON */}
          <div>
            <label
              htmlFor="cf-validation"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Validation Rules{" "}
              <span className="text-xs text-[var(--neutral-gray)]">(JSON)</span>
            </label>
            <textarea
              id="cf-validation"
              value={form.validationRulesJson}
              onChange={(e) =>
                updateField("validationRulesJson", e.target.value)
              }
              placeholder='{"options": ["Option A", "Option B"]}'
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none font-mono"
            />
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-3 gap-3">
            <ToggleSwitch
              label="Required"
              checked={form.isRequired}
              onChange={(v) => updateField("isRequired", v)}
            />
            <ToggleSwitch
              label="Filterable"
              checked={form.isFilterable}
              onChange={(v) => updateField("isFilterable", v)}
            />
            <ToggleSwitch
              label="Visible in List"
              checked={form.isVisibleInList}
              onChange={(v) => updateField("isVisibleInList", v)}
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
              disabled={loading || !form.fieldLabel.trim()}
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
                  {isEditing ? "Updating..." : "Creating..."}
                </span>
              ) : (
                <>
                  {isEditing ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isEditing ? "Update Field" : "Create Field"}
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
/*  Toggle Switch                                                       */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        checked
          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
          : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--neutral-gray)]"
      }`}
    >
      {checked ? (
        <ToggleRight className="h-4 w-4" />
      ) : (
        <ToggleLeft className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Field Row                                                           */
/* ------------------------------------------------------------------ */

function FieldRow({
  field,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: CustomFieldDefinition;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const TypeIcon = getFieldTypeIcon(field.fieldType);
  const fieldTypeLabel =
    FIELD_TYPE_OPTIONS.find((o) => o.value === field.fieldType)?.label ||
    field.fieldType;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--surface-1)]"
    >
      {/* Reorder */}
      <td className="w-10 px-2 py-3">
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="rounded p-0.5 text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <GripVertical className="h-3.5 w-3.5 text-[var(--neutral-gray)]/40" />
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="rounded p-0.5 text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>

      {/* Label & Key */}
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {field.fieldLabel}
          </p>
          <p className="text-xs font-mono text-[var(--neutral-gray)]">
            {field.fieldKey}
          </p>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
          <TypeIcon className="h-3 w-3" />
          {fieldTypeLabel}
        </span>
      </td>

      {/* Required */}
      <td className="px-4 py-3 text-center">
        {field.isRequired ? (
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--primary)]/10">
            <Check className="h-3 w-3 text-[var(--primary)]" />
          </span>
        ) : (
          <span className="text-xs text-[var(--neutral-gray)]">--</span>
        )}
      </td>

      {/* Filterable */}
      <td className="px-4 py-3 text-center">
        {field.isFilterable ? (
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--primary)]/10">
            <Check className="h-3 w-3 text-[var(--primary)]" />
          </span>
        ) : (
          <span className="text-xs text-[var(--neutral-gray)]">--</span>
        )}
      </td>

      {/* Visible */}
      <td className="px-4 py-3 text-center">
        {field.isVisibleInList ? (
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--primary)]/10">
            <Check className="h-3 w-3 text-[var(--primary)]" />
          </span>
        ) : (
          <span className="text-xs text-[var(--neutral-gray)]">--</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            aria-label={`Edit ${field.fieldLabel}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)]"
            aria-label={`Delete ${field.fieldLabel}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CustomFieldsPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Custom Fields", href: "/dashboard/system/custom-fields" },
  ]);

  const [activeTab, setActiveTab] = useState<string>("ticket");
  const [showCreate, setShowCreate] = useState(false);
  const [editField, setEditField] = useState<CustomFieldDefinition | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: definitions, isLoading } =
    useCustomFieldDefinitions(activeTab);
  const createMutation = useCreateCustomFieldDefinition();
  const updateMutation = useUpdateCustomFieldDefinition(editField?.id);
  const deleteMutation = useDeleteCustomFieldDefinition();
  const reorderMutation = useReorderCustomFieldDefinitions(activeTab);

  const fieldToDelete = definitions?.find(
    (d: CustomFieldDefinition) => d.id === deleteTarget,
  );

  const handleCreate = useCallback(
    (form: FieldFormData) => {
      let validationRules: Record<string, unknown> = {};
      try {
        validationRules = JSON.parse(form.validationRulesJson);
      } catch {
        // Keep empty object
      }

      const payload: CreateCustomFieldDefinitionPayload = {
        entityType: activeTab,
        fieldLabel: form.fieldLabel.trim(),
        fieldKey: form.fieldKey.trim() || undefined,
        fieldType: form.fieldType,
        description: form.description.trim(),
        isRequired: form.isRequired,
        isFilterable: form.isFilterable,
        isVisibleInList: form.isVisibleInList,
        displayOrder: form.displayOrder,
        validationRules,
        defaultValue: form.defaultValue.trim() || null,
      };

      createMutation.mutate(payload, {
        onSuccess: () => {
          setShowCreate(false);
        },
      });
    },
    [activeTab, createMutation],
  );

  const handleUpdate = useCallback(
    (form: FieldFormData) => {
      if (!editField) return;

      let validationRules: Record<string, unknown> = {};
      try {
        validationRules = JSON.parse(form.validationRulesJson);
      } catch {
        // Keep empty object
      }

      const payload: UpdateCustomFieldDefinitionPayload = {
        fieldLabel: form.fieldLabel.trim(),
        description: form.description.trim(),
        isRequired: form.isRequired,
        isFilterable: form.isFilterable,
        isVisibleInList: form.isVisibleInList,
        displayOrder: form.displayOrder,
        validationRules,
        defaultValue: form.defaultValue.trim() || undefined,
      };

      updateMutation.mutate(payload, {
        onSuccess: () => {
          setEditField(null);
        },
      });
    },
    [editField, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  }, [deleteTarget, deleteMutation]);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (!definitions || index <= 0) return;
      const items = definitions.map(
        (d: CustomFieldDefinition, _i: number) => ({
          id: d.id,
          displayOrder: d.displayOrder,
        }),
      );
      // Swap display orders.
      const tmpOrder = items[index].displayOrder;
      items[index].displayOrder = items[index - 1].displayOrder;
      items[index - 1].displayOrder = tmpOrder;
      reorderMutation.mutate(items);
    },
    [definitions, reorderMutation],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (!definitions || index >= definitions.length - 1) return;
      const items = definitions.map(
        (d: CustomFieldDefinition, _i: number) => ({
          id: d.id,
          displayOrder: d.displayOrder,
        }),
      );
      // Swap display orders.
      const tmpOrder = items[index].displayOrder;
      items[index].displayOrder = items[index + 1].displayOrder;
      items[index + 1].displayOrder = tmpOrder;
      reorderMutation.mutate(items);
    },
    [definitions, reorderMutation],
  );

  return (
    <PermissionGate permission="custom_fields.manage">
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
              <Settings size={20} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Custom Fields
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Define and manage custom fields for different entity types
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Add Custom Field
          </button>
        </motion.div>

        {/* Entity Type Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1"
        >
          {ENTITY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--neutral-gray)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {isLoading ? (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0"
                  >
                    <div className="h-4 w-4 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded-md bg-[var(--surface-2)]" />
                      <div className="h-3 w-24 animate-pulse rounded-md bg-[var(--surface-2)]" />
                    </div>
                    <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="h-5 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
                  </div>
                ))}
              </div>
            </div>
          ) : definitions && definitions.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                      <th className="w-10 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]" />
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Label / Key
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Type
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Required
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Filterable
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Visible
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {definitions.map(
                        (field: CustomFieldDefinition, index: number) => (
                          <FieldRow
                            key={field.id}
                            field={field}
                            onEdit={() => setEditField(field)}
                            onDelete={() => setDeleteTarget(field.id)}
                            onMoveUp={() => handleMoveUp(index)}
                            onMoveDown={() => handleMoveDown(index)}
                            isFirst={index === 0}
                            isLast={index === definitions.length - 1}
                          />
                        ),
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--surface-2)] mb-4">
                <Settings
                  size={24}
                  className="text-[var(--neutral-gray)]"
                />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                No custom fields defined
              </h3>
              <p className="text-sm text-[var(--neutral-gray)] mb-4">
                Create your first custom field for{" "}
                {ENTITY_TABS.find((t) => t.key === activeTab)?.label ||
                  activeTab}{" "}
                to get started.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                Add Custom Field
              </button>
            </div>
          )}
        </motion.div>

        {/* Create Dialog */}
        <FieldDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={createMutation.isPending}
        />

        {/* Edit Dialog */}
        <FieldDialog
          open={!!editField}
          onClose={() => setEditField(null)}
          onSubmit={handleUpdate}
          loading={updateMutation.isPending}
          editField={editField}
        />

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Custom Field"
          message={`Are you sure you want to delete the custom field "${fieldToDelete?.fieldLabel ?? ""}"? This will remove the field definition. Existing data stored in entity records will not be automatically deleted.`}
          confirmLabel="Delete Field"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </div>
    </PermissionGate>
  );
}
