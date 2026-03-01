"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export type CollapseMode = "smart" | "expand-all" | "collapse-all";

export interface UseSidebarSectionsOptions {
  sectionTitles: string[];
  activeSectionTitle: string | null;
}

interface StoredState {
  pinnedSections: Record<string, boolean>;
  collapseMode: CollapseMode;
  manualOverrides: Record<string, boolean>;
}

const STORAGE_KEY = "opms-sidebar-sections";
const COLLAPSE_CYCLE: CollapseMode[] = ["smart", "expand-all", "collapse-all"];

function loadState(): StoredState {
  if (typeof window === "undefined") {
    return { pinnedSections: {}, collapseMode: "smart", manualOverrides: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        pinnedSections: parsed.pinnedSections ?? {},
        collapseMode: parsed.collapseMode ?? "smart",
        manualOverrides: parsed.manualOverrides ?? {},
      };
    }
  } catch {
    // ignore
  }
  return { pinnedSections: {}, collapseMode: "smart", manualOverrides: {} };
}

function saveState(state: StoredState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useSidebarSections(options: UseSidebarSectionsOptions) {
  const { activeSectionTitle } = options;

  const [pinnedSections, setPinnedSections] = useState<Record<string, boolean>>(
    () => loadState().pinnedSections
  );
  const [collapseMode, setCollapseMode] = useState<CollapseMode>(
    () => loadState().collapseMode
  );
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, boolean>
  >(() => loadState().manualOverrides);

  // Persist state changes
  useEffect(() => {
    saveState({ pinnedSections, collapseMode, manualOverrides });
  }, [pinnedSections, collapseMode, manualOverrides]);

  const isSectionExpanded = useCallback(
    (title: string): boolean => {
      // Manual overrides take priority in smart mode
      if (collapseMode === "smart" && title in manualOverrides) {
        return manualOverrides[title];
      }

      switch (collapseMode) {
        case "expand-all":
          return true;
        case "collapse-all":
          return pinnedSections[title] === true;
        case "smart":
        default:
          return (
            title === activeSectionTitle || pinnedSections[title] === true
          );
      }
    },
    [collapseMode, activeSectionTitle, pinnedSections, manualOverrides]
  );

  const expandedSections = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const title of options.sectionTitles) {
      result[title] = isSectionExpanded(title);
    }
    return result;
  }, [options.sectionTitles, isSectionExpanded]);

  const toggleSection = useCallback((title: string) => {
    setManualOverrides((prev) => {
      const next = { ...prev };
      next[title] = !(prev[title] ?? true);
      return next;
    });
  }, []);

  const togglePin = useCallback((title: string) => {
    setPinnedSections((prev) => {
      const next = { ...prev };
      if (next[title]) {
        delete next[title];
      } else {
        next[title] = true;
      }
      return next;
    });
  }, []);

  const cycleCollapseMode = useCallback(() => {
    setCollapseMode((prev) => {
      const idx = COLLAPSE_CYCLE.indexOf(prev);
      const next = COLLAPSE_CYCLE[(idx + 1) % COLLAPSE_CYCLE.length];
      return next;
    });
    // Clear manual overrides when cycling mode
    setManualOverrides({});
  }, []);

  return {
    expandedSections,
    pinnedSections,
    collapseMode,
    toggleSection,
    togglePin,
    cycleCollapseMode,
    isSectionExpanded,
  };
}
