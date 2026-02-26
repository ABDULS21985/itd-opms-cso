"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Undo2, X } from "lucide-react";

interface UndoToastOptions {
  message: string;
  undoAction: () => void;
  duration?: number;
  variant?: "success" | "warning" | "error" | "info";
}

const variantBorderColors: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  info: "var(--info)",
};

function UndoToastContent({
  message,
  undoAction,
  duration = 6000,
  variant = "info",
  toastId,
}: UndoToastOptions & { toastId: string | number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      setElapsed(now - start);
      if (now - start >= duration) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [duration]);

  const progress = Math.min(elapsed / duration, 1);
  const borderColor = variantBorderColors[variant] ?? variantBorderColors.info;

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-[var(--surface-0)] shadow-lg border border-[var(--border)] min-w-[300px]"
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="text-sm text-[var(--text-primary)] font-medium flex-1">{message}</p>
        <button
          onClick={() => {
            undoAction();
            toast.dismiss(toastId);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/8 hover:bg-[var(--primary)]/15 transition-colors"
        >
          <Undo2 size={12} />
          Undo
        </button>
        <button
          onClick={() => toast.dismiss(toastId)}
          className="p-1 rounded-md text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--surface-2)]">
        <div
          className="h-full transition-[width] duration-75"
          style={{
            width: `${(1 - progress) * 100}%`,
            backgroundColor: borderColor,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Show an undo toast with countdown progress bar.
 * Returns the toast ID for manual dismissal.
 */
export function showUndoToast(options: UndoToastOptions): string | number {
  const id = toast.custom(
    (toastId) => <UndoToastContent {...options} toastId={toastId} />,
    { duration: options.duration ?? 6000 },
  );
  return id;
}
