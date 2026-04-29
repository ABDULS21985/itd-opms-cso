"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "opms-sidebar-clicks";
const WINDOW_DAYS = 30;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

interface ClickRecord {
  /** href visited */
  p: string;
  /** unix ms */
  t: number;
}

/**
 * Persists a rolling 30-day log of nav-item visits in localStorage.
 * Used by the "Adaptive" preset to reorder items by recency-weighted frequency.
 */
export function useSidebarTelemetry(navHrefs: Set<string>) {
  const pathname = usePathname();
  const lastLoggedRef = useRef<string | null>(null);

  // Log a visit when the path changes and matches a tracked nav href.
  useEffect(() => {
    if (!pathname) return;
    if (!navHrefs.has(pathname)) return;
    if (lastLoggedRef.current === pathname) return;
    lastLoggedRef.current = pathname;

    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const records: ClickRecord[] = raw ? JSON.parse(raw) : [];
      const cutoff = Date.now() - WINDOW_MS;
      const fresh = records.filter((r) => r.t >= cutoff);
      fresh.push({ p: pathname, t: Date.now() });
      // Keep storage bounded.
      const bounded = fresh.slice(-2000);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
    } catch {
      // ignore
    }
  }, [pathname, navHrefs]);

  // Snapshot of click counts per href in the rolling window.
  const getClickCounts = useCallback((): Map<string, number> => {
    const map = new Map<string, number>();
    if (typeof window === "undefined") return map;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const records: ClickRecord[] = raw ? JSON.parse(raw) : [];
      const cutoff = Date.now() - WINDOW_MS;
      for (const r of records) {
        if (r.t < cutoff) continue;
        map.set(r.p, (map.get(r.p) || 0) + 1);
      }
    } catch {
      // ignore
    }
    return map;
  }, []);

  return { getClickCounts };
}
