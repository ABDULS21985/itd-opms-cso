"use client";

import { useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
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
import { useState } from "react";
import { getLevelColor, collectDescendantIds, findNodeById } from "./constants";
import type { OrgViewProps } from "./types";
import type { OrgTreeNode } from "@/types";

/* ------------------------------------------------------------------ */
/*  Draggable + Droppable Tree Node                                    */
/* ------------------------------------------------------------------ */

function TreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  highlightedIds,
  searchQuery,
  focusedId,
  onToggle,
  onSelect,
}: {
  node: OrgTreeNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  highlightedIds: Set<string>;
  searchQuery: string;
  focusedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isFocused = focusedId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const levelColor = getLevelColor(node.level);
  const isHighlighted =
    highlightedIds.size === 0 || highlightedIds.has(node.id);
  const isDimmed = highlightedIds.size > 0 && !highlightedIds.has(node.id);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${node.id}`,
    data: { type: "org-node", nodeId: node.id },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `drag-${node.id}`,
    data: { type: "org-node", nodeId: node.id, node },
  });

  // Highlight name if it matches search
  function renderName(name: string) {
    if (!searchQuery.trim()) return name;
    const idx = name.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return name;
    return (
      <>
        {name.slice(0, idx)}
        <mark className="rounded bg-[var(--warning-light)] px-0.5 text-[var(--text-primary)]">
          {name.slice(idx, idx + searchQuery.length)}
        </mark>
        {name.slice(idx + searchQuery.length)}
      </>
    );
  }

  return (
    <div ref={setDropRef}>
      <div
        ref={setDragRef}
        className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all duration-150 ${
          isSelected
            ? "bg-[var(--primary)]/8 border border-[var(--primary)]/25"
            : isOver
              ? "bg-[var(--primary)]/5 border border-[var(--primary)]/20 border-dashed"
              : "hover:bg-[var(--surface-1)] border border-transparent"
        } ${isFocused ? "ring-2 ring-[var(--primary)]/30" : ""} ${
          isDimmed ? "opacity-35" : ""
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ marginLeft: depth * 24 }}
        onClick={() => onSelect(node.id)}
        data-node-id={node.id}
        tabIndex={-1}
      >
        {/* Connector line */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0 border-l-2 border-[var(--border)]"
            style={{ left: -12 + depth * 24 }}
          />
        )}

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--border)] opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </div>

        {/* Expand/collapse */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
            hasChildren
              ? "hover:bg-[var(--surface-2)] text-[var(--text-secondary)]"
              : "text-transparent cursor-default"
          }`}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            ))}
        </button>

        {/* Level badge */}
        <span
          className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
        >
          {node.level}
        </span>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {renderName(node.name)}
          </p>
        </div>

        {/* Manager + user count */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {node.managerName && (
            <span className="text-xs text-[var(--neutral-gray)] truncate max-w-[120px]">
              {node.managerName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Users size={12} className="text-[var(--neutral-gray)]" />
            {node.userCount}
          </span>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                highlightedIds={highlightedIds}
                searchQuery={searchQuery}
                focusedId={focusedId}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag Overlay Card                                                  */
/* ------------------------------------------------------------------ */

function DragCard({ node }: { node: OrgTreeNode }) {
  const levelColor = getLevelColor(node.level);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--surface-0)] px-4 py-2.5 shadow-lg">
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
      >
        {node.level}
      </span>
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {node.name}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Enhanced Tree View                                                 */
/* ------------------------------------------------------------------ */

export function EnhancedTreeView({
  tree,
  selectedId,
  onSelect,
  expandedIds,
  onToggle,
  highlightedIds,
  searchQuery,
  onMoveNode,
}: OrgViewProps) {
  const [activeNode, setActiveNode] = useState<OrgTreeNode | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Build flat visible list for keyboard navigation
  const visibleNodes = useMemo(() => {
    const result: { node: OrgTreeNode; depth: number }[] = [];
    function walk(nodes: OrgTreeNode[], depth: number) {
      for (const node of nodes) {
        result.push({ node, depth });
        if (expandedIds.has(node.id) && node.children?.length) {
          walk(node.children, depth + 1);
        }
      }
    }
    walk(tree, 0);
    return result;
  }, [tree, expandedIds]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement as Node)) return;

      const currentIdx = visibleNodes.findIndex((v) => v.node.id === focusedId);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextIdx = Math.min(currentIdx + 1, visibleNodes.length - 1);
          setFocusedId(visibleNodes[nextIdx]?.node.id ?? null);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prevIdx = Math.max(currentIdx - 1, 0);
          setFocusedId(visibleNodes[prevIdx]?.node.id ?? null);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (focusedId) {
            const node = visibleNodes[currentIdx]?.node;
            if (node?.children?.length && !expandedIds.has(node.id)) {
              onToggle(node.id);
            }
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (focusedId) {
            const node = visibleNodes[currentIdx]?.node;
            if (node && expandedIds.has(node.id)) {
              onToggle(node.id);
            }
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (focusedId) onSelect(focusedId);
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedId, visibleNodes, expandedIds, onToggle, onSelect]);

  // Scroll focused node into view
  useEffect(() => {
    if (!focusedId || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-node-id="${focusedId}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedId]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const nodeId = event.active.data.current?.nodeId as string;
      const node = findNodeById(tree, nodeId);
      setActiveNode(node);
    },
    [tree],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveNode(null);
      const { active, over } = event;
      if (!over) return;

      const draggedId = active.data.current?.nodeId as string;
      const targetId = over.data.current?.nodeId as string;
      if (!draggedId || !targetId || draggedId === targetId) return;

      // Prevent moving to own descendant
      const draggedNode = findNodeById(tree, draggedId);
      if (!draggedNode) return;
      const descendants = collectDescendantIds(draggedNode);
      if (descendants.has(targetId)) return;

      onMoveNode(draggedId, targetId);
    },
    [tree, onMoveNode],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className="h-full overflow-y-auto p-4 focus:outline-none"
        tabIndex={0}
        onFocus={() => {
          if (!focusedId && visibleNodes.length > 0) {
            setFocusedId(visibleNodes[0].node.id);
          }
        }}
      >
        {tree.map((rootNode) => (
          <TreeNode
            key={rootNode.id}
            node={rootNode}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            highlightedIds={highlightedIds}
            searchQuery={searchQuery}
            focusedId={focusedId}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
      </div>

      <DragOverlay>
        {activeNode ? <DragCard node={activeNode} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
