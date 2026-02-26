"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, ChevronRight, LogOut, User, Settings } from "lucide-react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

/* ------------------------------------------------------------------ */
/*  Page transition wrapper                                            */
/* ------------------------------------------------------------------ */

function PageTransition({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading, user, logout } = useAuth();

  // Sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  // Sidebar collapsed: hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("opms-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("opms-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Auto-collapse on tablet
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/auth/login");
    }
  }, [isLoading, isLoggedIn, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">
            Loading OPMS portal...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* Skip to content -- accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-xl focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <DashboardHeader
          onMenuClick={() => setMobileOpen(true)}
        />

        {/* Page content with transition */}
        <div id="main-content" className="p-4 lg:p-6">
          <PageTransition pathname={pathname}>{children}</PageTransition>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileNav />
    </div>
  );
}
