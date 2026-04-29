"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SidebarFloatingTipProps {
  label: string;
  /** Optional secondary line under the main label (e.g. group name, count). */
  sublabel?: string;
  /** Disable rendering — useful when the sidebar is expanded. */
  disabled?: boolean;
  children: ReactNode;
}

/**
 * Lightweight tooltip that floats to the right of a collapsed sidebar item.
 * Uses a body-level portal so it escapes the sidebar's overflow clipping.
 * Shows on hover/focus after a brief delay; never blocks pointer events.
 */
export function SidebarFloatingTip({
  label,
  sublabel,
  disabled,
  children,
}: SidebarFloatingTipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const show = () => {
    if (disabled) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      });
    }, 150);
  };

  const hide = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setCoords(null);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="contents"
      >
        {children}
      </span>
      {mounted && coords && !disabled
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: "translateY(-50%)",
                zIndex: 60,
                pointerEvents: "none",
              }}
              className="px-2.5 py-1.5 rounded-md bg-[color:var(--sidebar-bg-from)] border border-[color:var(--sidebar-border-strong)] shadow-2xl shadow-black/50 text-xs font-medium text-[color:var(--sidebar-text)] whitespace-nowrap"
            >
              {label}
              {sublabel ? (
                <span className="ml-2 text-[10px] text-[color:var(--sidebar-text-faint)]">
                  {sublabel}
                </span>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
