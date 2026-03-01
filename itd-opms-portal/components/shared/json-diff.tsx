"use client";

import { useMemo } from "react";
import { Minus, Plus, ArrowRight, Equal } from "lucide-react";

interface JsonDiffProps {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  className?: string;
}

type DiffType = "added" | "removed" | "changed" | "unchanged";

interface DiffEntry {
  key: string;
  type: DiffType;
  oldValue?: string;
  newValue?: string;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, path));
    } else {
      result[path] =
        typeof value === "object" ? JSON.stringify(value) : String(value ?? "null");
    }
  }
  return result;
}

function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): DiffEntry[] {
  const flatBefore = before ? flattenObject(before) : {};
  const flatAfter = after ? flattenObject(after) : {};
  const allKeys = new Set([...Object.keys(flatBefore), ...Object.keys(flatAfter)]);
  const entries: DiffEntry[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const inBefore = key in flatBefore;
    const inAfter = key in flatAfter;

    if (inBefore && !inAfter) {
      entries.push({ key, type: "removed", oldValue: flatBefore[key] });
    } else if (!inBefore && inAfter) {
      entries.push({ key, type: "added", newValue: flatAfter[key] });
    } else if (flatBefore[key] !== flatAfter[key]) {
      entries.push({
        key,
        type: "changed",
        oldValue: flatBefore[key],
        newValue: flatAfter[key],
      });
    } else {
      entries.push({ key, type: "unchanged", oldValue: flatBefore[key] });
    }
  }

  return entries;
}

const typeStyles: Record<DiffType, string> = {
  added: "bg-[var(--success-light)] text-[var(--success-dark,var(--success))]",
  removed: "bg-[var(--error-light)] text-[var(--error-dark,var(--error))]",
  changed: "bg-[var(--warning-light)] text-[var(--warning-dark,var(--warning))]",
  unchanged: "",
};

const typeIcons: Record<DiffType, typeof Plus> = {
  added: Plus,
  removed: Minus,
  changed: ArrowRight,
  unchanged: Equal,
};

export function JsonDiff({ before, after, className = "" }: JsonDiffProps) {
  const diff = useMemo(() => computeDiff(before, after), [before, after]);

  if (!before && !after) {
    return (
      <p className={`text-sm text-[var(--neutral-gray)] ${className}`}>
        No data available
      </p>
    );
  }

  if (!before) {
    return (
      <p className={`text-sm italic text-[var(--neutral-gray)] ${className}`}>
        No previous state — initial creation
      </p>
    );
  }

  if (!after) {
    return (
      <p className={`text-sm italic text-[var(--error)] ${className}`}>
        Record deleted
      </p>
    );
  }

  const changes = diff.filter((d) => d.type !== "unchanged");

  if (changes.length === 0) {
    return (
      <p className={`text-sm text-[var(--neutral-gray)] ${className}`}>No changes</p>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-sm ${className}`}
    >
      <div className="divide-y divide-[var(--border)]">
        {changes.map((entry) => {
          const Icon = typeIcons[entry.type];
          return (
            <div key={entry.key} className={`flex items-start gap-2 px-3 py-2 ${typeStyles[entry.type]}`}>
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-[140px] shrink-0 font-mono text-xs font-medium">
                {entry.key}
              </span>
              <span className="flex flex-wrap items-center gap-1 font-mono text-xs">
                {entry.type === "removed" && (
                  <span className="line-through opacity-75">{entry.oldValue}</span>
                )}
                {entry.type === "added" && <span>{entry.newValue}</span>}
                {entry.type === "changed" && (
                  <>
                    <span className="line-through opacity-60">{entry.oldValue}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
                    <span className="font-semibold">{entry.newValue}</span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
