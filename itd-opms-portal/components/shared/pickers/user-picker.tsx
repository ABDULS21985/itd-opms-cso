"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchUsers } from "@/hooks/use-system";
import { EntitySearchSelect } from "@/components/shared/entity-search-select";
import type { UserSearchResult } from "@/types";

interface UserPickerProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string | undefined;
  displayValue: string;
  onChange: (userId: string | undefined, displayName: string) => void;
}

export function UserPicker({
  label,
  placeholder = "Search users by name or email...",
  description,
  error,
  required,
  disabled,
  value,
  displayValue,
  onChange,
}: UserPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: results, isLoading } = useSearchUsers(searchQuery);

  return (
    <EntitySearchSelect<UserSearchResult>
      label={label}
      placeholder={placeholder}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      value={value}
      displayValue={displayValue}
      onChange={onChange}
      items={results ?? []}
      isLoading={isLoading}
      getItemId={(u) => u.id}
      getItemLabel={(u) => u.displayName}
      getItemSubtitle={(u) => u.email}
      onSearch={setSearchQuery}
      minSearchLength={2}
      renderOption={(user, isHighlighted) => (
        <div
          className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--surface-1)] ${
            isHighlighted ? "bg-[var(--surface-1)]" : ""
          } ${user.id === value ? "bg-[var(--primary)]/5" : ""}`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-[var(--neutral-gray)] truncate">
              {user.email}
              {user.department && ` · ${user.department}`}
            </p>
          </div>
          {user.id === value && (
            <span className="shrink-0 text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
              Selected
            </span>
          )}
        </div>
      )}
    />
  );
}
