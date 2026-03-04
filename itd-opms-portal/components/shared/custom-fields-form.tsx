"use client";

import { useMemo } from "react";
import { useCustomFieldDefinitions } from "@/hooks/use-custom-fields";
import type { CustomFieldDefinition } from "@/hooks/use-custom-fields";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

interface CustomFieldsFormProps {
  entityType: string;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  readOnly?: boolean;
}

/* ================================================================== */
/*  Field Renderers                                                     */
/* ================================================================== */

function TextInput({
  definition,
  value,
  onChange,
  readOnly,
}: {
  definition: CustomFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={definition.description || `Enter ${definition.fieldLabel}`}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 read-only:bg-[var(--surface-1)] read-only:cursor-default"
    />
  );
}

function TextareaInput({
  definition,
  value,
  onChange,
  readOnly,
}: {
  definition: CustomFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={definition.description || `Enter ${definition.fieldLabel}`}
      rows={3}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none read-only:bg-[var(--surface-1)] read-only:cursor-default"
    />
  );
}

function NumberInput({
  definition,
  value,
  onChange,
  readOnly,
  step,
}: {
  definition: CustomFieldDefinition;
  value: number | string;
  onChange: (v: number | string) => void;
  readOnly?: boolean;
  step?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "") {
          onChange("");
        } else {
          onChange(step === "0.01" ? parseFloat(val) : parseInt(val));
        }
      }}
      readOnly={readOnly}
      step={step}
      placeholder={definition.description || `Enter ${definition.fieldLabel}`}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 read-only:bg-[var(--surface-1)] read-only:cursor-default"
    />
  );
}

function BooleanInput({
  definition,
  value,
  onChange,
  readOnly,
}: {
  definition: CustomFieldDefinition;
  value: boolean;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!readOnly) onChange(!value);
      }}
      disabled={readOnly}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60 disabled:cursor-not-allowed ${
        value ? "bg-[var(--primary)]" : "bg-[var(--surface-2)]"
      }`}
      role="switch"
      aria-checked={value}
      aria-label={definition.fieldLabel}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function DateInput({
  definition: _definition,
  value,
  onChange,
  readOnly,
  includeTime,
}: {
  definition: CustomFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  includeTime?: boolean;
}) {
  return (
    <input
      type={includeTime ? "datetime-local" : "date"}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 read-only:bg-[var(--surface-1)] read-only:cursor-default"
    />
  );
}

function SelectInput({
  definition,
  value,
  onChange,
  readOnly,
}: {
  definition: CustomFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const options: string[] = useMemo(() => {
    if (
      definition.validationRules &&
      typeof definition.validationRules === "object"
    ) {
      const rules = definition.validationRules as Record<string, unknown>;
      if (Array.isArray(rules.options)) {
        return rules.options as string[];
      }
    }
    return [];
  }, [definition.validationRules]);

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:bg-[var(--surface-1)] disabled:cursor-not-allowed"
    >
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function MultiSelectInput({
  definition,
  value,
  onChange,
  readOnly,
}: {
  definition: CustomFieldDefinition;
  value: string[];
  onChange: (v: string[]) => void;
  readOnly?: boolean;
}) {
  const options: string[] = useMemo(() => {
    if (
      definition.validationRules &&
      typeof definition.validationRules === "object"
    ) {
      const rules = definition.validationRules as Record<string, unknown>;
      if (Array.isArray(rules.options)) {
        return rules.options as string[];
      }
    }
    return [];
  }, [definition.validationRules]);

  const selected = Array.isArray(value) ? value : [];

  function toggleOption(opt: string) {
    if (readOnly) return;
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggleOption(opt)}
            disabled={readOnly}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed ${
              isSelected
                ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--neutral-gray)] hover:border-[var(--primary)]/20"
            }`}
          >
            {opt}
          </button>
        );
      })}
      {options.length === 0 && (
        <p className="text-xs text-[var(--neutral-gray)]">
          No options defined in validation rules.
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Dynamic Field Renderer                                              */
/* ================================================================== */

function CustomFieldInput({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: {
  definition: CustomFieldDefinition;
  value: any;
  onChange: (v: any) => void;
  readOnly?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
        {definition.fieldLabel}
        {definition.isRequired && (
          <span className="ml-1 text-[var(--error)]">*</span>
        )}
      </label>
      {definition.description && (
        <p className="mb-1.5 text-xs text-[var(--neutral-gray)]">
          {definition.description}
        </p>
      )}

      {definition.fieldType === "text" && (
        <TextInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "textarea" && (
        <TextareaInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "number" && (
        <NumberInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "decimal" && (
        <NumberInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          step="0.01"
        />
      )}
      {definition.fieldType === "boolean" && (
        <BooleanInput
          definition={definition}
          value={!!value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "date" && (
        <DateInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "datetime" && (
        <DateInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          includeTime
        />
      )}
      {definition.fieldType === "select" && (
        <SelectInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "multiselect" && (
        <MultiSelectInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "url" && (
        <TextInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "email" && (
        <TextInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "phone" && (
        <TextInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}
      {definition.fieldType === "user_reference" && (
        <TextInput
          definition={definition}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )}

      {error && (
        <p className="mt-1 text-xs text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Form Component                                                 */
/* ================================================================== */

export function CustomFieldsForm({
  entityType,
  values,
  onChange,
  readOnly = false,
}: CustomFieldsFormProps) {
  const { data: definitions, isLoading } =
    useCustomFieldDefinitions(entityType);

  const validationErrors = useMemo(() => {
    if (!definitions) return {};
    const errors: Record<string, string> = {};
    for (const def of definitions) {
      if (def.isRequired) {
        const val = values[def.fieldKey];
        if (val === undefined || val === null || val === "") {
          errors[def.fieldKey] = `${def.fieldLabel} is required`;
        }
      }
    }
    return errors;
  }, [definitions, values]);

  function handleFieldChange(fieldKey: string, fieldValue: any) {
    onChange({
      ...values,
      [fieldKey]: fieldValue,
    });
  }

  // Don't render if there are no definitions.
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 py-2">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Custom Fields
          </span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 animate-pulse rounded-md bg-[var(--surface-2)]" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    );
  }

  if (!definitions || definitions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Divider */}
      <div className="flex items-center gap-2 py-2">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
          Custom Fields
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {definitions.map((def: CustomFieldDefinition) => {
          // Full-width for textarea and multiselect.
          const isFullWidth =
            def.fieldType === "textarea" || def.fieldType === "multiselect";

          return (
            <div
              key={def.id}
              className={isFullWidth ? "sm:col-span-2" : ""}
            >
              <CustomFieldInput
                definition={def}
                value={values[def.fieldKey]}
                onChange={(v) => handleFieldChange(def.fieldKey, v)}
                readOnly={readOnly}
                error={validationErrors[def.fieldKey]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
