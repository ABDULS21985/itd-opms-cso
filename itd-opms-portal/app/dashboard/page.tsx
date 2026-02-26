"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Shield,
  Users,
  FolderKanban,
  Headphones,
  HardDrive,
  Settings,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

/* ------------------------------------------------------------------ */
/*  Module cards config                                                */
/* ------------------------------------------------------------------ */

interface ModuleCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  permission?: string;
}

const modules: ModuleCard[] = [
  {
    title: "Governance",
    description: "Policies, RACI matrices, meeting governance, and OKRs",
    icon: Shield,
    href: "/dashboard/governance",
    color: "#1B7340",
    bgColor: "rgba(27, 115, 64, 0.1)",
    permission: "governance.view",
  },
  {
    title: "People",
    description: "Staff directory, skills matrix, onboarding, and roster",
    icon: Users,
    href: "/dashboard/people",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    permission: "people.view",
  },
  {
    title: "Planning",
    description: "Portfolios, projects, tasks, risks, and dependencies",
    icon: FolderKanban,
    href: "/dashboard/planning",
    color: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    permission: "planning.view",
  },
  {
    title: "ITSM",
    description: "Service catalog, incidents, requests, and problem management",
    icon: Headphones,
    href: "/dashboard/itsm",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.1)",
    permission: "itsm.view",
  },
  {
    title: "Assets",
    description: "Inventory, CMDB, license tracking, and procurement",
    icon: HardDrive,
    href: "/dashboard/assets",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    permission: "assets.view",
  },
  {
    title: "Knowledge Base",
    description: "Documentation, SOPs, runbooks, and shared knowledge",
    icon: LayoutDashboard,
    href: "/dashboard/knowledge",
    color: "#06B6D4",
    bgColor: "rgba(6, 182, 212, 0.1)",
    permission: "knowledge.view",
  },
  {
    title: "System",
    description: "Audit logs, system settings, roles, and permissions",
    icon: Settings,
    href: "/dashboard/system",
    color: "#64748B",
    bgColor: "rgba(100, 116, 139, 0.1)",
    permission: "system.view",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  // Filter modules based on user permissions (show all if no permissions set yet)
  const visibleModules = useMemo(() => {
    if (userPermissions.length === 0) return modules;
    return modules.filter(
      (m) => !m.permission || userPermissions.includes(m.permission),
    );
  }, [userPermissions]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {greeting}, {user?.displayName || "User"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Welcome to the IT Operations & Project Management System. Select a
          module to get started.
        </p>
      </motion.div>

      {/* Quick stats placeholder */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {[
          { label: "Open Incidents", value: "--", color: "#EF4444" },
          { label: "Active Projects", value: "--", color: "#8B5CF6" },
          { label: "Pending Requests", value: "--", color: "#F59E0B" },
          { label: "Assets Tracked", value: "--", color: "#1B7340" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {stat.label}
            </p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleModules.map((mod, index) => {
          const Icon = mod.icon;
          return (
            <motion.a
              key={mod.title}
              href={mod.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.05 }}
              className="group card-interactive bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-6 shadow-sm block"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: mod.bgColor }}
              >
                <Icon
                  size={24}
                  style={{ color: mod.color }}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                {mod.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                {mod.description}
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span>Open module</span>
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
