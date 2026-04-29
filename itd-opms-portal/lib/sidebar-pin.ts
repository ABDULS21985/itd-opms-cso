/* =============================================================================
   Sidebar entity pinning helpers
   -----------------------------------------------------------------------------
   Pages outside the sidebar can pin a typed entity (ticket, project, asset,
   release) into the user's Favorites list via these helpers. They write to the
   same localStorage key as `useSidebarFavorites`, so the sidebar reflects the
   change on next render — and a custom event nudges any open instance to
   refresh immediately.
   ============================================================================= */

import type { FavoriteItem, FavoriteKind } from "@/hooks/use-sidebar-favorites";

const STORAGE_KEY = "opms-sidebar-favorites";
const MAX_FAVORITES = 16;
const SIDEBAR_PIN_EVENT = "opms:sidebar-pin-changed";

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
    window.dispatchEvent(new CustomEvent(SIDEBAR_PIN_EVENT));
  } catch {
    // ignore
  }
}

export interface PinEntityArgs {
  kind: FavoriteKind;
  href: string;
  label: string;
  /** Lucide icon display name (e.g. "TicketCheck"). Optional. */
  iconName?: string;
}

/** Pin a typed entity to the sidebar. Returns true if added, false if already pinned or full. */
export function pinEntityToSidebar(args: PinEntityArgs): boolean {
  const list = loadFavorites();
  if (list.some((f) => f.path === args.href)) return false;
  if (list.length >= MAX_FAVORITES) return false;
  list.push({
    path: args.href,
    text: args.label,
    iconName: args.iconName || "",
    kind: args.kind,
  });
  saveFavorites(list);
  return true;
}

/** Remove a pinned entity by href. Returns true if it was pinned. */
export function unpinEntityFromSidebar(href: string): boolean {
  const list = loadFavorites();
  const next = list.filter((f) => f.path !== href);
  if (next.length === list.length) return false;
  saveFavorites(next);
  return true;
}

/** Toggle a pinned entity. */
export function togglePinEntityToSidebar(args: PinEntityArgs): boolean {
  const list = loadFavorites();
  if (list.some((f) => f.path === args.href)) {
    return unpinEntityFromSidebar(args.href);
  }
  return pinEntityToSidebar(args);
}

/** Subscribe to pin changes (used by the sidebar to refresh from cross-component writes). */
export function subscribeToPinChanges(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SIDEBAR_PIN_EVENT, handler);
  return () => window.removeEventListener(SIDEBAR_PIN_EVENT, handler);
}

export const SIDEBAR_PIN_STORAGE_KEY = STORAGE_KEY;
