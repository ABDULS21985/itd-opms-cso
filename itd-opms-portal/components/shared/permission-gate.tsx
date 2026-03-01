"use client";

import { type ReactNode } from "react";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

interface PermissionGateProps {
  /** Permission string required to view the content. */
  permission: string;
  children: ReactNode;
  /** Optional fallback. Defaults to an "Access Denied" message. */
  fallback?: ReactNode;
}

function AccessDenied({ permission }: { permission: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
      >
        <ShieldX size={32} className="text-[var(--error)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        Access Denied
      </h2>
      <p className="text-sm text-[var(--neutral-gray)] text-center max-w-md">
        You do not have the required permission ({permission}) to view this
        page. Contact your system administrator to request access.
      </p>
    </div>
  );
}

/**
 * PermissionGate renders its children only if the current user has the
 * required permission. Otherwise it shows an access-denied message.
 *
 * The wildcard "*" permission always grants access.
 */
export function PermissionGate({
  permission,
  children,
  fallback,
}: PermissionGateProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const permissions = user?.permissions ?? [];
  const hasAccess =
    permissions.includes("*") || permissions.includes(permission);

  if (!hasAccess) {
    return <>{fallback ?? <AccessDenied permission={permission} />}</>;
  }

  return <>{children}</>;
}
