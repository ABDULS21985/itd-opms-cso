"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdminColumn } from "@/components/admin/admin-data-table/types";

export interface ColumnPreferences {
  visibility: Record<string, boolean>;
  widths: Record<string, number>;
  pins: Record<string, "left" | "right" | null>;
}

function getStorageKey(tableId: string) {
  return `admin-table-${tableId}-cols`;
}

function buildDefaults(columns: AdminColumn<any>[]): ColumnPreferences {
  const visibility: Record<string, boolean> = {};
  const widths: Record<string, number> = {};
  const pins: Record<string, "left" | "right" | null> = {};

  for (const col of columns) {
    visibility[col.key] = col.defaultVisible !== false;
    if (col.defaultWidth) widths[col.key] = col.defaultWidth;
    pins[col.key] = col.defaultPin ?? null;
  }

  return { visibility, widths, pins };
}

export function useColumnPreferences(
  tableId: string,
  columns: AdminColumn<any>[],
) {
  const [preferences, setPreferences] = useState<ColumnPreferences>(() =>
    buildDefaults(columns),
  );

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(tableId));
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ColumnPreferences>;
        setPreferences((prev) => ({
          visibility: { ...prev.visibility, ...parsed.visibility },
          widths: { ...prev.widths, ...parsed.widths },
          pins: { ...prev.pins, ...parsed.pins },
        }));
      }
    } catch {
      // ignore invalid localStorage data
    }
  }, [tableId]);

  const persist = useCallback(
    (next: ColumnPreferences) => {
      try {
        localStorage.setItem(getStorageKey(tableId), JSON.stringify(next));
      } catch {
        // storage full or unavailable
      }
    },
    [tableId],
  );

  const setVisibility = useCallback(
    (key: string, visible: boolean) => {
      setPreferences((prev) => {
        const next = {
          ...prev,
          visibility: { ...prev.visibility, [key]: visible },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setWidth = useCallback(
    (key: string, width: number) => {
      setPreferences((prev) => {
        const next = {
          ...prev,
          widths: { ...prev.widths, [key]: width },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setPin = useCallback(
    (key: string, pin: "left" | "right" | null) => {
      setPreferences((prev) => {
        const next = {
          ...prev,
          pins: { ...prev.pins, [key]: pin },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetToDefaults = useCallback(() => {
    const defaults = buildDefaults(columns);
    setPreferences(defaults);
    try {
      localStorage.removeItem(getStorageKey(tableId));
    } catch {
      // ignore
    }
  }, [tableId, columns]);

  return { preferences, setVisibility, setWidth, setPin, resetToDefaults };
}
