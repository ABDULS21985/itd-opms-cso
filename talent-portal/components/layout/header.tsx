"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Search,
  Briefcase,
  Users,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

const navLinks = [
  { href: "/talents", label: "Talents", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
];

function DigibitLogo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="18" fill="var(--primary)" />
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fill="white"
        fontSize="16"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        D
      </text>
    </svg>
  );
}

export function Header() {
  const { user, isLoggedIn, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <DigibitLogo />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold leading-tight tracking-tight text-[var(--foreground)]">
              Digibit
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-gray)]">
              Talent Portal
            </span>
          </div>
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[var(--primary)]" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Search button */}
          <button
            type="button"
            className="hidden rounded-lg p-2 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] sm:flex"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {isLoggedIn ? (
            /* User dropdown */
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                  {user?.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : user?.email?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-[var(--foreground)] lg:block">
                  {user?.displayName ?? user?.email ?? "User"}
                </span>
                <ChevronDown
                  className={`hidden h-4 w-4 text-[var(--neutral-gray)] transition-transform duration-200 lg:block ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {user?.displayName ?? "User"}
                    </p>
                    <p className="truncate text-xs text-[var(--neutral-gray)]">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 text-[var(--neutral-gray)]" />
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--error)] transition-colors hover:bg-[var(--error-light)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Auth buttons */
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/auth/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register/candidate"
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-0)] md:hidden">
          <nav className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {!isLoggedIn && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register/candidate"
                  className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[var(--secondary)]"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
