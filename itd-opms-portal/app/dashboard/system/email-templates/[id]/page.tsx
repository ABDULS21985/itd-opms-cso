"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  ArrowLeft,
  Save,
  Trash2,
  Send,
  Eye,
  Code,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useEmailTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  usePreviewTemplate,
} from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INPUT_CLS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

const SELECT_CLS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

const CATEGORY_OPTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "password-reset", label: "Password Reset" },
  { value: "notifications", label: "Notifications" },
  { value: "alerts", label: "Alerts" },
  { value: "reports", label: "Reports" },
  { value: "system", label: "System" },
];

const SAMPLE_VARIABLES: Record<string, string> = {
  user_name: "John Doe",
  user_email: "john.doe@example.com",
  platform_name: "ITD-OPMS",
  reset_link: "https://opms.cbn.gov.ng/reset?token=abc123",
  ticket_number: "INC-2024-0042",
  action_url: "https://opms.cbn.gov.ng/dashboard",
  date: new Date().toLocaleDateString("en-GB"),
  org_name: "Central Bank of Nigeria - IT Department",
};

interface TemplateFormData {
  name: string;
  category: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  isActive: boolean;
}

const EMPTY_FORM: TemplateFormData = {
  name: "",
  category: "notifications",
  subject: "",
  bodyHtml: "",
  bodyText: "",
  variables: [],
  isActive: true,
};

/* ------------------------------------------------------------------ */
/*  Variable Tag Input                                                 */
/* ------------------------------------------------------------------ */

function VariableTagInput({
  variables,
  onChange,
}: {
  variables: string[];
  onChange: (vars: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.trim().replace(/[^a-zA-Z0-9_]/g, "");
      if (val && !variables.includes(val)) {
        onChange([...variables, val]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && variables.length > 0) {
      onChange(variables.slice(0, -1));
    }
  }

  function removeVar(v: string) {
    onChange(variables.filter((x) => x !== v));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 min-h-[42px] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
      {variables.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
        >
          {"{{" + v + "}}"}
          <button
            type="button"
            onClick={() => removeVar(v)}
            className="text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={variables.length === 0 ? "Type variable name and press Enter..." : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] outline-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const { data: templateData, isLoading } = useEmailTemplate(isNew ? undefined : id);
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate(isNew ? undefined : id);
  const deleteMutation = useDeleteTemplate();
  const previewMutation = usePreviewTemplate(isNew ? undefined : id);

  const [form, setForm] = useState<TemplateFormData>(EMPTY_FORM);
  const [showPreview, setShowPreview] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load template data
  useEffect(() => {
    if (isNew || !templateData) return;
    setForm({
      name: templateData.name ?? "",
      category: templateData.category ?? "notifications",
      subject: templateData.subject ?? "",
      bodyHtml: templateData.bodyHtml ?? "",
      bodyText: templateData.bodyText ?? "",
      variables: Array.isArray(templateData.variables) ? templateData.variables.map(String) : [],
      isActive: templateData.isActive ?? true,
    });
    setDirty(false);
  }, [templateData, isNew]);

  const handleChange = useCallback((field: keyof TemplateFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  // Generate preview from body HTML by replacing variables
  const livePreview = useMemo(() => {
    let html = form.bodyHtml;
    if (!html) return "<p style='color:#999;text-align:center;padding:40px;'>Enter HTML body to see preview</p>";
    // Replace {{variable}} with sample values
    form.variables.forEach((v) => {
      const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g");
      html = html.replace(regex, SAMPLE_VARIABLES[v] ?? `[${v}]`);
    });
    // Also replace any remaining {{...}} patterns
    html = html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name) => {
      return SAMPLE_VARIABLES[name] ?? `[${name}]`;
    });
    return html;
  }, [form.bodyHtml, form.variables]);

  // Server-side preview
  const handleServerPreview = useCallback(() => {
    if (isNew) {
      setPreviewHtml(livePreview);
      return;
    }
    const vars: Record<string, string> = {};
    form.variables.forEach((v) => {
      vars[v] = SAMPLE_VARIABLES[v] ?? `[${v}]`;
    });
    previewMutation.mutate(vars, {
      onSuccess: (data) => {
        if (data?.html) setPreviewHtml(data.html);
      },
    });
  }, [isNew, form.variables, previewMutation, livePreview]);

  function validate(): string | null {
    if (!form.name.trim()) return "Template name is required";
    if (!form.subject.trim()) return "Subject is required";
    if (!form.bodyHtml.trim()) return "HTML body is required";
    if (!form.category) return "Category is required";
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      subject: form.subject.trim(),
      body_html: form.bodyHtml,
      body_text: form.bodyText || undefined,
      variables: form.variables,
      is_active: form.isActive,
    };

    if (isNew) {
      createMutation.mutate(payload as Record<string, unknown>, {
        onSuccess: () => {
          router.push("/dashboard/system/email-templates");
        },
      });
    } else {
      updateMutation.mutate(payload as Record<string, unknown>, {
        onSuccess: () => {
          setDirty(false);
        },
      });
    }
  }

  function handleDelete() {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        router.push("/dashboard/system/email-templates");
      },
    });
  }

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[var(--surface-1)]" />
        <div className="h-96 animate-pulse rounded-xl bg-[var(--surface-1)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/system/email-templates")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <Mail size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {isNew ? "Create Template" : "Edit Template"}
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              {isNew ? "Create a new email template" : form.name || "Loading..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            {showPreview ? <Code size={16} /> : <Eye size={16} />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={handleServerPreview}
              disabled={previewMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
            >
              <Send size={16} />
              {previewMutation.isPending ? "Rendering..." : "Send Test"}
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--error)] transition-colors hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={(!dirty && !isNew) || createMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Save size={16} />
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>

      {/* Editor + Preview Split */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}
      >
        {/* Left: Editor Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Template Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Welcome Email"
              className={INPUT_CLS}
            />
          </div>

          {/* Category + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Category <span className="text-[var(--error)]">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className={SELECT_CLS}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Status
              </label>
              <button
                type="button"
                onClick={() => handleChange("isActive", !form.isActive)}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 w-full"
              >
                <span
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ backgroundColor: form.isActive ? "var(--primary)" : "var(--surface-2)" }}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                    style={{ transform: form.isActive ? "translateX(24px)" : "translateX(4px)" }}
                  />
                </span>
                <span className="text-sm text-[var(--text-primary)]">
                  {form.isActive ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Subject <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => handleChange("subject", e.target.value)}
              placeholder="e.g., Welcome to {{platform_name}}"
              className={INPUT_CLS}
            />
          </div>

          {/* Variables */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Template Variables
            </label>
            <p className="text-xs text-[var(--neutral-gray)] mb-1.5">
              Define variables used in the template (e.g., user_name, reset_link)
            </p>
            <VariableTagInput
              variables={form.variables}
              onChange={(vars) => handleChange("variables", vars)}
            />
          </div>

          {/* Body HTML */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Body HTML <span className="text-[var(--error)]">*</span>
            </label>
            <textarea
              value={form.bodyHtml}
              onChange={(e) => handleChange("bodyHtml", e.target.value)}
              rows={14}
              placeholder="<html>&#10;  <body>&#10;    <h1>Hello {{user_name}}</h1>&#10;  </body>&#10;</html>"
              className={INPUT_CLS + " font-mono text-xs leading-relaxed"}
            />
          </div>

          {/* Body Text (fallback) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Body Text <span className="text-xs text-[var(--neutral-gray)]">(plain text fallback)</span>
            </label>
            <textarea
              value={form.bodyText}
              onChange={(e) => handleChange("bodyText", e.target.value)}
              rows={5}
              placeholder="Hello {{user_name}},&#10;&#10;Welcome to the platform."
              className={INPUT_CLS + " font-mono text-xs"}
            />
          </div>
        </div>

        {/* Right: Live Preview */}
        {showPreview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Eye size={14} />
                Live Preview
              </h3>
              {form.variables.length > 0 && (
                <p className="text-xs text-[var(--neutral-gray)]">
                  Using sample data for {form.variables.length} variable{form.variables.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Subject Preview */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5">
              <p className="text-xs text-[var(--neutral-gray)] mb-0.5">Subject</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {form.subject
                  ? form.subject.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, name) => SAMPLE_VARIABLES[name] ?? `[${name}]`)
                  : "No subject"}
              </p>
            </div>

            {/* HTML Preview */}
            <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
              <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-[var(--neutral-gray)]">Email Preview</span>
              </div>
              <div
                className="p-6 min-h-[300px] max-h-[600px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml || livePreview }}
              />
            </div>

            {/* Warnings */}
            {!form.bodyText && form.bodyHtml && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">No plain text fallback</p>
                  <p className="text-xs text-amber-600">Some email clients may not render HTML. Add a plain text version.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Email Template"
        message={`Are you sure you want to delete "${form.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
