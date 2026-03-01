"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
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

  useEffect(() => {
    setOverrides(items);
    return () => setOverrides(null);
    // Only re-run when the serialized items change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), setOverrides]);
}

/** Read-only access to the current breadcrumb overrides (used by the header). */
export function useBreadcrumbOverrides() {
  return useContext(BreadcrumbContext).overrides;
}
