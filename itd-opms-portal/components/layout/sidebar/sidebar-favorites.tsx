"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Star,
  GripVertical,
  Pencil,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import type { FavoriteItem } from "@/hooks/use-sidebar-favorites";

interface SidebarFavoritesProps {
  favorites: FavoriteItem[];
  pathname: string;
  isActive: (pathname: string, href: string) => boolean;
  resolveIcon: (iconName: string) => LucideIcon;
  onRemove: (path: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onRename: (path: string, alias: string) => void;
}

interface FavoriteRowProps {
  fav: FavoriteItem;
  active: boolean;
  Icon: LucideIcon;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (alias: string) => void;
  onRemove: () => void;
}

function kindAccent(kind?: FavoriteItem["kind"]): string | null {
  switch (kind) {
    case "ticket":
      return "T";
    case "project":
      return "P";
    case "asset":
      return "A";
    case "release":
      return "R";
    default:
      return null;
  }
}

function FavoriteRow({
  fav,
  active,
  Icon,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRemove,
}: FavoriteRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fav.path });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(fav.alias || "");

  useEffect(() => {
    if (editing) {
      setDraft(fav.alias || "");
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [editing, fav.alias]);

  const display = fav.alias || fav.text;
  const accent = kindAccent(fav.kind);

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1.5 rounded-xl px-3 py-2 bg-[color:var(--sidebar-search-bg)] border border-[color:var(--sidebar-border-strong)]"
      >
        <Icon size={14} className="flex-shrink-0 text-[color:var(--sidebar-text-subtle)]" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave(draft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          placeholder={fav.text}
          maxLength={48}
          className="flex-1 min-w-0 bg-transparent text-xs text-[color:var(--sidebar-text)] placeholder:text-[color:var(--sidebar-text-faint)] focus:outline-none"
        />
        <button
          onClick={() => onSave(draft)}
          className="p-1 rounded text-emerald-400 hover:text-emerald-300"
          title="Save"
          aria-label="Save rename"
        >
          <Check size={12} />
        </button>
        <button
          onClick={onCancelEdit}
          className="p-1 rounded text-[color:var(--sidebar-text-faint)] hover:text-[color:var(--sidebar-text)]"
          title="Cancel"
          aria-label="Cancel rename"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/fav relative flex items-center"
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-0.5 mr-0.5 rounded text-[color:var(--sidebar-text-faint)] opacity-0 group-hover/fav:opacity-100 hover:text-[color:var(--sidebar-text-muted)] cursor-grab active:cursor-grabbing transition-opacity"
        aria-label={`Reorder ${display}`}
      >
        <GripVertical size={11} />
      </button>
      <Link
        href={fav.path}
        onDoubleClick={(e) => {
          e.preventDefault();
          onStartEdit();
        }}
        className={`
          flex-1 flex items-center gap-2 rounded-xl text-xs font-medium
          transition-all duration-200 px-2.5 py-2 border-l-[3px] min-w-0
          ${active
            ? "border-[color:var(--sidebar-accent)] bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
            : "border-transparent text-[color:var(--sidebar-text-muted)] hover:bg-[color:var(--sidebar-hover-bg)] hover:text-[color:var(--sidebar-text)]"
          }
        `}
      >
        <Icon size={14} className="flex-shrink-0" />
        <span className="truncate flex-1">{display}</span>
        {accent && (
          <span
            className="flex-shrink-0 text-[8px] font-bold px-1 py-px rounded bg-[color:var(--sidebar-search-bg)] text-[color:var(--sidebar-text-faint)]"
            title={fav.kind}
          >
            {accent}
          </span>
        )}
      </Link>
      <div className="absolute right-1.5 flex items-center gap-0.5 opacity-0 group-hover/fav:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartEdit();
          }}
          className="p-1 rounded text-[color:var(--sidebar-text-faint)] hover:text-[color:var(--sidebar-text)] hover:bg-[color:var(--sidebar-hover-bg-strong)]"
          title="Rename favorite"
          aria-label="Rename favorite"
        >
          <Pencil size={10} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 rounded text-[color:var(--sidebar-accent)] hover:text-[color:var(--sidebar-accent)] hover:bg-[color:var(--sidebar-hover-bg-strong)]"
          title="Remove from favorites"
          aria-label="Remove from favorites"
        >
          <Star size={11} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

export function SidebarFavorites({
  favorites,
  pathname,
  isActive,
  resolveIcon,
  onRemove,
  onReorder,
  onRename,
}: SidebarFavoritesProps) {
  const [editingPath, setEditingPath] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const ids = favorites.map((f) => f.path);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = favorites.findIndex((f) => f.path === active.id);
    const toIdx = favorites.findIndex((f) => f.path === over.id);
    if (fromIdx >= 0 && toIdx >= 0) {
      onReorder(fromIdx, toIdx);
    }
  };

  if (favorites.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--sidebar-text-subtle)] flex items-center gap-1.5">
        <Star size={10} className="text-[color:var(--sidebar-accent)]" />
        Favorites
        <span className="ml-auto text-[9px] font-normal normal-case text-[color:var(--sidebar-text-faint)] tracking-normal">
          drag to reorder · double-click to rename
        </span>
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {favorites.map((fav) => {
              const Icon = resolveIcon(fav.iconName);
              const active = isActive(pathname, fav.path);
              return (
                <FavoriteRow
                  key={fav.path}
                  fav={fav}
                  active={active}
                  Icon={Icon}
                  editing={editingPath === fav.path}
                  onStartEdit={() => setEditingPath(fav.path)}
                  onCancelEdit={() => setEditingPath(null)}
                  onSave={(alias) => {
                    onRename(fav.path, alias);
                    setEditingPath(null);
                  }}
                  onRemove={() => onRemove(fav.path)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mx-3 mt-2 border-t border-[color:var(--sidebar-border)]" />
    </div>
  );
}
