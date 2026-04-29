"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface SidebarBadgesData {
  /** href → numeric count to display as a pill. */
  counts: Record<string, number>;
  /** href → epoch millis of latest activity for the activity-dot feature. */
  activity: Record<string, number>;
}

interface BadgesResponse {
  counts?: Record<string, number>;
  activity?: Record<string, number>;
}

const REFRESH_MS = 60_000;
const VISIT_STORAGE_KEY = "opms-sidebar-last-seen";

function loadLastSeen(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VISIT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveLastSeen(data: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Fetches aggregated sidebar badge counts from the API and revalidates every
 * minute. Also tracks per-href "last seen" timestamps in localStorage so the
 * caller can decide whether to render an activity dot (latestActivity > lastSeen).
 */
export function useSidebarBadges(enabled: boolean = true) {
  const [data, setData] = useState<SidebarBadgesData>({
    counts: {},
    activity: {},
  });
  const [lastSeen, setLastSeen] = useState<Record<string, number>>(loadLastSeen);
  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef<boolean>(false);

  const fetchBadges = useCallback(async () => {
    if (!enabled) return;
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const res = await apiClient.get<BadgesResponse>("/sidebar/badges");
      setData({
        counts: res?.counts || {},
        activity: res?.activity || {},
      });
    } catch {
      // Best-effort; leave previous data in place.
    } finally {
      inflightRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchBadges();
    timerRef.current = window.setInterval(fetchBadges, REFRESH_MS) as unknown as number;
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [enabled, fetchBadges]);

  // Mark a href as seen "now" — typically called when user navigates to it.
  const markSeen = useCallback((href: string) => {
    setLastSeen((prev) => {
      const next = { ...prev, [href]: Date.now() };
      saveLastSeen(next);
      return next;
    });
  }, []);

  /** True when an item has activity newer than the user's last visit. */
  const hasNewActivity = useCallback(
    (href: string): boolean => {
      const latest = data.activity[href] || 0;
      if (latest <= 0) return false;
      const seen = lastSeen[href] || 0;
      return latest > seen;
    },
    [data.activity, lastSeen],
  );

  return {
    counts: data.counts,
    activity: data.activity,
    markSeen,
    hasNewActivity,
    refresh: fetchBadges,
  };
}
