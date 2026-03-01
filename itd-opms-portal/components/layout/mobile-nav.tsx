"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  FolderKanban,
  Headphones,
  MoreHorizontal,
  Users,
  HardDrive,
  Settings,
  Library,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MoreNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

const TABS: TabItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/governance", label: "Governance", icon: Shield },
  { href: "/dashboard/planning", label: "Planning", icon: FolderKanban },
  { href: "/dashboard/itsm", label: "ITSM", icon: Headphones },
];

const MORE_ITEMS: MoreNavItem[] = [
  {
    href: "/dashboard/people",
    label: "People",
    icon: Users,
    description: "Staff directory & skills",
  },
  {
    href: "/dashboard/assets",
    label: "Assets",
    icon: HardDrive,
    description: "Inventory & CMDB",
  },
  {
    href: "/dashboard/knowledge",
    label: "Knowledge",
    icon: Library,
    description: "Documentation & SOPs",
  },
  {
    href: "/dashboard/system/settings",
    label: "Settings",
    icon: Settings,
    description: "System configuration",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  const moreActive = MORE_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      {/* Bottom tab bar -- mobile only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--surface-1)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-14">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--neutral-gray)]"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <span className="text-[10px] font-semibold">
                    {tab.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              moreActive
                ? "text-[var(--primary)]"
                : "text-[var(--neutral-gray)]"
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={moreActive ? 2.5 : 2} />
            {moreActive && (
              <span className="text-[10px] font-semibold">More</span>
            )}
          </button>
        </div>
      </nav>

      {/* More bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-1)] rounded-t-2xl px-4 pb-[env(safe-area-inset-bottom)] lg:hidden"
            >
              <div className="flex items-center justify-between pt-4 pb-3">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  More
                </h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-4">
                {MORE_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${
                        active
                          ? "bg-[var(--primary)]/8 text-[var(--primary)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          active
                            ? "bg-[var(--primary)]/12"
                            : "bg-[var(--surface-2)]"
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer so page content doesn't get hidden behind bottom tab bar */}
      <div className="lg:hidden h-14 pb-[env(safe-area-inset-bottom)]" />
    </>
  );
}
