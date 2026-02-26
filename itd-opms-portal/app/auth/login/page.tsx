"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Building2,
  Landmark,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";

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

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithEntraID, isEntraIDEnabled, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success("Welcome back!", {
        description: "You have been signed in successfully.",
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.";
      setError(message);
      toast.error("Sign in failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntraIDLogin = async () => {
    setError("");
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
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* ===== Left Side -- CBN Branded Visual Panel ===== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background gradient with CBN green */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a2818] via-[#0E5A2D] to-[#1B7340]" />

        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-[#1B7340]/30 to-[#C4A962]/20 login-morph" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-[#C4A962]/15 to-[#1B7340]/15 blur-xl login-float-slow" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-[#0E5A2D]/20 to-[#C4A962]/10 blur-lg login-float" />

          {/* Floating particles */}
          <div className="absolute top-[15%] left-[20%] w-2 h-2 rounded-full bg-[#C4A962]/40 login-float" />
          <div className="absolute top-[25%] right-[30%] w-1.5 h-1.5 rounded-full bg-white/20 login-float-slow" />
          <div className="absolute bottom-[35%] left-[40%] w-2.5 h-2.5 rounded-full bg-[#C4A962]/30 login-float" />
          <div className="absolute top-[60%] left-[15%] w-1 h-1 rounded-full bg-white/30 login-float-slow" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col justify-between text-white w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-white/10 rounded-2xl blur-lg" />
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 relative z-10">
                  <Landmark className="w-6 h-6 text-[#C4A962]" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold block leading-tight">
                  Central Bank of Nigeria
                </span>
                <span className="text-xs text-green-200/70">
                  IT Department -- OPMS
                </span>
              </div>
            </div>
          </motion.div>

          {/* Hero text + Features */}
          <div className="space-y-10">
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full login-glass text-sm text-green-200">
                <Shield className="w-4 h-4 text-[#C4A962]" />
                <span>Operations & Project Management</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
                IT Operations
                <br />
                <span className="bg-gradient-to-r from-[#C4A962] via-[#D4B87A] to-[#C4A962] bg-clip-text text-transparent">
                  Management System
                </span>
              </h1>
              <p className="text-green-200/80 text-lg max-w-md leading-relaxed">
                Streamline governance, service management, project delivery, and
                asset tracking for the IT department.
              </p>
            </motion.div>

            {/* Feature cards */}
            <div className="space-y-3">
              {[
                {
                  icon: Shield,
                  title: "Governance & Compliance",
                  description:
                    "Policies, RACI matrices, OKRs, and audit trails",
                },
                {
                  icon: Building2,
                  title: "Service Management",
                  description:
                    "ITSM service catalog, incidents, and change management",
                },
                {
                  icon: Landmark,
                  title: "Asset & Resource Tracking",
                  description:
                    "CMDB, license management, and procurement workflows",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.15 }}
                  className="group flex items-start gap-4 p-4 rounded-xl login-glass hover:bg-white/15 transition-all duration-300 cursor-default"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C4A962]/30 to-[#1B7340]/30 flex items-center justify-center flex-shrink-0 group-hover:from-[#C4A962]/50 group-hover:to-[#1B7340]/50 transition-all duration-300">
                    <feature.icon className="w-5 h-5 text-[#C4A962]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/95">
                      {feature.title}
                    </h3>
                    <p className="text-green-200/70 text-sm mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex items-center gap-3 text-green-200/60 text-sm"
          >
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#C4A962]/40" />
            <p>
              &copy; {new Date().getFullYear()} Central Bank of Nigeria. All
              rights reserved.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ===== Right Side -- Login Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative overflow-hidden">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#1B7340]/10 to-[#C4A962]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-[#C4A962]/10 to-[#1B7340]/10 rounded-full blur-3xl" />

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center shadow-lg">
                <Landmark className="w-6 h-6 text-[#C4A962]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold text-[var(--foreground)] block leading-tight">
                  CBN IT Department
                </span>
                <span className="text-xs text-[var(--neutral-gray)]">
                  Operations & Project Management
                </span>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="login-glass-card rounded-3xl shadow-2xl shadow-black/5 p-8 sm:p-10 login-pulse-glow border border-[var(--border)]">
            {/* Header */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 bg-[#1B7340]/10">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1B7340] to-[#0E5A2D]">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
                Sign in to OPMS
              </h1>
              <p className="text-sm text-[var(--neutral-gray)] mt-2">
                {isEntraIDEnabled
                  ? "Sign in with your organizational account"
                  : "Enter your credentials to access the portal"}
              </p>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-[var(--error)]/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-[var(--error)]" />
                    </div>
                    <p className="text-sm text-[var(--error)] font-medium pt-1">
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Microsoft Entra ID SSO Button */}
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
                  className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed border border-[var(--border)] bg-[var(--surface-0)] text-[var(--foreground)] hover:bg-[var(--surface-1)] hover:border-[var(--primary)]/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isSSOLoading ? (
                    <div className="w-5 h-5 border-2 border-[var(--neutral-gray)]/30 border-t-[var(--foreground)] rounded-full animate-spin" />
                  ) : (
                    <>
                      <MicrosoftLogo />
                      Sign in with Microsoft
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Divider — shown when both auth modes are available */}
            {isEntraIDEnabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="relative mb-6"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[var(--surface-0)] px-3 text-[var(--neutral-gray)]">
                    or sign in with credentials
                  </span>
                </div>
              </motion.div>
            )}

            {/* Dev-mode email/password Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: isEntraIDEnabled ? 0.35 : 0.25 }}
              >
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                  Email address
                </label>
                <div className="relative login-input-glow rounded-xl transition-all duration-300">
                  <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] transition-colors duration-300"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@cbn.gov.ng"
                    className="w-full pl-11 pr-4 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: isEntraIDEnabled ? 0.45 : 0.35 }}
              >
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                  Password
                </label>
                <div className="relative login-input-glow rounded-xl transition-all duration-300">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] transition-colors duration-300"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-12 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-all duration-200 p-1 rounded-md hover:bg-black/5"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
                  className="login-btn-shine w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={16} />
                      Sign In with Credentials
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </div>

          {/* Security badge */}
          <motion.div
            className="mt-6 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface-0)]/80 shadow-sm border border-[var(--border)] text-xs text-[var(--neutral-gray)]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>Secured with 256-bit encryption</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
