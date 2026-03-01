"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { navGroups, type NavGroup } from "@/lib/navigation";
import {
  type SidebarLayoutState,
  getDefaultLayout,
  applyLayoutToGroups,
  arrayMove,
  snapWidth,
  validateImportedLayout,
  DEFAULT_WIDTH,
  type SidebarWidthSnap,
} from "@/lib/sidebar-layout-utils";

const STORAGE_KEY = "opms-sidebar-layout";

function loadLayout(): SidebarLayoutState {
  if (typeof window === "undefined") return getDefaultLayout(navGroups);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validateImportedLayout(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return getDefaultLayout(navGroups);
}

function saveLayout(state: SidebarLayoutState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useSidebarLayout() {
  const [layout, setLayout] = useState<SidebarLayoutState>(loadLayout);

  // Persist on change
  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  /* ------- Section reordering ------- */
  const reorderSections = useCallback((fromIdx: number, toIdx: number) => {
    setLayout((prev) => {
      // Don't move Overview (always index 0)
      if (fromIdx === 0 || toIdx === 0) return prev;
      const newOrder = arrayMove(prev.sectionOrder, fromIdx, toIdx);
      // Enforce Overview first
      const ovIdx = newOrder.indexOf("Overview");
      if (ovIdx > 0) {
        newOrder.splice(ovIdx, 1);
        newOrder.unshift("Overview");
      }
      return { ...prev, sectionOrder: newOrder };
    });
  }, []);

  /* ------- Item reordering within section ------- */
  const reorderItems = useCallback(
    (sectionLabel: string, fromIdx: number, toIdx: number) => {
      setLayout((prev) => {
        const items = prev.itemOrder[sectionLabel];
        if (!items) return prev;
        return {
          ...prev,
          itemOrder: {
            ...prev.itemOrder,
            [sectionLabel]: arrayMove(items, fromIdx, toIdx),
          },
        };
      });
    },
    [],
  );

  /* ------- Move item between sections ------- */
  const moveItemToSection = useCallback(
    (
      href: string,
      fromSection: string,
      toSection: string,
      insertIdx: number,
    ) => {
      setLayout((prev) => {
        const fromItems = [...(prev.itemOrder[fromSection] || [])];
        const toItems = [...(prev.itemOrder[toSection] || [])];

        const removeIdx = fromItems.indexOf(href);
        if (removeIdx === -1) return prev;

        fromItems.splice(removeIdx, 1);
        toItems.splice(insertIdx, 0, href);

        return {
          ...prev,
          itemOrder: {
            ...prev.itemOrder,
            [fromSection]: fromItems,
            [toSection]: toItems,
          },
        };
      });
    },
    [],
  );

  /* ------- Visibility ------- */
  const toggleItemVisibility = useCallback((href: string) => {
    setLayout((prev) => {
      const hidden = prev.hiddenItems.includes(href);
      return {
        ...prev,
        hiddenItems: hidden
          ? prev.hiddenItems.filter((h) => h !== href)
          : [...prev.hiddenItems, href],
      };
    });
  }, []);

  const toggleSectionVisibility = useCallback((label: string) => {
    if (label === "Overview") return; // Never hide Overview
    setLayout((prev) => {
      const hidden = prev.hiddenSections.includes(label);
      return {
        ...prev,
        hiddenSections: hidden
          ? prev.hiddenSections.filter((s) => s !== label)
          : [...prev.hiddenSections, label],
      };
    });
  }, []);

  const isItemHidden = useCallback(
    (href: string) => layout.hiddenItems.includes(href),
    [layout.hiddenItems],
  );

  const isSectionHidden = useCallback(
    (label: string) => layout.hiddenSections.includes(label),
    [layout.hiddenSections],
  );

  /* ------- Width ------- */
  const setSidebarWidth = useCallback((width: number) => {
    const snapped = snapWidth(width);
    setLayout((prev) => ({ ...prev, sidebarWidth: snapped }));
  }, []);

  /* ------- Reset ------- */
  const resetToDefault = useCallback(() => {
    const defaultLayout = getDefaultLayout(navGroups);
    setLayout(defaultLayout);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  /* ------- Import / Export ------- */
  const importLayout = useCallback((state: SidebarLayoutState) => {
    setLayout(state);
  }, []);

  const exportLayout = useCallback((): SidebarLayoutState => {
    return { ...layout };
  }, [layout]);

  /* ------- Apply to groups ------- */
  const applyToGroups = useCallback(
    (groups: NavGroup[], includeHidden = false): NavGroup[] => {
      return applyLayoutToGroups(groups, layout, includeHidden);
    },
    [layout],
  );

  /* ------- Computed values ------- */
  const hiddenItemCount = layout.hiddenItems.length;
  const hiddenSectionCount = layout.hiddenSections.length;
  const totalHiddenCount = hiddenItemCount + hiddenSectionCount;

  const sidebarWidth = layout.sidebarWidth as SidebarWidthSnap || DEFAULT_WIDTH;

  return useMemo(
    () => ({
      layout,
      sectionOrder: layout.sectionOrder,
      itemOrder: layout.itemOrder,
      hiddenItems: layout.hiddenItems,
      hiddenSections: layout.hiddenSections,
      sidebarWidth,
      hiddenItemCount,
      hiddenSectionCount,
      totalHiddenCount,
      reorderSections,
      reorderItems,
      moveItemToSection,
      toggleItemVisibility,
      toggleSectionVisibility,
      isItemHidden,
      isSectionHidden,
      setSidebarWidth,
      resetToDefault,
      importLayout,
      exportLayout,
      applyToGroups,
    }),
    [
      layout,
      sidebarWidth,
      hiddenItemCount,
      hiddenSectionCount,
      totalHiddenCount,
      reorderSections,
      reorderItems,
      moveItemToSection,
      toggleItemVisibility,
      toggleSectionVisibility,
      isItemHidden,
      isSectionHidden,
      setSidebarWidth,
      resetToDefault,
      importLayout,
      exportLayout,
      applyToGroups,
    ],
  );
}
