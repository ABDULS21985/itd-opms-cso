"use client";

import { useState, useEffect, useCallback } from "react";

export interface FavoriteItem {
  path: string;
  text: string;
  iconName: string;
}

const STORAGE_KEY = "opms-sidebar-favorites";
const MAX_FAVORITES = 8;

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

export function useSidebarFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(loadFavorites);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

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

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
}
