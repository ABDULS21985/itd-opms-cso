"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Sun,
  Inbox,
  ListChecks,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import { navGroups } from "@/lib/navigation";
import { fuzzyMatch, getHighlightSegments } from "@/lib/fuzzy-match";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import type { RecentItem } from "@/hooks/use-sidebar-recently-visited";

// =============================================================================
// Types
// =============================================================================

type CommandItemKind = "page" | "action" | "recent";

interface CommandItem {
  id: string;
  label: string;
  group: string;
  kind: CommandItemKind;
  href?: string;
  action?: () => void;
  icon: React.ReactNode;
  permission?: string;
}

interface ScoredCommandItem extends CommandItem {
  score: number;
  matchedIndices: number[];
}

// =============================================================================
// Props
// =============================================================================

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

const RECENT_STORAGE_KEY = "opms-sidebar-recent";

// =============================================================================
// Helpers
// =============================================================================

function loadRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function hasPermission(
  userPermissions: string[],
  requiredPermission?: string
): boolean {
  if (!requiredPermission) return true;
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(requiredPermission);
}

// =============================================================================
// Component
// =============================================================================

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const permissions = user?.permissions ?? [];

  // ---------------------------------------------------------------------------
  // Build page items from navGroups
  // ---------------------------------------------------------------------------
  const pageItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    for (const group of navGroups) {
      for (const item of group.items) {
        if (!hasPermission(permissions, item.permission)) continue;
        const Icon = item.icon;
        items.push({
          id: `page-${item.href}`,
          label: item.label,
          group: group.label,
          kind: "page",
          href: item.href,
          icon: <Icon size={16} />,
          permission: item.permission,
        });
      }
    }
    return items;
  }, [permissions]);

  // ---------------------------------------------------------------------------
  // Build quick action items
  // ---------------------------------------------------------------------------
  const cycleTheme = useCallback(() => {
    const order: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const currentIdx = order.indexOf(theme);
    const next = order[(currentIdx + 1) % order.length];
    setTheme(next);
  }, [theme, setTheme]);

  const quickActionDefs = useMemo(
    () => [
      {
        id: "action-new-ticket",
        label: "New Ticket",
        href: "/dashboard/itsm/tickets/new",
        icon: <Plus size={16} />,
        permission: "itsm.manage",
      },
      {
        id: "action-new-project",
        label: "New Project",
        href: "/dashboard/planning/projects/new",
        icon: <Plus size={16} />,
        permission: "planning.manage",
      },
      {
        id: "action-new-policy",
        label: "New Policy",
        href: "/dashboard/governance/policies/new",
        icon: <Plus size={16} />,
        permission: "governance.manage",
      },
      {
        id: "action-new-article",
        label: "New Article",
        href: "/dashboard/knowledge/articles/new",
        icon: <Plus size={16} />,
        permission: "knowledge.manage",
      },
      {
        id: "action-toggle-theme",
        label: "Toggle Theme",
        icon: <Sun size={16} />,
        permission: undefined,
      },
      {
        id: "action-my-queue",
        label: "My Queue",
        href: "/dashboard/itsm/my-queue",
        icon: <Inbox size={16} />,
        permission: "itsm.view",
      },
      {
        id: "action-my-actions",
        label: "My Actions",
        href: "/dashboard/governance/actions",
        icon: <ListChecks size={16} />,
        permission: "governance.view",
      },
    ],
    []
  );

  const actionItems = useMemo<CommandItem[]>(() => {
    return quickActionDefs
      .filter((a) => hasPermission(permissions, a.permission))
      .map((a) => ({
        id: a.id,
        label: a.label,
        group: "Quick Actions",
        kind: "action" as CommandItemKind,
        href: a.href,
        action: a.id === "action-toggle-theme" ? cycleTheme : undefined,
        icon: a.icon,
        permission: a.permission,
      }));
  }, [permissions, quickActionDefs, cycleTheme]);

  // ---------------------------------------------------------------------------
  // Build recent items
  // ---------------------------------------------------------------------------
  const [recentRaw, setRecentRaw] = useState<RecentItem[]>([]);

  useEffect(() => {
    if (open) {
      setRecentRaw(loadRecentItems());
    }
  }, [open]);

  const recentItems = useMemo<CommandItem[]>(() => {
    return recentRaw.map((r) => ({
      id: `recent-${r.path}`,
      label: r.text,
      group: "Recent",
      kind: "recent" as CommandItemKind,
      href: r.path,
      icon: <Clock size={16} />,
    }));
  }, [recentRaw]);

  // ---------------------------------------------------------------------------
  // All items combined
  // ---------------------------------------------------------------------------
  const allItems = useMemo<CommandItem[]>(
    () => [...recentItems, ...actionItems, ...pageItems],
    [recentItems, actionItems, pageItems]
  );

  // ---------------------------------------------------------------------------
  // Filtered / scored results
  // ---------------------------------------------------------------------------
  const filteredGroups = useMemo(() => {
    if (!query.trim()) {
      // Empty state: Recent first, Quick Actions, then first 10 pages
      const groups: Array<{ label: string; items: CommandItem[] }> = [];

      if (recentItems.length > 0) {
        groups.push({ label: "Recent", items: recentItems });
      }
      if (actionItems.length > 0) {
        groups.push({ label: "Quick Actions", items: actionItems });
      }
      if (pageItems.length > 0) {
        groups.push({ label: "Pages", items: pageItems.slice(0, 10) });
      }

      return groups;
    }

    // Fuzzy match all items
    const scored: ScoredCommandItem[] = [];
    for (const item of allItems) {
      const result = fuzzyMatch(query, item.label);
      if (result) {
        scored.push({ ...item, score: result.score, matchedIndices: result.matchedIndices });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Group by kind label
    const kindToGroupLabel: Record<CommandItemKind, string> = {
      recent: "Recent",
      action: "Quick Actions",
      page: "Pages",
    };

    const groupMap = new Map<string, ScoredCommandItem[]>();
    for (const item of scored) {
      const groupLabel = kindToGroupLabel[item.kind];
      if (!groupMap.has(groupLabel)) {
        groupMap.set(groupLabel, []);
      }
      groupMap.get(groupLabel)!.push(item);
    }

    const groups: Array<{ label: string; items: ScoredCommandItem[] }> = [];
    // Preserve order: Recent, Quick Actions, Pages
    for (const label of ["Recent", "Quick Actions", "Pages"]) {
      const items = groupMap.get(label);
      if (items && items.length > 0) {
        groups.push({ label, items });
      }
    }

    return groups;
  }, [query, allItems, recentItems, actionItems, pageItems]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const items: Array<CommandItem | ScoredCommandItem> = [];
    for (const group of filteredGroups) {
      for (const item of group.items) {
        items.push(item);
      }
    }
    return items;
  }, [filteredGroups]);

  // ---------------------------------------------------------------------------
  // Reset state when opened/closed
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Auto-focus input
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ---------------------------------------------------------------------------
  // Execute the selected item
  // ---------------------------------------------------------------------------
  const executeItem = useCallback(
    (item: CommandItem | ScoredCommandItem) => {
      if (item.action) {
        item.action();
        onOpenChange(false);
        return;
      }
      if (item.href) {
        router.push(item.href);
        onOpenChange(false);
      }
    },
    [router, onOpenChange]
  );

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0
          );
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1
          );
          break;
        }
        case "Enter": {
          e.preventDefault();
          const item = flatItems[activeIndex];
          if (item) {
            executeItem(item);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          onOpenChange(false);
          break;
        }
      }
    },
    [flatItems, activeIndex, executeItem, onOpenChange]
  );

  // ---------------------------------------------------------------------------
  // Scroll active item into view
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector(
      `[data-command-index="${activeIndex}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ---------------------------------------------------------------------------
  // Lock body scroll when open
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function renderLabel(item: CommandItem | ScoredCommandItem) {
    if ("matchedIndices" in item && item.matchedIndices.length > 0) {
      const segments = getHighlightSegments(item.label, item.matchedIndices);
      return (
        <span>
          {segments.map((seg, i) =>
            seg.highlighted ? (
              <span
                key={i}
                className="text-[var(--primary)] font-semibold"
              >
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </span>
      );
    }
    return <span>{item.label}</span>;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  let runningIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search
                size={18}
                className="shrink-0 text-[var(--neutral-gray)]"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent text-base text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 p-1 rounded-md hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[400px] overflow-y-auto py-2"
              role="listbox"
            >
              {filteredGroups.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--neutral-gray)]">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const groupEl = (
                    <div key={group.label} role="group" aria-label={group.label}>
                      {/* Group header */}
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                          {group.label}
                        </span>
                      </div>

                      {/* Group items */}
                      {group.items.map((item) => {
                        const itemIndex = runningIndex++;
                        const isActive = itemIndex === activeIndex;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-command-index={itemIndex}
                            role="option"
                            aria-selected={isActive}
                            onClick={() => executeItem(item)}
                            onMouseEnter={() => setActiveIndex(itemIndex)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-[var(--primary)]/10 border-l-2 border-[var(--primary)]"
                                : "border-l-2 border-transparent"
                            }`}
                          >
                            <span
                              className={`shrink-0 ${
                                isActive
                                  ? "text-[var(--primary)]"
                                  : "text-[var(--neutral-gray)]"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span
                              className={`flex-1 truncate ${
                                isActive
                                  ? "text-[var(--text-primary)]"
                                  : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {renderLabel(item)}
                            </span>
                            {item.kind === "page" && (
                              <span className="shrink-0 text-[10px] text-[var(--neutral-gray)]">
                                {(item as CommandItem & { group: string }).group}
                              </span>
                            )}
                            {isActive && (
                              <ArrowRight
                                size={14}
                                className="shrink-0 text-[var(--primary)]"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );

                  return groupEl;
                })
              )}
            </div>

            {/* Footer: keyboard hints */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-1)]">
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--neutral-gray)]">
                <kbd className="inline-flex items-center justify-center min-w-[18px] px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded shadow-sm">
                  &uarr;
                </kbd>
                <kbd className="inline-flex items-center justify-center min-w-[18px] px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded shadow-sm">
                  &darr;
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--neutral-gray)]">
                <kbd className="inline-flex items-center justify-center min-w-[18px] px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded shadow-sm">
                  &crarr;
                </kbd>
                Open
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--neutral-gray)]">
                <kbd className="inline-flex items-center justify-center min-w-[18px] px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded shadow-sm">
                  Esc
                </kbd>
                Close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
