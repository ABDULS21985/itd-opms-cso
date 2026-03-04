"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  1. Inline Text Editor                                              */
/* ------------------------------------------------------------------ */

interface InlineTextProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  validate?: (value: string) => string | null;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function InlineText({
  value,
  onSave,
  validate,
  placeholder,
  className,
  editable = true,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    if (validate) {
      const err = validate(draft);
      if (err) {
        setError(err);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
      setError(null);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!editing || !editable) {
    return (
      <span
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          setEditing(true);
        }}
        className={`${editable ? "cursor-text hover:bg-[var(--surface-2)]" : ""} px-1.5 py-0.5 -mx-1.5 rounded transition-colors ${className ?? ""}`}
        title={editable ? "Click to edit" : undefined}
      >
        {value || (
          <span className="text-[var(--neutral-gray)] italic">
            {placeholder || "Empty"}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        onBlur={handleSave}
        disabled={saving}
        className="w-full px-1.5 py-0.5 text-sm bg-[var(--surface-0)] border border-[var(--primary)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      />
      {saving && (
        <Loader2
          size={14}
          className="animate-spin text-[var(--primary)] flex-shrink-0"
        />
      )}
      {error && (
        <span className="text-xs text-[var(--error)] whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Inline Select Editor                                            */
/* ------------------------------------------------------------------ */

interface InlineSelectProps {
  value: string;
  options: { value: string; label: string; color?: string }[];
  onSave: (newValue: string) => Promise<void> | void;
  editable?: boolean;
  renderValue?: (value: string) => ReactNode;
}

export function InlineSelect({
  value,
  options,
  onSave,
  editable = true,
  renderValue,
}: InlineSelectProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const handleChange = async (newValue: string) => {
    if (newValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(newValue);
      setEditing(false);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!editing || !editable) {
    return (
      <span
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          setEditing(true);
        }}
        className={`${editable ? "cursor-pointer hover:ring-2 hover:ring-[var(--primary)]/20" : ""} rounded transition-all`}
        title={editable ? "Click to change" : undefined}
      >
        {renderValue ? renderValue(value) : value}
      </span>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setEditing(false)}
        disabled={saving}
        className="text-sm bg-[var(--surface-0)] border border-[var(--primary)] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Inline Date Editor                                              */
/* ------------------------------------------------------------------ */

interface InlineDateProps {
  value: string | null;
  onSave: (newValue: string) => Promise<void> | void;
  editable?: boolean;
  displayFormat?: (date: string) => string;
}

export function InlineDate({
  value,
  onSave,
  editable = true,
  displayFormat,
}: InlineDateProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const formatted = value
    ? displayFormat
      ? displayFormat(value)
      : new Date(value).toLocaleDateString()
    : "No date";

  if (!editing || !editable) {
    return (
      <span
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          setEditing(true);
        }}
        className={`${editable ? "cursor-pointer hover:bg-[var(--surface-2)]" : ""} px-1.5 py-0.5 -mx-1.5 rounded transition-colors`}
        title={editable ? "Click to change date" : undefined}
      >
        {formatted}
      </span>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="date"
        defaultValue={value?.split("T")[0] || ""}
        onChange={async (e) => {
          const newValue = e.target.value;
          if (!newValue || newValue === value?.split("T")[0]) {
            setEditing(false);
            return;
          }
          setSaving(true);
          try {
            await onSave(newValue);
            setEditing(false);
          } catch {
            toast.error("Failed to update date");
          } finally {
            setSaving(false);
          }
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        disabled={saving}
        className="text-sm bg-[var(--surface-0)] border border-[var(--primary)] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      />
    </div>
  );
}
