"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { AnimatedButton } from "./animated-button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Failed to load data. Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-16 text-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--error-light)]">
        <AlertCircle className="h-7 w-7 text-[var(--error)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">{message}</p>
      </div>
      {onRetry && (
        <AnimatedButton
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={onRetry}
        >
          Try again
        </AnimatedButton>
      )}
    </div>
  );
}
