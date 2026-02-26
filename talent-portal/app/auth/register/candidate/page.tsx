"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Shield,
  ShieldCheck,
  Check,
  X,
  Monitor,
  Server,
  Layers,
  Smartphone,
  Palette,
  BarChart3,
  Cloud,
  Target,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  AlertCircle,
  Info,
  GraduationCap,
  Zap,
  Users,
} from "lucide-react";
import {
  Spinner,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@digibit/ui/components";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { setToken } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

/* ------------------------------------------------------------------ */
/*  Password strength                                                   */
/* ------------------------------------------------------------------ */

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

const PW_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  {
    label: "One special character (!@#$...)",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "" };
  const passed = PW_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: "Weak", color: "var(--error)" };
  if (passed === 2) return { score: 2, label: "Fair", color: "var(--warning)" };
  if (passed === 3) return { score: 3, label: "Good", color: "var(--primary)" };
  return { score: 4, label: "Strong", color: "var(--success)" };
}

/* ------------------------------------------------------------------ */
/*  Track config                                                        */
/* ------------------------------------------------------------------ */

const TRACKS = [
  { value: "Frontend Development", icon: Monitor, tagline: "Build beautiful interfaces" },
  { value: "Backend Development", icon: Server, tagline: "Power the server side" },
  { value: "Full-Stack Development", icon: Layers, tagline: "End-to-end development" },
  { value: "Mobile Development", icon: Smartphone, tagline: "Apps for iOS & Android" },
  { value: "UI/UX Design", icon: Palette, tagline: "Design user experiences" },
  { value: "Data Science & Analytics", icon: BarChart3, tagline: "Insights from data" },
  { value: "DevOps & Cloud", icon: Cloud, tagline: "Infrastructure & deployment" },
  { value: "Cybersecurity", icon: ShieldCheck, tagline: "Protect digital assets" },
  { value: "Product Management", icon: Target, tagline: "Drive product strategy" },
  { value: "Quality Assurance", icon: CheckCircle2, tagline: "Ensure software quality" },
];

/* ------------------------------------------------------------------ */
/*  Step config & slide variants                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "About You" },
  { label: "Security" },
  { label: "Career Path" },
];

const STEP_HEADERS = [
  { heading: "Let\u2019s get started", subtitle: "Tell us a bit about yourself" },
  { heading: "Secure your account", subtitle: "Create a strong password" },
  { heading: "Choose your path", subtitle: "Select the track that best describes your expertise" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

const STORAGE_KEY = "candidate-register-wizard";

/* ------------------------------------------------------------------ */
/*  Left panel content                                                  */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: GraduationCap,
    title: "NITDA Certified",
    description: "Join a nationally recognized tech talent programme",
  },
  {
    icon: Zap,
    title: "AI-Powered Matching",
    description: "Get matched with opportunities that fit your skills",
  },
  {
    icon: Users,
    title: "Direct Employer Access",
    description: "Connect directly with verified hiring organizations",
  },
];

const MOBILE_BENEFITS = ["NITDA Certified", "AI Matching", "Direct Access"];

/* ------------------------------------------------------------------ */
/*  Celebration particles                                               */
/* ------------------------------------------------------------------ */

const PARTICLE_COUNT = 10;
const PARTICLE_COLORS = [
  "#1B7340",
  "#6366F1",
  "#8B5CF6",
  "#C4A35A",
  "#10B981",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

function CelebrationParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * 360;
        const radius = 80 + Math.random() * 60;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        const size = 6 + Math.random() * 6;
        const color =
          PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full left-1/2 top-1/2"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              marginLeft: -size / 2,
              marginTop: -size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x, y, opacity: 0, scale: 0 }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              ease: "easeOut",
              delay: Math.random() * 0.15,
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated checkmark SVG                                              */
/* ------------------------------------------------------------------ */

function AnimatedCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
    >
      <div className="relative w-20 h-20 mx-auto">
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            fill="var(--primary)"
            fillOpacity="0.08"
          />
          <motion.path
            d="M24 42 L35 53 L56 30"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          />
        </svg>
        <CelebrationParticles />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success overlay                                                     */
/* ------------------------------------------------------------------ */

function RegistrationSuccess({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="login-glass-card rounded-3xl shadow-2xl shadow-black/5 p-8 sm:p-10 border border-[var(--border)] text-center"
    >
      <AnimatedCheckmark />
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-2xl font-bold text-[var(--foreground)] mt-6 mb-2"
      >
        Account Created!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="text-sm text-[var(--neutral-gray)] mb-1"
      >
        Welcome aboard,{" "}
        <span className="font-semibold text-[var(--foreground)]">{name}</span>!
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-2 mt-6 text-sm text-[var(--neutral-gray)]"
      >
        <Spinner size="sm" />
        Redirecting to your dashboard...
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="flex items-center justify-center gap-1.5 mt-4"
      >
        <Sparkles size={14} className="text-[var(--warning)]" />
        <span className="text-xs text-[var(--neutral-gray)]">
          Your journey starts now
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step indicator                                                      */
/* ------------------------------------------------------------------ */

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:flex items-start justify-center mb-8">
        {STEPS.map((step, i) => (
          <Fragment key={i}>
            <div
              className="flex flex-col items-center"
              style={{ width: 120 }}
            >
              <div
                className={cn(
                  "relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                  i < currentStep &&
                    "bg-[var(--success)] text-white shadow-sm",
                  i === currentStep &&
                    "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25",
                  i > currentStep &&
                    "border-2 border-[var(--surface-3)] text-[var(--neutral-gray)] bg-[var(--surface-0)]",
                )}
              >
                {i < currentStep ? (
                  <motion.svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </motion.svg>
                ) : (
                  <span>{i + 1}</span>
                )}
                {i === currentStep && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
                    animate={{
                      scale: [1, 1.25, 1],
                      opacity: [0.6, 0, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] mt-2 font-medium text-center leading-tight",
                  i <= currentStep
                    ? "text-[var(--foreground)]"
                    : "text-[var(--neutral-gray)]",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 bg-[var(--surface-3)] rounded-full overflow-hidden mt-[18px] min-w-[40px]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--success)" }}
                  initial={false}
                  animate={{
                    width: i < currentStep ? "100%" : "0%",
                  }}
                  transition={{
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {/* Mobile */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Step {currentStep + 1} of 3
          </span>
          <span className="text-xs text-[var(--neutral-gray)]">
            {STEPS[currentStep].label}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[var(--primary)] rounded-full"
            initial={false}
            animate={{
              width: `${((currentStep + 1) / 3) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline field components                                             */
/* ------------------------------------------------------------------ */

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, x: -4, height: 0 }}
          animate={{ opacity: 1, x: 0, height: "auto" }}
          exit={{ opacity: 0, x: -4, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1 text-xs text-[var(--error)] mt-1"
        >
          <AlertCircle size={12} />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function FieldStatusIcon({
  isValid,
  hasError,
}: {
  isValid: boolean;
  hasError: boolean;
}) {
  return (
    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
      <AnimatePresence mode="wait">
        {isValid && (
          <motion.div
            key="valid"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CheckCircle2 size={16} className="text-[var(--success)]" />
          </motion.div>
        )}
        {hasError && (
          <motion.div
            key="error"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AlertCircle size={16} className="text-[var(--error)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Main page                                                           */
/* ================================================================== */

export default function CandidateRegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [track, setTrack] = useState("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showStrongBadge, setShowStrongBadge] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const prevScoreRef = useRef(0);

  function cycleTheme() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const markTouched = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const checkFieldValid = (field: string) => {
    if (!touchedFields[field]) return false;
    if (fieldErrors[field]) return false;
    if (field === "fullName") return fullName.trim().length > 0;
    if (field === "email")
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return false;
  };

  const strength = getPasswordStrength(password);

  /* ── Session storage: restore ── */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.fullName) setFullName(d.fullName);
        if (d.email) setEmail(d.email);
        if (d.password) setPassword(d.password);
        if (d.track) setTrack(d.track);
        if (d.consent) setConsent(d.consent);
        if (
          typeof d.currentStep === "number" &&
          d.currentStep >= 0 &&
          d.currentStep <= 2
        )
          setCurrentStep(d.currentStep);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  /* ── Session storage: persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fullName,
          email,
          password,
          track,
          consent,
          currentStep,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [fullName, email, password, track, consent, currentStep, hydrated]);

  /* ── Strong badge flash ── */
  useEffect(() => {
    if (strength.score === 4 && prevScoreRef.current < 4) {
      setShowStrongBadge(true);
      const t = setTimeout(() => setShowStrongBadge(false), 2000);
      return () => clearTimeout(t);
    }
    if (strength.score < 4) setShowStrongBadge(false);
    prevScoreRef.current = strength.score;
  }, [strength.score]);

  /* ── Error auto-dismiss ── */
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 10000);
    return () => clearTimeout(t);
  }, [error]);

  /* ── Validation ── */
  const validateStep = useCallback(
    (step: number): boolean => {
      const errs: Record<string, string> = {};
      if (step === 0) {
        if (!fullName.trim()) errs.fullName = "Full name is required";
        if (!email.trim()) errs.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          errs.email = "Enter a valid email address";
      } else if (step === 1) {
        if (password.length < 8)
          errs.password = "Password must be at least 8 characters";
      } else if (step === 2) {
        if (!track) errs.track = "Please select a career track";
        if (!consent)
          errs.consent = "You must agree to the Privacy Policy";
      }
      setFieldErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [fullName, email, password, track, consent],
  );

  const isStepValid = useCallback(
    (step: number): boolean => {
      if (step === 0)
        return (
          fullName.trim().length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        );
      if (step === 1) return password.length >= 8;
      if (step === 2) return !!track && consent;
      return false;
    },
    [fullName, email, password, track, consent],
  );

  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, 2));
    setError("");
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setFieldErrors({});
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(2)) return;
    setError("");
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ token: string }>(
        "/auth/register",
        {
          fullName,
          email,
          password,
          track,
          userType: "candidate",
          dataProcessingConsent: consent,
        },
      );
      setToken(response.token);
      sessionStorage.removeItem(STORAGE_KEY);
      await refreshUser();
      setRegistrationSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fullName, email, password, track, consent, validateStep, refreshUser, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "Enter" && !e.shiftKey && target.tagName !== "BUTTON") {
        e.preventDefault();
        if (currentStep < 2) handleNext();
        else handleSubmit();
      } else if (e.key === "Escape" && currentStep > 0) {
        e.preventDefault();
        handleBack();
      }
    },
    [currentStep, handleNext, handleBack, handleSubmit],
  );

  /* ================================================================ */

  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* Skip to form */}
      <a
        href="#registration-form"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--primary)] focus:text-white focus:outline-none focus:shadow-lg"
      >
        Skip to form
      </a>

      {/* ===== Left Side — Immersive Visual Panel ===== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
            alt="Young professionals collaborating"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/90 via-[#0f2347]/85 to-[#1a0f3d]/90" />
        </div>

        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 login-morph" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/15 blur-xl login-float-slow" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/10 blur-lg login-float-reverse" />

          {/* Floating particles */}
          <div className="absolute top-[15%] left-[20%] w-2 h-2 rounded-full bg-blue-400/40 login-float" />
          <div className="absolute top-[25%] right-[30%] w-1.5 h-1.5 rounded-full bg-cyan-400/50 login-float-slow" />
          <div className="absolute bottom-[35%] left-[40%] w-2.5 h-2.5 rounded-full bg-indigo-400/30 login-float-reverse" />
          <div className="absolute top-[60%] left-[15%] w-1 h-1 rounded-full bg-blue-300/50 login-float" />
          <div className="absolute top-[45%] right-[15%] w-2 h-2 rounded-full bg-cyan-300/40 login-float-slow" />
          <div className="absolute bottom-[20%] right-[25%] w-1.5 h-1.5 rounded-full bg-indigo-300/40 login-float" />
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
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] backdrop-blur-sm flex items-center justify-center border border-white/20 relative z-10">
                  <span className="text-white font-bold text-xl">D</span>
                </div>
              </div>
              <div>
                <span className="text-xl font-bold block leading-tight">
                  Digibit
                </span>
                <span className="text-xs text-blue-200/70">
                  Talent Portal
                </span>
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
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Talent Portal</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
                Launch Your
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  Tech Career
                </span>
              </h1>
              <p className="text-blue-200/80 text-lg max-w-md leading-relaxed">
                Join Nigeria&apos;s top NITDA-certified talent pool and get
                matched with verified employers through AI-powered matching.
              </p>
            </motion.div>

            {/* Feature cards */}
            <div className="space-y-3">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4 + index * 0.2,
                  }}
                  className="group flex items-start gap-4 p-4 rounded-xl login-glass hover:bg-white/15 transition-all duration-300 cursor-default"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400/30 to-cyan-400/30 flex items-center justify-center flex-shrink-0 group-hover:from-blue-400/50 group-hover:to-cyan-400/50 transition-all duration-300">
                    <feature.icon className="w-5 h-5 text-blue-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/95">
                      {feature.title}
                    </h3>
                    <p className="text-blue-200/70 text-sm mt-0.5">
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
            className="flex items-center gap-3 text-blue-200/60 text-sm"
          >
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-blue-400/40" />
            <p>Join 2,000+ candidates building their careers</p>
          </motion.div>
        </div>
      </div>

      {/* ===== Right Side — Registration Form ===== */}
      <div
        className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 relative overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Theme toggle */}
        <button
          type="button"
          onClick={cycleTheme}
          className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-[var(--surface-0)]/80 border border-[var(--border)] text-[var(--neutral-gray)] hover:text-[var(--foreground)] shadow-sm transition-colors backdrop-blur-sm"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? (
            <Moon size={16} />
          ) : theme === "light" ? (
            <Sun size={16} />
          ) : (
            <Monitor size={16} />
          )}
        </button>

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #1B7340 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-indigo-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-100/30 to-pink-100/20 rounded-full blur-3xl" />

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <div className="text-left">
                <span className="text-xl font-bold text-[var(--foreground)] block leading-tight">
                  Digibit
                </span>
                <span className="text-xs text-[var(--neutral-gray)]">
                  Talent Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Mobile benefits */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            {MOBILE_BENEFITS.map((benefit) => (
              <span
                key={benefit}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-gray)] bg-[var(--surface-0)] px-3 py-1.5 rounded-full border border-[var(--border)]"
              >
                <CheckCircle2 size={12} className="text-[var(--primary)]" />
                {benefit}
              </span>
            ))}
          </div>

          {/* Form card */}
          <AnimatePresence mode="wait">
            {registrationSuccess ? (
              <RegistrationSuccess key="success" name={fullName} />
            ) : (
              <motion.div
                id="registration-form"
                key="form"
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="login-glass-card rounded-3xl shadow-2xl shadow-black/5 p-5 sm:p-8 login-pulse-glow border border-[var(--border)] overflow-hidden"
              >
                {/* Step indicator */}
                <StepIndicator currentStep={currentStep} />

                {/* Step header */}
                <motion.div
                  className="text-center mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <motion.div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                    style={{ background: "rgba(30, 77, 183, 0.1)" }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[#0E5A2D]">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
                    {STEP_HEADERS[currentStep].heading}
                  </h1>
                  <p className="text-sm text-[var(--neutral-gray)] mt-2">
                    {STEP_HEADERS[currentStep].subtitle}
                  </p>
                </motion.div>

                {/* Error banner with dismiss */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        height: 0,
                        marginBottom: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                        marginBottom: 24,
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                        marginBottom: 0,
                      }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-3 p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-[var(--error)]/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-4 h-4 text-[var(--error)]" />
                        </div>
                        <p className="text-sm text-[var(--error)] font-medium pt-1 flex-1">
                          {error}
                        </p>
                        <button
                          type="button"
                          onClick={() => setError("")}
                          className="text-[var(--error)]/60 hover:text-[var(--error)] transition-colors p-0.5 rounded"
                          aria-label="Dismiss error"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step content */}
                <div className="relative">
                  <AnimatePresence mode="wait" custom={direction}>
                    {/* ── Step 1: About You ── */}
                    {currentStep === 0 && (
                      <motion.div
                        key="step-0"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="space-y-4"
                      >
                        {/* Full name */}
                        <div>
                          <label
                            htmlFor="fullName"
                            className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                          >
                            Full name
                          </label>
                          <div className="relative login-input-glow rounded-xl transition-all duration-300">
                            <User
                              size={18}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                            />
                            <input
                              type="text"
                              id="fullName"
                              autoFocus
                              autoComplete="name"
                              aria-required="true"
                              value={fullName}
                              onChange={(e) => {
                                setFullName(e.target.value);
                                setFieldErrors((p) => ({
                                  ...p,
                                  fullName: "",
                                }));
                              }}
                              onBlur={() => markTouched("fullName")}
                              placeholder="John Doe"
                              className={cn(
                                "w-full pl-11 pr-10 py-3.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-0)] hover:border-[var(--primary)]/30 text-[var(--foreground)]",
                                fieldErrors.fullName
                                  ? "border-[var(--error)]"
                                  : "border-[var(--border)]",
                              )}
                            />
                            <FieldStatusIcon
                              isValid={checkFieldValid("fullName")}
                              hasError={!!fieldErrors.fullName}
                            />
                          </div>
                          <FieldError message={fieldErrors.fullName} />
                        </div>

                        {/* Email */}
                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                          >
                            Email address
                          </label>
                          <div className="relative login-input-glow rounded-xl transition-all duration-300">
                            <Mail
                              size={18}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                            />
                            <input
                              type="email"
                              id="email"
                              autoComplete="email"
                              aria-required="true"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setFieldErrors((p) => ({
                                  ...p,
                                  email: "",
                                }));
                              }}
                              onBlur={() => markTouched("email")}
                              placeholder="you@example.com"
                              className={cn(
                                "w-full pl-11 pr-10 py-3.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-0)] hover:border-[var(--primary)]/30 text-[var(--foreground)]",
                                fieldErrors.email
                                  ? "border-[var(--error)]"
                                  : "border-[var(--border)]",
                              )}
                            />
                            <FieldStatusIcon
                              isValid={checkFieldValid("email")}
                              hasError={!!fieldErrors.email}
                            />
                          </div>
                          <FieldError message={fieldErrors.email} />
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 2: Security ── */}
                    {currentStep === 1 && (
                      <motion.div
                        key="step-1"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label
                            htmlFor="password"
                            className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                          >
                            Password
                          </label>
                          <div className="relative login-input-glow rounded-xl transition-all duration-300">
                            {/* Strong password badge */}
                            <AnimatePresence>
                              {showStrongBadge && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  transition={{ duration: 0.25 }}
                                  className="absolute -top-9 left-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white z-10"
                                  style={{
                                    backgroundColor: "var(--success)",
                                  }}
                                >
                                  <ShieldCheck size={14} />
                                  Strong password!
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Dynamic shield / lock icon */}
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                              <AnimatePresence mode="wait">
                                {strength.score === 0 ? (
                                  <motion.div
                                    key="lock"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <Lock
                                      size={18}
                                      className="text-[var(--neutral-gray)]"
                                    />
                                  </motion.div>
                                ) : strength.score >= 3 ? (
                                  <motion.div
                                    key="shield-check"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <ShieldCheck
                                      size={18}
                                      style={{ color: strength.color }}
                                    />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="shield"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <Shield
                                      size={18}
                                      style={{ color: strength.color }}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <input
                              type={showPassword ? "text" : "password"}
                              id="password"
                              autoFocus
                              autoComplete="new-password"
                              aria-required="true"
                              aria-describedby="password-strength"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                setFieldErrors((p) => ({
                                  ...p,
                                  password: "",
                                }));
                              }}
                              onFocus={() => setPasswordFocused(true)}
                              onBlur={() => setPasswordFocused(false)}
                              placeholder="Minimum 8 characters"
                              className={cn(
                                "w-full pl-11 pr-12 py-3.5 rounded-xl text-sm focus:outline-none transition-all duration-300 bg-[var(--surface-0)] text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] border",
                                fieldErrors.password &&
                                  "border-[var(--error)]",
                              )}
                              style={
                                fieldErrors.password
                                  ? undefined
                                  : {
                                      borderColor: password
                                        ? strength.color
                                        : "var(--border)",
                                      boxShadow: password
                                        ? `0 0 0 3px color-mix(in srgb, ${strength.color} 15%, transparent)`
                                        : undefined,
                                    }
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowPassword(!showPassword)
                              }
                              aria-label={
                                showPassword
                                  ? "Hide password"
                                  : "Show password"
                              }
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-all duration-200 p-1 rounded-md hover:bg-black/5"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                          </div>
                          <FieldError message={fieldErrors.password} />
                        </div>

                        {/* Strength bar + label */}
                        {password && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2.5"
                          >
                            <div className="flex flex-1 gap-[3px]">
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="h-1.5 flex-1 rounded-full overflow-hidden"
                                  style={{
                                    backgroundColor: "var(--surface-3)",
                                  }}
                                >
                                  <motion.div
                                    className="h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{
                                      width:
                                        i <= strength.score
                                          ? "100%"
                                          : "0%",
                                    }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                      backgroundColor:
                                        i <= strength.score
                                          ? strength.color
                                          : "transparent",
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <span
                              id="password-strength"
                              aria-live="polite"
                              className="text-xs font-semibold shrink-0 w-12 text-right"
                              style={{ color: strength.color }}
                            >
                              {strength.label}
                            </span>
                          </motion.div>
                        )}

                        {/* Requirements checklist */}
                        <AnimatePresence>
                          {password && passwordFocused && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{
                                height: "auto",
                                opacity: 1,
                              }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-1 overflow-hidden"
                            >
                              {PW_RULES.map((rule) => {
                                const met = rule.test(password);
                                return (
                                  <motion.li
                                    key={rule.label}
                                    layout
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <AnimatePresence mode="wait">
                                      <motion.span
                                        key={
                                          met ? "check" : "x"
                                        }
                                        initial={{
                                          scale: 0.6,
                                          opacity: 0,
                                        }}
                                        animate={{
                                          scale: 1,
                                          opacity: 1,
                                        }}
                                        exit={{
                                          scale: 0.6,
                                          opacity: 0,
                                        }}
                                        transition={{
                                          duration: 0.15,
                                        }}
                                      >
                                        {met ? (
                                          <Check
                                            size={14}
                                            className="text-[var(--success)]"
                                          />
                                        ) : (
                                          <X
                                            size={14}
                                            className="text-[var(--neutral-gray)]"
                                          />
                                        )}
                                      </motion.span>
                                    </AnimatePresence>
                                    <span
                                      className="transition-colors duration-200"
                                      style={{
                                        color: met
                                          ? "var(--success)"
                                          : "var(--neutral-gray)",
                                      }}
                                    >
                                      {rule.label}
                                    </span>
                                  </motion.li>
                                );
                              })}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}

                    {/* ── Step 3: Career Path ── */}
                    {currentStep === 2 && (
                      <motion.div
                        key="step-2"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="space-y-5"
                      >
                        <div>
                          <div
                            className="grid grid-cols-2 gap-2"
                            role="radiogroup"
                            aria-label="Career track"
                          >
                            {TRACKS.map((t) => {
                              const isSelected = track === t.value;
                              const Icon = t.icon;
                              return (
                                <motion.button
                                  type="button"
                                  key={t.value}
                                  onClick={() => {
                                    setTrack(t.value);
                                    setFieldErrors((p) => ({
                                      ...p,
                                      track: "",
                                    }));
                                  }}
                                  role="radio"
                                  aria-checked={isSelected}
                                  whileTap={{ scale: 0.95 }}
                                  className={cn(
                                    "relative flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                                    isSelected
                                      ? "bg-[var(--primary)]/10 border-[var(--primary)] shadow-sm"
                                      : "bg-[var(--surface-1)] border-[var(--border)] hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/20",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                                      isSelected
                                        ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                                        : "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
                                    )}
                                  >
                                    <Icon size={16} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={cn(
                                        "text-xs font-semibold leading-tight transition-colors duration-200",
                                        isSelected
                                          ? "text-[var(--primary)]"
                                          : "text-[var(--foreground)]",
                                      )}
                                    >
                                      {t.value}
                                    </p>
                                    <p className="text-[10px] text-[var(--neutral-gray)] mt-0.5 leading-tight">
                                      {t.tagline}
                                    </p>
                                  </div>
                                  <AnimatePresence>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 500,
                                          damping: 25,
                                        }}
                                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center"
                                      >
                                        <Check
                                          size={10}
                                          className="text-white"
                                        />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.button>
                              );
                            })}
                          </div>
                          <AnimatePresence>
                            {fieldErrors.track && (
                              <motion.p
                                id="track-error"
                                role="alert"
                                aria-live="polite"
                                initial={{ opacity: 0, x: -4 }}
                                animate={{
                                  opacity: 1,
                                  x: [0, -4, 4, -4, 4, 0],
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                                className="flex items-center gap-1 text-xs text-[var(--error)] mt-2"
                              >
                                <AlertCircle size={12} />
                                {fieldErrors.track}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Consent checkbox */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={consent}
                              onCheckedChange={(checked) => {
                                setConsent(checked === true);
                                setFieldErrors((p) => ({
                                  ...p,
                                  consent: "",
                                }));
                              }}
                              id="consent"
                              className="mt-1 data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]"
                            />
                            <label
                              htmlFor="consent"
                              className="text-sm text-[var(--neutral-gray)] leading-relaxed cursor-pointer"
                            >
                              I consent to Digibit processing my
                              personal data for talent matching and
                              employer introductions, in accordance
                              with the{" "}
                              <span
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPrivacyOpen(true);
                                }}
                                className="text-[var(--primary)] underline underline-offset-2 cursor-pointer hover:text-[var(--secondary)] transition-colors"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setPrivacyOpen(true);
                                  }
                                }}
                              >
                                Privacy Policy
                              </span>
                            </label>
                          </div>
                          {fieldErrors.consent && (
                            <div className="ml-7">
                              <FieldError
                                message={fieldErrors.consent}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-3 mt-8">
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)] transition-all"
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                  )}
                  {currentStep < 2 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!isStepValid(currentStep)}
                      className="login-btn-shine flex-1 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                    >
                      Continue
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading || !isStepValid(2)}
                      className="login-btn-shine flex-1 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Create Account
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* What Happens Next — Step 3 only */}
                <AnimatePresence>
                  {currentStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="mt-6"
                    >
                      <div className="bg-[var(--surface-1)] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Info
                            size={14}
                            className="text-[var(--primary)]"
                          />
                          <span className="text-xs font-semibold text-[var(--foreground)]">
                            After registration:
                          </span>
                        </div>
                        <ol className="space-y-2">
                          <li className="flex items-start gap-2 text-xs text-[var(--neutral-gray)]">
                            <span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                              1
                            </span>
                            We&apos;ll review your profile (usually
                            within 48 hours)
                          </li>
                          <li className="flex items-start gap-2 text-xs text-[var(--neutral-gray)]">
                            <span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                              2
                            </span>
                            You&apos;ll be matched with relevant job
                            opportunities
                          </li>
                          <li className="flex items-start gap-2 text-xs text-[var(--neutral-gray)]">
                            <span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                              3
                            </span>
                            Start receiving intro requests from
                            verified employers
                          </li>
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divider + Login link */}
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
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-[var(--primary)] hover:text-[var(--secondary)] font-semibold hover:underline underline-offset-4 transition-all duration-200"
                  >
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust signals */}
          <motion.div
            className="mt-6 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface-0)]/80 shadow-sm border border-[var(--border)] text-xs text-[var(--neutral-gray)]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>Secured with 256-bit encryption</span>
              </div>
            </div>
            <p className="text-center text-[10px] text-[var(--neutral-gray)]/60">
              Your data is protected and never shared without your
              consent
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">
              Privacy Policy
            </DialogTitle>
            <DialogDescription>
              Summary of Digibit Candidate Privacy Policy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-[var(--neutral-gray)] max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Data Processing
              </h3>
              <p>
                By registering, you authorise Digibit to process your
                personal data for the purpose of talent matching,
                employer introductions, and platform analytics.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Profile Visibility
              </h3>
              <p>
                Your profile information will be visible to verified
                employers on the platform. You can control what
                information is shared through your profile settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Employer Introductions
              </h3>
              <p>
                Employers may send you introduction requests through
                the platform. You have full control over accepting or
                declining these requests.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Your Rights
              </h3>
              <p>
                You can request access to, correction of, or deletion
                of your personal data at any time. Contact our support
                team for data-related requests.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
