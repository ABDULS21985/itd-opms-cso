"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  snapWidth,
  DEFAULT_WIDTH,
  SIDEBAR_WIDTH_SNAP,
  SNAP_THRESHOLD,
} from "@/lib/sidebar-layout-utils";

interface UseSidebarResizeOptions {
  initialWidth: number;
  collapsed: boolean;
  onWidthChange: (width: number) => void;
}

export function useSidebarResize({
  initialWidth,
  collapsed,
  onWidthChange,
}: UseSidebarResizeOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(initialWidth);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  // Sync with external width changes
  useEffect(() => {
    if (!isDragging) {
      setCurrentWidth(initialWidth);
    }
  }, [initialWidth, isDragging]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (collapsed) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidth;
      setIsDragging(true);
    },
    [collapsed, currentWidth],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const delta = e.clientX - startXRef.current;
      const rawWidth = startWidthRef.current + delta;
      // Clamp to range
      const clamped = Math.max(
        SIDEBAR_WIDTH_SNAP[0] - 20,
        Math.min(SIDEBAR_WIDTH_SNAP[SIDEBAR_WIDTH_SNAP.length - 1] + 20, rawWidth),
      );
      // Check if near a snap point for preview
      let preview = clamped;
      for (const snap of SIDEBAR_WIDTH_SNAP) {
        if (Math.abs(clamped - snap) <= SNAP_THRESHOLD) {
          preview = snap;
          break;
        }
      }
      setCurrentWidth(preview);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      const snapped = snapWidth(currentWidth);
      setCurrentWidth(snapped);
      onWidthChange(snapped);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, currentWidth, onWidthChange]);

  const handleDoubleClick = useCallback(() => {
    setCurrentWidth(DEFAULT_WIDTH);
    onWidthChange(DEFAULT_WIDTH);
  }, [onWidthChange]);

  return {
    isDragging,
    currentWidth,
    handlePointerDown,
    handleDoubleClick,
  };
}
