"use client";

import { useState, useCallback, useMemo } from "react";

export type DragType = "section" | "item" | null;

export function useSidebarCustomizeMode() {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [dragType, setDragType] = useState<DragType>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const enterCustomizeMode = useCallback(() => setIsCustomizing(true), []);
  const exitCustomizeMode = useCallback(() => {
    setIsCustomizing(false);
    setDragType(null);
    setDraggedId(null);
  }, []);

  const setDragState = useCallback((type: DragType, id: string | null) => {
    setDragType(type);
    setDraggedId(id);
  }, []);

  const clearDragState = useCallback(() => {
    setDragType(null);
    setDraggedId(null);
  }, []);

  return useMemo(
    () => ({
      isCustomizing,
      dragType,
      draggedId,
      enterCustomizeMode,
      exitCustomizeMode,
      setDragState,
      clearDragState,
    }),
    [
      isCustomizing,
      dragType,
      draggedId,
      enterCustomizeMode,
      exitCustomizeMode,
      setDragState,
      clearDragState,
    ],
  );
}
