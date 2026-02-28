"use client";

import { useMemo } from "react";
import { useCustomFieldDefinitions } from "@/hooks/use-custom-fields";
import type { CustomFieldDefinition } from "@/hooks/use-custom-fields";
import type { Column } from "@/components/shared/data-table";

/* ================================================================== */
/*  Value Formatters                                                    */
/* ================================================================== */

/**
 * Formats a custom field value for display in a table cell.
 */
function formatCustomFieldValue(
  fieldType: string,
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  switch (fieldType) {
    case "boolean":
      return value === true || value === "true" ? "Yes" : "No";

    case "date":
      if (typeof value === "string") {
        try {
          const date = new Date(value);
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          return String(value);
        }
      }
      return String(value);

    case "datetime":
      if (typeof value === "string") {
        try {
          const date = new Date(value);
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return String(value);
        }
      }
      return String(value);

    case "multiselect":
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return String(value);

    case "number":
      if (typeof value === "number") {
        return value.toLocaleString();
      }
      return String(value);

    case "decimal":
      if (typeof value === "number") {
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return String(value);

    case "url":
      return String(value);

    case "email":
      return String(value);

    default:
      return String(value);
  }
}

/* ================================================================== */
/*  Hook                                                                */
/* ================================================================== */

/**
 * Returns DataTable Column definitions for custom fields that have
 * `isVisibleInList` set to true for the given entity type.
 *
 * Each column renders the appropriate formatted value from the row's
 * `customFields` property.
 *
 * @example
 * ```tsx
 * const customCols = useCustomFieldColumns<Ticket>("ticket");
 * const allColumns = [...builtInColumns, ...customCols];
 * ```
 */
export function useCustomFieldColumns<
  T extends { customFields?: Record<string, any> },
>(entityType: string): Column<T>[] {
  const { data: definitions } = useCustomFieldDefinitions(entityType);

  const columns = useMemo(() => {
    if (!definitions || definitions.length === 0) {
      return [];
    }

    return definitions
      .filter((def: CustomFieldDefinition) => def.isVisibleInList)
      .map((def: CustomFieldDefinition): Column<T> => ({
        key: `cf_${def.fieldKey}`,
        header: def.fieldLabel,
        sortable: false,
        render: (item: T) => {
          const customFields = item.customFields || {};
          const value = customFields[def.fieldKey];
          const formatted = formatCustomFieldValue(def.fieldType, value);

          // Special rendering for URLs.
          if (def.fieldType === "url" && value && typeof value === "string") {
            return (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] underline underline-offset-2 hover:text-[var(--secondary)] text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                {formatted}
              </a>
            );
          }

          // Special rendering for emails.
          if (
            def.fieldType === "email" &&
            value &&
            typeof value === "string"
          ) {
            return (
              <a
                href={`mailto:${value}`}
                className="text-[var(--primary)] underline underline-offset-2 hover:text-[var(--secondary)] text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                {formatted}
              </a>
            );
          }

          // Special rendering for booleans with color.
          if (def.fieldType === "boolean") {
            const isTruthy = value === true || value === "true";
            return (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  isTruthy
                    ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                    : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                }`}
              >
                {isTruthy ? "Yes" : "No"}
              </span>
            );
          }

          // Special rendering for multiselect as tags.
          if (def.fieldType === "multiselect" && Array.isArray(value)) {
            if (value.length === 0) {
              return (
                <span className="text-sm text-[var(--neutral-gray)]">--</span>
              );
            }
            return (
              <div className="flex flex-wrap gap-1">
                {value.map((v: string) => (
                  <span
                    key={v}
                    className="inline-flex items-center rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    {v}
                  </span>
                ))}
              </div>
            );
          }

          return (
            <span className="text-sm text-[var(--text-primary)]">
              {formatted}
            </span>
          );
        },
      }));
  }, [definitions]);

  return columns;
}
