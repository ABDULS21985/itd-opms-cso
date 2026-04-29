"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  Compass,
  Plus,
  Star,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { fuzzyMatch, getHighlightSegments } from "@/lib/fuzzy-match";
import { navGroups } from "@/lib/navigation";
import type { FavoriteItem } from "@/hooks/use-sidebar-favorites";

interface SidebarCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Optional list of recently-visited paths to surface above all when query is empty. */
  recents: Array<{ path: string; text: string; iconName: string }>;
  favorites: FavoriteItem[];
  resolveIcon: (iconName: string) => LucideIcon;
}

interface PaletteRow {
  id: string;
  kind: "nav" | "action" | "favorite" | "recent";
  label: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  onRun?: () => void;
  /** Numeric score from fuzzyMatch — higher = better. */
  score: number;
  matched?: number[];
}

interface QuickAction {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  /** Aliases to broaden matching ("create incident" → "new ticket"). */
  aliases?: string[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "create-ticket",
    label: "Create ticket",
    hint: "New service desk request",
    href: "/dashboard/itsm/tickets?new=1",
    icon: Plus,
    aliases: ["new ticket", "create incident", "report issue"],
  },
  {
    id: "create-change",
    label: "Create change request",
    hint: "Submit a planning CR",
    href: "/dashboard/planning/change-requests?new=1",
    icon: Plus,
    aliases: ["new change", "rfc"],
  },
  {
    id: "ssa-new",
    label: "New server allocation request",
    hint: "Request server space",
    href: "/dashboard/ssa/new",
    icon: Plus,
    aliases: ["server request", "ssa", "new allocation"],
  },
  {
    id: "kb-new",
    label: "New knowledge article",
    hint: "Author KB content",
    href: "/dashboard/knowledge/articles/new",
    icon: Plus,
    aliases: ["new article", "create article"],
  },
  {
    id: "open-cab",
    label: "Open CAB calendar",
    hint: "Change advisory board",
    href: "/dashboard/itsm/cab-meetings",
    icon: Compass,
    aliases: ["cab", "change calendar"],
  },
  {
    id: "open-approvals",
    label: "Open approvals queue",
    href: "/dashboard/governance/approvals",
    icon: Compass,
    aliases: ["approvals", "my approvals"],
  },
];

const MAX_RESULTS = 12;

export function SidebarCommandPalette({
  open,
  onClose,
  recents,
  favorites,
  resolveIcon,
}: SidebarCommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // Reset on open / focus the input.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Close on route change.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current) closeRef.current();
    wasOpenRef.current = open;
  }, [pathname, open]);

  // Build the source pool every time the palette is shown.
  const sources = useMemo(() => {
    const navRows: PaletteRow[] = [];
    for (const group of navGroups) {
      for (const item of group.items) {
        navRows.push({
          id: `nav:${item.href}`,
          kind: "nav",
          label: item.label,
          hint: group.label,
          icon: item.icon,
          href: item.href,
          score: 0,
        });
      }
    }
    const actionRows: PaletteRow[] = QUICK_ACTIONS.map((a) => ({
      id: `action:${a.id}`,
      kind: "action",
      label: a.label,
      hint: a.hint,
      icon: a.icon,
      href: a.href,
      score: 0,
    }));
    const favRows: PaletteRow[] = favorites.map((f) => ({
      id: `fav:${f.path}`,
      kind: "favorite",
      label: f.alias || f.text,
      hint: f.kind ? `Favorite · ${f.kind}` : "Favorite",
      icon: resolveIcon(f.iconName),
      href: f.path,
      score: 0,
    }));
    const recentRows: PaletteRow[] = recents.map((r) => ({
      id: `recent:${r.path}`,
      kind: "recent",
      label: r.text,
      hint: "Recently visited",
      icon: resolveIcon(r.iconName),
      href: r.path,
      score: 0,
    }));
    return { navRows, actionRows, favRows, recentRows };
  }, [favorites, recents, resolveIcon]);

  // Build the visible result list based on the query.
  const results = useMemo<PaletteRow[]>(() => {
    const q = query.trim();
    if (!q) {
      // Empty query: show favorites, recents, and a sample of quick actions.
      const seen = new Set<string>();
      const merged: PaletteRow[] = [];
      for (const r of sources.favRows) {
        if (!seen.has(r.id)) {
          merged.push(r);
          seen.add(r.id);
        }
      }
      for (const r of sources.recentRows) {
        if (!seen.has(r.id)) {
          merged.push(r);
          seen.add(r.id);
        }
      }
      for (const r of sources.actionRows.slice(0, 4)) {
        if (!seen.has(r.id)) {
          merged.push(r);
          seen.add(r.id);
        }
      }
      return merged.slice(0, MAX_RESULTS);
    }

    const score = (label: string, kind: PaletteRow["kind"]) => {
      const m = fuzzyMatch(q, label);
      if (!m) return null;
      let bonus = 0;
      if (kind === "favorite") bonus += 4;
      if (kind === "recent") bonus += 3;
      if (kind === "action") bonus += 2;
      return { score: m.score + bonus, matched: m.matchedIndices };
    };

    const scoreAliased = (
      base: string,
      aliases: string[] | undefined,
      kind: PaletteRow["kind"],
    ) => {
      let best = score(base, kind);
      if (!aliases) return best;
      for (const alias of aliases) {
        const candidate = score(alias, kind);
        if (candidate && (!best || candidate.score > best.score)) {
          best = { ...candidate, matched: [] };
        }
      }
      return best;
    };

    const out: PaletteRow[] = [];

    for (const row of sources.navRows) {
      const s = score(row.label, row.kind);
      if (s) out.push({ ...row, score: s.score, matched: s.matched });
    }
    for (const row of sources.actionRows) {
      const action = QUICK_ACTIONS.find((a) => `action:${a.id}` === row.id);
      const s = scoreAliased(row.label, action?.aliases, row.kind);
      if (s) out.push({ ...row, score: s.score, matched: s.matched });
    }
    for (const row of sources.favRows) {
      const s = score(row.label, row.kind);
      if (s) out.push({ ...row, score: s.score, matched: s.matched });
    }
    for (const row of sources.recentRows) {
      const s = score(row.label, row.kind);
      if (s) out.push({ ...row, score: s.score, matched: s.matched });
    }

    out.sort((a, b) => b.score - a.score);
    // Dedupe by id.
    const seen = new Set<string>();
    const deduped: PaletteRow[] = [];
    for (const r of out) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      deduped.push(r);
      if (deduped.length >= MAX_RESULTS) break;
    }
    return deduped;
  }, [query, sources]);

  // Keep activeIdx valid.
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const runRow = useCallback(
    (row: PaletteRow) => {
      onClose();
      if (row.onRun) {
        row.onRun();
      } else if (row.href) {
        router.push(row.href);
      }
    },
    [onClose, router],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = results[activeIdx];
      if (row) runRow(row);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Command palette"
            className="relative w-full max-w-xl bg-[color:var(--sidebar-bg-from)] border border-[color:var(--sidebar-border-strong)] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[color:var(--sidebar-border)]">
              <Search size={16} className="text-[color:var(--sidebar-text-subtle)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type to search nav, actions, favorites…"
                className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--sidebar-text)] placeholder:text-[color:var(--sidebar-text-faint)] focus:outline-none"
              />
              <kbd className="text-[10px] text-[color:var(--sidebar-text-faint)] border border-[color:var(--sidebar-border)] rounded px-1.5 py-0.5 font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto sidebar-scroll py-2">
              {results.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-[color:var(--sidebar-text-faint)]">
                  No matches for &ldquo;{query}&rdquo;
                </div>
              ) : (
                results.map((row, idx) => {
                  const Icon = row.icon;
                  const focused = idx === activeIdx;
                  const segments = row.matched
                    ? getHighlightSegments(row.label, row.matched)
                    : null;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => runRow(row)}
                      className={`group w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        focused
                          ? "bg-[color:var(--sidebar-search-bg)] text-[color:var(--sidebar-text)]"
                          : "text-[color:var(--sidebar-text-muted)] hover:bg-[color:var(--sidebar-hover-bg)]"
                      }`}
                    >
                      <Icon
                        size={16}
                        className="flex-shrink-0 text-[color:var(--sidebar-text-subtle)]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm truncate">
                          {segments
                            ? segments.map((s, i) =>
                                s.highlighted ? (
                                  <mark
                                    key={i}
                                    className="bg-[color:var(--sidebar-active-bg-strong)] text-white rounded-sm px-[1px]"
                                  >
                                    {s.text}
                                  </mark>
                                ) : (
                                  <span key={i}>{s.text}</span>
                                ),
                              )
                            : row.label}
                        </span>
                        {row.hint && (
                          <span className="block text-[10px] text-[color:var(--sidebar-text-faint)]">
                            {row.kind === "favorite" && (
                              <Star
                                size={9}
                                className="inline-block -mt-0.5 mr-1 text-[color:var(--sidebar-accent)]"
                              />
                            )}
                            {row.hint}
                          </span>
                        )}
                      </div>
                      <ArrowRight
                        size={13}
                        className={`flex-shrink-0 transition-opacity ${
                          focused ? "opacity-100" : "opacity-0"
                        } text-[color:var(--sidebar-text-subtle)]`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-[color:var(--sidebar-border)] text-[10px] text-[color:var(--sidebar-text-faint)]">
              <span className="flex items-center gap-1">
                <kbd className="font-mono border border-[color:var(--sidebar-border)] rounded px-1">
                  ↑
                </kbd>
                <kbd className="font-mono border border-[color:var(--sidebar-border)] rounded px-1">
                  ↓
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft size={9} /> open
              </span>
              <span className="ml-auto">
                {results.length} result{results.length === 1 ? "" : "s"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
