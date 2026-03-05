"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
  Monitor,
  Shield,
  Wifi,
  Database,
  Server,
  Cloud,
  Mail,
  Phone,
  Printer,
  HardDrive,
  Lock,
  Key,
  Globe,
  Users,
  Settings,
  Wrench,
  Cpu,
  Network,
  Laptop,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useCatalogCategories,
  useCreateCatalogCategory,
  useDeleteCatalogCategory,
} from "@/hooks/use-itsm";
import type { CatalogCategory } from "@/types";

/* ------------------------------------------------------------------ */
/*  Icon Map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  FolderOpen,
  Monitor,
  Shield,
  Wifi,
  Database,
  Server,
  Cloud,
  Mail,
  Phone,
  Printer,
  HardDrive,
  Lock,
  Key,
  Globe,
  Users,
  Settings,
  Wrench,
  Cpu,
  Network,
  Laptop,
};

const ICON_NAMES = Object.keys(ICON_MAP);

function resolveIcon(name?: string): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return FolderOpen;
}

/* ------------------------------------------------------------------ */
/*  Hook: update a category by id (accepts id per call)                */
/* ------------------------------------------------------------------ */

function useUpdateCategoryById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<CatalogCategory>;
    }) => apiClient.put<CatalogCategory>(`/itsm/catalog/categories/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
    },
    onError: () => {
      toast.error("Failed to update category");
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Icon Picker Popover                                                */
/* ------------------------------------------------------------------ */

function IconPicker({
  currentIcon,
  onSelect,
  onClose,
}: {
  currentIcon?: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-xl"
    >
      <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
        Choose an icon
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {ICON_NAMES.map((name) => {
          const Icon = ICON_MAP[name];
          const isActive = currentIcon === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                onSelect(name);
                onClose();
              }}
              title={name}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150",
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
              )}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable Category Row                                              */
/* ------------------------------------------------------------------ */

function SortableCategoryRow({
  category,
  onRename,
  onChangeIcon,
  onDelete,
}: {
  category: CatalogCategory;
  onRename: (id: string, name: string) => void;
  onChangeIcon: (id: string, icon: string) => void;
  onDelete: (category: CatalogCategory) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(category.name);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = resolveIcon(category.icon);

  const startEditing = useCallback(() => {
    setEditValue(category.name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [category.name]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(category.name);
  }, [category.name]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== category.name) {
      onRename(category.id, trimmed);
    }
    setIsEditing(false);
  }, [editValue, category.id, category.name, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitRename();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
      }
    },
    [commitRename, cancelEditing],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 transition-all duration-150",
        isDragging && "z-50 shadow-lg opacity-50",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-[var(--neutral-gray)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      {/* Category icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        <Icon size={18} />
      </div>

      {/* Name / Inline edit */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitRename}
              className="w-full rounded-lg border border-[var(--primary)] bg-[var(--surface-1)] px-2.5 py-1 text-sm text-[var(--text-primary)] outline-none"
              aria-label="Category name"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitRename}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-white transition-colors hover:bg-[var(--primary)]/80"
              aria-label="Save name"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancelEditing}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              aria-label="Cancel editing"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p
            className="cursor-text truncate text-sm font-medium text-[var(--text-primary)]"
            onDoubleClick={startEditing}
            title="Double-click to rename"
          >
            {category.name}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setShowIconPicker((prev) => !prev)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          aria-label="Change icon"
          title="Change icon"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(category)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--error)]/10 hover:text-[var(--error)]"
          aria-label="Delete category"
          title="Delete category"
        >
          <Trash2 size={14} />
        </button>

        {/* Icon picker popover */}
        <AnimatePresence>
          {showIconPicker && (
            <IconPicker
              currentIcon={category.icon}
              onSelect={(iconName) => onChangeIcon(category.id, iconName)}
              onClose={() => setShowIconPicker(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag Overlay Card                                                  */
/* ------------------------------------------------------------------ */

function CategoryDragOverlay({
  category,
}: {
  category: CatalogCategory;
}) {
  const Icon = resolveIcon(category.icon);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--surface-0)] px-4 py-3 shadow-xl">
      <div className="flex h-7 w-7 items-center justify-center text-[var(--neutral-gray)]">
        <GripVertical size={16} />
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {category.name}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Category Inline Form                                           */
/* ------------------------------------------------------------------ */

function AddCategoryForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (trimmed) onSubmit(trimmed);
    },
    [name, onSubmit],
  );

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-2 rounded-xl border border-[var(--primary)]/40 bg-[var(--surface-0)] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
          <FolderOpen size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder="Category name..."
          disabled={isPending}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--neutral-gray)] disabled:opacity-50"
          aria-label="New category name"
        />
        <button
          type="submit"
          disabled={!name.trim() || isPending}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--primary)]/80 disabled:opacity-50"
        >
          {isPending ? (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <Plus size={14} />
          )}
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] disabled:opacity-50"
          aria-label="Cancel"
        >
          <X size={16} />
        </button>
      </div>
    </motion.form>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function CategoriesSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3"
        >
          <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-[var(--surface-2)]" />
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-[var(--surface-2)]" />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-4 animate-pulse rounded bg-[var(--surface-2)]"
              style={{ width: `${50 + i * 12}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-16"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
        <FolderOpen size={28} className="text-[var(--neutral-gray)]" />
      </div>
      <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
        No categories yet
      </p>
      <p className="mb-6 max-w-xs text-center text-xs text-[var(--text-secondary)]">
        Create your first category to organize services.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/80"
      >
        <Plus size={16} />
        Create Category
      </button>
    </motion.div>
  );
}

/* ================================================================== */
/*  CategoriesTab                                                      */
/* ================================================================== */

export function CategoriesTab() {
  const { data: categories, isLoading } = useCatalogCategories();
  const createCategory = useCreateCatalogCategory();
  const deleteCategory = useDeleteCatalogCategory();
  const updateCategory = useUpdateCategoryById();

  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogCategory | null>(
    null,
  );
  const [activeCategory, setActiveCategory] =
    useState<CatalogCategory | null>(null);

  /* Drag-and-drop sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedCategories = categories ?? [];
  const categoryIds = sortedCategories.map((c) => c.id);

  /* ------ Handlers ------ */

  const handleCreate = useCallback(
    (name: string) => {
      const nextSortOrder =
        sortedCategories.length > 0
          ? Math.max(...sortedCategories.map((c) => c.sortOrder)) + 1
          : 0;
      createCategory.mutate(
        { name, sortOrder: nextSortOrder },
        {
          onSuccess: () => setShowAddForm(false),
        },
      );
    },
    [createCategory, sortedCategories],
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      updateCategory.mutate({ id, body: { name } });
    },
    [updateCategory],
  );

  const handleChangeIcon = useCallback(
    (id: string, icon: string) => {
      updateCategory.mutate({ id, body: { icon } });
    },
    [updateCategory],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteCategory, deleteTarget]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = event.active.id as string;
      const cat = sortedCategories.find((c) => c.id === activeId) ?? null;
      setActiveCategory(cat);
    },
    [sortedCategories],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCategory(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const oldIndex = sortedCategories.findIndex((c) => c.id === activeId);
      const newIndex = sortedCategories.findIndex((c) => c.id === overId);

      if (oldIndex < 0 || newIndex < 0) return;

      // Build reordered array and update sortOrder for affected items
      const reordered = [...sortedCategories];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const minIdx = Math.min(oldIndex, newIndex);
      const maxIdx = Math.max(oldIndex, newIndex);

      for (let i = minIdx; i <= maxIdx; i++) {
        const cat = reordered[i];
        if (cat.sortOrder !== i) {
          updateCategory.mutate({ id: cat.id, body: { sortOrder: i } });
        }
      }
    },
    [sortedCategories, updateCategory],
  );

  const handleDragCancel = useCallback(() => {
    setActiveCategory(null);
  }, []);

  /* ------ Render ------ */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Categories
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Organize your service catalog with categories. Drag to reorder.
          </p>
        </div>
        {!showAddForm && sortedCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/80"
          >
            <Plus size={16} />
            Add Category
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <AddCategoryForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
            isPending={createCategory.isPending}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading ? (
        <CategoriesSkeleton />
      ) : sortedCategories.length === 0 && !showAddForm ? (
        <EmptyState onAdd={() => setShowAddForm(true)} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={categoryIds}
            strategy={verticalListSortingStrategy}
          >
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {sortedCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <SortableCategoryRow
                    category={category}
                    onRename={handleRename}
                    onChangeIcon={handleChangeIcon}
                    onDelete={setDeleteTarget}
                  />
                </motion.div>
              ))}
            </motion.div>
          </SortableContext>

          <DragOverlay>
            {activeCategory ? (
              <CategoryDragOverlay category={activeCategory} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Any services in this category will become uncategorized. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteCategory.isPending}
      />
    </div>
  );
}
