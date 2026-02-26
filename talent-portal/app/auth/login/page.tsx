"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Briefcase,
  User,
  Sparkles,
  TrendingUp,
  Users,
  Globe,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { setToken } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";

type LoginTab = "candidate" | "employer" | "admin";

const tabConfig = {
  candidate: {
    color: "var(--primary)",
    colorLight: "rgba(30, 77, 183, 0.1)",
    gradient: "from-[var(--primary)] to-[var(--secondary)]",
    icon: User,
    label: "Candidate",
  },
  employer: {
    color: "var(--warning)",
    colorLight: "rgba(245, 154, 35, 0.1)",
    gradient: "from-[var(--warning)] to-[var(--accent-orange)]",
    icon: Briefcase,
    label: "Employer",
  },
  admin: {
    color: "#0F172A",
    colorLight: "rgba(15, 23, 42, 0.1)",
    gradient: "from-[#0F172A] to-[#1E293B]",
    icon: Shield,
    label: "Admin",
  },
};

const features = [
  {
    icon: TrendingUp,
    title: "Career Growth",
    description: "Discover opportunities that match your ambitions",
  },
  {
    icon: Users,
    title: "Top Talent",
    description: "Connect with vetted professionals worldwide",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Access opportunities across multiple markets",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [tab, setTab] = useState<LoginTab>("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiClient.post<{ token: string }>("/auth/login", {
        email,
        password,
        userType: tab,
      });
      setToken(response.token);
      await refreshUser();
      if (tab === "admin") {
        router.push("/admin");
      } else if (tab === "employer") {
        router.push("/employer");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTab = tabConfig[tab];

  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* ===== Left Side — Immersive Visual Panel ===== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
            alt="Team collaboration"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/90 via-[#0f2347]/85 to-[#1a1145]/90" />
        </div>

        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 login-morph" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 blur-xl login-float-slow" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/10 blur-lg login-float-reverse" />

          {/* Floating particles */}
          <div className="absolute top-[15%] left-[20%] w-2 h-2 rounded-full bg-blue-400/40 login-float" />
          <div className="absolute top-[25%] right-[30%] w-1.5 h-1.5 rounded-full bg-purple-400/50 login-float-slow" />
          <div className="absolute bottom-[35%] left-[40%] w-2.5 h-2.5 rounded-full bg-cyan-400/30 login-float-reverse" />
          <div className="absolute top-[60%] left-[15%] w-1 h-1 rounded-full bg-indigo-300/50 login-float" />
          <div className="absolute top-[45%] right-[15%] w-2 h-2 rounded-full bg-blue-300/40 login-float-slow" />
          <div className="absolute bottom-[20%] right-[25%] w-1.5 h-1.5 rounded-full bg-purple-300/40 login-float" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col justify-between text-white w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-white/10 rounded-2xl blur-lg" />
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 relative z-10">
                  <span className="text-white font-bold text-xl">D</span>
                </div>
              </div>
              <div>
                <span className="text-xl font-bold block leading-tight">Digibit</span>
                <span className="text-xs text-blue-200/70">Talent Portal</span>
              </div>
            </Link>
          </motion.div>

          {/* Hero text + Features */}
          <div className="space-y-10">
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full login-glass text-sm text-blue-200">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Talent Portal</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
                Where Talent
                <br />
                <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  Meets Opportunity
                </span>
              </h1>
              <p className="text-blue-200/80 text-lg max-w-md leading-relaxed">
                Connect with top employers, discover roles tailored to your skills, and accelerate your career journey.
              </p>
            </motion.div>

            {/* Feature cards */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.15 }}
                  className="group flex items-start gap-4 p-4 rounded-xl login-glass hover:bg-white/15 transition-all duration-300 cursor-default"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400/30 to-indigo-400/30 flex items-center justify-center flex-shrink-0 group-hover:from-blue-400/50 group-hover:to-indigo-400/50 transition-all duration-300">
                    <feature.icon className="w-5 h-5 text-blue-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/95">{feature.title}</h3>
                    <p className="text-blue-200/70 text-sm mt-0.5">{feature.description}</p>
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
            className="flex items-center gap-3 text-blue-200/60 text-sm"
          >
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-blue-400/40" />
            <p>&copy; {new Date().getFullYear()} Global Digitalbit Limited. All rights reserved.</p>
          </motion.div>
        </div>
      </div>

      {/* ===== Right Side — Login Form ===== */}
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
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-purple-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-orange-100/30 to-yellow-100/20 rounded-full blur-3xl" />

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <div className="text-left">
                <span className="text-xl font-bold text-[var(--foreground)] block leading-tight">Digibit</span>
                <span className="text-xs text-[var(--neutral-gray)]">Talent Portal</span>
              </div>
            </Link>
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
              <motion.div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                style={{ background: currentTab.colorLight }}
                animate={{ background: currentTab.colorLight }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${currentTab.gradient}`}
                  layout
                  transition={{ duration: 0.4 }}
                >
                  <motion.div key={tab} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                    {tab === "candidate" && <User className="w-4 h-4 text-white" />}
                    {tab === "employer" && <Briefcase className="w-4 h-4 text-white" />}
                    {tab === "admin" && <Shield className="w-4 h-4 text-white" />}
                  </motion.div>
                </motion.div>
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
                Sign in to Talent Portal
              </h1>
              <p className="text-sm text-[var(--neutral-gray)] mt-2">
                Access your account to explore opportunities
              </p>
            </motion.div>

            {/* Animated Tabs */}
            <motion.div
              className="flex bg-[var(--surface-2)] rounded-2xl p-1.5 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {(["candidate", "employer", "admin"] as LoginTab[]).map((t) => {
                const config = tabConfig[t];
                const isActive = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTab(t);
                      setError("");
                    }}
                    className={`relative flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      isActive ? "text-white shadow-lg" : "text-[var(--neutral-gray)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className={`absolute inset-0 rounded-xl bg-gradient-to-r ${config.gradient}`}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {t === "admin" && <Shield size={14} />}
                      {config.label}
                    </span>
                  </button>
                );
              })}
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
                    <p className="text-sm text-[var(--error)] font-medium pt-1">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
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
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
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

              {tab !== "admin" && (
                <motion.div
                  className="flex items-center justify-end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Link
                    href="/auth/verify"
                    className="text-sm font-medium hover:underline underline-offset-4 transition-all duration-200"
                    style={{ color: currentTab.color }}
                  >
                    Forgot password?
                  </Link>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45 }}
                className="pt-1"
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`login-btn-shine w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r ${currentTab.gradient} shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>

            {/* Register link */}
            <AnimatePresence mode="wait">
              {tab !== "admin" && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative mt-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border)]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[var(--surface-0)] px-4 text-xs text-[var(--neutral-gray)] uppercase tracking-widest">
                        or
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-center text-[var(--neutral-gray)] mt-6">
                    Don&apos;t have an account?{" "}
                    <Link
                      href={
                        tab === "employer"
                          ? "/auth/register/employer"
                          : "/auth/register/candidate"
                      }
                      className="font-semibold hover:underline underline-offset-4 transition-all duration-200"
                      style={{ color: currentTab.color }}
                    >
                      Register
                    </Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
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
