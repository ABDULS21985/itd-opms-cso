"use client";

import { useState, useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#1B7340", "#0E5A2D", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#EC4899", "#EF4444",
  "#C4A35A", "#F59E0B", "#EAB308", "#10B981",
  "#059669", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#64748B", "#334155", "#171717", "#9CA3AF",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

export function ColorPicker({
  value,
  onChange,
  label,
  className,
}: ColorPickerProps) {
  const id = useId();
  const [customInput, setCustomInput] = useState(value);

  const handleCustomChange = (hex: string) => {
    setCustomInput(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          {label}
        </label>
      )}

      {/* Swatch grid */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              onChange(color);
              setCustomInput(color);
            }}
            className={cn(
              "w-7 h-7 rounded-lg border-2 transition-all hover:scale-110",
              value === color
                ? "border-[var(--foreground)] ring-2 ring-[var(--foreground)]/20"
                : "border-transparent hover:border-[var(--border)]",
            )}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          >
            {value === color && (
              <Check
                size={14}
                className="mx-auto"
                style={{
                  color: isLightColor(color) ? "#171717" : "#ffffff",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-[var(--border)] flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <input
          id={id}
          type="text"
          value={customInput}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="#1B7340"
          maxLength={7}
          className="flex-1 h-8 px-3 text-sm font-mono border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors bg-[var(--surface-0)]"
        />
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
