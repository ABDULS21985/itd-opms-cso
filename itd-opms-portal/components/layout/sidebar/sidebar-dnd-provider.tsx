"use client";

import { useCallback, useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { NavGroup } from "@/lib/navigation";
import { SidebarNavItemOverlay } from "./sidebar-nav-item";
import { SidebarNavSectionOverlay } from "./sidebar-nav-section";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DragInfo {
  type: "section" | "item";
  id: string;
  label: string;
  sourceSection?: string;
}

interface SidebarDndProviderProps {
  children: React.ReactNode;
  isCustomizing: boolean;
  groups: NavGroup[];
  onReorderSections: (fromIdx: number, toIdx: number) => void;
  onReorderItems: (
    sectionLabel: string,
    fromIdx: number,
    toIdx: number,
  ) => void;
  onMoveItemToSection: (
    href: string,
    fromSection: string,
    toSection: string,
    insertIdx: number,
  ) => void;
  onDragStateChange: (
    type: "section" | "item" | null,
    id: string | null,
  ) => void;
}

/* ------------------------------------------------------------------ */
/*  Helper: find which section contains an item href                   */
/* ------------------------------------------------------------------ */

function findSectionForItem(
  groups: NavGroup[],
  href: string,
): string | null {
  for (const g of groups) {
    if (g.items.some((i) => i.href === href)) return g.label;
  }
  return null;
}

function findItemByHref(groups: NavGroup[], href: string) {
  for (const g of groups) {
    const item = g.items.find((i) => i.href === href);
    if (item) return item;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SidebarDndProvider({
  children,
  isCustomizing,
  groups,
  onReorderSections,
  onReorderItems,
  onMoveItemToSection,
  onDragStateChange,
}: SidebarDndProviderProps) {
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sectionIds = useMemo(
    () => groups.map((g) => `section:${g.label}`),
    [groups],
  );

  /* ------- Handlers ------- */

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const id = active.id as string;
      const data = active.data.current as
        | { type: string; label?: string; href?: string }
        | undefined;

      if (id.startsWith("section:")) {
        const label = id.replace("section:", "");
        setActiveDrag({ type: "section", id, label });
        onDragStateChange("section", id);
      } else {
        const section = findSectionForItem(groups, id);
        const item = findItemByHref(groups, id);
        setActiveDrag({
          type: "item",
          id,
          label: item?.label || data?.label || id,
          sourceSection: section || undefined,
        });
        onDragStateChange("item", id);
      }
    },
    [groups, onDragStateChange],
  );

  const handleDragOver = useCallback(
    (_event: DragOverEvent) => {
      // Cross-section preview could be done here but we keep it simple
      // and handle everything in onDragEnd
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      onDragStateChange(null, null);

      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      // Section reorder
      if (activeId.startsWith("section:") && overId.startsWith("section:")) {
        const fromLabel = activeId.replace("section:", "");
        const toLabel = overId.replace("section:", "");
        const fromIdx = groups.findIndex((g) => g.label === fromLabel);
        const toIdx = groups.findIndex((g) => g.label === toLabel);
        if (fromIdx >= 0 && toIdx >= 0) {
          onReorderSections(fromIdx, toIdx);
        }
        return;
      }

      // Item reorder (same section or cross-section)
      if (!activeId.startsWith("section:")) {
        const sourceSection = findSectionForItem(groups, activeId);
        let targetSection: string | null = null;
        let targetIdx = 0;

        if (overId.startsWith("section:")) {
          // Dropped on a section header
          targetSection = overId.replace("section:", "");
          targetIdx = 0;
        } else {
          // Dropped on another item
          targetSection = findSectionForItem(groups, overId);
          if (targetSection) {
            const targetGroup = groups.find((g) => g.label === targetSection);
            targetIdx =
              targetGroup?.items.findIndex((i) => i.href === overId) ?? 0;
          }
        }

        if (!sourceSection || !targetSection) return;

        if (sourceSection === targetSection) {
          // Same section reorder
          const sourceGroup = groups.find((g) => g.label === sourceSection);
          if (!sourceGroup) return;
          const fromIdx = sourceGroup.items.findIndex(
            (i) => i.href === activeId,
          );
          if (fromIdx >= 0 && targetIdx >= 0) {
            onReorderItems(sourceSection, fromIdx, targetIdx);
          }
        } else {
          // Cross-section move
          const item = findItemByHref(groups, activeId);
          onMoveItemToSection(activeId, sourceSection, targetSection, targetIdx);

          toast(`Moved '${item?.label || activeId}' to ${targetSection} section`, {
            duration: 5000,
          });
        }
      }
    },
    [groups, onReorderSections, onReorderItems, onMoveItemToSection, onDragStateChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
    onDragStateChange(null, null);
  }, [onDragStateChange]);

  /* ------- Render ------- */

  if (!isCustomizing) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={sectionIds}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>

      <DragOverlay>
        {activeDrag?.type === "section" ? (
          <SidebarNavSectionOverlay label={activeDrag.label} />
        ) : activeDrag?.type === "item" ? (
          (() => {
            const item = findItemByHref(groups, activeDrag.id);
            return item ? <SidebarNavItemOverlay item={item} /> : null;
          })()
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
