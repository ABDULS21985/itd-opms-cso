"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface KeyboardShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_GROUPS = [
  {
    label: "Global",
    shortcuts: [
      { keys: ["Cmd", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["/"], description: "Focus sidebar search" },
      { keys: ["Esc"], description: "Close dialog / Deselect" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "T"], description: "Go to Tickets" },
      { keys: ["G", "P"], description: "Go to Projects" },
      { keys: ["G", "W"], description: "Go to Work Items" },
      { keys: ["G", "A"], description: "Go to Assets" },
      { keys: ["G", "K"], description: "Go to Knowledge Base" },
    ],
  },
  {
    label: "Tables",
    shortcuts: [
      { keys: ["J"], description: "Move down" },
      { keys: ["K"], description: "Move up" },
      { keys: ["X"], description: "Toggle select row" },
      { keys: ["Enter"], description: "Open selected row" },
      { keys: ["Esc"], description: "Clear selection" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["N"], description: "New item (context-aware)" },
      { keys: ["E"], description: "Edit selected item" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 text-[10px] font-mono font-medium bg-[var(--surface-1)] border border-[var(--border)] rounded text-[var(--text-secondary)] shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutHelp({
  open,
  onOpenChange,
}: KeyboardShortcutHelpProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-5">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-1.5">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-[var(--text-secondary)]">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-0.5">
                              {i > 0 && (
                                <span className="text-[10px] text-[var(--neutral-gray)] mx-0.5">
                                  +
                                </span>
                              )}
                              <Kbd>{key}</Kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-1)]">
              <p className="text-[10px] text-[var(--neutral-gray)] text-center">
                Press <Kbd>?</Kbd> to toggle this dialog
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
