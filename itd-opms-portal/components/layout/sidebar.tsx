"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
  X,
  Star,
  Clock,
  ChevronsUpDown,
  Minus,
  LayoutDashboard,
  Search,
  Layers,
  Pencil,
  Download,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { fuzzyMatch, getHighlightSegments } from "@/lib/fuzzy-match";
import { navGroups, type NavItem } from "@/lib/navigation";
import {
  useSidebarSections,
  type CollapseMode,
} from "@/hooks/use-sidebar-sections";
import { useSidebarFavorites } from "@/hooks/use-sidebar-favorites";
import { useRecentlyVisited } from "@/hooks/use-sidebar-recently-visited";
import { useSidebarScroll } from "@/hooks/use-sidebar-scroll";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { useSidebarCustomizeMode } from "@/hooks/use-sidebar-customize-mode";
import { useSidebarResize } from "@/hooks/use-sidebar-resize";
import {
  decodeLayoutFromBase64,
  validateImportedLayout,
} from "@/lib/sidebar-layout-utils";
import {
  SIDEBAR_PRESETS,
  PRESET_ORDER,
  type PresetId,
} from "@/components/layout/sidebar/presets";
import { SidebarSetupWizard } from "@/components/layout/sidebar/sidebar-setup-wizard";
import { SidebarNavSection } from "@/components/layout/sidebar/sidebar-nav-section";
import { SidebarDndProvider } from "@/components/layout/sidebar/sidebar-dnd-provider";
import { SidebarCustomizeToolbar } from "@/components/layout/sidebar/sidebar-customize-toolbar";
import { SidebarHiddenItemsDrawer } from "@/components/layout/sidebar/sidebar-hidden-items-drawer";
import { SidebarResizeHandle } from "@/components/layout/sidebar/sidebar-resize-handle";
import { SidebarImportExport } from "@/components/layout/sidebar/sidebar-import-export";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRoleBadge(roles: string[] | undefined) {
  if (roles?.includes("global_admin") || roles?.includes("super_admin"))
    return { label: "Global Admin", className: "bg-red-500/20 text-red-400" };
  if (roles?.includes("itd_director"))
    return {
      label: "ITD Director",
      className: "bg-blue-500/20 text-blue-400",
    };
  if (
    roles?.includes("head_of_division") ||
    roles?.includes("department_head")
  )
    return {
      label: "Head of Division",
      className: "bg-purple-500/20 text-purple-400",
    };
  if (
    roles?.includes("supervisor") ||
    roles?.includes("team_lead") ||
    roles?.includes("manager")
  )
    return {
      label: "Supervisor",
      className: "bg-amber-500/20 text-amber-400",
    };
  if (roles?.includes("auditor"))
    return { label: "Auditor", className: "bg-cyan-500/20 text-cyan-400" };
  if (roles?.includes("service_desk_agent"))
    return {
      label: "Service Desk",
      className: "bg-orange-500/20 text-orange-400",
    };
  return { label: "Staff", className: "bg-emerald-500/20 text-emerald-400" };
}

const exactMatchRoutes = ["/dashboard", "/dashboard/system"];
function isActive(pathname: string, href: string) {
  return exactMatchRoutes.includes(href)
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

/* ------------------------------------------------------------------ */
/*  HighlightedText                                                    */
/* ------------------------------------------------------------------ */

function HighlightedText({
  text,
  matchedIndices,
}: {
  text: string;
  matchedIndices: number[];
}) {
  const segments = getHighlightSegments(text, matchedIndices);
  return (
    <span>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark
            key={i}
            className="bg-[#C4A962]/30 text-white rounded-sm px-[1px]"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapse mode config                                               */
/* ------------------------------------------------------------------ */

const collapseModeConfig: Record<
  CollapseMode,
  { icon: LucideIcon; label: string; tooltip: string }
> = {
  smart: {
    icon: ChevronsUpDown,
    label: "Smart",
    tooltip:
      "Smart mode: Active section auto-expands, others collapse after a delay",
  },
  "expand-all": {
    icon: ChevronDown,
    label: "Expand All",
    tooltip: "All sections are expanded",
  },
  "collapse-all": {
    icon: Minus,
    label: "Collapse All",
    tooltip: "All sections are collapsed (pinned sections stay open)",
  },
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();

  /* ------- Local state ------- */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchFocusIndex, setSearchFocusIndex] = useState(-1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: NavItem;
  } | null>(null);
  const [recentSectionOpen, setRecentSectionOpen] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);

  /* ------- Preset management (localStorage) ------- */
  const [activePreset, setActivePreset] = useState<PresetId>("full");
  const [customVisibleSections, setCustomVisibleSections] = useState<string[]>(
    [],
  );
  const [wizardSeen, setWizardSeen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("opms-sidebar-preset");
    if (stored && PRESET_ORDER.includes(stored as PresetId)) {
      setActivePreset(stored as PresetId);
    }
    const storedCustom = localStorage.getItem("opms-sidebar-custom-sections");
    if (storedCustom) {
      try {
        setCustomVisibleSections(JSON.parse(storedCustom));
      } catch {
        /* ignore */
      }
    }
    const seen = localStorage.getItem("opms-sidebar-wizard-seen");
    setWizardSeen(seen === "true");
  }, []);

  useEffect(() => {
    if (wizardSeen || pathname !== "/dashboard") return;
    const timer = setTimeout(() => {
      setWizardOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [wizardSeen, pathname]);

  const handleApplyPreset = useCallback((id: PresetId) => {
    setActivePreset(id);
    localStorage.setItem("opms-sidebar-preset", id);
  }, []);

  const handleSetCustomSections = useCallback((sections: string[]) => {
    setCustomVisibleSections(sections);
    localStorage.setItem(
      "opms-sidebar-custom-sections",
      JSON.stringify(sections),
    );
  }, []);

  const handleMarkWizardSeen = useCallback(() => {
    setWizardSeen(true);
    localStorage.setItem("opms-sidebar-wizard-seen", "true");
  }, []);

  /* ------- New hooks ------- */
  const layoutHook = useSidebarLayout();
  const customizeMode = useSidebarCustomizeMode();

  const {
    isDragging: isResizing,
    currentWidth: resizeWidth,
    handlePointerDown: resizePointerDown,
    handleDoubleClick: resizeDoubleClick,
  } = useSidebarResize({
    initialWidth: layoutHook.sidebarWidth,
    collapsed,
    onWidthChange: layoutHook.setSidebarWidth,
  });

  const effectiveWidth = isResizing ? resizeWidth : layoutHook.sidebarWidth;

  /* ------- Handle shared layout URL param ------- */
  useEffect(() => {
    const layoutParam = searchParams.get("sidebar-layout");
    if (!layoutParam) return;

    const imported = decodeLayoutFromBase64(layoutParam);
    if (imported && validateImportedLayout(imported)) {
      const apply = window.confirm(
        "Someone shared a sidebar layout with you. Apply it?",
      );
      if (apply) {
        layoutHook.importLayout(imported);
        toast("Shared layout applied successfully");
      }
      // Remove param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("sidebar-layout");
      router.replace(url.pathname + url.search, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------- Refs ------- */
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);

  /* ------- Auth & permissions ------- */
  const userPermissions = user?.permissions || [];
  const roleBadge = getRoleBadge(user?.roles);
  const userInitial = (user?.displayName || user?.email || "U")
    .charAt(0)
    .toUpperCase();
  const hasWildcard = userPermissions.includes("*");

  /* ------- Filter groups by permissions ------- */
  const permissionFilteredGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              !item.permission ||
              userPermissions.length === 0 ||
              hasWildcard ||
              userPermissions.includes(item.permission),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [userPermissions, hasWildcard],
  );

  /* ------- Filter by preset ------- */
  const presetVisibleSections = useMemo(() => {
    const preset = SIDEBAR_PRESETS[activePreset];
    if (
      !preset ||
      !preset.visibleSections ||
      preset.visibleSections.length === 0
    )
      return null;
    if (activePreset === "custom") {
      return customVisibleSections.length > 0 ? customVisibleSections : null;
    }
    return preset.visibleSections;
  }, [activePreset, customVisibleSections]);

  const presetFilteredGroups = useMemo(() => {
    if (!presetVisibleSections) return permissionFilteredGroups;
    return permissionFilteredGroups.filter((g) =>
      presetVisibleSections.includes(g.label),
    );
  }, [permissionFilteredGroups, presetVisibleSections]);

  /* ------- Apply layout ordering ------- */
  const visibleGroups = useMemo(() => {
    return layoutHook.applyToGroups(
      presetFilteredGroups,
      customizeMode.isCustomizing,
    );
  }, [presetFilteredGroups, layoutHook, customizeMode.isCustomizing]);

  const presetHiddenSectionCount =
    permissionFilteredGroups.length - presetFilteredGroups.length;

  /* ------- Determine active section/item ------- */
  const activeSectionTitle = useMemo(() => {
    for (const group of visibleGroups) {
      for (const item of group.items) {
        if (isActive(pathname, item.href)) return group.label;
      }
    }
    return null;
  }, [pathname, visibleGroups]);

  const activeItemText = useMemo(() => {
    for (const group of visibleGroups) {
      for (const item of group.items) {
        if (isActive(pathname, item.href)) return item.label;
      }
    }
    return null;
  }, [pathname, visibleGroups]);

  /* ------- Hooks ------- */
  const sectionTitles = useMemo(
    () => visibleGroups.map((g) => g.label),
    [visibleGroups],
  );

  const {
    pinnedSections,
    collapseMode,
    toggleSection,
    togglePin,
    cycleCollapseMode,
    isSectionExpanded,
  } = useSidebarSections({
    sectionTitles,
    activeSectionTitle,
  });

  const { favorites, isFavorite, toggleFavorite, removeFavorite } =
    useSidebarFavorites();

  const navItemLookup = useMemo(() => {
    const map = new Map<string, { text: string; iconName: string }>();
    for (const group of navGroups) {
      for (const item of group.items) {
        map.set(item.href, {
          text: item.label,
          iconName: item.icon.displayName || "",
        });
      }
    }
    return map;
  }, []);

  const { recentItems } = useRecentlyVisited(navItemLookup);

  const {
    scrollProgress,
    setScrollRef,
    onScroll: handleNavScroll,
  } = useSidebarScroll(activeSectionTitle, activeItemText);

  /* ------- Debounced search ------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSearchFocusIndex(-1);
    }, 100);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ------- Search results ------- */
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return null;
    const results: Array<{
      group: string;
      item: NavItem;
      matchedIndices: number[];
      score: number;
    }> = [];
    for (const group of visibleGroups) {
      for (const item of group.items) {
        const match = fuzzyMatch(debouncedQuery, item.label);
        if (match) {
          results.push({
            group: group.label,
            item,
            matchedIndices: match.matchedIndices,
            score: match.score,
          });
        }
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }, [debouncedQuery, visibleGroups]);

  const flatSearchResults = searchResults || [];

  /* ------- Close mobile drawer on route change ------- */
  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  /* ------- Close user menu on click outside ------- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  /* ------- Close context menu on click outside ------- */
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick() {
      setContextMenu(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  /* ------- Global keyboard shortcuts ------- */
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        onMobileClose();
        setUserMenuOpen(false);
        setContextMenu(null);
        if (searchQuery) {
          setSearchQuery("");
          searchInputRef.current?.blur();
        }
        if (customizeMode.isCustomizing) {
          customizeMode.exitCustomizeMode();
        }
      }
      if (
        e.key === "/" &&
        !collapsed &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onMobileClose, searchQuery, collapsed, customizeMode]);

  /* ------- Navigation helpers ------- */
  const handleLogout = useCallback(() => {
    logout();
    router.push("/auth/login");
  }, [logout, router]);

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!searchResults || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchFocusIndex((prev) =>
        prev < flatSearchResults.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchFocusIndex((prev) =>
        prev > 0 ? prev - 1 : flatSearchResults.length - 1,
      );
    } else if (e.key === "Enter" && searchFocusIndex >= 0) {
      e.preventDefault();
      const result = flatSearchResults[searchFocusIndex];
      if (result) {
        router.push(result.item.href);
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    }
  };

  /* ------- Keyboard nav for nav area ------- */
  const allVisibleItems = useMemo(() => {
    const items: Array<{
      type: "header" | "item";
      groupLabel: string;
      item?: NavItem;
    }> = [];
    for (const group of visibleGroups) {
      items.push({ type: "header", groupLabel: group.label });
      if (isSectionExpanded(group.label)) {
        for (const item of group.items) {
          items.push({ type: "item", groupLabel: group.label, item });
        }
      }
    }
    return items;
  }, [visibleGroups, isSectionExpanded]);

  const [navFocusIndex, setNavFocusIndex] = useState(-1);

  const handleNavKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (debouncedQuery) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setNavFocusIndex((prev) =>
        prev < allVisibleItems.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setNavFocusIndex((prev) =>
        prev > 0 ? prev - 1 : allVisibleItems.length - 1,
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      setNavFocusIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setNavFocusIndex(allVisibleItems.length - 1);
    } else if (e.key === " " || e.key === "Space") {
      e.preventDefault();
      const focused = allVisibleItems[navFocusIndex];
      if (focused?.type === "header") {
        toggleSection(focused.groupLabel);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const focused = allVisibleItems[navFocusIndex];
      if (focused?.type === "item" && focused.item) {
        router.push(focused.item.href);
      } else if (focused?.type === "header") {
        toggleSection(focused.groupLabel);
      }
    } else if (e.key === "Escape") {
      const focused = allVisibleItems[navFocusIndex];
      if (focused) {
        const headerIdx = allVisibleItems.findIndex(
          (v) => v.type === "header" && v.groupLabel === focused.groupLabel,
        );
        if (headerIdx >= 0) setNavFocusIndex(headerIdx);
      }
    }
  };

  /* ------- Context menu handler ------- */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: NavItem) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    [],
  );

  /* ------- Customize mode handlers ------- */
  const handleEnterCustomize = useCallback(() => {
    if (collapsed) onToggleCollapse();
    customizeMode.enterCustomizeMode();
    setUserMenuOpen(false);
  }, [collapsed, onToggleCollapse, customizeMode]);

  const handleResetLayout = useCallback(() => {
    layoutHook.resetToDefault();
    toast("Layout reset to default");
  }, [layoutHook]);

  /* ------- Animation durations ------- */
  const dur = prefersReducedMotion ? 0 : 0.2;
  const staggerDur = prefersReducedMotion ? 0 : 0.03;

  /* ------- Resolve icon from name (for favorites/recent) ------- */
  const iconByName = useMemo(() => {
    const map = new Map<string, LucideIcon>();
    for (const group of navGroups) {
      for (const item of group.items) {
        map.set(item.icon.displayName || "", item.icon);
        map.set(item.label, item.icon);
      }
    }
    return map;
  }, []);

  const resolveIcon = useCallback(
    (iconName: string): LucideIcon => {
      return iconByName.get(iconName) || LayoutDashboard;
    },
    [iconByName],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const sidebarStyle = useMemo(() => {
    if (collapsed) return undefined;
    return { width: effectiveWidth } as React.CSSProperties;
  }, [collapsed, effectiveWidth]);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          relative flex flex-col h-screen
          bg-gradient-to-b from-[#3D2E0A] to-[#2A1F06]
          border-r border-[#A8893D]/15 shadow-2xl
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]

          fixed inset-y-0 left-0 z-50
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}

          lg:sticky lg:top-0 lg:z-10 lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : ""}
        `}
        style={sidebarStyle}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Resize handle */}
        <SidebarResizeHandle
          collapsed={collapsed}
          isDragging={isResizing}
          onPointerDown={resizePointerDown}
          onDoubleClick={resizeDoubleClick}
        />

        {/* -------------------------------------------------------- */}
        {/*  Logo & Branding                                          */}
        {/* -------------------------------------------------------- */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#A8893D]/15 bg-[#A8893D]/[0.04] backdrop-blur-sm flex-shrink-0">
          {/* Expanded logo */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 group ${collapsed ? "lg:hidden" : ""}`}
          >
            <Image
              src="/logo.jpeg"
              alt="CBN Logo"
              width={32}
              height={32}
              className="rounded-lg shadow-lg shadow-[#A8893D]/20 group-hover:shadow-[#A8893D]/40 transition-shadow"
            />
            <div className="flex items-center gap-2">
              <span className="font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                CBN OPMS
              </span>
              <span className="text-[9px] font-medium bg-[#A8893D]/30 text-[#C4A962] px-1.5 py-0.5 rounded-md">
                v1.0
              </span>
            </div>
          </Link>

          {/* Collapsed logo */}
          {collapsed && (
            <Link href="/dashboard" className="hidden lg:flex mx-auto">
              <Image
                src="/logo.jpeg"
                alt="CBN Logo"
                width={32}
                height={32}
                className="rounded-lg shadow-lg shadow-[#A8893D]/20"
              />
            </Link>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            {/* Customize toggle */}
            {!collapsed && !customizeMode.isCustomizing && (
              <button
                onClick={handleEnterCustomize}
                className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 flex-shrink-0"
                aria-label="Customize sidebar"
                title="Customize sidebar"
              >
                <Pencil size={14} />
              </button>
            )}

            {/* Collapse toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-200 flex-shrink-0"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>

            {/* Close button -- mobile */}
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Customize toolbar                                        */}
        {/* -------------------------------------------------------- */}
        <AnimatePresence>
          {customizeMode.isCustomizing && (
            <SidebarCustomizeToolbar
              isCustomizing={customizeMode.isCustomizing}
              totalHiddenCount={layoutHook.totalHiddenCount}
              onDone={customizeMode.exitCustomizeMode}
              onReset={handleResetLayout}
            />
          )}
        </AnimatePresence>

        {/* -------------------------------------------------------- */}
        {/*  Search bar                                               */}
        {/* -------------------------------------------------------- */}
        {!collapsed && !customizeMode.isCustomizing ? (
          <div className="px-3 pt-3 pb-1 flex-shrink-0">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search navigation..."
                className="w-full bg-white/5 border border-[#A8893D]/20 text-white text-sm rounded-lg pl-8 pr-8 py-2 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A8893D]/50 focus:border-[#A8893D]/50 transition-all duration-200"
              />
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 border border-[#A8893D]/20 rounded px-1 py-0.5 font-mono">
                  /
                </kbd>
              )}
            </div>
          </div>
        ) : collapsed ? (
          <div className="px-3 pt-3 pb-1 flex-shrink-0 hidden lg:block">
            <button
              onClick={() => {
                onToggleCollapse();
                setTimeout(() => searchInputRef.current?.focus(), 350);
              }}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-all duration-200"
              title="Search navigation"
            >
              <Search size={18} />
            </button>
          </div>
        ) : null}

        {/* -------------------------------------------------------- */}
        {/*  Navigation (scrollable area)                             */}
        {/* -------------------------------------------------------- */}
        <nav
          ref={(el) => {
            (navRef as React.MutableRefObject<HTMLElement | null>).current = el;
            setScrollRef(el);
          }}
          onScroll={handleNavScroll}
          onKeyDown={handleNavKeyDown}
          tabIndex={0}
          className="flex-1 py-2 px-3 overflow-y-auto sidebar-scroll focus:outline-none"
        >
          {/* ------- Search results mode ------- */}
          {debouncedQuery && searchResults !== null ? (
            <div>
              {flatSearchResults.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Search size={32} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500">
                    No results for &ldquo;{debouncedQuery}&rdquo;
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
                    Results ({flatSearchResults.length})
                  </p>
                  <div className="space-y-0.5">
                    {flatSearchResults.map((result, idx) => {
                      const Icon = result.item.icon;
                      const active = isActive(pathname, result.item.href);
                      const focused = idx === searchFocusIndex;
                      return (
                        <Link
                          key={result.item.href}
                          href={result.item.href}
                          onClick={() => setSearchQuery("")}
                          className={`
                            group relative flex items-center gap-3 rounded-xl text-sm font-medium
                            transition-all duration-200 px-3 py-2.5 border-l-[3px]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8893D]/50
                            ${
                              active
                                ? "border-[#A8893D] bg-[#A8893D]/15 text-white"
                                : focused
                                  ? "border-[#A8893D]/50 bg-white/5 text-white"
                                  : "border-transparent text-gray-200 hover:bg-white/5 hover:text-white"
                            }
                          `}
                        >
                          <Icon
                            size={18}
                            className={`flex-shrink-0 ${active ? "text-white" : "text-gray-300"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <HighlightedText
                              text={result.item.label}
                              matchedIndices={result.matchedIndices}
                            />
                            <span className="text-[10px] text-gray-400 ml-2">
                              {result.group}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* ------- Favorites section ------- */}
              {!collapsed &&
                !customizeMode.isCustomizing &&
                favorites.length > 0 && (
                  <div className="mb-3">
                    <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-300 flex items-center gap-1.5">
                      <Star size={10} className="text-[#C4A962]" />
                      Favorites
                    </p>
                    <div className="space-y-0.5">
                      {favorites.map((fav) => {
                        const FavIcon = resolveIcon(fav.iconName);
                        const active = isActive(pathname, fav.path);
                        return (
                          <div
                            key={fav.path}
                            className="group relative flex items-center"
                          >
                            <Link
                              href={fav.path}
                              className={`
                                flex-1 flex items-center gap-2.5 rounded-xl text-xs font-medium
                                transition-all duration-200 px-3 py-2 border-l-[3px]
                                ${
                                  active
                                    ? "border-[#A8893D] bg-[#A8893D]/15 text-white"
                                    : "border-transparent text-gray-200 hover:bg-white/5 hover:text-white"
                                }
                              `}
                            >
                              <FavIcon size={14} className="flex-shrink-0" />
                              <span className="truncate">{fav.text}</span>
                            </Link>
                            <button
                              onClick={() => removeFavorite(fav.path)}
                              className="absolute right-2 opacity-0 group-hover:opacity-100 text-[#C4A962] hover:text-[#C4A962]/80 transition-opacity"
                              title="Remove from favorites"
                            >
                              <Star size={12} fill="currentColor" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mx-3 mt-2 border-t border-[#A8893D]/15" />
                  </div>
                )}

              {/* ------- Recently visited ------- */}
              {!collapsed &&
                !customizeMode.isCustomizing &&
                recentItems.length > 0 && (
                  <div className="mb-3">
                    <button
                      onClick={() => setRecentSectionOpen((v) => !v)}
                      className="w-full px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-300 flex items-center gap-1.5 hover:text-gray-200 transition-colors"
                    >
                      <Clock size={10} />
                      Recently Visited
                      <motion.span
                        animate={{ rotate: recentSectionOpen ? 0 : -90 }}
                        transition={{ duration: dur }}
                        className="ml-auto"
                      >
                        <ChevronDown size={10} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {recentSectionOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: dur }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-0.5">
                            {recentItems.slice(0, 5).map((recent) => {
                              const RecentIcon = resolveIcon(recent.iconName);
                              return (
                                <Link
                                  key={recent.path}
                                  href={recent.path}
                                  className="flex items-center gap-2.5 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 px-3 py-1.5"
                                >
                                  <RecentIcon
                                    size={13}
                                    className="flex-shrink-0"
                                  />
                                  <span className="truncate">
                                    {recent.text}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="mx-3 mt-2 border-t border-[#A8893D]/15" />
                  </div>
                )}

              {/* ------- Collapse mode control ------- */}
              {!collapsed && !customizeMode.isCustomizing && (
                <div className="px-3 mb-2 flex items-center justify-end">
                  <button
                    onClick={cycleCollapseMode}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-400 transition-colors rounded px-1.5 py-0.5 hover:bg-white/5"
                    title={collapseModeConfig[collapseMode].tooltip}
                  >
                    {(() => {
                      const ModeIcon = collapseModeConfig[collapseMode].icon;
                      return <ModeIcon size={11} />;
                    })()}
                    <span>{collapseModeConfig[collapseMode].label}</span>
                  </button>
                </div>
              )}

              {/* ------- Nav groups (with DnD) ------- */}
              <SidebarDndProvider
                isCustomizing={customizeMode.isCustomizing}
                groups={visibleGroups}
                onReorderSections={(from, to) => {
                  layoutHook.reorderSections(from, to);
                  if (activePreset !== "custom") {
                    handleApplyPreset("custom");
                  }
                }}
                onReorderItems={(section, from, to) => {
                  layoutHook.reorderItems(section, from, to);
                  if (activePreset !== "custom") {
                    handleApplyPreset("custom");
                  }
                }}
                onMoveItemToSection={(href, from, to, idx) => {
                  layoutHook.moveItemToSection(href, from, to, idx);
                  if (activePreset !== "custom") {
                    handleApplyPreset("custom");
                  }
                }}
                onDragStateChange={customizeMode.setDragState}
              >
                {visibleGroups.map((group, groupIndex) => {
                  const expanded = isSectionExpanded(group.label);
                  const pinned = pinnedSections[group.label] || false;
                  const hasActiveItem = group.items.some((item) =>
                    isActive(pathname, item.href),
                  );

                  return (
                    <SidebarNavSection
                      key={group.label}
                      group={group}
                      expanded={expanded}
                      pinned={pinned}
                      hasActiveItem={hasActiveItem}
                      collapsed={collapsed}
                      isCustomizing={customizeMode.isCustomizing}
                      isSectionHidden={layoutHook.isSectionHidden(group.label)}
                      sidebarWidth={effectiveWidth}
                      dur={dur}
                      staggerDur={staggerDur}
                      pathname={pathname}
                      navFocusIndex={navFocusIndex}
                      visibleGroups={visibleGroups}
                      groupIndex={groupIndex}
                      isActive={isActive}
                      isFavorite={isFavorite}
                      isItemHidden={layoutHook.isItemHidden}
                      isSectionExpanded={isSectionExpanded}
                      onToggleSection={toggleSection}
                      onTogglePin={togglePin}
                      onToggleSectionVisibility={
                        layoutHook.toggleSectionVisibility
                      }
                      onToggleItemVisibility={layoutHook.toggleItemVisibility}
                      onContextMenu={handleContextMenu}
                    />
                  );
                })}
              </SidebarDndProvider>

              {/* ------- Hidden items drawer (customize mode) ------- */}
              {customizeMode.isCustomizing && (
                <SidebarHiddenItemsDrawer
                  isCustomizing={customizeMode.isCustomizing}
                  allGroups={permissionFilteredGroups}
                  hiddenItems={layoutHook.hiddenItems}
                  hiddenSections={layoutHook.hiddenSections}
                  onToggleItemVisibility={layoutHook.toggleItemVisibility}
                  onToggleSectionVisibility={
                    layoutHook.toggleSectionVisibility
                  }
                  dur={dur}
                />
              )}

              {/* ------- Hidden sections link (preset-based) ------- */}
              {presetHiddenSectionCount > 0 &&
                !collapsed &&
                !customizeMode.isCustomizing && (
                  <div className="mt-4 px-3">
                    <button
                      onClick={() => setWizardOpen(true)}
                      className="text-xs text-gray-400 hover:text-gray-400 transition-colors"
                    >
                      {presetHiddenSectionCount} more section
                      {presetHiddenSectionCount > 1 ? "s" : ""} hidden
                    </button>
                  </div>
                )}
            </>
          )}
        </nav>

        {/* -------------------------------------------------------- */}
        {/*  Scroll progress bar                                      */}
        {/* -------------------------------------------------------- */}
        {!collapsed && (
          <div className="h-[2px] bg-white/5 flex-shrink-0">
            <motion.div
              className="h-full bg-gradient-to-r from-[#A8893D] to-[#C4A962]"
              style={{ width: `${scrollProgress * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/*  User Section                                              */}
        {/* -------------------------------------------------------- */}
        <div
          className="relative border-t border-[#A8893D]/15 p-3"
          ref={userMenuRef}
        >
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: dur }}
                className={`absolute bottom-full mb-2 bg-[#2A1F06] border border-[#A8893D]/20 rounded-xl shadow-2xl shadow-black/40 p-2 z-50 ${
                  collapsed
                    ? "left-full ml-2 w-[200px]"
                    : "left-0 w-[220px]"
                }`}
              >
                <Link
                  href="/dashboard/system/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-100 hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User size={16} />
                  My Profile
                </Link>
                <Link
                  href="/dashboard/system/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-100 hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <HelpCircle size={16} />
                  Help & Support
                </Link>
                <div className="my-1 border-t border-[#A8893D]/15" />
                <button
                  onClick={() => {
                    setWizardOpen(true);
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-100 hover:bg-white/5 hover:text-white transition-colors w-full text-left"
                >
                  <Layers size={16} />
                  Sidebar Layout
                </button>
                <button
                  onClick={handleEnterCustomize}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-100 hover:bg-white/5 hover:text-white transition-colors w-full text-left"
                >
                  <Pencil size={16} />
                  Customize Sidebar
                </button>
                <button
                  onClick={() => {
                    setImportExportOpen(true);
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-100 hover:bg-white/5 hover:text-white transition-colors w-full text-left"
                >
                  <Download size={16} />
                  Import / Export
                </button>
                <div className="my-1 border-t border-[#A8893D]/15" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User button */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`
              flex items-center gap-3 w-full rounded-xl transition-all duration-200
              hover:bg-white/5 p-2
              ${collapsed ? "lg:justify-center" : ""}
            `}
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A8893D] to-[#6B5A28] flex items-center justify-center ring-2 ring-[#A8893D]/30">
                <span className="text-sm font-semibold text-white">
                  {userInitial}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0F172A]" />
            </div>
            {user && (
              <div
                className={`flex-1 min-w-0 text-left ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                <p className="text-sm font-medium text-white truncate">
                  {user.displayName || user.email}
                </p>
                <span
                  className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${roleBadge.className}`}
                >
                  {roleBadge.label}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Environment indicator */}
        <div className={`px-3 pb-2 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="flex items-center gap-1.5 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-gray-400">
              Development
            </span>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------------- */}
      {/*  Context menu (right-click on nav items)                    */}
      {/* ---------------------------------------------------------- */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: dur * 0.5 }}
            className="fixed z-[100] bg-[#2A1F06] border border-[#A8893D]/20 rounded-lg shadow-2xl shadow-black/50 p-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const item = contextMenu.item;
                toggleFavorite({
                  path: item.href,
                  text: item.label,
                  iconName: item.icon.displayName || "",
                });
                setContextMenu(null);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm text-gray-100 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <Star
                size={14}
                className={
                  isFavorite(contextMenu.item.href)
                    ? "text-[#C4A962]"
                    : "text-gray-500"
                }
                fill={
                  isFavorite(contextMenu.item.href) ? "currentColor" : "none"
                }
              />
              {isFavorite(contextMenu.item.href)
                ? "Remove from Favorites"
                : "Add to Favorites"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup wizard */}
      <SidebarSetupWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        allGroups={navGroups.map((g) => ({
          label: g.label,
          items: g.items.map((i) => ({ label: i.label })),
        }))}
        activePreset={activePreset}
        onApplyPreset={handleApplyPreset}
        customVisibleSections={customVisibleSections}
        onSetCustomSections={handleSetCustomSections}
        onMarkSeen={handleMarkWizardSeen}
      />

      {/* Import/Export modal */}
      <SidebarImportExport
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        currentLayout={layoutHook.exportLayout()}
        onImport={layoutHook.importLayout}
      />
    </>
  );
}
