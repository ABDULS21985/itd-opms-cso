"use client";

import { useState } from "react";
import { useSearchProjects } from "@/hooks/use-planning";
import { EntitySearchSelect } from "@/components/shared/entity-search-select";
import type { Project } from "@/types";

interface ProjectPickerProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string | undefined;
  displayValue: string;
  onChange: (projectId: string | undefined, title: string) => void;
}

export function ProjectPicker({
  label,
  placeholder = "Search projects by title or code...",
  description,
  error,
  required,
  disabled,
  value,
  displayValue,
  onChange,
}: ProjectPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useSearchProjects(searchQuery);

  return (
    <EntitySearchSelect<Project>
      label={label}
      placeholder={placeholder}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      value={value}
      displayValue={displayValue}
      onChange={onChange}
      items={data?.data ?? []}
      isLoading={isLoading}
      getItemId={(p) => p.id}
      getItemLabel={(p) => p.title}
      getItemSubtitle={(p) => `${p.code} · ${p.status}`}
      onSearch={setSearchQuery}
      minSearchLength={2}
    />
  );
}
