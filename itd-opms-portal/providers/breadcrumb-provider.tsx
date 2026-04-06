"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbContextType {
  /** Custom breadcrumb trail set by the current page. `null` = use auto-generated. */
  overrides: BreadcrumbItem[] | null;
  /** Called by pages to set a custom breadcrumb trail. */
  setOverrides: (items: BreadcrumbItem[] | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  overrides: null,
  setOverrides: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<BreadcrumbItem[] | null>(null);

  return (
    <BreadcrumbContext.Provider value={{ overrides, setOverrides }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * useBreadcrumbs — call from a page component to set custom breadcrumb labels.
 *
 * Pass an array of `{ label, href }` items. The header will render these
 * instead of the auto-generated path-based breadcrumbs.
 *
 * The overrides are automatically cleared on unmount.
 */
export function useBreadcrumbs(items: BreadcrumbItem[]) {
  const { setOverrides } = useContext(BreadcrumbContext);
  const [normalizedItems, setNormalizedItems] = useState<BreadcrumbItem[]>(items);

  // Keep a normalized snapshot of the items that only changes when the
  // breadcrumb contents (label/href) actually change. This avoids depending
  // on JSON.stringify hacks or disabling exhaustive-deps.
  useEffect(() => {
    setNormalizedItems((prev) =>
      areBreadcrumbArraysEqual(prev, items) ? prev : items
    );
  }, [items]);

  useEffect(() => {
    setOverrides(normalizedItems);
    return () => setOverrides(null);
  }, [normalizedItems, setOverrides]);
}

function areBreadcrumbArraysEqual(a: BreadcrumbItem[], b: BreadcrumbItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai.label !== bi.label || ai.href !== bi.href) {
      return false;
    }
  }
  return true;
}

/** Read-only access to the current breadcrumb overrides (used by the header). */
export function useBreadcrumbOverrides() {
  return useContext(BreadcrumbContext).overrides;
}
