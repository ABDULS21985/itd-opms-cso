"use client";

import { useWorkItems } from "@/hooks/use-planning";
import { EntitySearchSelect } from "@/components/shared/entity-search-select";
import type { WorkItem } from "@/types";

interface WorkItemPickerProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** The project to scope work items to. */
  projectId: string;
  value: string | undefined;
  displayValue: string;
  onChange: (workItemId: string | undefined, title: string) => void;
}

export function WorkItemPicker({
  label,
  placeholder = "Search work items...",
  description,
  error,
  required,
  disabled,
  projectId,
  value,
  displayValue,
  onChange,
}: WorkItemPickerProps) {
  const { data, isLoading } = useWorkItems(1, 100, projectId);

  return (
    <EntitySearchSelect<WorkItem>
      label={label}
      placeholder={placeholder}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      value={value}
      displayValue={displayValue}
      onChange={onChange}
      items={data?.items ?? []}
      isLoading={isLoading}
      getItemId={(w) => w.id}
      getItemLabel={(w) => w.title}
      getItemSubtitle={(w) => `${w.type} · ${w.status}`}
      clientSideFilter
      minSearchLength={0}
    />
  );
}
