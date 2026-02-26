"use client";

import { Edit, Trash2, Layers } from "lucide-react";
import { AnimatedCard } from "@/components/shared/animated-card";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/taxonomy";

interface TrackCardProps {
  track: Track;
  skillCount?: number;
  onEdit: (track: Track) => void;
  onDelete: (track: Track) => void;
}

export function TrackCard({ track, skillCount, onEdit, onDelete }: TrackCardProps) {
  return (
    <AnimatedCard accentColor={track.color}>
      <div className="p-5">
        {/* Track name */}
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{track.name}</h3>

        {/* Description */}
        {track.description && (
          <p className="text-xs text-[var(--neutral-gray)] line-clamp-2 mt-1">
            {track.description}
          </p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {/* Skill count badge */}
            {skillCount !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--neutral-gray)]">
                <Layers size={12} />
                {skillCount} skill{skillCount !== 1 ? "s" : ""}
              </span>
            )}

            {/* Active / Inactive badge */}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                track.isActive
                  ? "bg-[var(--success)]/10 text-[var(--success)]"
                  : "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
              )}
            >
              {track.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(track)}
              className="p-1.5 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
              aria-label={`Edit ${track.name}`}
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => onDelete(track)}
              className="p-1.5 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--error)]/10 hover:text-[var(--error)] transition-colors"
              aria-label={`Delete ${track.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
}
