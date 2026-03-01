"use client";

import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Users,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import type { HierarchyPointNode, HierarchyNode } from "d3-hierarchy";
import { getLevelColor, collectDescendantIds, findNodeById } from "./constants";
import type { OrgViewProps } from "./types";
import type { OrgTreeNode } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NODE_W = 220;
const NODE_H = 88;
const NODE_GAP_X = 40;
const NODE_GAP_Y = 50;
const MIN_SCALE = 0.15;
const MAX_SCALE = 2;
const MINIMAP_W = 200;
const MINIMAP_H = 140;

/* ------------------------------------------------------------------ */
/*  Layout computation                                                 */
/* ------------------------------------------------------------------ */

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  data: OrgTreeNode;
  parentId: string | null;
  parentX: number;
  parentY: number;
}

function computeLayout(roots: OrgTreeNode[]): LayoutNode[] {
  if (roots.length === 0) return [];

  // Wrap multiple roots in a virtual root
  const virtualRoot: OrgTreeNode =
    roots.length === 1
      ? roots[0]
      : {
          id: "__root__",
          name: "",
          code: "",
          level: "",
          managerName: "",
          userCount: 0,
          children: roots,
        };

  const root = hierarchy(virtualRoot, (d) => d.children ?? []);

  const layout = d3tree<OrgTreeNode>().nodeSize([
    NODE_W + NODE_GAP_X,
    NODE_H + NODE_GAP_Y,
  ]);
  layout(root);

  const nodes: LayoutNode[] = [];
  root.each((n: HierarchyNode<OrgTreeNode>) => {
    const node = n as HierarchyPointNode<OrgTreeNode>;
    if (node.data.id === "__root__") return;
    const parent = node.parent as HierarchyPointNode<OrgTreeNode> | null;
    nodes.push({
      id: node.data.id,
      x: node.x,
      y: node.y,
      data: node.data,
      parentId: parent?.data.id === "__root__" ? null : (parent?.data.id ?? null),
      parentX: parent?.data.id === "__root__" ? node.x : (parent?.x ?? node.x),
      parentY: parent?.data.id === "__root__" ? node.y - NODE_H - NODE_GAP_Y : (parent?.y ?? node.y),
    });
  });

  return nodes;
}

/* ------------------------------------------------------------------ */
/*  SVG Connector Path                                                 */
/* ------------------------------------------------------------------ */

function ConnectorPath({
  x1,
  y1,
  x2,
  y2,
  color,
  dimmed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dimmed: boolean;
}) {
  const midY = (y1 + NODE_H + y2) / 2;
  const d = `M ${x1 + NODE_W / 2} ${y1 + NODE_H} C ${x1 + NODE_W / 2} ${midY}, ${x2 + NODE_W / 2} ${midY}, ${x2 + NODE_W / 2} ${y2}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeOpacity={dimmed ? 0.15 : 0.5}
      className="transition-opacity duration-200"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Node Card (positioned HTML via foreignObject)                      */
/* ------------------------------------------------------------------ */

function NodeCard({
  node,
  x,
  y,
  isSelected,
  isHighlighted,
  isDimmed,
  onClick,
  onDoubleClick,
}: {
  node: OrgTreeNode;
  x: number;
  y: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const levelColor = getLevelColor(node.level);
  const hasManager = !!node.managerName;
  const hasUsers = node.userCount > 0;
  const hasChildren = (node.children?.length ?? 0) > 0;

  // RAG health: green = has manager + users, amber = missing one, red = neither
  const healthColor =
    hasManager && hasUsers ? "#10B981" : hasManager || hasUsers ? "#F59E0B" : "#EF4444";

  return (
    <foreignObject x={x} y={y} width={NODE_W} height={NODE_H}>
      <div
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={`h-full w-full rounded-xl border bg-[var(--surface-0)] px-3 py-2.5 cursor-pointer transition-all duration-200 select-none ${
          isSelected
            ? "border-[var(--primary)] shadow-md ring-2 ring-[var(--primary)]/20"
            : isHighlighted
              ? "border-[#F59E0B] shadow-md ring-2 ring-[#F59E0B]/30"
              : "border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-sm"
        } ${isDimmed ? "opacity-25" : ""}`}
        style={{ fontSize: 0 }}
      >
        {/* Top row: Level badge + health dot */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none"
            style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
          >
            {node.level}
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: healthColor }}
            title={
              hasManager && hasUsers
                ? "Healthy"
                : hasManager || hasUsers
                  ? "Partially staffed"
                  : "No manager or users"
            }
          />
        </div>

        {/* Name */}
        <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate leading-tight">
          {node.name}
        </p>

        {/* Bottom row: Manager + users */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[var(--neutral-gray)] truncate max-w-[140px]">
            {node.managerName || "No manager"}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--text-secondary)] shrink-0">
            <Users size={10} className="text-[var(--neutral-gray)]" />
            {node.userCount}
          </span>
        </div>

        {/* Expand indicator */}
        {hasChildren && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--surface-0)] border border-[var(--border)] text-[8px] font-bold text-[var(--text-muted)]">
            {node.children!.length}
          </div>
        )}
      </div>
    </foreignObject>
  );
}

/* ------------------------------------------------------------------ */
/*  DnD Overlay target (invisible positioned divs)                     */
/* ------------------------------------------------------------------ */

function DndDropTarget({
  nodeId,
  screenX,
  screenY,
  isInvalid,
}: {
  nodeId: string;
  screenX: number;
  screenY: number;
  isInvalid: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `chart-drop-${nodeId}`,
    data: { type: "org-node", nodeId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`absolute pointer-events-auto rounded-xl transition-all duration-150 ${
        isOver
          ? isInvalid
            ? "ring-2 ring-[#EF4444]/50 bg-[#EF4444]/5"
            : "ring-2 ring-[var(--primary)]/50 bg-[var(--primary)]/5"
          : ""
      }`}
      style={{
        left: screenX,
        top: screenY,
        width: NODE_W,
        height: NODE_H,
      }}
    />
  );
}

function DndDragHandle({
  nodeId,
  node,
  screenX,
  screenY,
}: {
  nodeId: string;
  node: OrgTreeNode;
  screenX: number;
  screenY: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chart-drag-${nodeId}`,
    data: { type: "org-node", nodeId, node },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing rounded p-1 transition-opacity ${
        isDragging ? "opacity-0" : "opacity-0 hover:opacity-60"
      }`}
      style={{
        left: screenX + 4,
        top: screenY + 4,
        zIndex: 10,
      }}
    >
      <GripVertical size={14} className="text-[var(--neutral-gray)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Minimap                                                            */
/* ------------------------------------------------------------------ */

function Minimap({
  layoutNodes,
  viewBox,
  containerW,
  containerH,
  transform,
  onPan,
}: {
  layoutNodes: LayoutNode[];
  viewBox: { minX: number; minY: number; maxX: number; maxY: number };
  containerW: number;
  containerH: number;
  transform: { x: number; y: number; scale: number };
  onPan: (x: number, y: number) => void;
}) {
  const minimapRef = useRef<SVGSVGElement>(null);
  const treeW = viewBox.maxX - viewBox.minX + NODE_W + 100;
  const treeH = viewBox.maxY - viewBox.minY + NODE_H + 100;
  const scaleX = MINIMAP_W / treeW;
  const scaleY = MINIMAP_H / treeH;
  const mmScale = Math.min(scaleX, scaleY);

  // Viewport rect in minimap coordinates
  const vpW = (containerW / transform.scale) * mmScale;
  const vpH = (containerH / transform.scale) * mmScale;
  const vpX = (-transform.x / transform.scale - viewBox.minX + 50) * mmScale;
  const vpY = (-transform.y / transform.scale - viewBox.minY + 50) * mmScale;

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!minimapRef.current) return;
      const rect = minimapRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / mmScale + viewBox.minX - 50;
      const clickY = (e.clientY - rect.top) / mmScale + viewBox.minY - 50;
      onPan(
        -(clickX - containerW / (2 * transform.scale)) * transform.scale,
        -(clickY - containerH / (2 * transform.scale)) * transform.scale,
      );
    },
    [mmScale, viewBox, containerW, containerH, transform.scale, onPan],
  );

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/90 backdrop-blur-sm shadow-sm overflow-hidden">
      <svg
        ref={minimapRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        onClick={handleMinimapClick}
        className="cursor-pointer"
      >
        <g transform={`translate(${(-viewBox.minX + 50) * mmScale}, ${(-viewBox.minY + 50) * mmScale}) scale(${mmScale})`}>
          {/* Lines */}
          {layoutNodes
            .filter((n) => n.parentId)
            .map((n) => (
              <line
                key={`mm-line-${n.id}`}
                x1={n.parentX + NODE_W / 2}
                y1={n.parentY + NODE_H}
                x2={n.x + NODE_W / 2}
                y2={n.y}
                stroke="var(--border)"
                strokeWidth={2 / mmScale}
              />
            ))}
          {/* Nodes as rects */}
          {layoutNodes.map((n) => {
            const lc = getLevelColor(n.data.level);
            return (
              <rect
                key={`mm-${n.id}`}
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill={lc.bg}
                stroke={lc.text}
                strokeWidth={2 / mmScale}
                opacity={0.8}
              />
            );
          })}
        </g>
        {/* Viewport indicator */}
        <rect
          x={Math.max(0, vpX)}
          y={Math.max(0, vpY)}
          width={Math.min(vpW, MINIMAP_W)}
          height={Math.min(vpH, MINIMAP_H)}
          fill="var(--primary)"
          fillOpacity={0.1}
          stroke="var(--primary)"
          strokeWidth={1.5}
          rx={3}
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Org Chart View                                                     */
/* ------------------------------------------------------------------ */

export function OrgChartView({
  tree,
  selectedId,
  onSelect,
  expandedIds,
  onToggle,
  highlightedIds,
  onMoveNode,
}: OrgViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<OrgTreeNode | null>(null);
  const [draggedDescendants, setDraggedDescendants] = useState<Set<string>>(
    new Set(),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Compute layout
  const layoutNodes = useMemo(() => computeLayout(tree), [tree]);

  // Bounding box
  const viewBox = useMemo(() => {
    if (layoutNodes.length === 0)
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of layoutNodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + NODE_H);
    }
    return { minX, minY, maxX, maxY };
  }, [layoutNodes]);

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Fit to view on first load
  useEffect(() => {
    if (layoutNodes.length > 0) fitToView();
  }, [layoutNodes.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const fitToView = useCallback(() => {
    const treeW = viewBox.maxX - viewBox.minX + 100;
    const treeH = viewBox.maxY - viewBox.minY + 100;
    const scaleX = containerSize.w / treeW;
    const scaleY = containerSize.h / treeH;
    const scale = Math.min(scaleX, scaleY, 1);
    const x =
      (containerSize.w - treeW * scale) / 2 - (viewBox.minX - 50) * scale;
    const y =
      (containerSize.h - treeH * scale) / 2 - (viewBox.minY - 50) * scale;
    setTransform({ x, y, scale });
  }, [viewBox, containerSize]);

  // Zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform((prev) => {
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, prev.scale * delta),
        );
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { ...prev, scale: newScale };
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        return {
          x: mx - ((mx - prev.x) / prev.scale) * newScale,
          y: my - ((my - prev.y) / prev.scale) * newScale,
          scale: newScale,
        };
      });
    },
    [],
  );

  // Pan
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      // Only pan if clicking on the background (not on a node)
      const target = e.target as Element;
      if (target.closest("[data-chart-node]")) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [transform.x, transform.y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    },
    [isPanning, panStart],
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom buttons
  const zoomIn = () =>
    setTransform((p) => ({
      ...p,
      scale: Math.min(MAX_SCALE, p.scale * 1.25),
    }));
  const zoomOut = () =>
    setTransform((p) => ({
      ...p,
      scale: Math.max(MIN_SCALE, p.scale * 0.8),
    }));
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 0.8 });

  // DnD handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const nodeId = event.active.data.current?.nodeId as string;
      const node = findNodeById(tree, nodeId);
      setActiveNode(node);
      if (node) {
        setDraggedDescendants(collectDescendantIds(node));
      }
    },
    [tree],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveNode(null);
      setDraggedDescendants(new Set());
      const { active, over } = event;
      if (!over) return;

      const draggedId = active.data.current?.nodeId as string;
      const targetId = over.data.current?.nodeId as string;
      if (!draggedId || !targetId || draggedId === targetId) return;

      const draggedNode = findNodeById(tree, draggedId);
      if (!draggedNode) return;
      const descendants = collectDescendantIds(draggedNode);
      if (descendants.has(targetId)) return;

      onMoveNode(draggedId, targetId);
    },
    [tree, onMoveNode],
  );

  // Compute screen positions for DnD overlay
  const screenPositions = useMemo(() => {
    return layoutNodes.map((n) => ({
      ...n,
      screenX: n.x * transform.scale + transform.x,
      screenY: n.y * transform.scale + transform.y,
    }));
  }, [layoutNodes, transform]);

  const showMinimap = layoutNodes.length > 20;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: "none" }}
        >
          <g
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
          >
            {/* Connector lines */}
            {layoutNodes
              .filter((n) => n.parentId)
              .map((n) => {
                const parentColor = getLevelColor(
                  layoutNodes.find((p) => p.id === n.parentId)?.data.level ?? "",
                ).text;
                const isDimmed =
                  highlightedIds.size > 0 &&
                  (!highlightedIds.has(n.id) ||
                    !highlightedIds.has(n.parentId!));
                return (
                  <ConnectorPath
                    key={`line-${n.id}`}
                    x1={n.parentX}
                    y1={n.parentY}
                    x2={n.x}
                    y2={n.y}
                    color={parentColor}
                    dimmed={isDimmed}
                  />
                );
              })}

            {/* Node cards */}
            {layoutNodes.map((n) => {
              const isHighlighted =
                highlightedIds.size > 0 && highlightedIds.has(n.id);
              const isDimmed =
                highlightedIds.size > 0 && !highlightedIds.has(n.id);
              return (
                <NodeCard
                  key={n.id}
                  node={n.data}
                  x={n.x}
                  y={n.y}
                  isSelected={selectedId === n.id}
                  isHighlighted={isHighlighted}
                  isDimmed={isDimmed}
                  onClick={() => onSelect(n.id)}
                  onDoubleClick={() => {
                    if (n.data.children?.length) onToggle(n.id);
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* DnD overlay layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 5 }}
        >
          {screenPositions.map((n) => (
            <DndDropTarget
              key={`dnd-drop-${n.id}`}
              nodeId={n.id}
              screenX={n.screenX}
              screenY={n.screenY}
              isInvalid={draggedDescendants.has(n.id)}
            />
          ))}
          {screenPositions.map((n) => (
            <DndDragHandle
              key={`dnd-drag-${n.id}`}
              nodeId={n.id}
              node={n.data}
              screenX={n.screenX}
              screenY={n.screenY}
            />
          ))}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
          <button
            type="button"
            onClick={fitToView}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] shadow-sm transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            title="Fit to screen"
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] shadow-sm transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] shadow-sm transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] shadow-sm transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            title="Reset zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-3 left-3 z-20 rounded-md bg-[var(--surface-0)]/80 backdrop-blur-sm border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--neutral-gray)]">
          {Math.round(transform.scale * 100)}%
        </div>

        {/* Minimap */}
        {showMinimap && (
          <Minimap
            layoutNodes={layoutNodes}
            viewBox={viewBox}
            containerW={containerSize.w}
            containerH={containerSize.h}
            transform={transform}
            onPan={(x, y) => setTransform((p) => ({ ...p, x, y }))}
          />
        )}
      </div>

      <DragOverlay>
        {activeNode ? (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--surface-0)] px-4 py-2.5 shadow-lg" style={{ transform: "rotate(2deg)" }}>
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: getLevelColor(activeNode.level).bg,
                color: getLevelColor(activeNode.level).text,
              }}
            >
              {activeNode.level}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {activeNode.name}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
