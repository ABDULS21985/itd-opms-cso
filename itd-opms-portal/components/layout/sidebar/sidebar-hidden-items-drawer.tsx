"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, EyeOff, Eye } from "lucide-react";
import type { NavGroup } from "@/lib/navigation";

interface SidebarHiddenItemsDrawerProps {
  isCustomizing: boolean;
  allGroups: NavGroup[];
  hiddenItems: string[];
  hiddenSections: string[];
  onToggleItemVisibility: (href: string) => void;
  onToggleSectionVisibility: (label: string) => void;
  dur: number;
}

export function SidebarHiddenItemsDrawer({
  isCustomizing,
  allGroups,
  hiddenItems,
  hiddenSections,
  onToggleItemVisibility,
  onToggleSectionVisibility,
  dur,
}: SidebarHiddenItemsDrawerProps) {
  const [open, setOpen] = useState(false);

  const totalHidden = hiddenItems.length + hiddenSections.length;

  const hiddenBySection = useMemo(() => {
    const result: Array<{
      sectionLabel: string;
      isSectionHidden: boolean;
      items: Array<{ href: string; label: string }>;
    }> = [];

    for (const group of allGroups) {
      const isSectionHidden = hiddenSections.includes(group.label);
      const hiddenGroupItems = group.items.filter((i) =>
        hiddenItems.includes(i.href),
      );

      if (isSectionHidden || hiddenGroupItems.length > 0) {
        result.push({
          sectionLabel: group.label,
          isSectionHidden,
          items: hiddenGroupItems.map((i) => ({
            href: i.href,
            label: i.label,
          })),
        });
      }
    }
    return result;
  }, [allGroups, hiddenItems, hiddenSections]);

  if (!isCustomizing || totalHidden === 0) return null;

  return (
    <div className="mt-3 mx-1">
      <div className="border-t border-[#A8893D]/15 pt-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-300 transition-colors"
        >
          <EyeOff size={10} />
          Hidden Items
          <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full ml-1">
            {totalHidden}
          </span>
          <motion.span
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: dur }}
            className="ml-auto"
          >
            <ChevronDown size={10} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: dur }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-1 pb-2">
                {hiddenBySection.map(({ sectionLabel, isSectionHidden, items }) => (
                  <div key={sectionLabel}>
                    {/* Section label */}
                    <div className="flex items-center gap-1.5 px-2 mb-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                        {sectionLabel}
                      </span>
                      {isSectionHidden && (
                        <button
                          onClick={() =>
                            onToggleSectionVisibility(sectionLabel)
                          }
                          className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-gray-300 transition-colors"
                          title="Show section"
                        >
                          <Eye size={9} />
                          Show section
                        </button>
                      )}
                    </div>

                    {/* Hidden items in this section */}
                    {items.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => onToggleItemVisibility(item.href)}
                        className="w-full flex items-center gap-2 px-3 py-1 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <EyeOff size={12} />
                        <span className="line-through truncate">
                          {item.label}
                        </span>
                        <Eye
                          size={11}
                          className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100"
                        />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
