import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "opms-activity-panel-open";

/**
 * Manages the activity panel open/close state with localStorage persistence.
 */
export function useActivityPanel() {
  const [open, setOpen] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setOpen(true);
  }, []);

  // Persist changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(open));
  }, [open]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  return { open, setOpen, toggle, close };
}
