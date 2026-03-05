"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ArrowLeft, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CategoriesTab } from "./_components/categories-tab";
import { ItemsTab } from "./_components/items-tab";

type Tab = "categories" | "items" | "analytics";

const tabs: { key: Tab; label: string }[] = [
  { key: "categories", label: "Categories" },
  { key: "items", label: "Items" },
  { key: "analytics", label: "Analytics" },
];

export default function ServiceCatalogManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  return (
    <PermissionGate permission="itsm.manage">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="space-y-6"
      >
        {/* Back Link */}
        <Link
          href="/dashboard/itsm/service-catalog"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Service Catalog
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Service Catalog Management
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage categories, items, and configurations.
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-0)] p-1 border border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {activeTab === "categories" && <CategoriesTab />}
            {activeTab === "items" && <ItemsTab />}
            {activeTab === "analytics" && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-16">
                <BarChart3 className="h-10 w-10 text-[var(--text-secondary)]" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Analytics coming soon
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PermissionGate>
  );
}
