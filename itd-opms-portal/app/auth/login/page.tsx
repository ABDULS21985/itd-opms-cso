"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  Building2,
  Landmark,
  LogIn,
  AlertTriangle,
  Clock,
  Info,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";

const showcaseHighlights = [
  {
    icon: Shield,
    eyebrow: "Governance",
    title: "Policy, approval, and audit discipline in one operating layer",
    description: "Align standards, review cycles, and decision trails without fragmenting the work.",
  },
  {
    icon: Building2,
    eyebrow: "Service Delivery",
    title: "Incidents, requests, and operational queues share one source of truth",
    description: "Run ITSM execution with clearer handoffs, visibility, and ownership.",
  },
  {
    icon: Landmark,
    eyebrow: "Assets & Portfolio",
    title: "Track systems, investments, and delivery commitments with board-ready clarity",
    description: "Bring PMO, CMDB, licensing, and procurement signals into one rhythm.",
  },
] as const;

const operationalSignals = [
  {
    value: "24/7",
    label: "Operational posture",
    description: "A single command surface for service, governance, and delivery.",
  },
  {
    value: "4",
    label: "Core disciplines",
    description: "Governance, ITSM, projects, and asset intelligence connected.",
  },
  {
    value: "1",
    label: "Unified portal",
    description: "Less context switching, faster decisions, cleaner accountability.",
  },
] as const;

const trustPillars = [
  "Secure sign-in controls",
  "Role-aware workflows",
  "Audit-ready activity trails",
] as const;

/**
 * Microsoft logo SVG component for the "Sign in with Microsoft" button.
 */
function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

/**
 * Maps API error messages to user-friendly guidance.
 */
function getFriendlyError(message: string): { title: string; description: string; icon: typeof Shield } {
  const lower = message.toLowerCase();
  if (lower.includes("invalid email or password") || lower.includes("invalid credentials")) {
    return {
      title: "Incorrect email or password",
      description: "Please double-check your credentials and try again. If you've forgotten your password, use the \"Forgot password?\" link below.",
      icon: Lock,
    };
  }
  if (lower.includes("account") && lower.includes("disabled")) {
    return {
      title: "Account disabled",
      description: "Your account has been deactivated. Please contact your IT administrator for assistance.",
      icon: AlertTriangle,
    };
  }
  if (lower.includes("too many") || lower.includes("rate limit")) {
    return {
      title: "Too many attempts",
      description: "You've made too many login attempts. Please wait a few minutes before trying again.",
      icon: Clock,
    };
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
    return {
      title: "Connection error",
      description: "Unable to reach the server. Please check your network connection and try again.",
      icon: AlertTriangle,
    };
  }
  return {
    title: "Sign in failed",
    description: message || "An unexpected error occurred. Please try again or contact IT support.",
    icon: Shield,
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithEntraID, isEntraIDEnabled, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoBanner, setInfoBanner] = useState<{ message: string; icon: typeof Clock } | null>(null);

  // Detect redirect reasons (e.g., session timeout, password reset success)
  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "timeout") {
      setInfoBanner({
        message: "Your session has expired due to inactivity. Please sign in again to continue.",
        icon: Clock,
      });
      toast.info("Session expired", {
        description: "You were signed out due to 30 minutes of inactivity.",
        duration: 6000,
      });
    } else if (reason === "password-reset") {
      toast.success("Password reset successful", {
        description: "Your password has been updated. Please sign in with your new password.",
        duration: 6000,
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoBanner(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result?.passwordChangeRequired) {
        toast.warning("Password change required", {
          description: "You must change your default password before continuing.",
        });
        router.push("/auth/change-password");
        return;
      }
      toast.success("Welcome back!", {
        description: "You have been signed in successfully.",
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.";
      const friendly = getFriendlyError(message);
      setError(message);
      toast.error(friendly.title, { description: friendly.description, duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntraIDLogin = async () => {
    setError("");
    setInfoBanner(null);
    setIsSSOLoading(true);

    try {
      await loginWithEntraID();
      // The function will redirect — this code only runs if something fails
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to initiate Microsoft sign-in. Please try again.";
      setError(message);
      toast.error("SSO Error", { description: message });
      setIsSSOLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--surface-1)]">
      <div className="absolute inset-0 login-page-aura pointer-events-none" />

      <div className="relative flex min-h-screen flex-col lg:h-screen lg:flex-row">
        <div className="login-scroll-pane login-showcase-panel relative hidden overflow-hidden lg:flex lg:w-[58%] lg:min-h-0 lg:overflow-y-auto">
          <div className="login-showcase-grid absolute inset-0" />
          <div className="login-showcase-orbit absolute inset-0" />
          <div className="absolute left-[10%] top-[16%] h-3 w-3 rounded-full bg-[#D9C58A]/65 login-float" />
          <div className="absolute right-[16%] top-[22%] h-2 w-2 rounded-full bg-white/35 login-float-slow" />
          <div className="absolute bottom-[22%] left-[22%] h-2.5 w-2.5 rounded-full bg-[#D9C58A]/45 login-float-reverse" />
          <div className="absolute right-[18%] bottom-[18%] h-[22rem] w-[22rem] rounded-full bg-[#D9C58A]/10 blur-3xl" />

          <div className="login-showcase-content relative z-10 flex w-full flex-col justify-between px-8 py-8 xl:px-12 xl:py-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-start justify-between gap-6"
            >
              <div className="inline-flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[1.75rem] bg-white/10 blur-xl" />
                  <Image
                    src="/logo.jpeg"
                    alt="CBN Logo"
                    width={76}
                    height={76}
                    className="relative z-10 rounded-[1.4rem] border border-white/20 shadow-2xl"
                  />
                </div>
                <div className="max-w-xs">
                  <span className="block text-[1.75rem] font-bold leading-tight text-white">
                    Central Bank of Nigeria
                  </span>
                  <span className="mt-1 block text-sm text-emerald-100/72">
                    IT Department — OPMS
                  </span>
                </div>
              </div>

              <div className="login-glass hidden rounded-full px-4 py-2 text-xs font-medium tracking-[0.18em] text-emerald-100/85 xl:inline-flex">
                CONTROL ROOM
              </div>
            </motion.div>

            <div className="login-showcase-stack grid gap-7 xl:gap-9">
              <motion.div
                initial={{ opacity: 0, x: -36 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="max-w-2xl"
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-emerald-100/88 backdrop-blur-xl">
                  <Sparkles className="h-4 w-4 text-[#D9C58A]" />
                  <span>National IT operations in a single visual rhythm</span>
                </div>
                <h1 className="login-showcase-title max-w-2xl text-5xl font-bold leading-[0.95] tracking-[-0.05em] text-white xl:text-[5.35rem]">
                  Operational clarity for every workflow that matters.
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-100/78">
                  A sharper surface for governance, service delivery, project execution, and asset intelligence across the IT department.
                </p>
              </motion.div>

              <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="grid gap-4">
                  {showcaseHighlights.map((highlight, index) => (
                    <motion.div
                      key={highlight.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.28 + index * 0.12 }}
                      className="login-highlight-card group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="login-highlight-icon">
                          <highlight.icon className="h-5 w-5 text-[#D9C58A]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/55">
                            {highlight.eyebrow}
                          </p>
                          <h2 className="mt-2 text-lg font-semibold leading-6 text-white">
                            {highlight.title}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-emerald-100/68">
                            {highlight.description}
                          </p>
                        </div>
                        <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-white/28 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#D9C58A]" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.45 }}
                  className="login-insight-panel"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/55">
                        Operating Picture
                      </p>
                      <h2 className="mt-3 text-[1.65rem] font-bold leading-8 text-white">
                        One portal. Multiple disciplines. Fewer blind spots.
                      </h2>
                    </div>
                    <div className="login-pulse-node mt-1" />
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {operationalSignals.map((signal, index) => (
                      <div
                        key={signal.label}
                        className={`login-signal-card ${index === 2 ? "sm:col-span-3 xl:col-span-1" : ""}`}
                      >
                        <span className="text-3xl font-bold tracking-[-0.05em] text-white">
                          {signal.value}
                        </span>
                        <p className="mt-2 text-sm font-semibold text-[#E5D4A3]">
                          {signal.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-emerald-100/62">
                          {signal.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-[1.65rem] border border-white/10 bg-black/12 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-2.5">
                        <Info className="h-4 w-4 text-[#D9C58A]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Designed for secure daily use
                        </p>
                        <p className="mt-1 text-sm leading-6 text-emerald-100/62">
                          A calmer entry point for high-accountability work, whether access flows through credentials or Microsoft Entra ID.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.95 }}
              className="flex flex-wrap items-center gap-3"
            >
              {trustPillars.map((pillar) => (
                <div
                  key={pillar}
                  className="login-glass rounded-full px-4 py-2 text-xs font-medium tracking-[0.12em] text-emerald-100/82"
                >
                  {pillar}
                </div>
              ))}
              <p className="ml-auto text-sm text-emerald-100/58">
                &copy; {new Date().getFullYear()} Central Bank of Nigeria. All rights reserved.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="login-scroll-pane login-auth-surface relative flex flex-1 items-start justify-center overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:min-h-0 lg:px-8 lg:py-5 lg:overflow-y-auto xl:items-center xl:px-10 xl:py-8">
          <div className="login-auth-grid absolute inset-0" />
          <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-[#D9C58A]/18 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#1B7340]/10 blur-3xl" />

          <motion.div
            className="login-auth-shell relative z-10 w-full max-w-[38rem]"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mb-4 lg:hidden"
            >
              <div className="login-mobile-hero">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.jpeg"
                    alt="CBN Logo"
                    width={58}
                    height={58}
                    className="rounded-[1.2rem] shadow-lg"
                  />
                  <div>
                    <p className="text-lg font-bold leading-tight text-[var(--foreground)]">
                      CBN IT Department
                    </p>
                    <p className="mt-1 text-sm text-[var(--neutral-gray)]">
                      Operations & Project Management
                    </p>
                  </div>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--neutral-gray)]">
                  Sign in to a sharper operations cockpit for governance, ITSM, delivery, and asset intelligence.
                </p>
              </div>
            </motion.div>

            <div className="login-form-frame rounded-[2rem] p-[1px] shadow-[0_32px_80px_rgba(7,35,22,0.17)]">
              <div className="login-glass-card rounded-[1.95rem] border border-white/70 px-4 py-4 sm:px-5 sm:py-5">
                <div className="login-card-mesh rounded-[1.6rem] border border-[var(--border)]/70 bg-white/82 p-5 shadow-[0_20px_40px_rgba(10,37,23,0.06)] backdrop-blur-2xl sm:p-6 xl:p-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 }}
                    className="login-form-header mb-6"
                  >
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      <div className="login-form-pill">
                        <span className="inline-flex h-2 w-2 rounded-full bg-[#1B7340]" />
                        Secure Access Layer
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--neutral-gray)]/60">
                          CBN secure portal
                        </p>
                        <p className="mt-1 text-sm font-medium text-[var(--foreground)]/78">
                          IT Department Operations Portal
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle,_rgba(27,115,64,0.14),_transparent_70%)]" />
                        <Image
                          src="/logo.jpeg"
                          alt="CBN Logo"
                          width={104}
                          height={104}
                          className="relative z-10 rounded-[1.75rem] border border-white/80 shadow-xl"
                        />
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <h1 className="text-3xl font-bold tracking-[-0.045em] text-[var(--foreground)] sm:text-[2.15rem]">
                        Sign in to OPMS
                      </h1>
                      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--neutral-gray)]">
                        {isEntraIDEnabled
                          ? "Sign in with your organizational account"
                          : "Enter your credentials to access the portal"}
                      </p>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {infoBanner && !error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="login-info-banner" aria-live="polite">
                          <div className="login-info-banner__icon">
                            <infoBanner.icon className="h-4 w-4 text-blue-700" />
                          </div>
                          <p className="text-sm font-medium leading-6 text-blue-800">
                            {infoBanner.message}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="login-error-banner" aria-live="assertive">
                          <div className="login-error-banner__icon">
                            <AlertTriangle className="h-4 w-4 text-[var(--error)]" />
                          </div>
                          <p className="text-sm font-medium leading-6 text-[var(--error-dark)]">
                            {error}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isEntraIDEnabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="mb-6"
                    >
                      <button
                        type="button"
                        onClick={handleEntraIDLogin}
                        disabled={isSSOLoading || authLoading}
                        className="login-sso-button"
                      >
                        {isSSOLoading ? (
                          <div className="h-5 w-5 rounded-full border-2 border-[var(--neutral-gray)]/30 border-t-[var(--foreground)] animate-spin" />
                        ) : (
                          <>
                            <MicrosoftLogo />
                            Sign in with Microsoft
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {isEntraIDEnabled && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      className="relative mb-6"
                    >
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--border)]/80" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="rounded-full border border-[var(--border)]/70 bg-white px-3 py-1 text-[var(--neutral-gray)] shadow-sm">
                          or sign in with credentials
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: isEntraIDEnabled ? 0.35 : 0.25 }}
                    >
                      <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
                        Email address
                      </label>
                      <div className="login-input-glow login-input-shell">
                        <Mail
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] transition-colors duration-300"
                        />
                        <input
                          type="email"
                          required
                          autoComplete="username"
                          spellCheck={false}
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError("");
                          }}
                          placeholder="you@cbn.gov.ng"
                          className="login-input-field w-full pl-11 pr-4"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: isEntraIDEnabled ? 0.45 : 0.35 }}
                    >
                      <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
                        Password
                      </label>
                      <div className="login-input-glow login-input-shell">
                        <Lock
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] transition-colors duration-300"
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError("");
                          }}
                          placeholder="Enter your password"
                          className="login-input-field w-full pl-11 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-[var(--neutral-gray)] transition-all duration-200 hover:bg-black/5 hover:text-[var(--foreground)]"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: isEntraIDEnabled ? 0.5 : 0.4 }}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/80 bg-white/80 px-3 py-1.5 text-xs text-[var(--neutral-gray)] shadow-sm">
                        <Lock className="h-3.5 w-3.5 text-[var(--primary)]" />
                        Encrypted authentication session
                      </div>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs font-medium text-[var(--primary)] transition-all duration-200 hover:text-[var(--secondary)] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: isEntraIDEnabled ? 0.55 : 0.45 }}
                      className="pt-1"
                    >
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="login-btn-shine login-submit-button"
                      >
                        {isLoading ? (
                          <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <>
                            <LogIn size={16} />
                            Sign In with Credentials
                          </>
                        )}
                      </button>
                    </motion.div>
                  </form>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.62 }}
                    className="login-assurance-grid mt-5 grid gap-3 sm:grid-cols-3"
                  >
                    <div className="login-assurance-card">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--neutral-gray)]/60">
                        Security
                      </span>
                      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                        Controlled access
                      </p>
                    </div>
                    <div className="login-assurance-card">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--neutral-gray)]/60">
                        Experience
                      </span>
                      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                        Cleaner daily entry
                      </p>
                    </div>
                    <div className="login-assurance-card">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--neutral-gray)]/60">
                        Continuity
                      </span>
                      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                        Built for repeat use
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            <motion.div
              className="login-bottom-meta mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/80 bg-white/85 px-4 py-2 text-xs text-[var(--neutral-gray)] shadow-sm backdrop-blur-xl">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>Secured with 256-bit encryption</span>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-[var(--neutral-gray)]">
                <Info className="h-3.5 w-3.5 text-[var(--primary)]" />
                Need help? Contact your IT administrator.
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
