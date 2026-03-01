"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export interface RecentItem {
  path: string;
  text: string;
  iconName: string;
  timestamp: number;
}

const STORAGE_KEY = "opms-sidebar-recent";
const MAX_RECENT = 5;

function loadRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveRecent(items: RecentItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function useRecentlyVisited(
  navItemLookup: Map<string, { text: string; iconName: string }>
) {
  const pathname = usePathname();
  const [recentItems, setRecentItems] = useState<RecentItem[]>(loadRecent);

  useEffect(() => {
    if (!pathname) return;

    const navItem = navItemLookup.get(pathname);
    if (!navItem) return;

    setRecentItems((prev) => {
      // Remove existing entry for this path
      const filtered = prev.filter((item) => item.path !== pathname);

      // Add to front with current timestamp
      const updated: RecentItem[] = [
        {
          path: pathname,
          text: navItem.text,
          iconName: navItem.iconName,
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, MAX_RECENT);

      saveRecent(updated);
      return updated;
    });
  }, [pathname, navItemLookup]);

  return {
    recentItems,
  };
}
