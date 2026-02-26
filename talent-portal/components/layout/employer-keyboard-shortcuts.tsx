"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  Calendar,
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
  { keys: "G D", label: "Go to Dashboard", icon: LayoutDashboard, category: "navigation" },
  { keys: "G J", label: "Go to Jobs", icon: Briefcase, category: "navigation" },
  { keys: "G P", label: "Go to Pipeline", icon: KanbanSquare, category: "navigation" },
  { keys: "G I", label: "Go to Interviews", icon: Calendar, category: "navigation" },
  { keys: "G S", label: "Go to Settings", icon: Settings, category: "navigation" },
  { keys: "⌘ K", label: "Open command palette", icon: Search, category: "actions" },
  { keys: "?", label: "Show keyboard shortcuts", icon: HelpCircle, category: "general" },
];

/* ------------------------------------------------------------------ */
/*  Navigation map (G prefix)                                          */
/* ------------------------------------------------------------------ */

const G_ROUTES: Record<string, string> = {
  d: "/employer",
  j: "/employer/jobs",
  p: "/employer/pipeline",
  i: "/employer/interviews",
  s: "/employer/settings",
};

/* ------------------------------------------------------------------ */
/*  useKeyboardShortcuts hook                                          */
/* ------------------------------------------------------------------ */

interface ShortcutsOptions {
  onCommandPalette: () => void;
  onShowShortcuts: () => void;
}

export function useEmployerKeyboardShortcuts({ onCommandPalette, onShowShortcuts }: ShortcutsOptions) {
  const router = useRouter();
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // ⌘K / Ctrl+K — always
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPalette();
        return;
      }

      if (isInput) return;

      // ? — show shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onShowShortcuts();
        return;
      }

      // G prefix
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        gPending.current = true;
        clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          gPending.current = false;
        }, 1000);
        return;
      }

      if (gPending.current) {
        gPending.current = false;
        clearTimeout(gTimer.current);
        const route = G_ROUTES[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
      }
    },
    [router, onCommandPalette, onShowShortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}

/* ------------------------------------------------------------------ */
/*  Shortcuts dialog component                                         */
/* ------------------------------------------------------------------ */

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployerKeyboardShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
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
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
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
                                <span className="text-sm text-[var(--text-primary)]">{shortcut.label}</span>
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
