"use client";

import { CLASSIFICATION_COLORS } from "./vault-constants";

export function ClassificationBadge({ classification }: { classification: string }) {
  const colors = CLASSIFICATION_COLORS[classification] || {
    text: "#6B7280",
    bg: "rgba(107, 114, 128, 0.1)",
  };
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize"
      style={{ color: colors.text, backgroundColor: colors.bg }}
    >
      {classification.replace(/_/g, " ")}
    </span>
  );
}
