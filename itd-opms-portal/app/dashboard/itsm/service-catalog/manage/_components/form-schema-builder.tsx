"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
  Type,
  AlignLeft,
  ChevronDownCircle,
  List,
  Calendar,
  Upload,
  SquareCheck,
  Circle,
  Hash,
  Mail,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FormSchema,
  FormSchemaField,
  FormFieldOption,
  FormFieldCondition,
  FormFieldValidation,
} from "@/components/shared/dynamic-form-renderer";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FormSchemaBuilderProps {
  value: FormSchema;
  onChange: (schema: FormSchema) => void;
}

type FieldType = FormSchemaField["type"];

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FIELD_TYPE_CONFIG: Record<
  FieldType,
  { label: string; icon: React.ElementType }
> = {
  text: { label: "Text", icon: Type },
  textarea: { label: "Textarea", icon: AlignLeft },
  select: { label: "Select", icon: ChevronDownCircle },
  multi_select: { label: "Multi Select", icon: List },
  date: { label: "Date", icon: Calendar },
  file: { label: "File Upload", icon: Upload },
  checkbox: { label: "Checkbox", icon: SquareCheck },
  radio: { label: "Radio", icon: Circle },
  number: { label: "Number", icon: Hash },
  email: { label: "Email", icon: Mail },
};

const CONDITION_OPERATORS: {
  value: FormFieldCondition["operator"];
  label: string;
}[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_empty", label: "Not Empty" },
];

const HAS_OPTIONS: FieldType[] = ["select", "multi_select", "radio"];

const TEXT_LIKE_TYPES: FieldType[] = [
  "text",
  "textarea",
  "email",
];

const inputBaseClass =
  "w-full rounded-xl border bg-[var(--surface-0)] text-sm transition-all duration-200 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] " +
  "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] border-[var(--border)]";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toSnakeCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function generateUniqueName(
  baseName: string,
  existingNames: string[],
  excludeName?: string,
): string {
  const filtered = existingNames.filter((n) => n !== excludeName);
  if (!filtered.includes(baseName)) return baseName;

  let counter = 2;
  while (filtered.includes(`${baseName}_${counter}`)) {
    counter++;
  }
  return `${baseName}_${counter}`;
}

/* ------------------------------------------------------------------ */
/*  Inline Input                                                       */
/* ------------------------------------------------------------------ */

function BuilderInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(
          inputBaseClass,
          "h-9 px-3",
          readOnly && "opacity-60 cursor-not-allowed bg-[var(--surface-1)]",
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
    >
      <div
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors duration-200",
          checked ? "bg-[var(--primary)]" : "bg-[var(--surface-2)]",
        )}
      >
        <motion.div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Options Editor                                                     */
/* ------------------------------------------------------------------ */

function OptionsEditor({
  options,
  onChange,
}: {
  options: FormFieldOption[];
  onChange: (opts: FormFieldOption[]) => void;
}) {
  const addOption = () => {
    onChange([...options, { value: "", label: "" }]);
  };

  const updateOption = (
    index: number,
    field: "value" | "label",
    val: string,
  ) => {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, [field]: val } : opt,
    );
    onChange(updated);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
        Options
      </label>
      <div className="space-y-2">
        {options.map((opt, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={opt.value}
              onChange={(e) => updateOption(index, "value", e.target.value)}
              placeholder="Value"
              className={cn(inputBaseClass, "h-8 px-2.5 flex-1")}
            />
            <input
              type="text"
              value={opt.label}
              onChange={(e) => updateOption(index, "label", e.target.value)}
              placeholder="Label"
              className={cn(inputBaseClass, "h-8 px-2.5 flex-1")}
            />
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="flex-shrink-0 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
      >
        <Plus size={12} />
        Add Option
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Validation Editor                                                  */
/* ------------------------------------------------------------------ */

function ValidationEditor({
  fieldType,
  validation,
  onChange,
}: {
  fieldType: FieldType;
  validation: FormFieldValidation;
  onChange: (val: FormFieldValidation) => void;
}) {
  const isTextLike = TEXT_LIKE_TYPES.includes(fieldType);
  const isNumber = fieldType === "number";

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        Validation
      </label>

      <Toggle
        label="Required"
        checked={validation.required ?? false}
        onChange={(val) => onChange({ ...validation, required: val })}
      />

      {isTextLike && (
        <div className="grid grid-cols-2 gap-3">
          <BuilderInput
            label="Min Length"
            type="number"
            value={validation.minLength ?? ""}
            onChange={(val) =>
              onChange({
                ...validation,
                minLength: val ? parseInt(val, 10) : undefined,
              })
            }
            placeholder="0"
          />
          <BuilderInput
            label="Max Length"
            type="number"
            value={validation.maxLength ?? ""}
            onChange={(val) =>
              onChange({
                ...validation,
                maxLength: val ? parseInt(val, 10) : undefined,
              })
            }
            placeholder="255"
          />
        </div>
      )}

      {isTextLike && (
        <div className="space-y-2">
          <BuilderInput
            label="Pattern (Regex)"
            value={validation.pattern ?? ""}
            onChange={(val) =>
              onChange({ ...validation, pattern: val || undefined })
            }
            placeholder="^[a-zA-Z]+$"
          />
          <BuilderInput
            label="Pattern Error Message"
            value={validation.patternMessage ?? ""}
            onChange={(val) =>
              onChange({ ...validation, patternMessage: val || undefined })
            }
            placeholder="Invalid format"
          />
        </div>
      )}

      {isNumber && (
        <div className="grid grid-cols-2 gap-3">
          <BuilderInput
            label="Minimum"
            type="number"
            value={validation.min ?? ""}
            onChange={(val) =>
              onChange({
                ...validation,
                min: val ? parseFloat(val) : undefined,
              })
            }
            placeholder="0"
          />
          <BuilderInput
            label="Maximum"
            type="number"
            value={validation.max ?? ""}
            onChange={(val) =>
              onChange({
                ...validation,
                max: val ? parseFloat(val) : undefined,
              })
            }
            placeholder="100"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Condition Editor                                                   */
/* ------------------------------------------------------------------ */

function ConditionEditor({
  condition,
  otherFields,
  onChange,
  onClear,
}: {
  condition: FormFieldCondition | undefined;
  otherFields: FormSchemaField[];
  onChange: (cond: FormFieldCondition) => void;
  onClear: () => void;
}) {
  const hasCondition = !!condition;

  if (!hasCondition) {
    return (
      <div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Conditional Visibility
        </label>
        {otherFields.length === 0 ? (
          <p className="text-xs text-[var(--neutral-gray)]">
            Add more fields to enable conditional visibility.
          </p>
        ) : (
          <button
            type="button"
            onClick={() =>
              onChange({
                field: otherFields[0].name,
                operator: "not_empty",
              })
            }
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
          >
            <Eye size={12} />
            Add Condition
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Conditional Visibility
        </label>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-[var(--error)] hover:text-[var(--error)]/80 transition-colors"
        >
          <EyeOff size={10} />
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Field
          </label>
          <div className="relative">
            <select
              value={condition.field}
              onChange={(e) =>
                onChange({ ...condition, field: e.target.value })
              }
              className={cn(
                inputBaseClass,
                "h-8 px-2.5 pr-8 appearance-none",
              )}
            >
              {otherFields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Operator
          </label>
          <div className="relative">
            <select
              value={condition.operator}
              onChange={(e) =>
                onChange({
                  ...condition,
                  operator: e.target.value as FormFieldCondition["operator"],
                })
              }
              className={cn(
                inputBaseClass,
                "h-8 px-2.5 pr-8 appearance-none",
              )}
            >
              {CONDITION_OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none"
            />
          </div>
        </div>
        {condition.operator !== "not_empty" && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Value
            </label>
            <input
              type="text"
              value={condition.value ?? ""}
              onChange={(e) =>
                onChange({ ...condition, value: e.target.value })
              }
              placeholder="Expected value"
              className={cn(inputBaseClass, "h-8 px-2.5")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field Editor Panel (inline expand below card)                      */
/* ------------------------------------------------------------------ */

function FieldEditorPanel({
  field,
  allFields,
  onUpdate,
  onDone,
}: {
  field: FormSchemaField;
  allFields: FormSchemaField[];
  onUpdate: (updated: FormSchemaField) => void;
  onDone: () => void;
}) {
  const otherFields = allFields.filter((f) => f.name !== field.name);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="rounded-b-xl border border-t-0 border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-4">
        {/* Basic fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BuilderInput
            label="Label"
            value={field.label}
            onChange={(val) => onUpdate({ ...field, label: val })}
            placeholder="Field label"
          />
          <BuilderInput
            label="Name (ID)"
            value={field.name}
            onChange={() => {}}
            readOnly
            placeholder="field_name"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BuilderInput
            label="Placeholder"
            value={field.placeholder ?? ""}
            onChange={(val) =>
              onUpdate({ ...field, placeholder: val || undefined })
            }
            placeholder="Enter placeholder text..."
          />
          <BuilderInput
            label="Description"
            value={field.description ?? ""}
            onChange={(val) =>
              onUpdate({ ...field, description: val || undefined })
            }
            placeholder="Help text shown below field"
          />
        </div>

        {/* Options editor */}
        {HAS_OPTIONS.includes(field.type) && (
          <OptionsEditor
            options={field.options ?? []}
            onChange={(opts) => onUpdate({ ...field, options: opts })}
          />
        )}

        {/* Validation */}
        <ValidationEditor
          fieldType={field.type}
          validation={field.validation ?? {}}
          onChange={(val) => onUpdate({ ...field, validation: val })}
        />

        {/* Condition */}
        <ConditionEditor
          condition={field.condition}
          otherFields={otherFields}
          onChange={(cond) => onUpdate({ ...field, condition: cond })}
          onClear={() => onUpdate({ ...field, condition: undefined })}
        />

        {/* Done button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onDone}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Check size={14} />
            Done
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable Field Card                                                */
/* ------------------------------------------------------------------ */

function SortableFieldCard({
  field,
  allFields,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
  onDoneEditing,
}: {
  field: FormSchemaField;
  allFields: FormSchemaField[];
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: FormSchemaField) => void;
  onDoneEditing: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.name,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const TypeIcon = FIELD_TYPE_CONFIG[field.type]?.icon ?? FileText;
  const typeLabel = FIELD_TYPE_CONFIG[field.type]?.label ?? field.type;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "flex items-center gap-3 border bg-[var(--surface-0)] px-4 py-3 transition-all duration-200",
          isEditing
            ? "rounded-t-xl border-[var(--primary)]/40 border-b-transparent"
            : "rounded-xl border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-sm",
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 rounded-lg text-[var(--neutral-gray)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing transition-colors"
          aria-label={`Reorder ${field.label}`}
        >
          <GripVertical size={16} />
        </button>

        {/* Type icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <TypeIcon size={14} className="text-[var(--primary)]" />
        </div>

        {/* Label + name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {field.label || "Untitled Field"}
          </p>
          <p className="text-xs text-[var(--neutral-gray)] truncate">
            {field.name}
          </p>
        </div>

        {/* Type badge */}
        <span className="flex-shrink-0 inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
          {typeLabel}
        </span>

        {/* Required badge */}
        {field.validation?.required && (
          <span className="flex-shrink-0 inline-flex items-center rounded-full bg-[var(--error)]/10 px-2 py-0.5 text-xs font-medium text-[var(--error)]">
            Required
          </span>
        )}

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
            aria-label={`Edit ${field.label}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
            aria-label={`Delete ${field.label}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Inline editor */}
      <AnimatePresence>
        {isEditing && (
          <FieldEditorPanel
            field={field}
            allFields={allFields}
            onUpdate={onUpdate}
            onDone={onDoneEditing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag Overlay Card (ghost shown while dragging)                     */
/* ------------------------------------------------------------------ */

function DragOverlayCard({ field }: { field: FormSchemaField }) {
  const TypeIcon = FIELD_TYPE_CONFIG[field.type]?.icon ?? FileText;
  const typeLabel = FIELD_TYPE_CONFIG[field.type]?.label ?? field.type;

  return (
    <div
      className="flex items-center gap-3 border border-[var(--primary)]/40 bg-[var(--surface-0)] rounded-xl px-4 py-3 shadow-xl"
      style={{ transform: "rotate(2deg)", opacity: 0.92 }}
    >
      <GripVertical size={16} className="text-[var(--neutral-gray)]" />
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
        <TypeIcon size={14} className="text-[var(--primary)]" />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">
        {field.label || "Untitled Field"}
      </p>
      <span className="flex-shrink-0 inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
        {typeLabel}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Field Panel                                                    */
/* ------------------------------------------------------------------ */

function AddFieldPanel({
  existingNames,
  onAdd,
  onCancel,
}: {
  existingNames: string[];
  onAdd: (field: FormSchemaField) => void;
  onCancel: () => void;
}) {
  const [selectedType, setSelectedType] = useState<FieldType | null>(null);
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [description, setDescription] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!nameManuallyEdited) {
      const snake = toSnakeCase(val);
      setName(snake ? generateUniqueName(snake, existingNames) : "");
    }
  };

  const handleNameChange = (val: string) => {
    setNameManuallyEdited(true);
    setName(toSnakeCase(val));
  };

  const handleAdd = () => {
    if (!selectedType || !label.trim() || !name.trim()) return;

    const uniqueName = generateUniqueName(name, existingNames);

    const newField: FormSchemaField = {
      name: uniqueName,
      type: selectedType,
      label: label.trim(),
      ...(placeholder && { placeholder }),
      ...(description && { description }),
      ...(HAS_OPTIONS.includes(selectedType) && {
        options: [
          { value: "option_1", label: "Option 1" },
          { value: "option_2", label: "Option 2" },
        ],
      }),
    };

    onAdd(newField);
  };

  const canAdd = selectedType && label.trim() && name.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-[var(--primary)]/30 bg-[var(--surface-0)] p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Add New Field
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Type selection grid */}
      {!selectedType && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
            Select Field Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.entries(FIELD_TYPE_CONFIG) as [FieldType, typeof FIELD_TYPE_CONFIG[FieldType]][]).map(
              ([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 text-[var(--text-secondary)] transition-all duration-150 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
                  >
                    <Icon size={18} />
                    <span className="text-xs font-medium">{config.label}</span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Field details form (after type is selected) */}
      {selectedType && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className="text-xs text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
            >
              Change type
            </button>
            <span className="text-xs text-[var(--neutral-gray)]">/</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-primary)]">
              {(() => {
                const Icon = FIELD_TYPE_CONFIG[selectedType].icon;
                return <Icon size={12} />;
              })()}
              {FIELD_TYPE_CONFIG[selectedType].label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BuilderInput
              label="Label *"
              value={label}
              onChange={handleLabelChange}
              placeholder="e.g. Employee Name"
            />
            <BuilderInput
              label="Name (ID) *"
              value={name}
              onChange={handleNameChange}
              placeholder="employee_name"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BuilderInput
              label="Placeholder"
              value={placeholder}
              onChange={setPlaceholder}
              placeholder="Placeholder text..."
            />
            <BuilderInput
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Help text..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all",
                canAdd
                  ? "bg-[var(--primary)] hover:opacity-90"
                  : "bg-[var(--primary)]/40 cursor-not-allowed",
              )}
            >
              <Plus size={14} />
              Add Field
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  FormSchemaBuilder (main exported component)                        */
/* ------------------------------------------------------------------ */

export function FormSchemaBuilder({ value, onChange }: FormSchemaBuilderProps) {
  const [editingFieldName, setEditingFieldName] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fields = value.fields;
  const fieldNames = useMemo(() => fields.map((f) => f.name), [fields]);
  const fieldIds = useMemo(() => fields.map((f) => f.name), [fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* ---- Field CRUD ---- */

  const addField = useCallback(
    (field: FormSchemaField) => {
      onChange({ fields: [...fields, field] });
      setIsAdding(false);
      setEditingFieldName(field.name);
    },
    [fields, onChange],
  );

  const updateField = useCallback(
    (updated: FormSchemaField) => {
      onChange({
        fields: fields.map((f) =>
          f.name === updated.name ? updated : f,
        ),
      });
    },
    [fields, onChange],
  );

  const deleteField = useCallback(
    (name: string) => {
      onChange({ fields: fields.filter((f) => f.name !== name) });
      if (editingFieldName === name) setEditingFieldName(null);
    },
    [fields, onChange, editingFieldName],
  );

  /* ---- Drag handlers ---- */

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = fields.findIndex((f) => f.name === active.id);
      const newIndex = fields.findIndex((f) => f.name === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onChange({ fields: arrayMove(fields, oldIndex, newIndex) });
      }
    },
    [fields, onChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeField = activeId
    ? fields.find((f) => f.name === activeId) ?? null
    : null;

  /* ---- Render ---- */

  return (
    <div className="space-y-3">
      {/* Field list */}
      {fields.length === 0 && !isAdding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-12 px-6"
        >
          <FileText
            size={40}
            className="text-[var(--text-secondary)] mb-3 opacity-40"
          />
          <p className="text-sm text-[var(--text-secondary)] text-center max-w-sm">
            No form fields yet. Add fields to create a custom request form.
          </p>
        </motion.div>
      )}

      {fields.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={fieldIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {fields.map((field) => (
                <SortableFieldCard
                  key={field.name}
                  field={field}
                  allFields={fields}
                  isEditing={editingFieldName === field.name}
                  onEdit={() =>
                    setEditingFieldName(
                      editingFieldName === field.name ? null : field.name,
                    )
                  }
                  onDelete={() => deleteField(field.name)}
                  onUpdate={updateField}
                  onDoneEditing={() => setEditingFieldName(null)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeField ? <DragOverlayCard field={activeField} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add field panel / button */}
      <AnimatePresence mode="wait">
        {isAdding ? (
          <AddFieldPanel
            key="add-panel"
            existingNames={fieldNames}
            onAdd={addField}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <motion.button
            key="add-button"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-3 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5"
          >
            <Plus size={16} />
            Add Field
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
