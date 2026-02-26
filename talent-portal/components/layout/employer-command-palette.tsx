"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Mail,
  Settings,
  Search,
  ArrowRight,
  PlusCircle,
  KanbanSquare,
  Calendar,
  BarChart3,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  category: "page" | "action" | "recent";
  href?: string;
  action?: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Static commands                                                     */
/* ------------------------------------------------------------------ */

const PAGE_COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", description: "Hiring overview & metrics", icon: LayoutDashboard, category: "page", href: "/employer", shortcut: "G D" },
  { id: "pipeline", label: "Pipeline", description: "Manage candidate stages", icon: KanbanSquare, category: "page", href: "/employer/pipeline", shortcut: "G P" },
  { id: "jobs", label: "My Jobs", description: "All job postings", icon: Briefcase, category: "page", href: "/employer/jobs", shortcut: "G J" },
  { id: "candidates", label: "Discover Talent", description: "Search candidates", icon: Users, category: "page", href: "/employer/candidates" },
  { id: "interviews", label: "Interviews", description: "Schedule & manage", icon: Calendar, category: "page", href: "/employer/interviews", shortcut: "G I" },
  { id: "intro-requests", label: "Intro Requests", description: "Incoming requests", icon: Mail, category: "page", href: "/employer/intro-requests" },
  { id: "team", label: "Team", description: "Members & roles", icon: UserPlus, category: "page", href: "/employer/team" },
  { id: "analytics", label: "Analytics", description: "Insights & performance", icon: BarChart3, category: "page", href: "/employer/analytics" },
  { id: "settings", label: "Settings", description: "Security & preferences", icon: Settings, category: "page", href: "/employer/settings", shortcut: "G S" },
];

const ACTION_COMMANDS: CommandItem[] = [
  { id: "post-job", label: "Post a Job", description: "Create a new job posting", icon: PlusCircle, category: "action", href: "/employer/jobs/new" },
];

/* ------------------------------------------------------------------ */
/*  Recent searches (localStorage)                                     */
/* ------------------------------------------------------------------ */

const RECENT_KEY = "employer-cmd-recent";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter((r) => r !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EmployerCommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches] = useState(getRecentSearches);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      const recent: CommandItem[] = recentSearches.slice(0, 3).map((r, i) => {
        const match = [...PAGE_COMMANDS, ...ACTION_COMMANDS].find(
          (c) => c.label.toLowerCase() === r.toLowerCase()
        );
        return match
          ? { ...match, id: `recent-${i}`, category: "recent" as const }
          : { id: `recent-${i}`, label: r, icon: Search, category: "recent" as const, href: undefined };
      }).filter((r) => r.href);

      return { recent, pages: PAGE_COMMANDS, actions: ACTION_COMMANDS };
    }

    const matchPages = PAGE_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
    const matchActions = ACTION_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );

    return { recent: [], pages: matchPages, actions: matchActions };
  }, [query, recentSearches]);

  const allItems = useMemo(() => {
    return [
      ...filteredCommands.recent,
      ...filteredCommands.pages,
      ...filteredCommands.actions,
    ];
  }, [filteredCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (item: CommandItem) => {
      if (item.label) addRecentSearch(item.label);
      onOpenChange(false);
      if (item.href) {
        router.push(item.href);
      } else if (item.action) {
        item.action();
      }
    },
    [router, onOpenChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item) executeCommand(item);
      }
    },
    [allItems, selectedIndex, executeCommand]
  );

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const renderSection = (title: string, items: CommandItem[], startIndex: number) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
            {title}
          </span>
        </div>
        {items.map((item, i) => {
          const globalIndex = startIndex + i;
          const Icon = item.icon;
          const isSelected = globalIndex === selectedIndex;
          return (
            <button
              key={item.id}
              data-index={globalIndex}
              onClick={() => executeCommand(item)}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors rounded-lg mx-1 ${
                isSelected
                  ? "bg-[var(--accent-orange)]/8 text-[var(--accent-orange)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              }`}
              style={{ width: "calc(100% - 8px)" }}
            >
              <Icon
                size={18}
                className={isSelected ? "text-[var(--accent-orange)]" : "text-[var(--neutral-gray)]"}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-[var(--neutral-gray)] truncate mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
              {item.shortcut && (
                <div className="flex items-center gap-1">
                  {item.shortcut.split(" ").map((key) => (
                    <kbd
                      key={key}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-1)] border border-[var(--border)] rounded text-[var(--neutral-gray)]"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              )}
              {isSelected && (
                <ArrowRight size={14} className="text-[var(--accent-orange)] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  let runningIndex = 0;
  const recentStart = runningIndex;
  runningIndex += filteredCommands.recent.length;
  const pagesStart = runningIndex;
  runningIndex += filteredCommands.pages.length;
  const actionsStart = runningIndex;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[25%] -translate-x-1/2 z-50 w-full max-w-[560px] mx-4"
          >
            <div className="bg-[var(--surface-0)] border border-[var(--border)] shadow-2xl rounded-2xl overflow-hidden" role="dialog" aria-label="Command palette">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <Search size={18} className="text-[var(--neutral-gray)] flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, actions..."
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-[var(--neutral-gray)] text-[var(--text-primary)]"
                />
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-1)] border border-[var(--border)] rounded text-[var(--neutral-gray)]">
                  ESC
                </kbd>
              </div>

              <div
                ref={listRef}
                className="max-h-[360px] overflow-y-auto py-2 px-1"
              >
                {allItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-[var(--neutral-gray)]">
                    <Search size={32} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">No results found</p>
                    <p className="text-xs mt-1 opacity-70">Try a different search term</p>
                  </div>
                ) : (
                  <>
                    {renderSection("Recent", filteredCommands.recent, recentStart)}
                    {renderSection("Pages", filteredCommands.pages, pagesStart)}
                    {renderSection("Quick Actions", filteredCommands.actions, actionsStart)}
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-1)]">
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--neutral-gray)]">
                  <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--neutral-gray)]">
                  <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--neutral-gray)]">
                  <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded">esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
