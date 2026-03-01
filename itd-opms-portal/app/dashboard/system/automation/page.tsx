"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Play,
  Pause,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  ChevronDown,
  Search,
  Filter,
  Pencil,
  X,
  Activity,
  ToggleLeft,
  ToggleRight,
  FlaskConical,
  ListChecks,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useAutomationRules,
  useAutomationRule,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useToggleAutomationRule,
  useTestAutomationRule,
  useAutomationExecutions,
  useAutomationStats,
  type AutomationRule,
  type AutomationExecution,
  type ActionConfig,
  type CreateAutomationRulePayload,
  type UpdateAutomationRulePayload,
} from "@/hooks/use-automation";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRIGGER_TYPE_OPTIONS = [
  { value: "", label: "All Triggers" },
  { value: "event", label: "Event" },
  { value: "schedule", label: "Schedule" },
  { value: "condition", label: "Condition" },
];

const TRIGGER_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  event: { bg: "rgba(59, 130, 246, 0.12)", text: "#2563EB" },
  schedule: { bg: "rgba(139, 92, 246, 0.12)", text: "#7C3AED" },
  condition: { bg: "rgba(245, 158, 11, 0.12)", text: "#D97706" },
};

const EVENT_TYPE_OPTIONS = [
  { value: "ticket.created", label: "Ticket Created" },
  { value: "ticket.updated", label: "Ticket Updated" },
  { value: "ticket.status_changed", label: "Ticket Status Changed" },
  { value: "ticket.assigned", label: "Ticket Assigned" },
  { value: "workitem.status_changed", label: "Work Item Status Changed" },
  { value: "workitem.created", label: "Work Item Created" },
  { value: "change_request.submitted", label: "Change Request Submitted" },
  { value: "change_request.approved", label: "Change Request Approved" },
  { value: "project.status_changed", label: "Project Status Changed" },
  { value: "project.milestone_reached", label: "Project Milestone Reached" },
];

const CRON_PRESETS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Every 30 min", value: "*/30 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily 9am", value: "0 9 * * *" },
  { label: "Daily 5pm", value: "0 17 * * *" },
  { label: "Weekly Monday 9am", value: "0 9 * * 1" },
  { label: "Monthly 1st 9am", value: "0 9 1 * *" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "ticket", label: "Ticket" },
  { value: "project", label: "Project" },
  { value: "work_item", label: "Work Item" },
];

const OPERATOR_OPTIONS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "contains", label: "contains" },
  { value: "is_null", label: "is empty" },
  { value: "is_not_null", label: "is not empty" },
  { value: "in", label: "in list" },
];

const ACTION_TYPE_OPTIONS = [
  { value: "update_field", label: "Update Field" },
  { value: "assign_user", label: "Assign User" },
  { value: "assign_queue", label: "Assign to Queue" },
  { value: "send_notification", label: "Send Notification" },
  { value: "start_approval", label: "Start Approval" },
  { value: "create_action_item", label: "Create Action Item" },
  { value: "webhook", label: "Webhook" },
  { value: "escalate", label: "Escalate" },
  { value: "set_priority", label: "Set Priority" },
  { value: "add_tag", label: "Add Tag" },
  { value: "add_comment", label: "Add Comment" },
];

const EXECUTION_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  success: { bg: "rgba(16, 185, 129, 0.12)", text: "#059669" },
  partial: { bg: "rgba(245, 158, 11, 0.12)", text: "#D97706" },
  failed: { bg: "rgba(239, 68, 68, 0.12)", text: "#DC2626" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/* ------------------------------------------------------------------ */
/*  Stat Card Component                                                */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: typeof Zap;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {value}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Condition Row Component                                            */
/* ------------------------------------------------------------------ */

interface ConditionRow {
  field: string;
  operator: string;
  value: string;
}

function ConditionBuilder({
  conditions,
  logic,
  onConditionsChange,
  onLogicChange,
}: {
  conditions: ConditionRow[];
  logic: "and" | "or";
  onConditionsChange: (conditions: ConditionRow[]) => void;
  onLogicChange: (logic: "and" | "or") => void;
}) {
  function addCondition() {
    onConditionsChange([...conditions, { field: "", operator: "eq", value: "" }]);
  }

  function removeCondition(index: number) {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  }

  function updateCondition(index: number, updates: Partial<ConditionRow>) {
    const updated = conditions.map((c, i) =>
      i === index ? { ...c, ...updates } : c,
    );
    onConditionsChange(updated);
  }

  const needsValue = (op: string) => !["is_null", "is_not_null"].includes(op);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--neutral-gray)]">Match</span>
        <select
          value={logic}
          onChange={(e) => onLogicChange(e.target.value as "and" | "or")}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="and">ALL conditions (AND)</option>
          <option value="or">ANY condition (OR)</option>
        </select>
      </div>

      {conditions.map((cond, index) => (
        <div key={index} className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--neutral-gray)] w-10">
            {index === 0 ? "When" : logic === "and" ? "AND" : "OR"}
          </span>
          <input
            type="text"
            value={cond.field}
            onChange={(e) => updateCondition(index, { field: e.target.value })}
            placeholder="Field name (e.g. status)"
            className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
          />
          <select
            value={cond.operator}
            onChange={(e) => updateCondition(index, { operator: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          >
            {OPERATOR_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          {needsValue(cond.operator) && (
            <input
              type="text"
              value={cond.value}
              onChange={(e) => updateCondition(index, { value: e.target.value })}
              placeholder="Value"
              className="flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
            />
          )}
          <button
            type="button"
            onClick={() => removeCondition(index)}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-[var(--border)] text-[var(--error)] hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCondition}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
      >
        <Plus size={14} />
        Add condition
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action Builder Component                                           */
/* ------------------------------------------------------------------ */

interface ActionRow {
  type: string;
  config: Record<string, string>;
}

function ActionBuilder({
  actions,
  onActionsChange,
}: {
  actions: ActionRow[];
  onActionsChange: (actions: ActionRow[]) => void;
}) {
  function addAction() {
    onActionsChange([...actions, { type: "update_field", config: {} }]);
  }

  function removeAction(index: number) {
    onActionsChange(actions.filter((_, i) => i !== index));
  }

  function updateActionType(index: number, type: string) {
    const updated = actions.map((a, i) =>
      i === index ? { type, config: {} } : a,
    );
    onActionsChange(updated);
  }

  function updateActionConfig(index: number, key: string, value: string) {
    const updated = actions.map((a, i) =>
      i === index ? { ...a, config: { ...a.config, [key]: value } } : a,
    );
    onActionsChange(updated);
  }

  function renderActionFields(action: ActionRow, index: number) {
    switch (action.type) {
      case "update_field":
        return (
          <>
            <input
              type="text"
              value={action.config.field || ""}
              onChange={(e) => updateActionConfig(index, "field", e.target.value)}
              placeholder="Field name"
              className="flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
            />
            <input
              type="text"
              value={action.config.value || ""}
              onChange={(e) => updateActionConfig(index, "value", e.target.value)}
              placeholder="New value"
              className="flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
            />
          </>
        );
      case "send_notification":
        return (
          <textarea
            value={action.config.message || ""}
            onChange={(e) => updateActionConfig(index, "message", e.target.value)}
            placeholder="Notification message..."
            rows={2}
            className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none resize-none"
          />
        );
      case "escalate":
      case "set_priority":
        return (
          <select
            value={action.config.priority || ""}
            onChange={(e) => updateActionConfig(index, "priority", e.target.value)}
            className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">Select priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        );
      case "add_comment":
        return (
          <textarea
            value={action.config.comment || ""}
            onChange={(e) => updateActionConfig(index, "comment", e.target.value)}
            placeholder="Comment text..."
            rows={2}
            className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none resize-none"
          />
        );
      case "add_tag":
        return (
          <input
            type="text"
            value={action.config.tag || ""}
            onChange={(e) => updateActionConfig(index, "tag", e.target.value)}
            placeholder="Tag name"
            className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
          />
        );
      case "assign_user":
        return (
          <input
            type="text"
            value={action.config.userId || ""}
            onChange={(e) => updateActionConfig(index, "userId", e.target.value)}
            placeholder="User ID"
            className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
          />
        );
      case "assign_queue":
        return (
          <input
            type="text"
            value={action.config.queueId || ""}
            onChange={(e) => updateActionConfig(index, "queueId", e.target.value)}
            placeholder="Queue ID"
            className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
          />
        );
      case "webhook":
        return (
          <input
            type="text"
            value={action.config.url || ""}
            onChange={(e) => updateActionConfig(index, "url", e.target.value)}
            placeholder="Webhook URL"
            className="flex-1 min-w-[250px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
          />
        );
      case "start_approval":
        return (
          <input
            type="text"
            value={action.config.approvalType || ""}
            onChange={(e) => updateActionConfig(index, "approvalType", e.target.value)}
            placeholder="Approval type"
            className="flex-1 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
          />
        );
      case "create_action_item":
        return (
          <>
            <input
              type="text"
              value={action.config.title || ""}
              onChange={(e) => updateActionConfig(index, "title", e.target.value)}
              placeholder="Action item title"
              className="flex-1 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
            />
            <input
              type="text"
              value={action.config.assignee || ""}
              onChange={(e) => updateActionConfig(index, "assignee", e.target.value)}
              placeholder="Assignee ID"
              className="flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
            />
          </>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-3">
      {actions.map((action, index) => (
        <div
          key={index}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider min-w-[60px]">
              Action {index + 1}
            </span>
            <select
              value={action.type}
              onChange={(e) => updateActionType(index, e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeAction(index)}
              className="flex items-center justify-center h-7 w-7 rounded-lg border border-[var(--border)] text-[var(--error)] hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="flex items-start gap-2 flex-wrap pl-[68px]">
            {renderActionFields(action, index)}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addAction}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
      >
        <Plus size={14} />
        Add action
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rule Form Panel                                                    */
/* ------------------------------------------------------------------ */

interface RuleFormData {
  name: string;
  description: string;
  triggerType: "event" | "schedule" | "condition";
  eventType: string;
  cronExpression: string;
  conditionEntityType: string;
  conditions: ConditionRow[];
  conditionLogic: "and" | "or";
  actions: ActionRow[];
  maxExecutionsPerHour: number;
  cooldownMinutes: number;
}

const DEFAULT_FORM_DATA: RuleFormData = {
  name: "",
  description: "",
  triggerType: "event",
  eventType: "",
  cronExpression: "",
  conditionEntityType: "",
  conditions: [],
  conditionLogic: "and",
  actions: [],
  maxExecutionsPerHour: 100,
  cooldownMinutes: 0,
};

function RuleFormPanel({
  open,
  onClose,
  editingRule,
}: {
  open: boolean;
  onClose: () => void;
  editingRule: AutomationRule | null;
}) {
  const [form, setForm] = useState<RuleFormData>(DEFAULT_FORM_DATA);
  const createMutation = useCreateAutomationRule();
  const updateMutation = useUpdateAutomationRule(editingRule?.id);

  // Populate form when editing.
  useEffect(() => {
    if (editingRule) {
      const triggerConfig = (editingRule.triggerConfig || {}) as Record<string, unknown>;
      const condConfig = (editingRule.conditionConfig || {}) as Record<string, unknown>;
      const rawConditions = (condConfig.conditions || []) as Array<Record<string, unknown>>;
      const rawActions = (editingRule.actions || []) as unknown as Array<Record<string, unknown>>;

      setForm({
        name: editingRule.name,
        description: editingRule.description || "",
        triggerType: editingRule.triggerType,
        eventType: (triggerConfig.event_type as string) || "",
        cronExpression: (triggerConfig.cron as string) || "",
        conditionEntityType: (triggerConfig.entity_type as string) || "",
        conditions: rawConditions.map((c) => ({
          field: (c.field as string) || "",
          operator: (c.operator as string) || "eq",
          value: c.value != null ? String(c.value) : "",
        })),
        conditionLogic: ((condConfig.logic as string) || "and") as "and" | "or",
        actions: rawActions.map((a) => ({
          type: (a.type as string) || "update_field",
          config: (a.config || {}) as Record<string, string>,
        })),
        maxExecutionsPerHour: editingRule.maxExecutionsPerHour || 100,
        cooldownMinutes: editingRule.cooldownMinutes || 0,
      });
    } else {
      setForm(DEFAULT_FORM_DATA);
    }
  }, [editingRule]);

  const buildPayload = useCallback((): CreateAutomationRulePayload => {
    let triggerConfig: Record<string, unknown> = {};
    if (form.triggerType === "event") {
      triggerConfig = { event_type: form.eventType, entity_type: form.conditionEntityType || "ticket" };
    } else if (form.triggerType === "schedule") {
      triggerConfig = { cron: form.cronExpression, timezone: "Asia/Manila" };
    } else if (form.triggerType === "condition") {
      triggerConfig = { entity_type: form.conditionEntityType || "ticket", check_interval_minutes: 30 };
    }

    let conditionConfig: Record<string, unknown> = {};
    if (form.conditions.length > 0) {
      conditionConfig = {
        logic: form.conditionLogic,
        conditions: form.conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
      };
    }

    return {
      name: form.name,
      description: form.description,
      triggerType: form.triggerType,
      triggerConfig,
      conditionConfig,
      actions: form.actions.map((a) => ({ type: a.type, config: a.config })),
      maxExecutionsPerHour: form.maxExecutionsPerHour,
      cooldownMinutes: form.cooldownMinutes,
    };
  }, [form]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload();

    if (editingRule) {
      const updatePayload: UpdateAutomationRulePayload = { ...payload };
      updateMutation.mutate(updatePayload, {
        onSuccess: () => {
          onClose();
          setForm(DEFAULT_FORM_DATA);
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onClose();
          setForm(DEFAULT_FORM_DATA);
        },
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative z-10 w-full max-w-2xl bg-[var(--surface-0)] border-l border-[var(--border)] shadow-2xl overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {editingRule ? "Edit Automation Rule" : "Create Automation Rule"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Settings size={16} />
                Basic Information
              </h3>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Auto-escalate critical tickets"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what this rule does..."
                  rows={2}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                />
              </div>
            </div>

            {/* Section 2: Trigger */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Zap size={16} />
                Trigger
              </h3>
              <div className="flex gap-2">
                {(["event", "schedule", "condition"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, triggerType: type }))}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                      form.triggerType === type
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                    }`}
                  >
                    {type === "event" && <Zap size={14} className="inline mr-1.5 -mt-0.5" />}
                    {type === "schedule" && <Clock size={14} className="inline mr-1.5 -mt-0.5" />}
                    {type === "condition" && <ListChecks size={14} className="inline mr-1.5 -mt-0.5" />}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Event trigger config */}
              {form.triggerType === "event" && (
                <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                      Event Type
                    </label>
                    <select
                      value={form.eventType}
                      onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      <option value="">Select event type...</option>
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                      Entity Type
                    </label>
                    <select
                      value={form.conditionEntityType}
                      onChange={(e) => setForm((f) => ({ ...f, conditionEntityType: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      <option value="">Select entity type...</option>
                      {ENTITY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Schedule trigger config */}
              {form.triggerType === "schedule" && (
                <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                      Cron Expression
                    </label>
                    <input
                      type="text"
                      value={form.cronExpression}
                      onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
                      placeholder="*/15 * * * *"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] font-mono placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CRON_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, cronExpression: preset.value }))}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          form.cronExpression === preset.value
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--neutral-gray)] hover:bg-[var(--surface-0)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Condition trigger config */}
              {form.triggerType === "condition" && (
                <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                      Entity Type
                    </label>
                    <select
                      value={form.conditionEntityType}
                      onChange={(e) => setForm((f) => ({ ...f, conditionEntityType: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      <option value="">Select entity type...</option>
                      {ENTITY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Conditions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Filter size={16} />
                Conditions
                <span className="text-xs font-normal text-[var(--neutral-gray)]">(optional filters)</span>
              </h3>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <ConditionBuilder
                  conditions={form.conditions}
                  logic={form.conditionLogic}
                  onConditionsChange={(conditions) => setForm((f) => ({ ...f, conditions }))}
                  onLogicChange={(logic) => setForm((f) => ({ ...f, conditionLogic: logic }))}
                />
              </div>
            </div>

            {/* Section 4: Actions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Play size={16} />
                Actions
              </h3>
              <ActionBuilder
                actions={form.actions}
                onActionsChange={(actions) => setForm((f) => ({ ...f, actions }))}
              />
            </div>

            {/* Section 5: Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Settings size={16} />
                Rate Limiting
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                    Max Executions / Hour
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.maxExecutionsPerHour}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxExecutionsPerHour: parseInt(e.target.value) || 100,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                    Cooldown (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={form.cooldownMinutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        cooldownMinutes: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? "Saving..."
                : editingRule
                ? "Update Rule"
                : "Create Rule"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Test Rule Modal                                                    */
/* ------------------------------------------------------------------ */

function TestRuleModal({
  open,
  onClose,
  ruleId,
}: {
  open: boolean;
  onClose: () => void;
  ruleId: string | undefined;
}) {
  const [entityType, setEntityType] = useState("ticket");
  const [entityId, setEntityId] = useState("");
  const testMutation = useTestAutomationRule(ruleId);

  function handleTest() {
    if (!entityId.trim()) return;
    testMutation.mutate({ entityType, entityId });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FlaskConical size={20} />
            Test Rule (Dry Run)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Entity ID
            </label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter the UUID of the entity to test against..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--text-primary)] font-mono placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {testMutation.data && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
              <div className="flex items-center gap-2">
                {testMutation.data.conditionsMet ? (
                  <CheckCircle size={18} className="text-[var(--success)]" />
                ) : (
                  <XCircle size={18} className="text-[var(--error)]" />
                )}
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {testMutation.data.conditionsMet
                    ? "All conditions met - actions would fire"
                    : "Conditions not met - no actions would fire"}
                </span>
              </div>

              {testMutation.data.conditionsMet && (
                <div>
                  <p className="text-xs font-medium text-[var(--neutral-gray)] mb-1">
                    Actions that would execute:
                  </p>
                  <pre className="text-xs text-[var(--text-primary)] bg-[var(--surface-0)] rounded-lg p-3 overflow-x-auto font-mono">
                    {JSON.stringify(testMutation.data.actionsToExecute, null, 2)}
                  </pre>
                </div>
              )}

              {testMutation.data.matchedConditions &&
                Array.isArray(testMutation.data.matchedConditions) &&
                testMutation.data.matchedConditions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--neutral-gray)] mb-1">
                      Matched conditions:
                    </p>
                    <pre className="text-xs text-[var(--text-primary)] bg-[var(--surface-0)] rounded-lg p-3 overflow-x-auto font-mono">
                      {JSON.stringify(testMutation.data.matchedConditions, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testMutation.isPending || !entityId.trim()}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FlaskConical size={14} />
            {testMutation.isPending ? "Testing..." : "Run Test"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AutomationPage() {
  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Automation", href: "/dashboard/system/automation" },
  ]);

  // Tab state
  const [activeTab, setActiveTab] = useState<"rules" | "executions">("rules");

  // Rules state
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [triggerTypeFilter, setTriggerTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);

  // Test state
  const [testRuleId, setTestRuleId] = useState<string | undefined>(undefined);

  // Execution state
  const [execPage, setExecPage] = useState(1);
  const [execStatusFilter, setExecStatusFilter] = useState("");

  // Debounce search input.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Queries.
  const { data: statsData } = useAutomationStats();
  const { data: rulesData, isLoading: rulesLoading } = useAutomationRules(page, 20, {
    isActive: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    triggerType: triggerTypeFilter || undefined,
  });
  const { data: execData, isLoading: execLoading } = useAutomationExecutions(execPage, 20, {
    status: execStatusFilter || undefined,
  });

  // Mutations.
  const deleteMutation = useDeleteAutomationRule();
  const toggleMutation = useToggleAutomationRule();

  // Normalize paginated data.
  const allRules = useMemo(() => {
    if (!rulesData) return [];
    if (Array.isArray(rulesData)) return rulesData;
    if ("data" in rulesData && Array.isArray(rulesData.data)) return rulesData.data;
    return [];
  }, [rulesData]);

  const rulesMeta = useMemo(() => {
    if (!rulesData || Array.isArray(rulesData)) return undefined;
    return "meta" in rulesData ? rulesData.meta : undefined;
  }, [rulesData]);

  const allExecutions = useMemo(() => {
    if (!execData) return [];
    if (Array.isArray(execData)) return execData;
    if ("data" in execData && Array.isArray(execData.data)) return execData.data;
    return [];
  }, [execData]);

  const execMeta = useMemo(() => {
    if (!execData || Array.isArray(execData)) return undefined;
    return "meta" in execData ? execData.meta : undefined;
  }, [execData]);

  // Client-side search on top of server filters.
  const filteredRules = useMemo(() => {
    if (!debouncedSearch) return allRules;
    const q = debouncedSearch.toLowerCase();
    return allRules.filter(
      (r: AutomationRule) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }, [allRules, debouncedSearch]);

  const stats = statsData as { totalRules: number; activeRules: number; executionsToday: number; failuresToday: number } | undefined;

  function handleEdit(rule: AutomationRule) {
    setEditingRule(rule);
    setFormOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingRule(null);
  }

  function handleToggle(ruleId: string) {
    toggleMutation.mutate(ruleId);
  }

  // Trigger type badge helper.
  function getTriggerTypeBadge(type: string) {
    const color = TRIGGER_TYPE_COLORS[type] || { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" };
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {type === "event" && <Zap size={11} className="mr-1" />}
        {type === "schedule" && <Clock size={11} className="mr-1" />}
        {type === "condition" && <ListChecks size={11} className="mr-1" />}
        {type}
      </span>
    );
  }

  // Entity scope from trigger_config.
  function getEntityScope(rule: AutomationRule) {
    const config = rule.triggerConfig as Record<string, unknown> | null;
    if (!config) return "-";
    const entityType = config.entity_type as string | undefined;
    if (entityType) {
      const label = ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType)?.label || entityType;
      return label;
    }
    return "-";
  }

  // Rules table columns.
  const ruleColumns: Column<AutomationRule>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      className: "min-w-[220px]",
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {item.name}
          </p>
          {item.description && (
            <p className="text-xs text-[var(--neutral-gray)] truncate max-w-[280px]">
              {item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "triggerType",
      header: "Trigger",
      render: (item) => getTriggerTypeBadge(item.triggerType),
    },
    {
      key: "entityScope",
      header: "Entity Scope",
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)]">
          {getEntityScope(item)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      align: "center",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(item.id);
          }}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          title={item.isActive ? "Click to deactivate" : "Click to activate"}
        >
          {item.isActive ? (
            <>
              <ToggleRight size={20} className="text-[var(--success)]" />
              <span className="text-[var(--success)]">Active</span>
            </>
          ) : (
            <>
              <ToggleLeft size={20} className="text-[var(--neutral-gray)]" />
              <span className="text-[var(--neutral-gray)]">Inactive</span>
            </>
          )}
        </button>
      ),
    },
    {
      key: "executionCount",
      header: "Runs",
      align: "center",
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)] tabular-nums">
          {item.executionCount}
        </span>
      ),
    },
    {
      key: "lastExecutedAt",
      header: "Last Run",
      render: (item) => (
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
          {item.lastExecutedAt ? formatRelative(item.lastExecutedAt) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            title="Edit rule"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTestRuleId(item.id);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            title="Test rule"
          >
            <FlaskConical size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(item);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-red-50"
            title="Delete rule"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  // Executions table columns.
  const executionColumns: Column<AutomationExecution>[] = [
    {
      key: "executedAt",
      header: "Time",
      className: "min-w-[140px]",
      render: (item) => (
        <span className="text-xs text-[var(--text-primary)] tabular-nums">
          {formatDateTime(item.executedAt)}
        </span>
      ),
    },
    {
      key: "ruleId",
      header: "Rule",
      className: "min-w-[120px]",
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)] font-mono text-xs truncate block max-w-[120px]">
          {item.ruleId.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "entityType",
      header: "Entity",
      render: (item) => (
        <div className="min-w-0">
          <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
            {item.entityType}
          </span>
          <p className="text-[10px] text-[var(--neutral-gray)] font-mono truncate max-w-[120px]">
            {item.entityId.slice(0, 8)}...
          </p>
        </div>
      ),
    },
    {
      key: "actionsTaken",
      header: "Actions",
      className: "min-w-[200px]",
      render: (item) => {
        const actions = item.actionsTaken;
        if (!actions || !Array.isArray(actions) || actions.length === 0) {
          return <span className="text-xs text-[var(--neutral-gray)]">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {actions.slice(0, 3).map((action: Record<string, unknown>, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-primary)]"
              >
                {(action.type as string) || "action"}
              </span>
            ))}
            {actions.length > 3 && (
              <span className="text-[10px] text-[var(--neutral-gray)]">
                +{actions.length - 3} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (item) => {
        const color = EXECUTION_STATUS_COLORS[item.status] || EXECUTION_STATUS_COLORS.failed;
        return (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.status === "success" && <CheckCircle size={11} />}
            {item.status === "partial" && <AlertTriangle size={11} />}
            {item.status === "failed" && <XCircle size={11} />}
            {item.status}
          </span>
        );
      },
    },
    {
      key: "durationMs",
      header: "Duration",
      align: "right",
      render: (item) => (
        <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
          {item.durationMs}ms
        </span>
      ),
    },
  ];

  return (
    <PermissionGate permission="automation.view">
      <div className="space-y-6">
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
              style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
            >
              <Zap size={20} style={{ color: "#D97706" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Workflow Automation
              </h1>
              <p className="text-sm text-[var(--neutral-gray)]">
                Create and manage automated workflow rules
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
              onClick={() => {
                setEditingRule(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Create Rule
            </button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Rules"
            value={stats?.totalRules ?? 0}
            icon={ListChecks}
            color="#2563EB"
            delay={0}
          />
          <StatCard
            label="Active Rules"
            value={stats?.activeRules ?? 0}
            icon={Play}
            color="#059669"
            delay={0.05}
          />
          <StatCard
            label="Executions Today"
            value={stats?.executionsToday ?? 0}
            icon={Activity}
            color="#7C3AED"
            delay={0.1}
          />
          <StatCard
            label="Failures Today"
            value={stats?.failuresToday ?? 0}
            icon={AlertTriangle}
            color="#DC2626"
            delay={0.15}
          />
        </div>

        {/* Tab Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center gap-1 border-b border-[var(--border)]"
        >
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "rules"
                ? "text-[var(--primary)]"
                : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
            }`}
          >
            Rules
            {activeTab === "rules" && (
              <motion.div
                layoutId="automation-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("executions")}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "executions"
                ? "text-[var(--primary)]"
                : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
            }`}
          >
            Execution Log
            {activeTab === "executions" && (
              <motion.div
                layoutId="automation-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
              />
            )}
          </button>
        </motion.div>

        {/* Rules Tab Content */}
        {activeTab === "rules" && (
          <>
            {/* Search & Filters */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex flex-col gap-3"
            >
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search rules by name or description..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                      Trigger Type
                    </label>
                    <select
                      value={triggerTypeFilter}
                      onChange={(e) => {
                        setTriggerTypeFilter(e.target.value);
                        setPage(1);
                      }}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      {TRIGGER_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Rules Table */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <DataTable
                columns={ruleColumns}
                data={filteredRules}
                keyExtractor={(item: AutomationRule) => item.id}
                loading={rulesLoading}
                emptyTitle="No automation rules found"
                emptyDescription="Create your first automation rule to automate workflows."
                onRowClick={(item: AutomationRule) => handleEdit(item)}
                pagination={
                  rulesMeta
                    ? {
                        currentPage: rulesMeta.page,
                        totalPages: rulesMeta.totalPages,
                        totalItems: rulesMeta.totalItems,
                        pageSize: rulesMeta.pageSize,
                        onPageChange: setPage,
                      }
                    : undefined
                }
              />
            </motion.div>
          </>
        )}

        {/* Executions Tab Content */}
        {activeTab === "executions" && (
          <>
            {/* Execution filters */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex items-center gap-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                  Status
                </label>
                <select
                  value={execStatusFilter}
                  onChange={(e) => {
                    setExecStatusFilter(e.target.value);
                    setExecPage(1);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="">All</option>
                  <option value="success">Success</option>
                  <option value="partial">Partial</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </motion.div>

            {/* Executions Table */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <DataTable
                columns={executionColumns}
                data={allExecutions}
                keyExtractor={(item: AutomationExecution) => item.id}
                loading={execLoading}
                emptyTitle="No executions yet"
                emptyDescription="Automation execution logs will appear here once rules start running."
                pagination={
                  execMeta
                    ? {
                        currentPage: execMeta.page,
                        totalPages: execMeta.totalPages,
                        totalItems: execMeta.totalItems,
                        pageSize: execMeta.pageSize,
                        onPageChange: setExecPage,
                      }
                    : undefined
                }
              />
            </motion.div>
          </>
        )}

        {/* Rule Form Slide-over Panel */}
        <AnimatePresence>
          {formOpen && (
            <RuleFormPanel
              open={formOpen}
              onClose={handleFormClose}
              editingRule={editingRule}
            />
          )}
        </AnimatePresence>

        {/* Test Rule Modal */}
        <AnimatePresence>
          {testRuleId && (
            <TestRuleModal
              open={!!testRuleId}
              onClose={() => setTestRuleId(undefined)}
              ruleId={testRuleId}
            />
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Automation Rule"
          message={`Are you sure you want to delete "${deleteTarget?.name ?? "this rule"}"? This will also delete all execution history. This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </div>
    </PermissionGate>
  );
}
