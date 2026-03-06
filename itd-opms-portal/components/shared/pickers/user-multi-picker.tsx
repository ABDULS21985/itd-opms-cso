"use client";

import { useState } from "react";
import { useSearchUsers } from "@/hooks/use-system";
import {
  EntityMultiSelect,
  type SelectedEntity,
} from "@/components/shared/entity-multi-select";
import type { UserSearchResult } from "@/types";

interface UserMultiPickerProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  selected: SelectedEntity[];
  onChange: (items: SelectedEntity[]) => void;
}

export function UserMultiPicker({
  label,
  placeholder = "Search users by name or email...",
  description,
  error,
  required,
  disabled,
  selected,
  onChange,
}: UserMultiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: results, isLoading } = useSearchUsers(searchQuery);

  return (
    <EntityMultiSelect<UserSearchResult>
      label={label}
      placeholder={placeholder}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      selected={selected}
      onChange={onChange}
      items={results ?? []}
      isLoading={isLoading}
      getItemId={(u) => u.id}
      getItemLabel={(u) => u.displayName}
      getItemSubtitle={(u) => u.email}
      onSearch={setSearchQuery}
      minSearchLength={0}
      renderOption={(user, isSelected) => (
        <div
          className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--surface-1)] ${
            isSelected ? "bg-[var(--primary)]/5" : ""
          }`}
        >
          {isSelected ? (
            <span className="shrink-0 text-[var(--primary)]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <polyline points="9 11 12 14 22 4" />
              </svg>
            </span>
          ) : (
            <span className="shrink-0 text-[var(--neutral-gray)]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </span>
          )}
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
          {isSelected && (
            <span className="shrink-0 text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
              Added
            </span>
          )}
        </div>
      )}
    />
  );
}
