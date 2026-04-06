"use client";

import { STATUS_COLORS, statusLabel } from "./vault-constants";

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || {
    text: "#6B7280",
    bg: "rgba(107, 114, 128, 0.1)",
  };
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: colors.text, backgroundColor: colors.bg }}
    >
      {statusLabel(status)}
    </span>
  );
}
