"use client";

import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";

interface SidebarTenantChipProps {
  tenantName?: string;
  /** When true, render as a link to the tenants admin page. */
  canManageTenants: boolean;
  collapsed: boolean;
}

/**
 * Compact tenant indicator rendered just under the search bar.
 * Currently shows the current workspace; clicking opens the tenants admin page
 * for users who have system.view permission. A multi-workspace dropdown can be
 * added once the backend exposes the list of tenants the current user can switch into.
 */
export function SidebarTenantChip({
  tenantName,
  canManageTenants,
  collapsed,
}: SidebarTenantChipProps) {
  if (collapsed) return null;
  if (!tenantName) return null;

  const inner = (
    <div className="flex items-center gap-2 px-3 py-1.5 mx-3 mb-1 rounded-lg bg-[color:var(--sidebar-search-bg)]/60 border border-[color:var(--sidebar-border)] text-xs">
      <Building2
        size={12}
        className="flex-shrink-0 text-[color:var(--sidebar-text-subtle)]"
      />
      <span className="flex-1 min-w-0 truncate text-[color:var(--sidebar-text-muted)] font-medium">
        {tenantName}
      </span>
      {canManageTenants && (
        <ChevronRight
          size={12}
          className="flex-shrink-0 text-[color:var(--sidebar-text-faint)]"
        />
      )}
    </div>
  );

  if (canManageTenants) {
    return (
      <Link
        href="/dashboard/system/tenants"
        className="block hover:opacity-90 transition-opacity"
        aria-label="Switch or manage tenants"
        title="Manage tenants"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
