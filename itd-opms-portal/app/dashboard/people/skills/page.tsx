"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Users,
  Loader2,
} from "lucide-react";
import {
  useSkillCategories,
  useSkills,
  useUsersBySkill,
} from "@/hooks/use-people";
import type { SkillCategory, Skill } from "@/types";

/* ------------------------------------------------------------------ */
/*  Category Tree Node                                                  */
/* ------------------------------------------------------------------ */

function CategoryNode({
  category,
  selectedId,
  onSelect,
}: {
  category: SkillCategory;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: children } = useSkillCategories(category.id);
  const childCategories = children ?? [];
  const isSelected = selectedId === category.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(category.id);
          if (childCategories.length > 0) setExpanded((e) => !e);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-2)]"
        style={{
          backgroundColor: isSelected ? "var(--surface-2)" : "transparent",
          color: isSelected ? "var(--primary)" : "var(--text-primary)",
        }}
      >
        {childCategories.length > 0 ? (
          expanded ? (
            <ChevronDown size={14} className="shrink-0 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-[var(--text-secondary)]" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <FolderOpen size={14} className="shrink-0" />
        <span className="truncate font-medium">{category.name}</span>
      </button>

      <AnimatePresence>
        {expanded && childCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-4 border-l border-[var(--border)] pl-2"
          >
            {childCategories.map((child) => (
              <CategoryNode
                key={child.id}
                category={child}
                selectedId={selectedId}
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
/*  Skill Card Component                                                */
/* ------------------------------------------------------------------ */

function SkillCard({ skill }: { skill: Skill }) {
  const [showUsers, setShowUsers] = useState(false);
  const { data: users, isLoading } = useUsersBySkill(
    showUsers ? skill.id : undefined,
  );
  const userCount = users?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-all duration-200 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {skill.name}
          </h3>
          {skill.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
              {skill.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowUsers((s) => !s)}
          className="ml-3 flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <Users size={12} />
          {showUsers && !isLoading ? userCount : "View"}
        </button>
      </div>

      <AnimatePresence>
        {showUsers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 border-t border-[var(--border)] pt-3"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 size={14} className="animate-spin text-[var(--primary)]" />
              </div>
            ) : userCount === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-2">
                No users have this skill yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {(users ?? []).slice(0, 5).map((us) => (
                  <div
                    key={us.id}
                    className="flex items-center justify-between rounded-lg bg-[var(--surface-1)] px-2.5 py-1.5"
                  >
                    <span className="text-xs text-[var(--text-primary)]">
                      {us.userId.slice(0, 8)}...
                    </span>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                      style={{
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        color: "#3B82F6",
                      }}
                    >
                      {us.proficiencyLevel}
                    </span>
                  </div>
                ))}
                {userCount > 5 && (
                  <p className="text-[10px] text-[var(--text-secondary)] text-center">
                    +{userCount - 5} more
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SkillsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data: rootCategories, isLoading: categoriesLoading } =
    useSkillCategories();
  const { data: skillsData, isLoading: skillsLoading } = useSkills(
    page,
    20,
    selectedCategoryId || undefined,
  );

  const categories = rootCategories ?? [];
  const skills = skillsData?.data ?? [];
  const meta = skillsData?.meta;

  const filteredSkills = searchQuery
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : skills;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <Brain size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Skills Directory
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Browse skill categories and track team proficiencies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Plus size={16} />
            Add Category
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Add Skill
          </button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </motion.div>

      {/* Main Content: Sidebar + Skills Grid */}
      <div className="flex gap-6">
        {/* Category Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden lg:block w-64 shrink-0"
        >
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3">
            <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Categories
            </h2>

            {/* All Skills Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId(null);
                setPage(1);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{
                backgroundColor:
                  selectedCategoryId === null ? "var(--surface-2)" : "transparent",
                color:
                  selectedCategoryId === null
                    ? "var(--primary)"
                    : "var(--text-primary)",
              }}
            >
              <Brain size={14} className="shrink-0" />
              All Skills
            </button>

            {categoriesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2
                  size={16}
                  className="animate-spin text-[var(--primary)]"
                />
              </div>
            ) : categories.length === 0 ? (
              <p className="px-3 py-4 text-xs text-[var(--text-secondary)] text-center">
                No categories yet.
              </p>
            ) : (
              <div className="mt-1 space-y-0.5">
                {categories.map((cat) => (
                  <CategoryNode
                    key={cat.id}
                    category={cat}
                    selectedId={selectedCategoryId}
                    onSelect={(id) => {
                      setSelectedCategoryId(id);
                      setPage(1);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Skills Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex-1 min-w-0"
        >
          {skillsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                size={24}
                className="animate-spin text-[var(--primary)]"
              />
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
              <Brain
                size={24}
                className="mx-auto text-[var(--text-secondary)] mb-2"
              />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No skills found
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {selectedCategoryId
                  ? "No skills in this category. Add one to get started."
                  : "Add your first skill to start building the directory."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Showing page {meta.page} of {meta.totalPages} (
                    {meta.totalItems} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
