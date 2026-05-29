"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Shield,
  Building2,
  Landmark,
  ClipboardList,
  Network,
  Boxes,
  Users,
  BookOpen,
  KeyRound,
  Rocket,
  BarChart3,
  Bell,
  ScrollText,
  GitBranch,
  Cpu,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Activity,
  LineChart,
  Lock,
  Layers,
  Globe2,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

const pillars = [
  {
    icon: Shield,
    eyebrow: "Governance",
    title: "Policy, approvals, and audit trails as one operating layer",
    description:
      "Standards, review cycles, and decision evidence flow through the same system — no fragmented spreadsheets, no missing trails.",
    href: "/dashboard/governance",
  },
  {
    icon: Building2,
    eyebrow: "Service Delivery",
    title: "Incidents, requests, and operational queues with one source of truth",
    description:
      "Run ITSM execution with cleaner handoffs, sharper ownership, and visibility from intake through resolution.",
    href: "/dashboard/itsm",
  },
  {
    icon: Network,
    eyebrow: "Assets & Configuration",
    title: "Track every system, license, and dependency with board-ready clarity",
    description:
      "CMDB, asset lifecycles, license compliance, and warranties in a single graph the whole department can read.",
    href: "/dashboard/cmdb",
  },
  {
    icon: ClipboardList,
    eyebrow: "Strategic Planning",
    title: "Connect portfolio, projects, budgets, and delivery commitments",
    description:
      "PMO, roadmap, capacity, and budget signals share one rhythm so leadership can plan against reality, not last quarter.",
    href: "/dashboard/planning",
  },
] as const;

const modules = [
  {
    icon: Shield,
    name: "Governance",
    description: "Policies, approvals, audit trails, decision evidence.",
  },
  {
    icon: Building2,
    name: "Service Management",
    description: "Incidents, problems, change, requests, lifecycles.",
  },
  {
    icon: Network,
    name: "CMDB & Assets",
    description: "Configuration items, relationships, hardware, licenses.",
  },
  {
    icon: ClipboardList,
    name: "Planning & PMO",
    description: "Portfolio, projects, capacity, budgets, snapshots.",
  },
  {
    icon: Boxes,
    name: "Vendor Management",
    description: "Vendors, contracts, scorecards, renewal alerts.",
  },
  {
    icon: ScrollText,
    name: "GRC",
    description: "Risk, compliance, controls, and regulatory mapping.",
  },
  {
    icon: BookOpen,
    name: "Knowledge",
    description: "Articles, runbooks, and institutional memory.",
  },
  {
    icon: KeyRound,
    name: "Vault",
    description: "Credential and secret custody for IT operations.",
  },
  {
    icon: Rocket,
    name: "Releases",
    description: "Release calendars, go-live runs, deployment evidence.",
  },
  {
    icon: BarChart3,
    name: "Analytics & Reports",
    description: "Cross-module reporting and operational dashboards.",
  },
  {
    icon: Users,
    name: "People & Roles",
    description: "Directory, role-aware workflows, accountability.",
  },
  {
    icon: Bell,
    name: "Notifications",
    description: "Event-driven alerts across tickets and workflows.",
  },
] as const;

const signals = [
  {
    value: "12+",
    label: "Integrated modules",
    description:
      "Governance, ITSM, CMDB, planning, vendor, GRC, knowledge, and more — one portal.",
  },
  {
    value: "1",
    label: "Source of truth",
    description:
      "A single operating layer for the IT department, with shared identity and audit.",
  },
  {
    value: "24/7",
    label: "Operational posture",
    description:
      "Always-on visibility for service health, delivery, and risk signals.",
  },
  {
    value: "4",
    label: "Core disciplines",
    description:
      "Governance, service delivery, asset intelligence, and strategic planning — connected.",
  },
] as const;

const trustItems = [
  { icon: Lock, label: "MFA + role-aware access" },
  { icon: ScrollText, label: "Immutable audit trail" },
  { icon: Layers, label: "Multi-tenant by design" },
  { icon: Activity, label: "Real-time event stream" },
] as const;

export default function LandingPage() {
  const { isLoggedIn, isLoading } = useAuth();

  const primaryHref = isLoggedIn ? "/dashboard" : "/auth/login";
  const primaryLabel = isLoggedIn ? "Continue to dashboard" : "Sign in to portal";
  const PrimaryIcon = isLoggedIn ? ArrowRight : LogIn;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--surface-1)]">
      {/* ============== HERO ============== */}
      <section className="login-showcase-panel relative overflow-hidden">
        {/* CBN headquarters backdrop */}
        <Image
          src="/cbn-building.jpg"
          alt="Central Bank of Nigeria headquarters"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover object-center"
        />
        {/* Backdrop overlay — mostly neutral dark with a faint green tint; darker
            on the left so the white headline stays legible, lighter on the right
            so the building shows through with its natural colours */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, rgba(7,17,12,0.86) 0%, rgba(11,26,19,0.58) 45%, rgba(16,34,26,0.30) 100%)",
          }}
        />
        <div className="login-showcase-grid absolute inset-0" />
        <div className="login-showcase-orbit absolute inset-0" />

        {/* Floating accents */}
        <div
          className="login-float absolute left-[8%] top-[18%] h-3 w-3 rounded-full"
          style={{ backgroundColor: "rgba(168,137,61,0.65)" }}
        />
        <div className="absolute right-[12%] top-[24%] h-2 w-2 rounded-full bg-white/35 login-float-slow" />
        <div
          className="login-float-reverse absolute bottom-[18%] left-[18%] h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "rgba(168,137,61,0.5)" }}
        />
        <div
          className="absolute right-[10%] bottom-[10%] h-[26rem] w-[26rem] rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(168,137,61,0.12)" }}
        />
        <div
          className="absolute left-[-6rem] top-[30%] h-[20rem] w-[20rem] rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(45,155,86,0.18)" }}
        />

        <div className="relative z-10 mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col px-6 py-8 lg:px-12 lg:py-12">
          {/* Top nav */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between gap-6"
          >
            <div className="inline-flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-3 rounded-2xl bg-white/10 blur-xl" />
                <Image
                  src="/logo.jpeg"
                  alt="CBN Logo"
                  width={56}
                  height={56}
                  className="relative z-10 rounded-2xl border border-white/20 shadow-2xl"
                />
              </div>
              <div className="leading-tight">
                <span className="block text-base font-bold text-white sm:text-lg">
                  Central Bank of Nigeria
                </span>
                <span className="block text-xs text-white/70 sm:text-sm">
                  IT Department — OPMS
                </span>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <a
                href="#capabilities"
                className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition hover:text-white"
              >
                Capabilities
              </a>
              <a
                href="#modules"
                className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition hover:text-white"
              >
                Modules
              </a>
              <Link
                href={primaryHref}
                className="ml-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-white/30 hover:bg-white/15"
              >
                <PrimaryIcon className="h-4 w-4" />
                {isLoading ? "Loading…" : isLoggedIn ? "Dashboard" : "Sign in"}
              </Link>
            </div>

            <Link
              href={primaryHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white sm:hidden"
            >
              <PrimaryIcon className="h-3.5 w-3.5" />
              {isLoggedIn ? "Dashboard" : "Sign in"}
            </Link>
          </motion.div>

          {/* Hero content */}
          <div className="flex flex-1 items-center py-12 lg:py-20">
            <div className="grid w-full gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <motion.div
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="max-w-2xl"
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-xl">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--gold-light)]" />
                  <span className="sidebar-gold-text">
                    The Operating System for IT
                  </span>
                </div>

                <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.5rem]">
                  Operational clarity for{" "}
                  <span className="sidebar-gold-text sidebar-gold-active">
                    every workflow
                  </span>{" "}
                  that matters.
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-8 text-white/80">
                  ITD-OPMS is the unified surface for governance, service
                  delivery, project execution, and asset intelligence across
                  the IT department — built for the rhythm of the Central Bank
                  of Nigeria.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href={primaryHref}
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[var(--secondary)] shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(168,137,61,0.35)]"
                  >
                    <PrimaryIcon className="h-4 w-4" />
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#capabilities"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-white/40 hover:bg-white/10"
                  >
                    Explore capabilities
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  {trustItems.map((item) => (
                    <div
                      key={item.label}
                      className="inline-flex items-center gap-2 text-sm text-white/72"
                    >
                      <item.icon className="h-4 w-4 text-[var(--gold-light)]" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Hero side — operating picture panel */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="login-insight-panel hidden lg:block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                      Operating Picture
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      One pulse for the department
                    </h3>
                  </div>
                  <div className="login-pulse-node" />
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    {
                      icon: Activity,
                      label: "Service health",
                      value: "Operational",
                      tone: "rgba(74,222,128,0.85)",
                    },
                    {
                      icon: LineChart,
                      label: "Delivery velocity",
                      value: "On track",
                      tone: "rgba(168,137,61,0.85)",
                    },
                    {
                      icon: GitBranch,
                      label: "Change pipeline",
                      value: "12 in flight",
                      tone: "rgba(96,165,250,0.85)",
                    },
                    {
                      icon: Cpu,
                      label: "Asset coverage",
                      value: "98.4% reconciled",
                      tone: "rgba(217,197,138,0.85)",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="login-signal-card flex items-center justify-between gap-4"
                    >
                      <div className="inline-flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                          }}
                        >
                          <row.icon className="h-4 w-4 text-white/85" />
                        </div>
                        <span className="text-sm text-white/82">
                          {row.label}
                        </span>
                      </div>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: row.tone }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Today
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    Cross-module signals roll up here once you sign in — live
                    incidents, change risk, license posture, and budget burn,
                    all in one rhythm.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Stat strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {signals.map((signal) => (
              <div key={signal.label} className="min-w-0">
                <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {signal.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-light)]">
                  {signal.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {signal.description}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============== PILLARS ============== */}
      <section
        id="capabilities"
        className="relative bg-[var(--surface-1)] py-20 lg:py-28"
      >
        <div className="login-auth-grid absolute inset-0 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <div className="login-form-pill mb-5">
              <Globe2 className="h-3.5 w-3.5" />
              Four disciplines, one operating layer
            </div>
            <h2
              className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Built for the way IT actually runs.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">
              ITD-OPMS replaces the spreadsheets, side-channels, and disconnected
              tools that fragment IT delivery. Each discipline shares identity,
              data, and audit — so context follows the work, not the tool.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {pillars.map((pillar, idx) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="card-interactive group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-0)] p-7 lg:p-9"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.04), 0 12px 32px rgba(15,23,42,0.06)",
                }}
              >
                <div
                  className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(27,115,64,0.18), transparent 70%)",
                  }}
                />
                <div className="relative">
                  <div
                    className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: "rgba(27,115,64,0.2)",
                      background:
                        "linear-gradient(135deg, rgba(27,115,64,0.1), rgba(139,111,46,0.08))",
                    }}
                  >
                    <pillar.icon className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
                    {pillar.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold leading-[1.2] tracking-tight text-[var(--text-primary)]">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-[var(--text-muted)]">
                    {pillar.description}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] transition-transform group-hover:translate-x-1">
                    Learn more
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== MODULES GRID ============== */}
      <section
        id="modules"
        className="relative bg-[var(--surface-2)] py-20 lg:py-28"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end"
          >
            <div className="max-w-2xl">
              <div className="login-form-pill mb-5">
                <Layers className="h-3.5 w-3.5" />
                Everything in one portal
              </div>
              <h2
                className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                A complete module suite, ready to run.
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-[var(--text-muted)]">
              From governance ledgers to credential vaults, every operating
              concern of the IT department lives in a single, coherent
              workspace.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((mod, idx) => (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className="card-interactive group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
              >
                <div
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105"
                  style={{
                    borderColor: "rgba(27,115,64,0.18)",
                    background:
                      "linear-gradient(135deg, rgba(27,115,64,0.08), rgba(139,111,46,0.06))",
                  }}
                >
                  <mod.icon className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                  {mod.name}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">
                  {mod.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== OPERATING RHYTHM ============== */}
      <section className="relative bg-[var(--surface-1)] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
            >
              <div className="login-form-pill mb-5">
                <Activity className="h-3.5 w-3.5" />
                The operating rhythm
              </div>
              <h2
                className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                Connected workflows.{" "}
                <span className="sidebar-gold-text sidebar-gold-active">
                  Audited evidence.
                </span>{" "}
                Real-time signal.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">
                Every action — an approval, a deployment, a license assignment,
                a budget commitment — is captured on a single timeline. The
                department finally moves at the speed of its decisions.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  "Role-aware workflows that route work to the right hands automatically.",
                  "Cross-module relationships so an asset, a ticket, and a project share context.",
                  "Event-driven notifications that surface what needs attention — not what doesn't.",
                  "Audit trails on every state change for governance and compliance review.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--primary)]" />
                    <span className="text-base leading-7 text-[var(--text-secondary)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Mock dashboard panel */}
              <div
                className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-0)]"
                style={{
                  boxShadow:
                    "0 30px 80px -20px rgba(15,23,42,0.18), 0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-1)] px-5 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--surface-4)]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--surface-4)]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--surface-4)]" />
                  </div>
                  <div className="ml-3 flex items-center gap-2 rounded-md bg-[var(--surface-0)] px-3 py-1 text-xs text-[var(--text-muted)]">
                    <Lock className="h-3 w-3" />
                    opms.cbn.gov.ng/dashboard
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                        Operations
                      </p>
                      <h4 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                        Today's operating picture
                      </h4>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--success-light)] px-3 py-1 text-xs font-semibold text-[var(--success-dark)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] bento-dot-pulse" />
                      Live
                    </div>
                  </div>

                  {/* Mini metric tiles */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Open incidents",
                        value: "14",
                        delta: "-3 vs yest",
                        positive: true,
                      },
                      {
                        label: "Changes in CAB",
                        value: "7",
                        delta: "+2 this wk",
                        positive: false,
                      },
                      {
                        label: "Asset coverage",
                        value: "98.4%",
                        delta: "Reconciled",
                        positive: true,
                      },
                      {
                        label: "Budget burn",
                        value: "62%",
                        delta: "On track",
                        positive: true,
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
                      >
                        <p className="text-xs text-[var(--text-muted)]">
                          {m.label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                          {m.value}
                        </p>
                        <p
                          className={`mt-1 text-[11px] font-semibold ${
                            m.positive
                              ? "text-[var(--success-dark)]"
                              : "text-[var(--warning-dark)]"
                          }`}
                        >
                          {m.delta}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Activity rows */}
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      Activity
                    </p>
                    {[
                      {
                        dot: "var(--info)",
                        text: "Change CHG-204 approved by CAB",
                        time: "2m",
                      },
                      {
                        dot: "var(--gold)",
                        text: "License renewal due in 14 days · Microsoft 365 E5",
                        time: "12m",
                      },
                      {
                        dot: "var(--success)",
                        text: "Incident INC-1187 resolved · payment gateway restored",
                        time: "28m",
                      },
                    ].map((row) => (
                      <div
                        key={row.text}
                        className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5"
                      >
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: row.dot }}
                        />
                        <span className="flex-1 text-sm text-[var(--text-secondary)]">
                          {row.text}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {row.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating accent badge */}
              <div
                className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-xl sm:block"
                style={{
                  boxShadow: "0 18px 40px -12px rgba(27,115,64,0.25)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(27,115,64,0.12), rgba(139,111,46,0.12))",
                    }}
                  >
                    <Shield className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Audit trail
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      100% captured
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============== CTA BANNER ============== */}
      <section className="relative overflow-hidden">
        <div className="login-showcase-panel relative">
          <div className="login-showcase-grid absolute inset-0" />
          <div
            className="absolute right-[-6rem] top-[-6rem] h-[26rem] w-[26rem] rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(168,137,61,0.18)" }}
          />
          <div
            className="absolute left-[-4rem] bottom-[-4rem] h-[20rem] w-[20rem] rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(45,155,86,0.22)" }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center lg:py-28"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur-xl">
              <Landmark className="h-3.5 w-3.5 text-[var(--gold-light)]" />
              <span>For the IT department of the Central Bank of Nigeria</span>
            </div>
            <h2
              className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ letterSpacing: "-0.035em" }}
            >
              Step into the{" "}
              <span className="sidebar-gold-text sidebar-gold-active">
                control room
              </span>{" "}
              for IT operations.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Sign in with your CBN credentials to begin. Single sign-on
              available via Microsoft Entra ID.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={primaryHref}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-[var(--secondary)] shadow-[0_18px_40px_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(168,137,61,0.4)]"
              >
                <PrimaryIcon className="h-5 w-5" />
                {primaryLabel}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="mailto:itd-support@cbn.gov.ng?subject=ITD-OPMS%20Access%20Request"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur-xl transition hover:border-white/40 hover:bg-white/10"
              >
                Request access
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface-0)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 lg:flex-row lg:items-center lg:px-12">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="CBN Logo"
              width={40}
              height={40}
              className="rounded-xl border border-[var(--border)]"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Central Bank of Nigeria · ITD-OPMS
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Operations and Project Management System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--text-muted)]">
            <a href="#capabilities" className="hover:text-[var(--text-primary)]">
              Capabilities
            </a>
            <a href="#modules" className="hover:text-[var(--text-primary)]">
              Modules
            </a>
            <Link
              href="/auth/login"
              className="hover:text-[var(--text-primary)]"
            >
              Sign in
            </Link>
            <span className="text-[var(--text-muted)]">
              © {new Date().getFullYear()} Central Bank of Nigeria
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
