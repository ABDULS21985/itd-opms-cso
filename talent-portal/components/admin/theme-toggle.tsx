"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const modes = [
  { value: "light" as const, icon: Sun, label: "Light mode" },
  { value: "system" as const, icon: Monitor, label: "System preference" },
  { value: "dark" as const, icon: Moon, label: "Dark mode" },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const activeIdx = modes.findIndex((m) => m.value === theme);

  return (
    <div
      className="relative flex items-center gap-0.5 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
      role="radiogroup"
      aria-label="Theme preference"
    >
      {/* Sliding pill indicator */}
      <div
        className="absolute top-1 h-[calc(100%-8px)] w-[30px] rounded-lg bg-[var(--surface-0)] shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(${activeIdx * 30}px)` }}
        aria-hidden="true"
      />

      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = theme === mode.value;
        const tooltip =
          mode.value === "system"
            ? `System (currently ${resolvedTheme})`
            : mode.label;

        return (
          <button
            key={mode.value}
            role="radio"
            aria-checked={isActive}
            aria-label={tooltip}
            title={tooltip}
            onClick={() => setTheme(mode.value)}
            className={cn(
              "relative z-10 flex items-center justify-center w-[30px] h-[26px] rounded-lg transition-colors duration-200",
              isActive
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
