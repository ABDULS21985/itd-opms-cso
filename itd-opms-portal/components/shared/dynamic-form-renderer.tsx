"use client";

import { useState, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  Upload,
  X,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Form Schema Types                                                  */
/* ------------------------------------------------------------------ */

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_empty";
  value?: string;
}

export interface FormSchemaField {
  name: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "multi_select"
    | "date"
    | "file"
    | "checkbox"
    | "radio"
    | "number"
    | "email";
  label: string;
  placeholder?: string;
  description?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  condition?: FormFieldCondition;
  defaultValue?: string | string[] | boolean;
}

export interface FormSchema {
  fields: FormSchemaField[];
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

function validateField(
  field: FormSchemaField,
  value: unknown,
): string | undefined {
  const v = field.validation;
  if (!v) return undefined;

  const strVal = typeof value === "string" ? value : "";
  const arrVal = Array.isArray(value) ? value : [];

  if (v.required) {
    if (field.type === "multi_select" && arrVal.length === 0)
      return `${field.label} is required`;
    if (field.type === "checkbox" && value !== true)
      return `${field.label} must be checked`;
    if (field.type === "file" && arrVal.length === 0)
      return `${field.label} is required`;
    if (
      !["multi_select", "checkbox", "file"].includes(field.type) &&
      !strVal.trim()
    )
      return `${field.label} is required`;
  }

  if (strVal && v.minLength && strVal.length < v.minLength)
    return `${field.label} must be at least ${v.minLength} characters`;

  if (strVal && v.maxLength && strVal.length > v.maxLength)
    return `${field.label} must be at most ${v.maxLength} characters`;

  if (strVal && v.pattern) {
    try {
      const re = new RegExp(v.pattern);
      if (!re.test(strVal))
        return v.patternMessage || `${field.label} format is invalid`;
    } catch {
      // ignore bad regex
    }
  }

  if (field.type === "number" && strVal) {
    const num = Number(strVal);
    if (isNaN(num)) return `${field.label} must be a number`;
    if (v.min !== undefined && num < v.min)
      return `${field.label} must be at least ${v.min}`;
    if (v.max !== undefined && num > v.max)
      return `${field.label} must be at most ${v.max}`;
  }

  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Condition Evaluation                                               */
/* ------------------------------------------------------------------ */

function evaluateCondition(
  condition: FormFieldCondition | undefined,
  formData: Record<string, unknown>,
): boolean {
  if (!condition) return true;

  const fieldValue = formData[condition.field];
  const strValue = typeof fieldValue === "string" ? fieldValue : "";

  switch (condition.operator) {
    case "equals":
      return strValue === condition.value;
    case "not_equals":
      return strValue !== condition.value;
    case "contains":
      return strValue.includes(condition.value || "");
    case "not_empty":
      return !!strValue.trim();
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
    >
      {label}
      {required && <span className="text-[var(--error)] ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          className="flex items-center gap-1 text-xs text-[var(--error)] mt-1.5 font-medium"
        >
          <AlertCircle size={12} />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function FieldDescription({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs text-[var(--neutral-gray)] mt-1">{text}</p>;
}

const inputBaseClass =
  "w-full rounded-xl border bg-[var(--surface-0)] text-sm transition-all duration-200 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] " +
  "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]";

/* ------------------------------------------------------------------ */
/*  Individual Field Renderers                                         */
/* ------------------------------------------------------------------ */

function TextField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        required={field.validation?.required}
      />
      <input
        id={id}
        type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cn(
          inputBaseClass,
          "h-10 px-3.5",
          error ? "border-[var(--error)]" : "border-[var(--border)]",
        )}
      />
      <FieldError error={error} />
      {!error && <FieldDescription text={field.description} />}
    </div>
  );
}

function TextareaField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        required={field.validation?.required}
      />
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={cn(
          inputBaseClass,
          "px-3.5 py-2.5 resize-none",
          error ? "border-[var(--error)]" : "border-[var(--border)]",
        )}
      />
      {field.validation?.maxLength && (
        <p className="text-xs text-[var(--text-secondary)] mt-1 text-right">
          {value.length}/{field.validation.maxLength}
        </p>
      )}
      <FieldError error={error} />
      {!error && <FieldDescription text={field.description} />}
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        required={field.validation?.required}
      />
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            inputBaseClass,
            "h-10 px-3.5 pr-10 appearance-none",
            error ? "border-[var(--error)]" : "border-[var(--border)]",
          )}
        >
          <option value="">{field.placeholder || "Select..."}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none"
        />
      </div>
      <FieldError error={error} />
      {!error && <FieldDescription text={field.description} />}
    </div>
  );
}

function MultiSelectField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  id: string;
}) {
  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        required={field.validation?.required}
      />
      <div className="space-y-1.5">
        {field.options?.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2 text-sm transition-all duration-150",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                    selected
                      ? "bg-[var(--primary)] border-[var(--primary)]"
                      : "border-[var(--border)]",
                  )}
                >
                  {selected && <Check size={10} className="text-white" />}
                </div>
                {opt.label}
              </div>
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
      {!error && <FieldDescription text={field.description} />}
    </div>
  );
}

function DateField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        required={field.validation?.required}
      />
      <div className="relative">
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            inputBaseClass,
            "h-10 px-3.5",
            error ? "border-[var(--error)]" : "border-[var(--border)]",
          )}
        />
        <Calendar
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none"
        />
      </div>
      <FieldError error={error} />
      {!error && <FieldDescription text={field.description} />}
    </div>
  );
}

function FileField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: File[];
  onChange: (v: File[]) => void;
  error?: string;
  id: string;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      onChange([...value, ...Array.from(files)]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        required={field.validation?.required}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200",
          "hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5",
          error
            ? "border-[var(--error)]"
            : "border-[var(--border)] bg-[var(--surface-0)]",
        )}
      >
        <Upload size={20} className="text-[var(--text-secondary)]" />
        <span className="text-sm text-[var(--text-secondary)]">
          Click to upload or drag and drop
        </span>
        <input
          id={id}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      {value.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {value.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm"
            >
              <span className="text-[var(--text-primary)] truncate mr-2">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <FieldError error={error} />
      {!error && <FieldDescription text={field.description} />}
    </div>
  );
}

function CheckboxField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <button
        id={id}
        type="button"
        onClick={() => onChange(!value)}
        className="flex items-start gap-3 w-full text-left"
      >
        <div
          className={cn(
            "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
            value
              ? "bg-[var(--primary)] border-[var(--primary)]"
              : "border-[var(--border)]",
          )}
        >
          {value && <Check size={12} className="text-white" />}
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {field.label}
            {field.validation?.required && (
              <span className="text-[var(--error)] ml-0.5">*</span>
            )}
          </span>
          {field.description && (
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
              {field.description}
            </p>
          )}
        </div>
      </button>
      <FieldError error={error} />
    </div>
  );
}

function RadioField({
  field,
  value,
  onChange,
  error,
  id,
}: {
  field: FormSchemaField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        required={field.validation?.required}
      />
      <div className="space-y-1.5">
        {field.options?.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all duration-150",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                    selected
                      ? "border-[var(--primary)]"
                      : "border-[var(--border)]",
                  )}
                >
                  {selected && (
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  )}
                </div>
                {opt.label}
              </div>
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
      {!error && <FieldDescription text={field.description} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DynamicFormRenderer                                           */
/* ------------------------------------------------------------------ */

interface DynamicFormRendererProps {
  schema: FormSchema;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function DynamicFormRenderer({
  schema,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Submit Request",
}: DynamicFormRendererProps) {
  const formId = useId();
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (field.defaultValue !== undefined) {
        initial[field.name] = field.defaultValue;
      } else if (field.type === "multi_select") {
        initial[field.name] = [];
      } else if (field.type === "file") {
        initial[field.name] = [];
      } else if (field.type === "checkbox") {
        initial[field.name] = false;
      } else {
        initial[field.name] = "";
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const updateField = useCallback(
    (name: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setTouched((prev) => ({ ...prev, [name]: true }));
      // Clear error on change
      if (errors[name]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    [errors],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const visibleFields = schema.fields.filter((f) =>
      evaluateCondition(f.condition, formData),
    );

    for (const field of visibleFields) {
      const err = validateField(field, formData[field.name]);
      if (err) newErrors[field.name] = err;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(
        Object.fromEntries(visibleFields.map((f) => [f.name, true])),
      );
      return;
    }

    // Build clean data, only visible fields, excluding files (which need separate handling)
    const submitData: Record<string, unknown> = {};
    for (const field of visibleFields) {
      if (field.type !== "file") {
        submitData[field.name] = formData[field.name];
      }
    }

    onSubmit(submitData);
  };

  const visibleFields = schema.fields.filter((f) =>
    evaluateCondition(f.condition, formData),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AnimatePresence mode="popLayout">
        {visibleFields.map((field, index) => {
          const id = `${formId}-${field.name}`;
          const error = touched[field.name] ? errors[field.name] : undefined;

          return (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              {(field.type === "text" ||
                field.type === "email" ||
                field.type === "number") && (
                <TextField
                  field={field}
                  value={(formData[field.name] as string) || ""}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}

              {field.type === "textarea" && (
                <TextareaField
                  field={field}
                  value={(formData[field.name] as string) || ""}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}

              {field.type === "select" && (
                <SelectField
                  field={field}
                  value={(formData[field.name] as string) || ""}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}

              {field.type === "multi_select" && (
                <MultiSelectField
                  field={field}
                  value={(formData[field.name] as string[]) || []}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}

              {field.type === "date" && (
                <DateField
                  field={field}
                  value={(formData[field.name] as string) || ""}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}

              {field.type === "file" && (
                <FileField
                  field={field}
                  value={(formData[field.name] as File[]) || []}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}

              {field.type === "checkbox" && (
                <CheckboxField
                  field={field}
                  value={(formData[field.name] as boolean) || false}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}

              {field.type === "radio" && (
                <RadioField
                  field={field}
                  value={(formData[field.name] as string) || ""}
                  onChange={(v) => updateField(field.name, v)}
                  error={error}
                  id={id}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
        className={cn(
          "w-full rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200",
          isSubmitting
            ? "bg-[var(--primary)]/60 cursor-not-allowed"
            : "bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-md",
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Processing...
          </span>
        ) : (
          submitLabel
        )}
      </motion.button>
    </form>
  );
}
