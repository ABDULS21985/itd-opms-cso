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
import { SidebarFloatingTip } from "./sidebar-floating-tip";

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
  /** CSS color used to tint the icon (e.g. the parent group's color). */
  iconColor?: string;
  /** Numeric badge count to render as a pill (omit if 0). */
  badgeCount?: number;
  /** Whether this item has activity since the user's last visit. */
  hasNewActivity?: boolean;
  onContextMenu: (e: React.MouseEvent, item: NavItem) => void;
  onToggleVisibility: (href: string) => void;
  onItemClick?: (href: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function formatBadge(n: number): string {
  if (n > 99) return "99+";
  return String(n);
}

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
  iconColor,
  badgeCount,
  hasNewActivity,
  onContextMenu,
  onToggleVisibility,
  onItemClick,
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

  const showBadge = !isCustomizing && typeof badgeCount === "number" && badgeCount > 0;
  const showActivityDot = !isCustomizing && hasNewActivity && !showBadge;

  /* ------- Collapsed mode ------- */
  if (collapsed) {
    const tipSub = showBadge ? formatBadge(badgeCount!) : undefined;
    return (
      <SidebarFloatingTip label={item.label} sublabel={tipSub}>
        <Link
          key={item.href}
          href={item.href}
          onClick={() => onItemClick?.(item.href)}
          aria-current={active ? "page" : undefined}
          aria-label={item.label}
          className={`
            group relative flex items-center justify-center rounded-xl
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sidebar-active-bg-strong)]
            active:scale-[0.98]
            w-10 h-10 mx-auto
            ${
              active
                ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                : "text-[color:var(--sidebar-text-muted)] hover:bg-[color:var(--sidebar-hover-bg)] hover:text-[color:var(--sidebar-text)]"
            }
          `}
        >
          {active && (
            <div
              className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-gradient-to-b from-[#1B7340] to-[#2D9B58]"
              style={{ boxShadow: "0 0 8px rgba(168,137,61,0.4)" }}
            />
          )}
          <Icon
            size={20}
            className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
              active
                ? "text-[color:var(--sidebar-active-text)]"
                : "text-[color:var(--sidebar-text-subtle)] group-hover:text-[color:var(--sidebar-text)]"
            }`}
            style={!active && iconColor ? { color: iconColor } : undefined}
          />
          {showBadge && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-rose-500 text-white shadow-[0_0_0_2px_var(--sidebar-bg-from)]"
              aria-label={`${badgeCount} pending`}
            >
              {formatBadge(badgeCount!)}
            </span>
          )}
          {showActivityDot && (
            <span
              className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_0_2px_var(--sidebar-bg-from)]"
              aria-label="New activity"
            />
          )}
        </Link>
      </SidebarFloatingTip>
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
            className="flex-shrink-0 p-1 mr-0.5 rounded text-[color:var(--sidebar-text-faint)] hover:text-[color:var(--sidebar-text-muted)] cursor-grab active:cursor-grabbing transition-colors"
            aria-label={`Reorder ${item.label}`}
          >
            <GripVertical size={14} />
          </button>
        )}

        <Link
          href={item.href}
          onClick={() => onItemClick?.(item.href)}
          onContextMenu={(e) => onContextMenu(e, item)}
          aria-current={active ? "page" : undefined}
          className={`
            group relative flex-1 flex items-center gap-3 rounded-xl text-sm font-medium
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sidebar-active-bg-strong)]
            active:scale-[0.98]
            px-3 py-2.5
            ${isHidden && isCustomizing ? "line-through decoration-gray-500" : ""}
            ${
              active
                ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                : isFocused
                  ? "bg-[color:var(--sidebar-search-bg)] text-[color:var(--sidebar-text)]"
                  : "text-[color:var(--sidebar-text-muted)] hover:bg-[color:var(--sidebar-hover-bg)] hover:text-[color:var(--sidebar-text)]"
            }
          `}
        >
          {/* Active indicator bar */}
          {active && !isCustomizing && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-gradient-to-b from-[#1B7340] to-[#2D9B58]"
              style={{ boxShadow: "0 0 8px rgba(168,137,61,0.4)" }}
              transition={{ duration: dur }}
            />
          )}

          <Icon
            size={20}
            className={`flex-shrink-0 transition-all duration-200 group-hover:${hoverClass} ${
              active
                ? "text-[color:var(--sidebar-active-text)]"
                : "text-[color:var(--sidebar-text-subtle)] group-hover:text-[color:var(--sidebar-text)]"
            }`}
            style={!active && iconColor ? { color: iconColor } : undefined}
          />

          <div className="flex-1 min-w-0">
            <span className="truncate block">{item.label}</span>
            {/* Wide mode subtitle */}
            {sidebarWidth >= 320 && item.permission && (
              <span className="text-[10px] text-[color:var(--sidebar-text-faint)] truncate block">
                {item.permission}
              </span>
            )}
          </div>

          {/* Activity dot (suppressed when a count badge is shown) */}
          {showActivityDot && (
            <span
              className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0"
              aria-label="New activity"
              title="New activity since your last visit"
            />
          )}

          {/* Numeric count pill */}
          {showBadge && (
            <span
              className={`flex-shrink-0 min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                active
                  ? "bg-white/20 text-[color:var(--sidebar-active-text)]"
                  : "bg-rose-500/90 text-white"
              }`}
              aria-label={`${badgeCount} pending`}
            >
              {formatBadge(badgeCount!)}
            </span>
          )}

          {/* Favorite indicator */}
          {isFav && !isCustomizing && (
            <Star
              size={12}
              className="text-[#2D9B58] flex-shrink-0"
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
            className="flex-shrink-0 p-1 ml-0.5 rounded text-[color:var(--sidebar-text-faint)] hover:text-[color:var(--sidebar-text-muted)] transition-colors"
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
      className="flex items-center gap-3 rounded-xl text-sm font-medium px-3 py-2.5 bg-[color:var(--sidebar-bg-from)] border border-[color:var(--sidebar-border-strong)] text-[color:var(--sidebar-text)] shadow-2xl shadow-black/50"
      style={{ transform: "rotate(3deg)", opacity: 0.9, width: 240 }}
    >
      <GripVertical size={14} className="text-[color:var(--sidebar-text-faint)]" />
      <Icon size={20} className="text-[color:var(--sidebar-text)] flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </div>
  );
}
