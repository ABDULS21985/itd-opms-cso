"use client";

import { useState } from "react";
import { ChevronRight, MapPin, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Location, LocationTreeNode } from "@/types/taxonomy";

interface LocationTreeNodeProps {
  node: LocationTreeNode;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
}

export function LocationTreeNodeComp({
  node,
  onEdit,
  onDelete,
}: LocationTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* Country header */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-3 hover:bg-[var(--surface-1)] transition-colors"
      >
        <ChevronRight
          size={16}
          className={cn(
            "text-[var(--neutral-gray)] transition-transform",
            expanded && "rotate-90",
          )}
        />
        <MapPin size={14} className="text-[var(--info)]" />
        <span className="font-semibold text-sm text-[var(--text-primary)]">
          {node.country}
        </span>
        {node.countryCode && (
          <span className="text-xs text-[var(--neutral-gray)]">
            ({node.countryCode})
          </span>
        )}
        <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--neutral-gray)]">
          {node.totalCities} {node.totalCities === 1 ? "city" : "cities"}
        </span>
      </button>

      {/* City rows */}
      {expanded && (
        <div className="divide-y divide-[var(--border)]">
          {node.locations.map((location) => (
            <div
              key={location.id}
              className="flex items-center gap-3 pl-8 pr-4 py-2.5 hover:bg-[var(--surface-1)] transition-colors"
            >
              <span className="flex-1 text-sm text-[var(--text-primary)]">
                {location.city}
              </span>

              {location.timezone && (
                <span className="text-xs text-[var(--neutral-gray)]">
                  {location.timezone}
                </span>
              )}

              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  location.isActive ? "bg-[var(--success)]" : "bg-[var(--neutral-gray)]",
                )}
                title={location.isActive ? "Active" : "Inactive"}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(location);
                }}
                className="p-1 rounded-md text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                title="Edit location"
                aria-label="Edit location"
              >
                <Edit size={14} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(location);
                }}
                className="p-1 rounded-md text-[var(--neutral-gray)] hover:bg-[var(--error)]/5 hover:text-[var(--error)] transition-colors"
                title="Delete location"
                aria-label="Delete location"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
