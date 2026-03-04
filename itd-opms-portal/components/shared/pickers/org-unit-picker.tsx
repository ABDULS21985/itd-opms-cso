"use client";

import { useMemo } from "react";
import { useOrgTree } from "@/hooks/use-system";
import { EntitySearchSelect } from "@/components/shared/entity-search-select";
import type { OrgTreeNode } from "@/types";

interface FlatOrgUnit {
  id: string;
  name: string;
  code: string;
  level: string;
  depth: number;
}

function flattenTree(nodes: OrgTreeNode[], depth = 0): FlatOrgUnit[] {
  const result: FlatOrgUnit[] = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      name: node.name,
      code: node.code,
      level: node.level,
      depth,
    });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

interface OrgUnitPickerProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string | undefined;
  displayValue: string;
  onChange: (orgUnitId: string | undefined, name: string) => void;
}

export function OrgUnitPicker({
  label,
  placeholder = "Search organizational units...",
  description,
  error,
  required,
  disabled,
  value,
  displayValue,
  onChange,
}: OrgUnitPickerProps) {
  const { data: tree, isLoading } = useOrgTree();

  const flatUnits = useMemo(
    () => (tree ? flattenTree(tree) : []),
    [tree],
  );

  return (
    <EntitySearchSelect<FlatOrgUnit>
      label={label}
      placeholder={placeholder}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      value={value}
      displayValue={displayValue}
      onChange={onChange}
      items={flatUnits}
      isLoading={isLoading}
      getItemId={(u) => u.id}
      getItemLabel={(u) => u.name}
      getItemSubtitle={(u) => `${u.code} · ${u.level}`}
      clientSideFilter
      minSearchLength={0}
      renderOption={(unit, isHighlighted) => (
        <div
          className={`flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--surface-1)] ${
            isHighlighted ? "bg-[var(--surface-1)]" : ""
          } ${unit.id === value ? "bg-[var(--primary)]/5" : ""}`}
          style={{ paddingLeft: `${12 + unit.depth * 16}px` }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {unit.name}
            </p>
            <p className="text-xs text-[var(--neutral-gray)] truncate">
              {unit.code} · {unit.level}
            </p>
          </div>
          {unit.id === value && (
            <span className="shrink-0 text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
              Selected
            </span>
          )}
        </div>
      )}
    />
  );
}
