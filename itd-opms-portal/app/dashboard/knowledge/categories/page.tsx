"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Save,
  ChevronRight,
} from "lucide-react";
import {
  useKBCategories,
  useCreateKBCategory,
  useUpdateKBCategory,
  useDeleteKBCategory,
} from "@/hooks/use-knowledge";
import type {
  KBCategory,
  CreateKBCategoryRequest,
  UpdateKBCategoryRequest,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-[var(--neutral-gray)]">{hint}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

/* ------------------------------------------------------------------ */
/*  Modal: Create / Edit Category                                      */
/* ------------------------------------------------------------------ */

function CategoryModal({
  initial,
  categories,
  onClose,
}: {
  initial?: KBCategory;
  categories: KBCategory[];
  onClose: () => void;
}) {
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(
    initial?.sortOrder !== undefined ? String(initial.sortOrder) : "0",
  );

  const createCategory = useCreateKBCategory();
  const updateCategory = useUpdateKBCategory(initial?.id);

  const isPending = createCategory.isPending || updateCategory.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base = {
      name,
      description: description || undefined,
      parentId: parentId || undefined,
      icon: icon || undefined,
      sortOrder: Number(sortOrder),
    };

    if (isEdit) {
      const req: UpdateKBCategoryRequest = base;
      updateCategory.mutate(req, { onSuccess: onClose });
    } else {
      const req: CreateKBCategoryRequest = { ...base, name };
      createCategory.mutate(req, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {isEdit ? "Edit Category" : "New Category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Field label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className={inputCls}
              placeholder="Category name"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputCls + " resize-none"}
              placeholder="Optional description"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Parent Category">
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className={inputCls}
              >
                <option value="">None (root)</option>
                {categories
                  .filter((c) => c.id !== initial?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Sort Order">
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                min={0}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Icon" hint="e.g. folder, book, shield">
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className={inputCls}
              placeholder="Optional icon name"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CategoriesPage() {
  const { data: categories, isLoading } = useKBCategories();
  const deleteCategory = useDeleteKBCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KBCategory | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cats = Array.isArray(categories) ? categories : [];

  function openCreate() {
    setEditing(undefined);
    setModalOpen(true);
  }

  function openEdit(cat: KBCategory) {
    setEditing(cat);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this category? Articles in this category will become uncategorized.",
      )
    )
      return;
    setDeletingId(id);
    deleteCategory.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  }

  const rootCats = cats.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) =>
    cats.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <FolderTree size={22} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              KB Categories
            </h1>
            <p className="text-xs text-[var(--neutral-gray)]">
              {cats.length} categor{cats.length === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          New Category
        </button>
      </motion.div>

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={22}
              className="animate-spin text-[var(--primary)]"
            />
          </div>
        ) : cats.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <FolderTree size={36} className="text-[var(--neutral-gray)]/40" />
            <p className="text-sm text-[var(--neutral-gray)]">
              No categories yet. Create one to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rootCats.map((cat) => {
              const children = childrenOf(cat.id);
              return (
                <li key={cat.id}>
                  <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface-1)] transition-colors">
                    <FolderTree
                      size={16}
                      className="shrink-0 text-[var(--primary)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-[var(--neutral-gray)] truncate">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    {children.length > 0 && (
                      <span className="text-xs text-[var(--neutral-gray)] shrink-0">
                        {children.length} sub
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                        className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        title="Delete"
                      >
                        {deletingId === cat.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Children */}
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-3 pl-12 pr-5 py-3 hover:bg-[var(--surface-1)] transition-colors border-t border-[var(--border)]/50"
                    >
                      <ChevronRight
                        size={12}
                        className="shrink-0 text-[var(--neutral-gray)]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)]">
                          {child.name}
                        </p>
                        {child.description && (
                          <p className="text-xs text-[var(--neutral-gray)] truncate">
                            {child.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(child)}
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(child.id)}
                          disabled={deletingId === child.id}
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Delete"
                        >
                          {deletingId === child.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <CategoryModal
            initial={editing}
            categories={cats}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
