"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Users,
  Loader2,
  Award,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import {
  useSkillCategories,
  useSkills,
  useUsersBySkill,
} from "@/hooks/use-people";
import type { SkillCategory, Skill, UserSkill } from "@/types";
import {
  KPIStatCard,
  ChartCard,
  DonutChart,
  TreemapChart,
  FunnelChart,
  StackedBarChart,
} from "@/components/dashboard/charts";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROFICIENCY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;

const PROFICIENCY_COLORS: Record<string, string> = {
  beginner: "#94A3B8",
  intermediate: "#3B82F6",
  advanced: "#8B5CF6",
  expert: "#F59E0B",
};

const PROFICIENCY_NUMERIC: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

const CHART_PALETTE = [
  "#1B7340",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#10B981",
  "#F97316",
  "#6366F1",
];

const AVATAR_COLORS = [
  "#1B7340",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
];

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */

function computeCategoryDistribution(
  skills: Skill[],
  categories: SkillCategory[],
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const counts = new Map<string, number>();
  for (const s of skills) {
    const name = catMap.get(s.categoryId) ?? "Uncategorized";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, value], i) => ({
      name,
      value,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }))
    .sort((a, b) => b.value - a.value);
}

function computeProficiencyDonut(userSkills: UserSkill[]) {
  const counts: Record<string, number> = {};
  for (const level of PROFICIENCY_LEVELS) counts[level] = 0;
  for (const us of userSkills) {
    const lvl = us.proficiencyLevel?.toLowerCase() ?? "beginner";
    if (lvl in counts) counts[lvl]++;
    else counts.beginner++;
  }
  return PROFICIENCY_LEVELS.map((level) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value: counts[level],
    color: PROFICIENCY_COLORS[level],
  })).filter((d) => d.value > 0);
}

function computeProficiencyFunnel(userSkills: UserSkill[]) {
  const counts: Record<string, number> = {};
  for (const level of PROFICIENCY_LEVELS) counts[level] = 0;
  for (const us of userSkills) {
    const lvl = us.proficiencyLevel?.toLowerCase() ?? "beginner";
    if (lvl in counts) counts[lvl]++;
    else counts.beginner++;
  }
  return PROFICIENCY_LEVELS.map((level) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value: counts[level],
    color: PROFICIENCY_COLORS[level],
  }));
}

function computeCertificationRate(userSkills: UserSkill[]) {
  if (userSkills.length === 0) return 0;
  const certified = userSkills.filter((us) => us.certified).length;
  return Math.round((certified / userSkills.length) * 100);
}

function computeTopSkillsBarData(
  skillUserMap: Map<string, UserSkill[]>,
  skillNameMap: Map<string, string>,
) {
  const entries = Array.from(skillUserMap.entries())
    .map(([skillId, users]) => ({ skillId, users, total: users.length }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return entries.map(({ skillId, users }) => {
    const row: Record<string, string | number> = {
      skill: skillNameMap.get(skillId) ?? skillId.slice(0, 8),
    };
    for (const level of PROFICIENCY_LEVELS) {
      row[level.charAt(0).toUpperCase() + level.slice(1)] = users.filter(
        (u) => (u.proficiencyLevel?.toLowerCase() ?? "beginner") === level,
      ).length;
    }
    return row;
  });
}

/* ------------------------------------------------------------------ */
/*  Category Tree Node                                                 */
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
            <ChevronDown
              size={14}
              className="shrink-0 text-[var(--text-secondary)]"
            />
          ) : (
            <ChevronRight
              size={14}
              className="shrink-0 text-[var(--text-secondary)]"
            />
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
/*  Enhanced Skill Card                                                */
/* ------------------------------------------------------------------ */

function EnhancedSkillCard({
  skill,
  onUserSkillsLoaded,
}: {
  skill: Skill;
  onUserSkillsLoaded: (skillId: string, users: UserSkill[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: users, isLoading } = useUsersBySkill(skill.id);
  const userSkills = users ?? [];
  const userCount = userSkills.length;

  // Report user skills upward for analytics aggregation
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (userSkills.length > 0 && userSkills.length !== prevLenRef.current) {
      prevLenRef.current = userSkills.length;
      onUserSkillsLoaded(skill.id, userSkills);
    }
  }, [userSkills, skill.id, onUserSkillsLoaded]);

  // Proficiency distribution for this skill
  const profCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const level of PROFICIENCY_LEVELS) counts[level] = 0;
    for (const us of userSkills) {
      const lvl = us.proficiencyLevel?.toLowerCase() ?? "beginner";
      if (lvl in counts) counts[lvl]++;
      else counts.beginner++;
    }
    return counts;
  }, [userSkills]);

  const avgProficiency = useMemo(() => {
    if (userSkills.length === 0) return 0;
    const total = userSkills.reduce(
      (sum, us) =>
        sum +
        (PROFICIENCY_NUMERIC[us.proficiencyLevel?.toLowerCase() ?? "beginner"] ??
          1),
      0,
    );
    return +(total / userSkills.length).toFixed(1);
  }, [userSkills]);

  const certifiedCount = userSkills.filter((us) => us.certified).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card card-interactive rounded-xl p-4 cursor-pointer"
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {skill.name}
          </h3>
          {skill.description && (
            <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
              {skill.description}
            </p>
          )}
        </div>
        <div className="relative ml-2">
          <span className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
            <Users size={12} />
            {isLoading ? "..." : userCount}
          </span>
          {userCount > 0 && (
            <span
              className="bento-dot-pulse absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#1B7340" }}
            />
          )}
        </div>
      </div>

      {/* Proficiency Bar */}
      {userCount > 0 && (
        <div className="mt-3">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            {PROFICIENCY_LEVELS.map((level) => {
              const pct = (profCounts[level] / userCount) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={level}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: PROFICIENCY_COLORS[level],
                  }}
                  className="transition-all duration-500"
                  title={`${level}: ${profCounts[level]}`}
                />
              );
            })}
          </div>
          {/* Legend dots */}
          <div className="mt-2 flex items-center gap-3">
            {PROFICIENCY_LEVELS.map(
              (level) =>
                profCounts[level] > 0 && (
                  <div key={level} className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: PROFICIENCY_COLORS[level] }}
                    />
                    <span className="text-[9px] capitalize text-[var(--text-muted)]">
                      {level}
                    </span>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {/* Stats Row */}
      {userCount > 0 && (
        <div className="mt-3 flex items-center gap-4 border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">
              Avg: {avgProficiency}/4
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">
              {certifiedCount} certified
            </span>
          </div>
        </div>
      )}

      {/* Expanded Team Members */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 border-t border-[var(--border)] pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2
                  size={14}
                  className="animate-spin text-[var(--primary)]"
                />
              </div>
            ) : userCount === 0 ? (
              <p className="py-2 text-center text-xs text-[var(--text-secondary)]">
                No users have this skill yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {userSkills.slice(0, 6).map((us, idx) => (
                  <div
                    key={us.id}
                    className="flex items-center justify-between rounded-lg bg-[var(--surface-1)] px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{
                          backgroundColor:
                            AVATAR_COLORS[idx % AVATAR_COLORS.length],
                        }}
                      >
                        {us.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-[var(--text-primary)]">
                        User {us.userId.slice(0, 6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {us.certified && (
                        <CheckCircle2
                          size={12}
                          className="text-[var(--primary)]"
                        />
                      )}
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                        style={{
                          backgroundColor: `${PROFICIENCY_COLORS[us.proficiencyLevel?.toLowerCase() ?? "beginner"]}20`,
                          color:
                            PROFICIENCY_COLORS[
                              us.proficiencyLevel?.toLowerCase() ?? "beginner"
                            ],
                        }}
                      >
                        {us.proficiencyLevel}
                      </span>
                    </div>
                  </div>
                ))}
                {userCount > 6 && (
                  <p className="pt-1 text-center text-[10px] text-[var(--text-secondary)]">
                    +{userCount - 6} more team members
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

  // Paginated list for display
  const { data: skillsData, isLoading: skillsLoading } = useSkills(
    page,
    20,
    selectedCategoryId || undefined,
  );
  // All skills for analytics
  const { data: allSkillsData } = useSkills(1, 500);
  const { data: rootCategories, isLoading: categoriesLoading } =
    useSkillCategories();

  const categories = rootCategories ?? [];
  const skills = skillsData?.data ?? [];
  const allSkills = allSkillsData?.data ?? [];
  const meta = skillsData?.meta;
  const totalSkills = allSkillsData?.meta?.totalItems ?? 0;

  // Aggregated user skills from all cards
  const [skillUserMap, setSkillUserMap] = useState<Map<string, UserSkill[]>>(
    new Map(),
  );

  const handleUserSkillsLoaded = useCallback(
    (skillId: string, usersList: UserSkill[]) => {
      setSkillUserMap((prev) => {
        if (prev.get(skillId)?.length === usersList.length) return prev;
        const next = new Map(prev);
        next.set(skillId, usersList);
        return next;
      });
    },
    [],
  );

  // Aggregated data
  const allUserSkills = useMemo(
    () => Array.from(skillUserMap.values()).flat(),
    [skillUserMap],
  );

  const uniqueUserCount = useMemo(() => {
    const ids = new Set(allUserSkills.map((us) => us.userId));
    return ids.size;
  }, [allUserSkills]);

  const certRate = useMemo(
    () => computeCertificationRate(allUserSkills),
    [allUserSkills],
  );

  // Chart data
  const treemapData = useMemo(
    () => computeCategoryDistribution(allSkills, categories),
    [allSkills, categories],
  );
  const donutData = useMemo(
    () => computeProficiencyDonut(allUserSkills),
    [allUserSkills],
  );
  const funnelData = useMemo(
    () => computeProficiencyFunnel(allUserSkills),
    [allUserSkills],
  );
  const skillNameMap = useMemo(
    () => new Map(allSkills.map((s) => [s.id, s.name])),
    [allSkills],
  );
  const barData = useMemo(
    () => computeTopSkillsBarData(skillUserMap, skillNameMap),
    [skillUserMap, skillNameMap],
  );

  // Filtered skills for display
  const filteredSkills = searchQuery
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.description ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : skills;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
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
            Explore competencies, track proficiencies, and identify talent gaps
          </p>
        </div>
      </motion.div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPIStatCard
          label="Total Skills"
          value={totalSkills}
          icon={Brain}
          color="#1B7340"
          bgColor="rgba(27, 115, 64, 0.1)"
          isLoading={!allSkillsData}
          index={0}
        />
        <KPIStatCard
          label="Categories"
          value={categories.length}
          icon={FolderOpen}
          color="#3B82F6"
          bgColor="rgba(59, 130, 246, 0.1)"
          isLoading={categoriesLoading}
          index={1}
        />
        <KPIStatCard
          label="Skilled Users"
          value={uniqueUserCount}
          icon={Users}
          color="#8B5CF6"
          bgColor="rgba(139, 92, 246, 0.1)"
          isLoading={false}
          index={2}
        />
        <KPIStatCard
          label="Certification Rate"
          value={certRate}
          suffix="%"
          icon={Award}
          color="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.1)"
          isLoading={false}
          index={3}
        />
      </div>

      {/* ── Charts 2×2 ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard
          title="Skills by Category"
          subtitle="Distribution of skills across categories"
          delay={0.2}
          isEmpty={treemapData.length === 0}
        >
          <TreemapChart data={treemapData} height={220} />
        </ChartCard>

        <ChartCard
          title="Proficiency Distribution"
          subtitle="Team proficiency level breakdown"
          delay={0.25}
          isEmpty={donutData.length === 0}
        >
          <DonutChart
            data={donutData}
            height={220}
            showLegend
            centerLabel="Proficiency"
            centerValue={allUserSkills.length.toString()}
          />
        </ChartCard>

        <ChartCard
          title="Proficiency Pipeline"
          subtitle="Talent progression through levels"
          delay={0.3}
          isEmpty={funnelData.every((d) => d.value === 0)}
        >
          <FunnelChart data={funnelData} height={220} />
        </ChartCard>

        <ChartCard
          title="Top Skills by Adoption"
          subtitle="Most popular skills by user count"
          delay={0.35}
          isEmpty={barData.length === 0}
        >
          <StackedBarChart
            data={barData}
            categories={PROFICIENCY_LEVELS.map(
              (l) => l.charAt(0).toUpperCase() + l.slice(1),
            )}
            categoryKey="skill"
            height={220}
            layout="vertical"
            colors={PROFICIENCY_LEVELS.map((l) => PROFICIENCY_COLORS[l])}
            showLegend
          />
        </ChartCard>
      </div>

      {/* ── Section Divider ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Skills Directory
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* ── Search + Category Pills ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-3"
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
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>

        {/* Category Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId(null);
              setPage(1);
            }}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor:
                selectedCategoryId === null ? "#1B7340" : "var(--surface-2)",
              color:
                selectedCategoryId === null
                  ? "#FFFFFF"
                  : "var(--text-secondary)",
            }}
          >
            All Skills
          </button>
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(cat.id);
                setPage(1);
              }}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor:
                  selectedCategoryId === cat.id
                    ? CHART_PALETTE[idx % CHART_PALETTE.length]
                    : "var(--surface-2)",
                color:
                  selectedCategoryId === cat.id
                    ? "#FFFFFF"
                    : "var(--text-secondary)",
              }}
            >
              {cat.name}
            </button>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Sidebar + Grid ── */}
      <div className="flex gap-6">
        {/* Category Sidebar (lg+) */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden w-64 shrink-0 lg:block"
        >
          <div className="glass-card rounded-xl p-3">
            <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Categories
            </h2>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId(null);
                setPage(1);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{
                backgroundColor:
                  selectedCategoryId === null
                    ? "var(--surface-2)"
                    : "transparent",
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
              <p className="px-3 py-4 text-center text-xs text-[var(--text-secondary)]">
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
          transition={{ duration: 0.4, delay: 0.4 }}
          className="min-w-0 flex-1"
        >
          {skillsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                size={24}
                className="animate-spin text-[var(--primary)]"
              />
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Brain
                size={24}
                className="mx-auto mb-2 text-[var(--text-secondary)]"
              />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No skills found
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {selectedCategoryId
                  ? "No skills in this category."
                  : "Add your first skill to start building the directory."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredSkills.map((skill) => (
                  <EnhancedSkillCard
                    key={skill.id}
                    skill={skill}
                    onUserSkillsLoaded={handleUserSkillsLoaded}
                  />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
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
