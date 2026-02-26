"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Upload,
  Download,
  Merge,
  Edit,
  X,
  Check,
  AlertCircle,
  Tags,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedButton } from "@/components/shared/animated-button";
import { showUndoToast } from "@/components/shared/undo-toast";
import {
  useAdminSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
} from "@/hooks/use-taxonomy";
import type { SkillTag } from "@/types/taxonomy";
import { cn } from "@/lib/utils";

interface SkillsPanelProps {
  onMergeClick: (selectedIds: string[]) => void;
  onImportClick: () => void;
  onExportClick: () => void;
}

export function SkillsPanel({ onMergeClick, onImportClick, onExportClick }: SkillsPanelProps) {
  const { data: skills = [], isLoading, isError } = useAdminSkills();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    skills.forEach((s) => cats.add(s.category ?? "Uncategorized"));
    return Array.from(cats).sort();
  }, [skills]);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const cat = s.category ?? "Uncategorized";
      const matchesCategory = categoryFilter === "all" || cat === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [skills, search, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, SkillTag[]>();
    filtered.forEach((s) => {
      const cat = s.category ?? "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSkill.mutate(
      { name: newName.trim(), category: newCategory.trim() || undefined },
      {
        onSuccess: () => {
          setNewName("");
          setNewCategory("");
          setShowCreateForm(false);
          toast.success("Skill created");
        },
      },
    );
  };

  const handleEditSave = (skill: SkillTag) => {
    if (!editName.trim() || editName.trim() === skill.name) {
      setEditingId(null);
      return;
    }
    updateSkill.mutate(
      { id: skill.id, name: editName.trim() },
      { onSuccess: () => { setEditingId(null); toast.success("Skill updated"); } },
    );
  };

  const handleSoftDelete = (skill: SkillTag) => {
    updateSkill.mutate({ id: skill.id, isActive: false });
    showUndoToast({
      message: `"${skill.name}" deactivated`,
      undoAction: () => updateSkill.mutate({ id: skill.id, isActive: true }),
      variant: "warning",
    });
  };

  const handleToggleActive = (skill: SkillTag) => {
    updateSkill.mutate({ id: skill.id, isActive: !skill.isActive });
  };

  // ── Loading / Error / Empty states ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--neutral-gray)]">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-[var(--error)]">
        <AlertCircle size={28} />
        <p className="text-sm font-medium">Failed to load skills</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <AnimatedButton variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreateForm(true)}>
          Create New
        </AnimatedButton>
        <AnimatedButton variant="secondary" size="sm" icon={<Upload size={14} />} onClick={onImportClick}>
          Import
        </AnimatedButton>
        <AnimatedButton variant="secondary" size="sm" icon={<Download size={14} />} onClick={onExportClick}>
          Export
        </AnimatedButton>

        {selectedIds.size >= 2 && (
          <AnimatedButton
            variant="ghost"
            size="sm"
            icon={<Merge size={14} />}
            onClick={() => onMergeClick(Array.from(selectedIds))}
          >
            Merge ({selectedIds.size})
          </AnimatedButton>
        )}
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--surface-1)] p-3">
          <input
            autoFocus
            placeholder="Skill name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          />
          <input
            placeholder="Category (optional)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-40 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          />
          <AnimatedButton variant="primary" size="sm" icon={<Check size={14} />} onClick={handleCreate} loading={createSkill.isPending}>
            Save
          </AnimatedButton>
          <AnimatedButton variant="ghost" size="sm" icon={<X size={14} />} onClick={() => { setShowCreateForm(false); setNewName(""); setNewCategory(""); }}>
            Cancel
          </AnimatedButton>
        </div>
      )}

      {/* Skills list grouped by category */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-[var(--neutral-gray)]">
          <Tags size={32} />
          <p className="text-sm font-medium">No skills found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(([category, items]) => {
            const isCollapsed = collapsedCategories.has(category);
            return (
              <div key={category} className="rounded-xl border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <span>{category}</span>
                  <span className="text-xs text-[var(--neutral-gray)]">{items.length} skill{items.length !== 1 ? "s" : ""}</span>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-[var(--border)]">
                    {items.map((skill) => (
                      <div key={skill.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-1)] transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(skill.id)}
                          onChange={() => toggleSelect(skill.id)}
                          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                        />

                        {editingId === skill.id ? (
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(skill);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => handleEditSave(skill)}
                            className="flex-1 rounded-lg border border-[var(--primary)] bg-[var(--surface-1)] px-2 py-1 text-sm outline-none"
                          />
                        ) : (
                          <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{skill.name}</span>
                        )}

                        {skill.category && (
                          <span className="text-xs bg-[var(--surface-2)] rounded-lg px-2 py-0.5">{skill.category}</span>
                        )}
                        <span className="text-xs text-[var(--neutral-gray)]">{skill.usageCount} uses</span>
                        <span className={cn("h-2 w-2 rounded-full", skill.isActive ? "bg-[var(--success)]" : "bg-[var(--neutral-gray)]")} />

                        <button
                          onClick={() => { setEditingId(skill.id); setEditName(skill.name); }}
                          className="p-1 rounded-md text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(skill)}
                          className={cn(
                            "p-1 rounded-md transition-colors",
                            skill.isActive
                              ? "text-[var(--success)] hover:bg-[var(--success)]/5"
                              : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]",
                          )}
                          title={skill.isActive ? "Deactivate" : "Activate"}
                        >
                          {skill.isActive ? <Check size={14} /> : <X size={14} />}
                        </button>
                        <button
                          onClick={() => handleSoftDelete(skill)}
                          className="p-1 rounded-md text-[var(--neutral-gray)] hover:bg-[var(--error)]/5 hover:text-[var(--error)] transition-colors"
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
