"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { hierarchy, partition } from "d3-hierarchy";
import type { HierarchyRectangularNode, HierarchyNode } from "d3-hierarchy";
import { ChevronRight } from "lucide-react";
import { getLevelColor, buildBreadcrumb } from "./constants";
import type { OrgViewProps } from "./types";
import type { OrgTreeNode } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ArcDatum {
  id: string;
  data: OrgTreeNode;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  depth: number;
  parent: ArcDatum | null;
}

interface TooltipState {
  node: ArcDatum;
  clientX: number;
  clientY: number;
}

/* ------------------------------------------------------------------ */
/*  Arc path generator (manual SVG path, no d3-shape)                  */
/* ------------------------------------------------------------------ */

function describeArc(
  cx: number,
  cy: number,
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
): string {
  // Clamp to avoid degenerate arcs
  const delta = endAngle - startAngle;
  if (delta < 1e-6 || outerRadius < 1e-6) return "";

  const largeArc = delta > Math.PI ? 1 : 0;

  const sinStart = Math.sin(startAngle);
  const cosStart = Math.cos(startAngle);
  const sinEnd = Math.sin(endAngle);
  const cosEnd = Math.cos(endAngle);

  // Outer arc: from startAngle to endAngle at outerRadius
  const ox1 = cx + outerRadius * sinStart;
  const oy1 = cy - outerRadius * cosStart;
  const ox2 = cx + outerRadius * sinEnd;
  const oy2 = cy - outerRadius * cosEnd;

  // Inner arc: from endAngle to startAngle at innerRadius
  const ix1 = cx + innerRadius * sinEnd;
  const iy1 = cy - innerRadius * cosEnd;
  const ix2 = cx + innerRadius * sinStart;
  const iy2 = cy - innerRadius * cosStart;

  if (innerRadius < 1e-6) {
    // Pie wedge (no inner hole)
    return [
      `M ${cx} ${cy}`,
      `L ${ox1} ${oy1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${ox2} ${oy2}`,
      `Z`,
    ].join(" ");
  }

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    `Z`,
  ].join(" ");
}

/* ------------------------------------------------------------------ */
/*  Partition layout computation                                       */
/* ------------------------------------------------------------------ */

function computePartition(
  roots: OrgTreeNode[],
  radius: number,
): ArcDatum[] {
  if (roots.length === 0 || radius <= 0) return [];

  // Wrap multiple roots in a virtual root
  const virtualRoot: OrgTreeNode =
    roots.length === 1
      ? roots[0]
      : {
          id: "__sunburst_root__",
          name: "Organization",
          code: "",
          level: "root",
          managerName: "",
          userCount: 0,
          children: roots,
        };

  const root = hierarchy(virtualRoot, (d) => d.children ?? []).sum(
    (d) => (d.children && d.children.length > 0 ? 0 : Math.max(d.userCount, 1)),
  );

  const partitionLayout = partition<OrgTreeNode>().size([
    2 * Math.PI,
    radius,
  ]);

  partitionLayout(root);

  const arcs: ArcDatum[] = [];

  root.each((n: HierarchyNode<OrgTreeNode>) => {
    const node = n as HierarchyRectangularNode<OrgTreeNode>;
    // Skip virtual root
    if (node.data.id === "__sunburst_root__") return;

    const parentArc =
      node.parent && node.parent.data.id !== "__sunburst_root__"
        ? arcs.find((a) => a.id === node.parent!.data.id) ?? null
        : null;

    arcs.push({
      id: node.data.id,
      data: node.data,
      x0: node.x0,
      x1: node.x1,
      y0: node.y0,
      y1: node.y1,
      depth: node.data.id === virtualRoot.id ? 0 : node.depth,
      parent: parentArc,
    });
  });

  return arcs;
}

/* ------------------------------------------------------------------ */
/*  Animated Arc component                                             */
/* ------------------------------------------------------------------ */

function AnimatedArc({
  cx,
  cy,
  startAngle,
  endAngle,
  innerRadius,
  outerRadius,
  fill,
  stroke,
  strokeWidth,
  opacity,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  isSelected,
}: {
  cx: number;
  cy: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  isSelected: boolean;
}) {
  return (
    <motion.path
      d={describeArc(cx, cy, startAngle, endAngle, innerRadius, outerRadius)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      className="cursor-pointer"
      initial={false}
      animate={{
        d: describeArc(cx, cy, startAngle, endAngle, innerRadius, outerRadius),
        opacity,
        strokeWidth,
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        filter: isSelected ? "brightness(1.15)" : undefined,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function ArcTooltip({ tooltip }: { tooltip: TooltipState }) {
  const { node } = tooltip;
  const levelColor = getLevelColor(node.data.level);
  const childCount = node.data.children?.length ?? 0;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: tooltip.clientX + 12,
        top: tooltip.clientY - 8,
      }}
    >
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 shadow-lg max-w-[260px]">
        {/* Level badge */}
        <span
          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none mb-1.5"
          style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
        >
          {node.data.level}
        </span>

        {/* Name */}
        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight mb-0.5">
          {node.data.name}
        </p>

        {/* Code */}
        {node.data.code && (
          <p className="text-[11px] text-[var(--text-muted)] font-mono mb-1">
            {node.data.code}
          </p>
        )}

        {/* Details */}
        <div className="flex flex-col gap-0.5 text-[11px] text-[var(--neutral-gray)]">
          <span>
            Manager: {node.data.managerName || "None"}
          </span>
          <span>
            Users: {node.data.userCount}
          </span>
          <span>
            Sub-units: {childCount}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Center Label                                                       */
/* ------------------------------------------------------------------ */

function CenterLabel({
  cx,
  cy,
  node,
  radius,
}: {
  cx: number;
  cy: number;
  node: ArcDatum | null;
  radius: number;
}) {
  const innerR = Math.max(radius * 0.18, 30);
  const displayNode = node;
  const levelColor = displayNode
    ? getLevelColor(displayNode.data.level)
    : null;

  return (
    <g>
      {/* Center circle background */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="var(--surface-0)"
        stroke="var(--border)"
        strokeWidth={1}
      />
      {displayNode ? (
        <>
          {/* Level */}
          <text
            x={cx}
            y={cy - innerR * 0.35}
            textAnchor="middle"
            className="text-[9px] font-semibold uppercase tracking-wide"
            fill={levelColor?.text ?? "var(--text-muted)"}
          >
            {displayNode.data.level}
          </text>
          {/* Name (truncated) */}
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            className="text-[11px] font-semibold"
            fill="var(--text-primary)"
          >
            {displayNode.data.name.length > 16
              ? displayNode.data.name.slice(0, 15) + "\u2026"
              : displayNode.data.name}
          </text>
          {/* User count */}
          <text
            x={cx}
            y={cy + innerR * 0.35}
            textAnchor="middle"
            className="text-[9px]"
            fill="var(--text-muted)"
          >
            {displayNode.data.userCount} users
          </text>
        </>
      ) : (
        <text
          x={cx}
          y={cy + 3}
          textAnchor="middle"
          className="text-[11px]"
          fill="var(--text-muted)"
        >
          Hover to inspect
        </text>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Breadcrumb Trail                                                   */
/* ------------------------------------------------------------------ */

function BreadcrumbTrail({
  tree,
  focusedId,
  onNavigate,
}: {
  tree: OrgTreeNode[];
  focusedId: string | null;
  onNavigate: (id: string | null) => void;
}) {
  const crumbs = useMemo(() => {
    if (!focusedId) return null;
    return buildBreadcrumb(tree, focusedId);
  }, [tree, focusedId]);

  if (!crumbs || crumbs.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-0.5 flex-wrap">
      {/* Root button */}
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-0)] border border-[var(--border)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
      >
        Root
      </button>

      {crumbs.map((node, i) => {
        const isLast = i === crumbs.length - 1;
        const levelColor = getLevelColor(node.level);

        return (
          <div key={node.id} className="flex items-center gap-0.5">
            <ChevronRight
              size={12}
              className="text-[var(--neutral-gray)] shrink-0"
            />
            <button
              type="button"
              onClick={() => onNavigate(node.id)}
              disabled={isLast}
              className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                isLast
                  ? "cursor-default border-transparent"
                  : "bg-[var(--surface-0)] border-[var(--border)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
              }`}
              style={{
                backgroundColor: isLast ? levelColor.bg : undefined,
                color: isLast ? levelColor.text : "var(--text-muted)",
              }}
            >
              {node.name.length > 20
                ? node.name.slice(0, 19) + "\u2026"
                : node.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: find node in tree by ID                                    */
/* ------------------------------------------------------------------ */

function findNode(
  nodes: OrgTreeNode[],
  id: string,
): OrgTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  SunburstView                                                       */
/* ------------------------------------------------------------------ */

export function SunburstView({
  tree,
  selectedId,
  onSelect,
  highlightedIds,
}: OrgViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 600 });
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredArc, setHoveredArc] = useState<ArcDatum | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  /* ---- Observe container size ---- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ w: width, h: height });
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ---- Determine the roots for partition ---- */
  const focusedRoots: OrgTreeNode[] = useMemo(() => {
    if (!focusedId) return tree;
    const node = findNode(tree, focusedId);
    return node ? [node] : tree;
  }, [tree, focusedId]);

  /* ---- Compute layout ---- */
  const radius = Math.min(containerSize.w, containerSize.h) / 2 - 16;
  const cx = containerSize.w / 2;
  const cy = containerSize.h / 2;

  const arcs = useMemo(
    () => computePartition(focusedRoots, Math.max(radius, 40)),
    [focusedRoots, radius],
  );

  /* ---- Inner radius (reserved for center label) ---- */
  const innerRadiusPad = useMemo(() => {
    if (arcs.length === 0) return 0;
    // Find the minimum y0 that is > 0 (first ring)
    let minY0 = Infinity;
    for (const arc of arcs) {
      if (arc.y0 > 0 && arc.y0 < minY0) minY0 = arc.y0;
    }
    return minY0 === Infinity ? 0 : minY0;
  }, [arcs]);

  /* ---- Max depth for ring scaling ---- */
  const maxDepth = useMemo(() => {
    let d = 0;
    for (const arc of arcs) {
      if (arc.depth > d) d = arc.depth;
    }
    return d;
  }, [arcs]);

  /* ---- Handlers ---- */
  const handleArcClick = useCallback(
    (arc: ArcDatum) => {
      onSelect(arc.id);
      // If the arc has children, focus on it
      if (arc.data.children && arc.data.children.length > 0) {
        setFocusedId(arc.id);
      }
    },
    [onSelect],
  );

  const handleArcMouseEnter = useCallback((arc: ArcDatum) => {
    setHoveredArc(arc);
  }, []);

  const handleArcMouseMove = useCallback(
    (e: React.MouseEvent, arc: ArcDatum) => {
      setTooltip({
        node: arc,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [],
  );

  const handleArcMouseLeave = useCallback(() => {
    setHoveredArc(null);
    setTooltip(null);
  }, []);

  const handleBreadcrumbNavigate = useCallback(
    (id: string | null) => {
      setFocusedId(id);
      if (id) onSelect(id);
    },
    [onSelect],
  );

  /* ---- Empty state ---- */
  if (tree.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
          No organizational units to display.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Breadcrumb trail */}
      <BreadcrumbTrail
        tree={tree}
        focusedId={focusedId}
        onNavigate={handleBreadcrumbNavigate}
      />

      {/* SVG Canvas */}
      <AnimatePresence mode="wait">
        <motion.svg
          key={focusedId ?? "__root__"}
          className="absolute inset-0 h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Arcs */}
          {arcs.map((arc) => {
            const levelColor = getLevelColor(arc.data.level);
            const isSelected = selectedId === arc.id;
            const isDimmed =
              highlightedIds.size > 0 && !highlightedIds.has(arc.id);
            const isHovered = hoveredArc?.id === arc.id;

            // Compute fill: use the level's text color with varying alpha
            // Deeper levels get more opaque to create depth effect
            const baseColor = levelColor.text;
            const alpha = arc.depth === 0
              ? 0.7
              : 0.35 + (arc.depth / Math.max(maxDepth, 1)) * 0.4;
            const fill = isHovered
              ? baseColor
              : hexToRGBA(baseColor, alpha);
            const stroke = isSelected
              ? "var(--primary)"
              : isHovered
                ? baseColor
                : "var(--surface-0)";
            const strokeW = isSelected ? 3 : isHovered ? 2 : 1;
            const opacity = isDimmed ? 0.25 : 1;

            return (
              <AnimatedArc
                key={arc.id}
                cx={cx}
                cy={cy}
                startAngle={arc.x0}
                endAngle={arc.x1}
                innerRadius={arc.y0}
                outerRadius={arc.y1}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeW}
                opacity={opacity}
                onClick={() => handleArcClick(arc)}
                onMouseEnter={() => handleArcMouseEnter(arc)}
                onMouseLeave={handleArcMouseLeave}
                onMouseMove={(e) => handleArcMouseMove(e, arc)}
                isSelected={isSelected}
              />
            );
          })}

          {/* Center label */}
          <CenterLabel
            cx={cx}
            cy={cy}
            node={hoveredArc}
            radius={innerRadiusPad > 0 ? innerRadiusPad : radius * 0.22}
          />
        </motion.svg>
      </AnimatePresence>

      {/* Tooltip (portal to body via fixed positioning) */}
      {tooltip && <ArcTooltip tooltip={tooltip} />}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/90 backdrop-blur-sm px-3 py-2 shadow-sm">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-0.5">
          Levels
        </span>
        {getLevelEntries(arcs).map(({ level, color }) => (
          <div key={level} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-[var(--text-muted)] capitalize">
              {level}
            </span>
          </div>
        ))}
      </div>

      {/* Node count info */}
      <div className="absolute bottom-3 left-3 z-20 rounded-md bg-[var(--surface-0)]/80 backdrop-blur-sm border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--neutral-gray)]">
        {arcs.length} unit{arcs.length !== 1 ? "s" : ""}
        {focusedId ? " (focused)" : ""}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Utility: hex color to rgba string                                  */
/* ------------------------------------------------------------------ */

function hexToRGBA(hex: string, alpha: number): string {
  // Handle var() CSS custom properties - return the hex with opacity as fallback
  if (hex.startsWith("var(")) return hex;

  // Handle #RGB or #RRGGBB
  let r = 0,
    g = 0,
    b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return hex;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ------------------------------------------------------------------ */
/*  Utility: extract unique levels present in arcs for legend          */
/* ------------------------------------------------------------------ */

function getLevelEntries(
  arcs: ArcDatum[],
): { level: string; color: string }[] {
  const seen = new Set<string>();
  const entries: { level: string; color: string }[] = [];

  for (const arc of arcs) {
    const lvl = arc.data.level.toLowerCase();
    if (!seen.has(lvl)) {
      seen.add(lvl);
      entries.push({
        level: lvl,
        color: getLevelColor(lvl).text,
      });
    }
  }

  return entries;
}
