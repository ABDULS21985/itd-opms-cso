"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { slideOverVariants, backdropVariants, useReducedMotion } from "@/lib/motion-variants";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Width class e.g. "max-w-lg", "max-w-xl" */
  width?: string;
  children: ReactNode;
  className?: string;
}

export function SlideOverPanel({
  open,
  onClose,
  title,
  description,
  width = "max-w-lg",
  children,
  className,
}: SlideOverPanelProps) {
  const reduced = useReducedMotion();

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // Body scroll lock and keyboard listener
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            variants={reduced ? undefined : backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={reduced ? undefined : slideOverVariants}
            initial={reduced ? undefined : "hidden"}
            animate={reduced ? undefined : "visible"}
            exit={reduced ? undefined : "exit"}
            className={cn(
              "absolute inset-y-0 right-0 w-full bg-[var(--surface-0)] shadow-xl flex flex-col",
              width,
              className,
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--border)]">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Close panel"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
