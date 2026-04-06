"use client";

import { useSupportQueues } from "@/hooks/use-itsm";
import { EntitySearchSelect } from "@/components/shared/entity-search-select";
import type { SupportQueue } from "@/types";

interface QueuePickerProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string | undefined;
  displayValue: string;
  onChange: (queueId: string | undefined, name: string) => void;
}

export function QueuePicker({
  label,
  placeholder = "Search support queues...",
  description,
  error,
  required,
  disabled,
  value,
  displayValue,
  onChange,
}: QueuePickerProps) {
  const { data: queues, isLoading } = useSupportQueues(true);

  return (
    <EntitySearchSelect<SupportQueue>
      label={label}
      placeholder={placeholder}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      value={value}
      displayValue={displayValue}
      onChange={onChange}
      items={queues ?? []}
      isLoading={isLoading}
      getItemId={(q) => q.id}
      getItemLabel={(q) => q.name}
      getItemSubtitle={(q) =>
        `${q.autoAssignRule} · ${q.isActive ? "Active" : "Inactive"}`
      }
      clientSideFilter
      minSearchLength={0}
    />
  );
}
