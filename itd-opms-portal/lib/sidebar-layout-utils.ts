import type { NavGroup } from "@/lib/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SidebarLayoutState {
  version: 1;
  sectionOrder: string[];
  itemOrder: Record<string, string[]>;
  hiddenItems: string[];
  hiddenSections: string[];
  sidebarWidth: number;
}

export const SIDEBAR_WIDTH_SNAP = [220, 260, 320] as const;
export type SidebarWidthSnap = (typeof SIDEBAR_WIDTH_SNAP)[number];
export const DEFAULT_WIDTH: SidebarWidthSnap = 260;
export const SNAP_THRESHOLD = 15;

/* ------------------------------------------------------------------ */
/*  Default layout from navGroups                                      */
/* ------------------------------------------------------------------ */

export function getDefaultLayout(groups: NavGroup[]): SidebarLayoutState {
  const sectionOrder = groups.map((g) => g.label);
  const itemOrder: Record<string, string[]> = {};
  for (const g of groups) {
    itemOrder[g.label] = g.items.map((i) => i.href);
  }
  return {
    version: 1,
    sectionOrder,
    itemOrder,
    hiddenItems: [],
    hiddenSections: [],
    sidebarWidth: DEFAULT_WIDTH,
  };
}

/* ------------------------------------------------------------------ */
/*  Apply layout ordering + hidden filtering to NavGroups              */
/* ------------------------------------------------------------------ */

export function applyLayoutToGroups(
  groups: NavGroup[],
  layout: SidebarLayoutState,
  /** When true, include hidden items (for customize mode) */
  includeHidden = false,
): NavGroup[] {
  const groupMap = new Map<string, NavGroup>();
  for (const g of groups) {
    groupMap.set(g.label, g);
  }

  // Build ordered section list
  const orderedLabels: string[] = [];

  // First add sections from layout.sectionOrder that exist in groups
  for (const label of layout.sectionOrder) {
    if (groupMap.has(label)) {
      orderedLabels.push(label);
    }
  }
  // Then add any groups not in sectionOrder (new sections added after layout was saved)
  for (const g of groups) {
    if (!orderedLabels.includes(g.label)) {
      orderedLabels.push(g.label);
    }
  }

  // Ensure "Overview" is always first
  const overviewIdx = orderedLabels.indexOf("Overview");
  if (overviewIdx > 0) {
    orderedLabels.splice(overviewIdx, 1);
    orderedLabels.unshift("Overview");
  }

  const result: NavGroup[] = [];

  for (const label of orderedLabels) {
    // Skip hidden sections (unless showing hidden)
    if (!includeHidden && layout.hiddenSections.includes(label)) continue;

    const group = groupMap.get(label);
    if (!group) continue;

    // Order items within section
    const itemHrefOrder = layout.itemOrder[label];
    let orderedItems = [...group.items];

    if (itemHrefOrder && itemHrefOrder.length > 0) {
      const itemMap = new Map(group.items.map((i) => [i.href, i]));
      const sorted: typeof orderedItems = [];

      // Add items in saved order
      for (const href of itemHrefOrder) {
        const item = itemMap.get(href);
        if (item) {
          sorted.push(item);
          itemMap.delete(href);
        }
      }
      // Add any new items not in saved order
      for (const item of itemMap.values()) {
        sorted.push(item);
      }
      orderedItems = sorted;
    }

    // Filter hidden items (unless showing hidden)
    if (!includeHidden) {
      orderedItems = orderedItems.filter(
        (i) => !layout.hiddenItems.includes(i.href),
      );
    }

    if (orderedItems.length > 0 || includeHidden) {
      result.push({ ...group, items: orderedItems });
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Snap width to nearest allowed value                                */
/* ------------------------------------------------------------------ */

export function snapWidth(raw: number): SidebarWidthSnap {
  let closest: SidebarWidthSnap = DEFAULT_WIDTH;
  let minDist = Infinity;
  for (const w of SIDEBAR_WIDTH_SNAP) {
    const dist = Math.abs(raw - w);
    if (dist < minDist) {
      minDist = dist;
      closest = w;
    }
  }
  return closest;
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

export function validateImportedLayout(
  data: unknown,
): data is SidebarLayoutState {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (!Array.isArray(obj.sectionOrder)) return false;
  if (typeof obj.itemOrder !== "object" || obj.itemOrder === null) return false;
  if (!Array.isArray(obj.hiddenItems)) return false;
  if (!Array.isArray(obj.hiddenSections)) return false;
  if (typeof obj.sidebarWidth !== "number") return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Import / Export                                                     */
/* ------------------------------------------------------------------ */

export function exportLayoutToFile(layout: SidebarLayoutState): void {
  const json = JSON.stringify(layout, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `opms-sidebar-layout-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function encodeLayoutToBase64(layout: SidebarLayoutState): string {
  return btoa(JSON.stringify(layout));
}

export function decodeLayoutFromBase64(
  encoded: string,
): SidebarLayoutState | null {
  try {
    const json = JSON.parse(atob(encoded));
    return validateImportedLayout(json) ? json : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Array reorder helper                                               */
/* ------------------------------------------------------------------ */

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}
