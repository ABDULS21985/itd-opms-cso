"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  GripVertical,
  Eye,
  EyeOff,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/lib/navigation";

/* ------------------------------------------------------------------ */
/*  Icon hover animation map                                           */
/* ------------------------------------------------------------------ */

type HoverAnimClass =
  | "sidebar-icon-pulse"
  | "sidebar-icon-rotate"
  | "sidebar-icon-wave"
  | "sidebar-icon-bounce"
  | "sidebar-icon-scale";

const iconHoverMap: Record<string, HoverAnimClass> = {
  LayoutDashboard: "sidebar-icon-pulse",
  Target: "sidebar-icon-pulse",
  ShieldCheck: "sidebar-icon-pulse",
  Settings: "sidebar-icon-rotate",
  Users: "sidebar-icon-wave",
  UserPlus: "sidebar-icon-wave",
  UserCheck: "sidebar-icon-wave",
  User: "sidebar-icon-wave",
  Activity: "sidebar-icon-bounce",
  FileBarChart: "sidebar-icon-bounce",
};

function getIconHoverClass(icon: LucideIcon): HoverAnimClass {
  return iconHoverMap[icon.displayName || ""] || "sidebar-icon-scale";
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SidebarNavItemProps {
  item: NavItem;
  active: boolean;
  isFav: boolean;
  collapsed: boolean;
  isCustomizing: boolean;
  isHidden: boolean;
  sidebarWidth: number;
  isFocused: boolean;
  itemIndex: number;
  dur: number;
  staggerDur: number;
  onContextMenu: (e: React.MouseEvent, item: NavItem) => void;
  onToggleVisibility: (href: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SidebarNavItem({
  item,
  active,
  isFav,
  collapsed,
  isCustomizing,
  isHidden,
  sidebarWidth,
  isFocused,
  itemIndex,
  dur,
  staggerDur,
  onContextMenu,
  onToggleVisibility,
}: SidebarNavItemProps) {
  const Icon = item.icon;
  const hoverClass = getIconHoverClass(item.icon);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.href,
    disabled: !isCustomizing,
    data: { type: "item", sectionLabel: "", href: item.href },
  });

  const sortableStyle = isCustomizing
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }
    : undefined;

  /* ------- Collapsed mode ------- */
  if (collapsed) {
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
        className={`
          group relative flex items-center justify-center rounded-xl
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8893D]/50
          active:scale-[0.98]
          w-10 h-10 mx-auto
          ${
            active
              ? "bg-[#A8893D]/15 text-white"
              : "text-gray-200 hover:bg-white/5 hover:text-white"
          }
        `}
      >
        {active && (
          <div
            className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-gradient-to-b from-[#A8893D] to-[#C4A962]"
            style={{ boxShadow: "0 0 8px rgba(168,137,61,0.4)" }}
          />
        )}
        <Icon
          size={20}
          className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
            active
              ? "text-white"
              : "text-gray-300 group-hover:text-white"
          }`}
        />
      </Link>
    );
  }

  /* ------- Expanded mode ------- */
  return (
    <motion.li
      ref={setNodeRef}
      style={sortableStyle}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: dur, delay: staggerDur * itemIndex }}
      className={isHidden && isCustomizing ? "opacity-50" : ""}
    >
      <div className="flex items-center">
        {/* Drag handle — customize mode only */}
        {isCustomizing && (
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-1 mr-0.5 rounded text-gray-400 hover:text-gray-200 cursor-grab active:cursor-grabbing transition-colors"
            aria-label={`Reorder ${item.label}`}
          >
            <GripVertical size={14} />
          </button>
        )}

        <Link
          href={item.href}
          onContextMenu={(e) => onContextMenu(e, item)}
          aria-current={active ? "page" : undefined}
          className={`
            group relative flex-1 flex items-center gap-3 rounded-xl text-sm font-medium
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8893D]/50
            active:scale-[0.98]
            px-3 py-2.5
            ${isHidden && isCustomizing ? "line-through decoration-gray-500" : ""}
            ${
              active
                ? "bg-[#A8893D]/15 text-white"
                : isFocused
                  ? "bg-white/5 text-white"
                  : "text-gray-200 hover:bg-white/5 hover:text-white"
            }
          `}
        >
          {/* Active indicator bar */}
          {active && !isCustomizing && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-gradient-to-b from-[#A8893D] to-[#C4A962]"
              style={{ boxShadow: "0 0 8px rgba(168,137,61,0.4)" }}
              transition={{ duration: dur }}
            />
          )}

          <Icon
            size={20}
            className={`flex-shrink-0 transition-all duration-200 group-hover:${hoverClass} ${
              active
                ? "text-white"
                : "text-gray-300 group-hover:text-white"
            }`}
          />

          <div className="flex-1 min-w-0">
            <span className="truncate block">{item.label}</span>
            {/* Wide mode subtitle */}
            {sidebarWidth >= 320 && item.permission && (
              <span className="text-[10px] text-gray-400 truncate block">
                {item.permission}
              </span>
            )}
          </div>

          {/* Favorite indicator */}
          {isFav && !isCustomizing && (
            <Star
              size={12}
              className="text-[#C4A962] flex-shrink-0"
              fill="currentColor"
            />
          )}
        </Link>

        {/* Visibility toggle — customize mode only */}
        {isCustomizing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(item.href);
            }}
            className="flex-shrink-0 p-1 ml-0.5 rounded text-gray-400 hover:text-gray-200 transition-colors"
            aria-label={isHidden ? `Show ${item.label}` : `Hide ${item.label}`}
          >
            {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag overlay variant (simplified for ghost)                        */
/* ------------------------------------------------------------------ */

export function SidebarNavItemOverlay({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <div
      className="flex items-center gap-3 rounded-xl text-sm font-medium px-3 py-2.5 bg-[#2A1F06] border border-[#A8893D]/30 text-white shadow-2xl shadow-black/50"
      style={{ transform: "rotate(3deg)", opacity: 0.9, width: 240 }}
    >
      <GripVertical size={14} className="text-gray-400" />
      <Icon size={20} className="text-white flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </div>
  );
}
