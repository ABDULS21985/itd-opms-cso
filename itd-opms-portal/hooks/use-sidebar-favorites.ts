"use client";

import { useState, useEffect, useCallback } from "react";

export type FavoriteKind = "page" | "ticket" | "project" | "asset" | "release";

export interface FavoriteItem {
  path: string;
  text: string;
  iconName: string;
  /** Discriminator for entity-pinned favorites (#4). Undefined for plain nav items. */
  kind?: FavoriteKind;
  /** User-assigned alias that overrides `text` in the UI (#5). */
  alias?: string;
}

const STORAGE_KEY = "opms-sidebar-favorites";
const MAX_FAVORITES = 16;

function loadFavorites(): FavoriteItem[] {
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

function saveFavorites(items: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

const SIDEBAR_PIN_EVENT = "opms:sidebar-pin-changed";

export function useSidebarFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(loadFavorites);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // React to cross-component pins (e.g. from list pages calling pinEntityToSidebar).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setFavorites(loadFavorites());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener(SIDEBAR_PIN_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SIDEBAR_PIN_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const isFavorite = useCallback(
    (path: string): boolean => {
      return favorites.some((f) => f.path === path);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (item: FavoriteItem) => {
      setFavorites((prev) => {
        const exists = prev.findIndex((f) => f.path === item.path);
        if (exists !== -1) {
          return prev.filter((_, i) => i !== exists);
        }
        if (prev.length >= MAX_FAVORITES) {
          return prev;
        }
        return [...prev, item];
      });
    },
    []
  );

  const removeFavorite = useCallback((path: string) => {
    setFavorites((prev) => prev.filter((f) => f.path !== path));
  }, []);

  const reorderFavorites = useCallback((fromIdx: number, toIdx: number) => {
    setFavorites((prev) => {
      if (
        fromIdx < 0 ||
        fromIdx >= prev.length ||
        toIdx < 0 ||
        toIdx >= prev.length ||
        fromIdx === toIdx
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const renameFavorite = useCallback((path: string, alias: string) => {
    setFavorites((prev) =>
      prev.map((f) =>
        f.path === path
          ? { ...f, alias: alias.trim() ? alias.trim() : undefined }
          : f
      )
    );
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    reorderFavorites,
    renameFavorite,
  };
}
