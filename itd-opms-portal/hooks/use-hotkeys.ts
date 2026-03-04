"use client";

import { useEffect, useRef } from "react";

interface HotkeyConfig {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  handler: (e: KeyboardEvent) => void;
  enabled?: boolean;
  preventDefault?: boolean;
  global?: boolean;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useHotkeys(shortcuts: HotkeyConfig[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        INPUT_TAGS.has(target.tagName) || target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        if (isInput && !shortcut.global) continue;

        const mod = shortcut.modifiers;
        if (mod) {
          if (mod.ctrl && !e.ctrlKey && !e.metaKey) continue;
          if (mod.meta && !e.metaKey && !e.ctrlKey) continue;
          if (mod.shift && !e.shiftKey) continue;
          if (mod.alt && !e.altKey) continue;
        } else {
          if (e.ctrlKey || e.metaKey || e.altKey) continue;
        }

        if (e.key.toLowerCase() === shortcut.key.toLowerCase()) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler(e);
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
