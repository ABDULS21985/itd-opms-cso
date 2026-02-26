"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  TrendingUp,
  Settings,
  HelpCircle,
  Search,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShortcutDef {
  keys: string;
  label: string;
  icon?: LucideIcon;
  category: "navigation" | "actions" | "general";
}

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                               */
/* ------------------------------------------------------------------ */

const SHORTCUTS: ShortcutDef[] = [
  // Navigation (G then X)
  { keys: "G → D", label: "Go to Dashboard", icon: LayoutDashboard, category: "navigation" },
  { keys: "G → C", label: "Go to Candidates", icon: Users, category: "navigation" },
  { keys: "G → J", label: "Go to Jobs", icon: Briefcase, category: "navigation" },
  { keys: "G → P", label: "Go to Placements", icon: TrendingUp, category: "navigation" },
  { keys: "G → S", label: "Go to Settings", icon: Settings, category: "navigation" },
  // Actions
  { keys: "⌘ K", label: "Open command palette", icon: Search, category: "actions" },
  // General
  { keys: "?", label: "Show keyboard shortcuts", icon: HelpCircle, category: "general" },
  { keys: "Esc", label: "Close dialog / cancel", category: "general" },
];

/* ------------------------------------------------------------------ */
/*  Hook: useKeyboardShortcuts                                         */
/* ------------------------------------------------------------------ */

interface ShortcutActions {
  onCommandPalette: () => void;
  onShowShortcuts: () => void;
}

export function useKeyboardShortcuts({ onCommandPalette, onShowShortcuts }: ShortcutActions) {
  const router = useRouter();
  const [gPending, setGPending] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // ⌘K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPalette();
        return;
      }

      // ? — show shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onShowShortcuts();
        return;
      }

      // G prefix for navigation
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!gPending) {
          setGPending(true);
          setTimeout(() => setGPending(false), 1000);
          return;
        }
      }

      if (gPending) {
        setGPending(false);
        switch (e.key) {
          case "d":
            e.preventDefault();
            router.push("/admin");
            break;
          case "c":
            e.preventDefault();
            router.push("/admin/candidates");
            break;
          case "j":
            e.preventDefault();
            router.push("/admin/jobs");
            break;
          case "p":
            e.preventDefault();
            router.push("/admin/placements");
            break;
          case "s":
            e.preventDefault();
            router.push("/admin/settings");
            break;
        }
      }
    },
    [router, onCommandPalette, onShowShortcuts, gPending]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/* ------------------------------------------------------------------ */
/*  Dialog component                                                   */
/* ------------------------------------------------------------------ */

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const categories: { key: string; label: string }[] = [
    { key: "navigation", label: "Navigation" },
    { key: "actions", label: "Actions" },
    { key: "general", label: "General" },
  ];

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[480px] mx-4"
          >
            <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden" role="dialog" aria-label="Keyboard shortcuts">
              <div className="px-5 pt-5 pb-3 border-b border-[var(--border)]">
                <h2 className="text-base font-semibold text-[#171717]">Keyboard Shortcuts</h2>
              </div>

              <div className="px-5 py-4 max-h-[400px] overflow-y-auto space-y-5">
                {categories.map((cat) => {
                  const items = SHORTCUTS.filter((s) => s.category === cat.key);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-2">
                        {cat.label}
                      </p>
                      <div className="space-y-1">
                        {items.map((shortcut) => {
                          const Icon = shortcut.icon;
                          return (
                            <div
                              key={shortcut.keys}
                              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                {Icon && <Icon size={15} className="text-[var(--neutral-gray)]" />}
                                <span className="text-sm text-[#171717]">{shortcut.label}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.split(" ").map((key) => (
                                  <kbd
                                    key={key}
                                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono bg-[var(--surface-1)] border border-[var(--border)] rounded-md text-[var(--neutral-gray)]"
                                  >
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-1)] rounded-b-2xl">
                <p className="text-xs text-[var(--neutral-gray)]">
                  Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded">?</kbd> anytime to show this dialog
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
