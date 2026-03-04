"use client";

import { useOKRs } from "@/hooks/use-governance";
import { EntitySearchSelect } from "@/components/shared/entity-search-select";
import type { OKR } from "@/types";

interface OKRPickerProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string | undefined;
  displayValue: string;
  onChange: (okrId: string | undefined, objective: string) => void;
}

export function OKRPicker({
  label,
  placeholder = "Search OKRs...",
  description,
  error,
  required,
  disabled,
  value,
  displayValue,
  onChange,
}: OKRPickerProps) {
  const { data, isLoading } = useOKRs(1, 100);

  return (
    <EntitySearchSelect<OKR>
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
      getItemId={(o) => o.id}
      getItemLabel={(o) => o.objective}
      getItemSubtitle={(o) => `${o.level} · ${o.period} · ${o.status}`}
      clientSideFilter
      minSearchLength={0}
    />
  );
}
