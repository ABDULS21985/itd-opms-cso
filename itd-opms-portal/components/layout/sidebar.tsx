"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  LayoutDashboard,
  Shield,
  FileText,
  GitBranch,
  Calendar,
  Target,
  Users,
  Brain,
  UserPlus,
  ClipboardList,
  FolderKanban,
  Briefcase,
  ListTodo,
  AlertTriangle,
  Headphones,
  BookOpen,
  CircleDot,
  TicketCheck,
  Bug,
  HardDrive,
  Server,
  KeyRound,
  ScrollText,
  Settings,
  Library,
  Search,
  PenSquare,
  ShieldCheck,
  AlertOctagon,
  ClipboardCheck,
  Scale,
  UserCheck,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
  X,
  Building2,
  Network,
  MonitorSmartphone,
  Mail,
  Activity,
  Star,
  Pin,
  Clock,
  Layers,
  ChevronsUpDown,
  Minus,
  BarChart3,
  PieChart,
  TrendingUp,
  ShieldAlert,
  Milestone,
  AlertCircle,
  FileEdit,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { fuzzyMatch, getHighlightSegments } from "@/lib/fuzzy-match";
import {
  useSidebarSections,
  type CollapseMode,
} from "@/hooks/use-sidebar-sections";
import {
  useSidebarFavorites,
  type FavoriteItem,
} from "@/hooks/use-sidebar-favorites";
import { useRecentlyVisited } from "@/hooks/use-sidebar-recently-visited";
import { useSidebarScroll } from "@/hooks/use-sidebar-scroll";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import {
  SIDEBAR_PRESETS,
  PRESET_ORDER,
  type PresetId,
} from "@/components/layout/sidebar/presets";
import { SidebarSetupWizard } from "@/components/layout/sidebar/sidebar-setup-wizard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation structure -- 9 groups                                   */
/* ------------------------------------------------------------------ */

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        href: "/dashboard/analytics",
        label: "Executive Overview",
        icon: BarChart3,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/portfolio",
        label: "Portfolio Analytics",
        icon: PieChart,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/projects",
        label: "Project Performance",
        icon: TrendingUp,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/risks",
        label: "Risk & Issues",
        icon: ShieldAlert,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/resources",
        label: "Resource & Workload",
        icon: Users,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/governance",
        label: "Governance & Compliance",
        icon: Shield,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/offices",
        label: "Office Analytics",
        icon: Building2,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/collaboration",
        label: "Collaboration & Dependencies",
        icon: GitBranch,
        permission: "reporting.view",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        href: "/dashboard/governance/policies",
        label: "Policies",
        icon: FileText,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/raci",
        label: "RACI",
        icon: GitBranch,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/meetings",
        label: "Meetings",
        icon: Calendar,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/actions",
        label: "Action Tracker",
        icon: ClipboardList,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/okrs",
        label: "OKRs",
        icon: Target,
        permission: "governance.view",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/dashboard/people/directory",
        label: "Directory",
        icon: Users,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/skills",
        label: "Skills",
        icon: Brain,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/onboarding",
        label: "Onboarding",
        icon: UserPlus,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/roster",
        label: "Roster",
        icon: ClipboardList,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/offboarding",
        label: "Offboarding",
        icon: LogOut,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/training",
        label: "Training",
        icon: BookOpen,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/capacity",
        label: "Capacity",
        icon: Activity,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/analytics",
        label: "People Analytics",
        icon: BarChart3,
        permission: "people.view",
      },
    ],
  },
  {
    label: "Planning",
    items: [
      {
        href: "/dashboard/planning/portfolios",
        label: "Portfolios",
        icon: FolderKanban,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/projects",
        label: "Projects",
        icon: Briefcase,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/work-items",
        label: "Work Items",
        icon: ListTodo,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/milestones",
        label: "Milestones",
        icon: Milestone,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/risks",
        label: "Risks",
        icon: AlertTriangle,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/issues",
        label: "Issues",
        icon: AlertCircle,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/change-requests",
        label: "Change Requests",
        icon: FileEdit,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/pir",
        label: "PIR Reviews",
        icon: ClipboardCheck,
        permission: "planning.view",
      },
    ],
  },
  {
    label: "ITSM",
    items: [
      {
        href: "/dashboard/itsm/service-catalog",
        label: "Service Catalog",
        icon: BookOpen,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/tickets",
        label: "Tickets",
        icon: CircleDot,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/my-queue",
        label: "My Queue",
        icon: TicketCheck,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/problems",
        label: "Problems",
        icon: Bug,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/sla-dashboard",
        label: "SLA Dashboard",
        icon: Activity,
        permission: "itsm.view",
      },
    ],
  },
  {
    label: "Assets",
    items: [
      {
        href: "/dashboard/cmdb/assets",
        label: "Asset Inventory",
        icon: HardDrive,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/topology",
        label: "Topology",
        icon: Network,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/licenses",
        label: "Licenses",
        icon: KeyRound,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/warranties",
        label: "Warranties",
        icon: ShieldCheck,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/reconciliation",
        label: "Reconciliation",
        icon: Layers,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/reports",
        label: "Asset Reports",
        icon: FileBarChart,
        permission: "assets.view",
      },
    ],
  },
  {
    label: "Knowledge",
    items: [
      {
        href: "/dashboard/knowledge",
        label: "Knowledge Base",
        icon: Library,
        permission: "knowledge.view",
      },
      {
        href: "/dashboard/knowledge/search",
        label: "Search",
        icon: Search,
        permission: "knowledge.view",
      },
      {
        href: "/dashboard/knowledge/articles/new",
        label: "New Article",
        icon: PenSquare,
        permission: "knowledge.manage",
      },
    ],
  },
  {
    label: "GRC",
    items: [
      {
        href: "/dashboard/grc",
        label: "GRC Dashboard",
        icon: ShieldCheck,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/risks",
        label: "Risks",
        icon: AlertOctagon,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/audits",
        label: "Audits",
        icon: ClipboardCheck,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/compliance",
        label: "Compliance",
        icon: Scale,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/access-reviews",
        label: "Access Reviews",
        icon: UserCheck,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/reports",
        label: "Reports",
        icon: FileBarChart,
        permission: "grc.view",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/dashboard/system",
        label: "Overview",
        icon: LayoutDashboard,
        permission: "system.view",
      },
      {
        href: "/dashboard/system/users",
        label: "Users",
        icon: Users,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/roles",
        label: "Roles & Permissions",
        icon: Shield,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/tenants",
        label: "Tenants",
        icon: Building2,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/org-units",
        label: "Org Structure",
        icon: Network,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/audit-logs",
        label: "Audit Logs",
        icon: ScrollText,
        permission: "system.view",
      },
      {
        href: "/dashboard/system/sessions",
        label: "Sessions",
        icon: MonitorSmartphone,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/settings",
        label: "Settings",
        icon: Settings,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/email-templates",
        label: "Email Templates",
        icon: Mail,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/health",
        label: "Platform Health",
        icon: Activity,
        permission: "system.view",
      },
    ],
  },
];

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
/*  Icon hover animation map                                           */
/* ------------------------------------------------------------------ */

type HoverAnimClass =
  | "sidebar-icon-pulse"
  | "sidebar-icon-rotate"
  | "sidebar-icon-wave"
  | "sidebar-icon-bounce"
  | "sidebar-icon-scale";

const iconHoverMap: Record<string, HoverAnimClass> = {
  LayoutDashboard: "sidebar-icon-pulse",
  Target: "sidebar-icon-pulse",
  ShieldCheck: "sidebar-icon-pulse",
  Settings: "sidebar-icon-rotate",
  Users: "sidebar-icon-wave",
  UserPlus: "sidebar-icon-wave",
  UserCheck: "sidebar-icon-wave",
  User: "sidebar-icon-wave",
  Activity: "sidebar-icon-bounce",
  FileBarChart: "sidebar-icon-bounce",
};

function getIconHoverClass(icon: LucideIcon): HoverAnimClass {
  return iconHoverMap[icon.displayName || ""] || "sidebar-icon-scale";
}

/* ------------------------------------------------------------------ */
/*  HighlightedText — renders fuzzy-matched text with highlights       */
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
/*  Collapse mode icons & labels                                       */
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

  // Show wizard on first visit after 800ms, only on /dashboard
  useEffect(() => {
    if (wizardSeen || pathname !== "/dashboard") return;
    const timer = setTimeout(() => {
      setWizardOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [wizardSeen, pathname]);

  const handleApplyPreset = useCallback(
    (id: PresetId) => {
      setActivePreset(id);
      localStorage.setItem("opms-sidebar-preset", id);
    },
    [],
  );

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
    if (!preset || !preset.visibleSections || preset.visibleSections.length === 0)
      return null; // null = show all
    if (activePreset === "custom") {
      return customVisibleSections.length > 0 ? customVisibleSections : null;
    }
    return preset.visibleSections;
  }, [activePreset, customVisibleSections]);

  const visibleGroups = useMemo(() => {
    if (!presetVisibleSections) return permissionFilteredGroups;
    return permissionFilteredGroups.filter((g) =>
      presetVisibleSections.includes(g.label),
    );
  }, [permissionFilteredGroups, presetVisibleSections]);

  const hiddenSectionCount = permissionFilteredGroups.length - visibleGroups.length;

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
    expandedSections,
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
    scrollToSection,
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
      }
      // "/" to focus search — only if no other input/textarea is focused
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
  }, [onMobileClose, searchQuery, collapsed]);

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
    // Only handle when the nav container or its children are focused
    if (debouncedQuery) return; // search mode uses its own keyboard handling

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
      // Jump to section header
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

  /* ------- Animation durations ------- */
  const dur = prefersReducedMotion ? 0 : 0.2;
  const staggerDur = prefersReducedMotion ? 0 : 0.03;

  /* ------- Resolve icon from name (for favorites/recent) ------- */
  const iconByName = useMemo(() => {
    const map = new Map<string, LucideIcon>();
    for (const group of navGroups) {
      for (const item of group.items) {
        map.set(item.icon.displayName || "", item.icon);
        // Also map by label for fallback
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
          flex flex-col h-screen
          bg-gradient-to-b from-[#3D2E0A] to-[#2A1F06]
          border-r border-[#A8893D]/15 shadow-2xl
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]

          fixed inset-y-0 left-0 z-50
          ${mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]"}

          lg:sticky lg:top-0 lg:z-10 lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
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

          {/* Collapse toggle -- desktop only */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 flex-shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>

          {/* Close button -- mobile only */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Search bar                                               */}
        {/* -------------------------------------------------------- */}
        {!collapsed ? (
          <div className="px-3 pt-3 pb-1 flex-shrink-0">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 border border-[#A8893D]/20 rounded px-1 py-0.5 font-mono">
                  /
                </kbd>
              )}
            </div>
          </div>
        ) : (
          <div className="px-3 pt-3 pb-1 flex-shrink-0 hidden lg:block">
            <button
              onClick={() => {
                onToggleCollapse();
                // Focus search after expanding
                setTimeout(() => searchInputRef.current?.focus(), 350);
              }}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all duration-200"
              title="Search navigation"
            >
              <Search size={18} />
            </button>
          </div>
        )}

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
                  <Search
                    size={32}
                    className="mx-auto text-gray-600 mb-3"
                  />
                  <p className="text-sm text-gray-500">
                    No results for &ldquo;{debouncedQuery}&rdquo;
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
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
                          onClick={() => {
                            setSearchQuery("");
                          }}
                          className={`
                            group relative flex items-center gap-3 rounded-xl text-sm font-medium
                            transition-all duration-200 px-3 py-2.5 border-l-[3px]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8893D]/50
                            ${
                              active
                                ? "border-[#A8893D] bg-[#A8893D]/15 text-white"
                                : focused
                                  ? "border-[#A8893D]/50 bg-white/5 text-white"
                                  : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                            }
                          `}
                        >
                          <Icon
                            size={18}
                            className={`flex-shrink-0 ${active ? "text-white" : "text-gray-500"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <HighlightedText
                              text={result.item.label}
                              matchedIndices={result.matchedIndices}
                            />
                            <span className="text-[10px] text-gray-600 ml-2">
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
              {!collapsed && favorites.length > 0 && (
                <div className="mb-3">
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
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
                                  : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
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
              {!collapsed && recentItems.length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={() => setRecentSectionOpen((v) => !v)}
                    className="w-full px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-1.5 hover:text-gray-400 transition-colors"
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
                                className="flex items-center gap-2.5 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all duration-200 px-3 py-1.5"
                              >
                                <RecentIcon
                                  size={13}
                                  className="flex-shrink-0"
                                />
                                <span className="truncate">{recent.text}</span>
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
              {!collapsed && (
                <div className="px-3 mb-2 flex items-center justify-end">
                  <button
                    onClick={cycleCollapseMode}
                    className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors rounded px-1.5 py-0.5 hover:bg-white/5"
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

              {/* ------- Nav groups ------- */}
              {visibleGroups.map((group, groupIndex) => {
                const expanded = isSectionExpanded(group.label);
                const pinned = pinnedSections[group.label] || false;
                const hasActiveItem = group.items.some((item) =>
                  isActive(pathname, item.href),
                );

                return (
                  <div
                    key={group.label}
                    className={groupIndex > 0 ? "mt-2" : ""}
                  >
                    {/* Section header */}
                    {!collapsed ? (
                      <div className="group/header flex items-center px-3 mb-1">
                        <button
                          onClick={() => toggleSection(group.label)}
                          className={`
                            flex-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest
                            transition-colors duration-200 py-1
                            ${
                              hasActiveItem
                                ? "bg-gradient-to-r from-[#A8893D] to-[#C4A962] bg-clip-text text-transparent"
                                : "text-gray-500 hover:text-gray-400"
                            }
                          `}
                        >
                          <motion.span
                            animate={{ rotate: expanded ? 0 : -90 }}
                            transition={{ duration: dur }}
                            className="flex-shrink-0 text-gray-600"
                          >
                            <ChevronDown size={11} />
                          </motion.span>
                          <span>{group.label}</span>
                          {!expanded && (
                            <span className="text-[9px] text-gray-600 ml-1 font-normal">
                              ({group.items.length})
                            </span>
                          )}
                        </button>
                        {/* Pin button (visible on hover) */}
                        <button
                          onClick={() => togglePin(group.label)}
                          className={`
                            flex-shrink-0 p-0.5 rounded transition-all duration-200
                            ${
                              pinned
                                ? "opacity-100 text-[#A8893D]"
                                : "opacity-0 group-hover/header:opacity-100 text-gray-600 hover:text-gray-400"
                            }
                          `}
                          title={
                            pinned ? "Unpin section" : "Pin section open"
                          }
                        >
                          <Pin
                            size={11}
                            className={`transition-transform duration-200 ${pinned ? "-rotate-45" : ""}`}
                          />
                        </button>
                      </div>
                    ) : (
                      // Collapsed: thin divider
                      groupIndex > 0 && (
                        <div className="hidden lg:block mx-3 mb-2 border-t border-[#A8893D]/15" />
                      )
                    )}

                    {/* Nav items with AnimatePresence */}
                    {!collapsed ? (
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: dur }}
                            className="space-y-0.5 overflow-hidden"
                          >
                            {group.items.map((item, itemIndex) => {
                              const active = isActive(pathname, item.href);
                              const Icon = item.icon;
                              const hoverClass = getIconHoverClass(item.icon);

                              // Compute flat index for keyboard focus
                              let flatIdx = -1;
                              let counter = 0;
                              for (const g of visibleGroups) {
                                counter++; // header
                                if (g.label === group.label) {
                                  flatIdx = counter + itemIndex;
                                  break;
                                }
                                if (isSectionExpanded(g.label)) {
                                  counter += g.items.length;
                                }
                              }
                              const isFocused = navFocusIndex === flatIdx;

                              return (
                                <motion.li
                                  key={item.href}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    duration: dur,
                                    delay: staggerDur * itemIndex,
                                  }}
                                >
                                  <Link
                                    href={item.href}
                                    onContextMenu={(e) =>
                                      handleContextMenu(e, item)
                                    }
                                    aria-current={
                                      active ? "page" : undefined
                                    }
                                    className={`
                                      group relative flex items-center gap-3 rounded-xl text-sm font-medium
                                      transition-all duration-200
                                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8893D]/50
                                      active:scale-[0.98]
                                      px-3 py-2.5
                                      ${
                                        active
                                          ? "bg-[#A8893D]/15 text-white"
                                          : isFocused
                                            ? "bg-white/5 text-white"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                      }
                                    `}
                                  >
                                    {/* Active indicator bar */}
                                    {active && (
                                      <motion.div
                                        layoutId="sidebar-active-indicator"
                                        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-gradient-to-b from-[#A8893D] to-[#C4A962]"
                                        style={{
                                          boxShadow:
                                            "0 0 8px rgba(27,115,64,0.4)",
                                        }}
                                        transition={{ duration: dur }}
                                      />
                                    )}

                                    <Icon
                                      size={20}
                                      className={`flex-shrink-0 transition-all duration-200 group-hover:${hoverClass} ${
                                        active
                                          ? "text-white"
                                          : "text-gray-500 group-hover:text-gray-300"
                                      }`}
                                    />
                                    <span className="flex-1 truncate">
                                      {item.label}
                                    </span>

                                    {/* Favorite indicator */}
                                    {isFavorite(item.href) && (
                                      <Star
                                        size={12}
                                        className="text-[#C4A962] flex-shrink-0"
                                        fill="currentColor"
                                      />
                                    )}
                                  </Link>
                                </motion.li>
                              );
                            })}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    ) : (
                      // Collapsed mode: just icons
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const active = isActive(pathname, item.href);
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              aria-label={item.label}
                              title={item.label}
                              className={`
                                group relative flex items-center justify-center rounded-xl
                                transition-all duration-200
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8893D]/50
                                active:scale-[0.98]
                                w-10 h-10 mx-auto
                                ${
                                  active
                                    ? "bg-[#A8893D]/15 text-white"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }
                              `}
                            >
                              {active && (
                                <div
                                  className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-gradient-to-b from-[#A8893D] to-[#C4A962]"
                                  style={{
                                    boxShadow:
                                      "0 0 8px rgba(27,115,64,0.4)",
                                  }}
                                />
                              )}
                              <Icon
                                size={20}
                                className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
                                  active
                                    ? "text-white"
                                    : "text-gray-500 group-hover:text-gray-300"
                                }`}
                              />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ------- Hidden sections link ------- */}
              {hiddenSectionCount > 0 && !collapsed && (
                <div className="mt-4 px-3">
                  <button
                    onClick={() => setWizardOpen(true)}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {hiddenSectionCount} more section
                    {hiddenSectionCount > 1 ? "s" : ""} hidden
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
          {/* User dropdown popover */}
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User size={16} />
                  My Profile
                </Link>
                <Link
                  href="/dashboard/system/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <HelpCircle size={16} />
                  Help & Support
                </Link>
                {/* Preset selector */}
                <div className="my-1 border-t border-[#A8893D]/15" />
                <button
                  onClick={() => {
                    setWizardOpen(true);
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors w-full text-left"
                >
                  <Layers size={16} />
                  Sidebar Layout
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
            {/* Avatar with online indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A8893D] to-[#6B5A28] flex items-center justify-center ring-2 ring-[#A8893D]/30">
                <span className="text-sm font-semibold text-white">
                  {userInitial}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0F172A]" />
            </div>

            {/* User info -- hidden when collapsed */}
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
            <span className="text-[10px] font-medium text-gray-600">
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
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left"
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

      {/* ---------------------------------------------------------- */}
      {/*  Setup wizard                                               */}
      {/* ---------------------------------------------------------- */}
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
    </>
  );
}
