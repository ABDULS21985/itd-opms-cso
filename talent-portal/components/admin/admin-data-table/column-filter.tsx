"use client";

import { useState, useEffect } from "react";
import type { ColumnFilter as ColumnFilterConfig } from "./types";

interface ColumnFilterProps {
  config: ColumnFilterConfig;
  value: any;
  onChange: (value: any) => void;
}

const inputClass =
  "h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors";

export function ColumnFilterControl({
  config,
  value,
  onChange,
}: ColumnFilterProps) {
  switch (config.type) {
    case "text":
      return <TextFilter value={value} onChange={onChange} placeholder={config.placeholder} />;
    case "select":
      return (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={inputClass}
        >
          <option value="">All</option>
          {config.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "date-range":
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={Array.isArray(value) ? value[0] ?? "" : ""}
            onChange={(e) =>
              onChange([e.target.value, Array.isArray(value) ? value[1] ?? "" : ""])
            }
            className={`${inputClass} w-[130px]`}
          />
          <span className="text-xs text-[var(--neutral-gray)]">to</span>
          <input
            type="date"
            value={Array.isArray(value) ? value[1] ?? "" : ""}
            onChange={(e) =>
              onChange([Array.isArray(value) ? value[0] ?? "" : "", e.target.value])
            }
            className={`${inputClass} w-[130px]`}
          />
        </div>
      );
    case "number-range":
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={Array.isArray(value) ? value[0] ?? "" : ""}
            onChange={(e) =>
              onChange([e.target.value, Array.isArray(value) ? value[1] ?? "" : ""])
            }
            placeholder="Min"
            className={`${inputClass} w-[80px]`}
          />
          <span className="text-xs text-[var(--neutral-gray)]">-</span>
          <input
            type="number"
            value={Array.isArray(value) ? value[1] ?? "" : ""}
            onChange={(e) =>
              onChange([Array.isArray(value) ? value[0] ?? "" : "", e.target.value])
            }
            placeholder="Max"
            className={`${inputClass} w-[80px]`}
          />
        </div>
      );
    default:
      return null;
  }
}

/** Text input with local debounce to avoid excessive parent updates */
function TextFilter({
  value,
  onChange,
  placeholder,
}: {
  value: any;
  onChange: (v: any) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== (value ?? "")) onChange(local || undefined);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder ?? "Filter..."}
      className={inputClass}
    />
  );
}
