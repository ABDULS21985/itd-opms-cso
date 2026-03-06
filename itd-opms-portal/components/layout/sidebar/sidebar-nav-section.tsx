"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Pin,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import type { NavItem, NavGroup } from "@/lib/navigation";
import { SidebarNavItem } from "./sidebar-nav-item";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SidebarNavSectionProps {
  group: NavGroup;
  expanded: boolean;
  pinned: boolean;
  hasActiveItem: boolean;
  collapsed: boolean;
  isCustomizing: boolean;
  isSectionHidden: boolean;
  sidebarWidth: number;
  dur: number;
  staggerDur: number;
  pathname: string;
  navFocusIndex: number;
  visibleGroups: NavGroup[];
  groupIndex: number;
  isActive: (pathname: string, href: string) => boolean;
  isFavorite: (href: string) => boolean;
  isItemHidden: (href: string) => boolean;
  isSectionExpanded: (title: string) => boolean;
  onToggleSection: (title: string) => void;
  onTogglePin: (title: string) => void;
  onToggleSectionVisibility: (label: string) => void;
  onToggleItemVisibility: (href: string) => void;
  onContextMenu: (e: React.MouseEvent, item: NavItem) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SidebarNavSection({
  group,
  expanded,
  pinned,
  hasActiveItem,
  collapsed,
  isCustomizing,
  isSectionHidden,
  sidebarWidth,
  dur,
  staggerDur,
  pathname,
  navFocusIndex,
  visibleGroups,
  groupIndex,
  isActive: isActiveFn,
  isFavorite,
  isItemHidden,
  isSectionExpanded,
  onToggleSection,
  onTogglePin,
  onToggleSectionVisibility,
  onToggleItemVisibility,
  onContextMenu,
}: SidebarNavSectionProps) {
  const isOverview = group.label === "Overview";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `section:${group.label}`,
    disabled: !isCustomizing || isOverview,
    data: { type: "section", label: group.label },
  });

  const sortableStyle = isCustomizing
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }
    : undefined;

  const itemIds = useMemo(
    () => group.items.map((i) => i.href),
    [group.items],
  );

  /* ------- Collapsed mode: thin divider + icons ------- */
  if (collapsed) {
    return (
      <div className={groupIndex > 0 ? "mt-2" : ""}>
        {groupIndex > 0 && (
          <div className="hidden lg:block mx-3 mb-2 border-t border-[#8B6F2E]/20" />
        )}
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              active={isActiveFn(pathname, item.href)}
              isFav={isFavorite(item.href)}
              collapsed
              isCustomizing={false}
              isHidden={false}
              sidebarWidth={sidebarWidth}
              isFocused={false}
              itemIndex={0}
              dur={dur}
              staggerDur={0}
              onContextMenu={onContextMenu}
              onToggleVisibility={onToggleItemVisibility}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ------- Expanded mode ------- */
  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={`${groupIndex > 0 ? "mt-2" : ""} ${
        isCustomizing
          ? "rounded-lg border border-dashed border-[#1B7340]/20 p-1"
          : ""
      } ${isSectionHidden && isCustomizing ? "opacity-50" : ""}`}
    >
      {/* Section header */}
      <div className="group/header flex items-center px-3 mb-1 relative">
        {/* Drag handle — customize mode */}
        {isCustomizing && !isOverview && (
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-0.5 mr-1 rounded text-gray-400 hover:text-gray-200 cursor-grab active:cursor-grabbing transition-colors"
            aria-label={`Reorder ${group.label} section`}
          >
            <GripVertical size={12} />
          </button>
        )}

        <button
          onClick={() => onToggleSection(group.label)}
          className={`
            flex-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em]
            transition-all duration-300 py-1.5 group/section-btn
            ${
              hasActiveItem
                ? "sidebar-gold-active"
                : "text-[#A8893D]/70 hover:text-[#C4A962]"
            }
          `}
        >
          {/* Golden accent bar */}
          <motion.span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full"
            initial={false}
            animate={{
              height: hasActiveItem ? 18 : 0,
              opacity: hasActiveItem ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              background: "linear-gradient(180deg, #C4A962, #8B6F2E)",
            }}
          />

          <motion.span
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: dur }}
            className={`flex-shrink-0 transition-colors duration-300 ${
              hasActiveItem ? "text-[#C4A962]" : "text-[#8B6F2E]/50 group-hover/section-btn:text-[#A8893D]"
            }`}
          >
            <ChevronDown size={12} />
          </motion.span>
          <span
            className={`${isSectionHidden && isCustomizing ? "line-through" : ""} ${
              hasActiveItem ? "sidebar-gold-text" : ""
            }`}
          >
            {group.label}
          </span>
          {!expanded && (
            <span className="text-[9px] text-[#8B6F2E]/50 ml-1 font-normal tabular-nums">
              ({group.items.length})
            </span>
          )}
        </button>

        {/* Section visibility toggle — customize mode */}
        {isCustomizing && !isOverview && (
          <button
            onClick={() => onToggleSectionVisibility(group.label)}
            className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-200 transition-colors mr-1"
            aria-label={
              isSectionHidden
                ? `Show ${group.label} section`
                : `Hide ${group.label} section`
            }
          >
            {isSectionHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        )}

        {/* Item count badge — customize mode */}
        {isCustomizing && (
          <span className="text-[9px] text-[#A8893D] bg-[#8B6F2E]/10 px-1.5 py-0.5 rounded-full mr-1 border border-[#8B6F2E]/20">
            {group.items.length}
          </span>
        )}

        {/* Pin button (visible on hover) */}
        {!isCustomizing && (
          <button
            onClick={() => onTogglePin(group.label)}
            className={`
              flex-shrink-0 p-0.5 rounded transition-all duration-200
              ${
                pinned
                  ? "opacity-100 text-[#C4A962]"
                  : "opacity-0 group-hover/header:opacity-100 text-[#8B6F2E]/50 hover:text-[#A8893D]"
              }
            `}
            title={pinned ? "Unpin section" : "Pin section open"}
          >
            <Pin
              size={11}
              className={`transition-transform duration-200 ${pinned ? "-rotate-45" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Nav items */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur }}
            className="space-y-0.5 overflow-hidden"
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              {group.items.map((item, itemIndex) => {
                const active = isActiveFn(pathname, item.href);
                const hidden = isItemHidden(item.href);

                // Compute flat index for keyboard focus
                let flatIdx = -1;
                let counter = 0;
                for (const g of visibleGroups) {
                  counter++; // header
                  if (g.label === group.label) {
                    flatIdx = counter + itemIndex;
                    break;
                  }
                  if (isSectionExpanded(g.label)) {
                    counter += g.items.length;
                  }
                }
                const isFocused = navFocusIndex === flatIdx;

                return (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    active={active}
                    isFav={isFavorite(item.href)}
                    collapsed={false}
                    isCustomizing={isCustomizing}
                    isHidden={hidden}
                    sidebarWidth={sidebarWidth}
                    isFocused={isFocused}
                    itemIndex={itemIndex}
                    dur={dur}
                    staggerDur={staggerDur}
                    onContextMenu={onContextMenu}
                    onToggleVisibility={onToggleItemVisibility}
                  />
                );
              })}
            </SortableContext>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag overlay variant (simplified for ghost)                        */
/* ------------------------------------------------------------------ */

export function SidebarNavSectionOverlay({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] px-4 py-2.5 bg-[#0B0A06] border border-[#8B6F2E]/30 text-[#C4A962] shadow-2xl shadow-black/50"
      style={{ transform: "rotate(3deg)", opacity: 0.9, width: 240 }}
    >
      <GripVertical size={12} className="text-gray-400" />
      <span>{label}</span>
    </div>
  );
}
