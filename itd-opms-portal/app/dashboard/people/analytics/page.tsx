"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  GraduationCap,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import {
  useSkillCategories,
  useSkills,
  useTrainingRecords,
  useExpiringCertifications,
  useCapacityAllocations,
} from "@/hooks/use-people";

/* ------------------------------------------------------------------ */
/*  Stat Card Component                                                 */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  color,
  loading,
  icon: Icon,
}: {
  label: string;
  value: string | number | undefined;
  color: string;
  loading: boolean;
  icon: typeof Brain;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {loading ? (
          <span className="inline-block w-8 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
        ) : (
          (value ?? "--")
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Wrapper                                                     */
/* ------------------------------------------------------------------ */

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PeopleAnalyticsPage() {
  // Skills data
  const { data: skillCategories, isLoading: catLoading } =
    useSkillCategories();
  const { data: allSkills, isLoading: skillsLoading } = useSkills(1, 1);

  // Training data
  const { data: totalTraining, isLoading: totalTrainingLoading } =
    useTrainingRecords(1, 1);
  const { data: completedTraining, isLoading: completedLoading } =
    useTrainingRecords(1, 1, undefined, undefined, "completed");
  const { data: inProgressTraining, isLoading: inProgressLoading } =
    useTrainingRecords(1, 1, undefined, undefined, "in_progress");
  const { data: plannedTraining, isLoading: plannedLoading } =
    useTrainingRecords(1, 1, undefined, undefined, "planned");

  // Capacity data
  const { data: capacityData, isLoading: capacityLoading } =
    useCapacityAllocations(1, 100);

  // Expiring certifications
  const { data: expiring30, isLoading: exp30Loading } =
    useExpiringCertifications(30);
  const { data: expiring60, isLoading: exp60Loading } =
    useExpiringCertifications(60);
  const { data: expiring90, isLoading: exp90Loading } =
    useExpiringCertifications(90);

  const categories = skillCategories ?? [];
  const allocations = capacityData?.data ?? [];

  // Capacity summary
  const uniqueUsers = new Set(allocations.map((a) => a.userId)).size;
  const avgAllocation =
    allocations.length > 0
      ? Math.round(
          allocations.reduce((sum, a) => sum + a.allocationPct, 0) /
            allocations.length,
        )
      : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
          >
            <BarChart3 size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Workforce Analytics
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Skills distribution, training progress, capacity overview, and
              certification status
            </p>
          </div>
        </div>
      </motion.div>

      {/* Skills Distribution */}
      <Section title="Skills Distribution" delay={0.1}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Skills"
            value={allSkills?.meta?.totalItems}
            color="#1B7340"
            loading={skillsLoading}
            icon={Brain}
          />
          <StatCard
            label="Categories"
            value={categories.length}
            color="#3B82F6"
            loading={catLoading}
            icon={Brain}
          />
          {categories.slice(0, 2).map((cat) => (
            <CategoryStatCard key={cat.id} categoryId={cat.id} name={cat.name} />
          ))}
        </div>

        {categories.length > 2 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {categories.slice(2, 6).map((cat) => (
              <CategoryStatCard key={cat.id} categoryId={cat.id} name={cat.name} />
            ))}
          </div>
        )}
      </Section>

      {/* Training Completion */}
      <Section title="Training Completion" delay={0.2}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Records"
            value={totalTraining?.meta?.totalItems}
            color="#8B5CF6"
            loading={totalTrainingLoading}
            icon={GraduationCap}
          />
          <StatCard
            label="Completed"
            value={completedTraining?.meta?.totalItems}
            color="#10B981"
            loading={completedLoading}
            icon={CheckCircle}
          />
          <StatCard
            label="In Progress"
            value={inProgressTraining?.meta?.totalItems}
            color="#3B82F6"
            loading={inProgressLoading}
            icon={Clock}
          />
          <StatCard
            label="Planned"
            value={plannedTraining?.meta?.totalItems}
            color="#6B7280"
            loading={plannedLoading}
            icon={Clock}
          />
        </div>
      </Section>

      {/* Capacity Overview */}
      <Section title="Capacity Overview" delay={0.3}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Allocations"
            value={allocations.length}
            color="#3B82F6"
            loading={capacityLoading}
            icon={Users}
          />
          <StatCard
            label="Unique Users"
            value={uniqueUsers}
            color="#8B5CF6"
            loading={capacityLoading}
            icon={Users}
          />
          <StatCard
            label="Avg Allocation"
            value={`${avgAllocation}%`}
            color={avgAllocation > 80 ? "#EF4444" : "#10B981"}
            loading={capacityLoading}
            icon={Users}
          />
          <StatCard
            label="Over-Allocated"
            value={
              capacityLoading
                ? undefined
                : (() => {
                    const userTotals = new Map<string, number>();
                    for (const a of allocations) {
                      userTotals.set(
                        a.userId,
                        (userTotals.get(a.userId) ?? 0) + a.allocationPct,
                      );
                    }
                    return Array.from(userTotals.values()).filter(
                      (v) => v > 100,
                    ).length;
                  })()
            }
            color="#EF4444"
            loading={capacityLoading}
            icon={AlertTriangle}
          />
        </div>
      </Section>

      {/* Certification Status */}
      <Section title="Certification Status" delay={0.4}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: "#EF4444" }} />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Expiring in 30 days
              </p>
            </div>
            <p
              className="text-3xl font-bold tabular-nums"
              style={{ color: "#EF4444" }}
            >
              {exp30Loading ? (
                <span className="inline-block w-8 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                (expiring30?.length ?? 0)
              )}
            </p>
            {expiring30 && expiring30.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {expiring30.slice(0, 3).map((cert) => (
                  <p
                    key={cert.id}
                    className="text-xs text-[var(--text-secondary)] truncate"
                  >
                    {cert.title}
                  </p>
                ))}
                {expiring30.length > 3 && (
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    +{expiring30.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: "#F59E0B" }} />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Expiring in 60 days
              </p>
            </div>
            <p
              className="text-3xl font-bold tabular-nums"
              style={{ color: "#F59E0B" }}
            >
              {exp60Loading ? (
                <span className="inline-block w-8 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                (expiring60?.length ?? 0)
              )}
            </p>
            {expiring60 && expiring60.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {expiring60.slice(0, 3).map((cert) => (
                  <p
                    key={cert.id}
                    className="text-xs text-[var(--text-secondary)] truncate"
                  >
                    {cert.title}
                  </p>
                ))}
                {expiring60.length > 3 && (
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    +{expiring60.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: "#3B82F6" }} />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Expiring in 90 days
              </p>
            </div>
            <p
              className="text-3xl font-bold tabular-nums"
              style={{ color: "#3B82F6" }}
            >
              {exp90Loading ? (
                <span className="inline-block w-8 h-8 rounded bg-[var(--surface-2)] animate-pulse" />
              ) : (
                (expiring90?.length ?? 0)
              )}
            </p>
            {expiring90 && expiring90.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {expiring90.slice(0, 3).map((cert) => (
                  <p
                    key={cert.id}
                    className="text-xs text-[var(--text-secondary)] truncate"
                  >
                    {cert.title}
                  </p>
                ))}
                {expiring90.length > 3 && (
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    +{expiring90.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Stat Card — shows skill count per category                 */
/* ------------------------------------------------------------------ */

function CategoryStatCard({
  categoryId,
  name,
}: {
  categoryId: string;
  name: string;
}) {
  const { data, isLoading } = useSkills(1, 1, categoryId);
  const colors = [
    "#8B5CF6",
    "#F59E0B",
    "#10B981",
    "#EF4444",
    "#06B6D4",
    "#F97316",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] truncate mb-2">
        {name}
      </p>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {isLoading ? (
          <span className="inline-block w-8 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
        ) : (
          (data?.meta?.totalItems ?? 0)
        )}
      </p>
      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">skills</p>
    </div>
  );
}
