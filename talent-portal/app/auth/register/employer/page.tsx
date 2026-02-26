"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Users,
  Zap,
  Sparkles,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Shield,
  Cpu,
  Landmark,
  HeartPulse,
  GraduationCap,
  ShoppingCart,
  LineChart,
  Building,
  MoreHorizontal,
  Info,
  ChevronDown,
} from "lucide-react";
import {
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

/* ------------------------------------------------------------------ */
/*  Zod schema                                                          */
/* ------------------------------------------------------------------ */

const employerRegisterSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name is required")
    .max(200, "Company name is too long"),
  website: z.string().optional(),
  sector: z.string().min(1, "Please select your industry sector"),
  contactName: z
    .string()
    .min(2, "Contact name is required")
    .max(100, "Contact name is too long"),
  email: z.string().email("Please enter a valid work email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  consent: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service",
  }),
});

type EmployerRegisterForm = z.infer<typeof employerRegisterSchema>;

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
/*  Sector config                                                       */
/* ------------------------------------------------------------------ */

const SECTORS = [
  { value: "Technology", icon: Cpu, tagline: "Software & IT" },
  {
    value: "Financial Services",
    icon: Landmark,
    tagline: "Banking & Fintech",
  },
  { value: "Healthcare", icon: HeartPulse, tagline: "Health & Biotech" },
  { value: "Education", icon: GraduationCap, tagline: "EdTech & Training" },
  {
    value: "E-Commerce",
    icon: ShoppingCart,
    tagline: "Retail & Marketplace",
  },
  { value: "Consulting", icon: LineChart, tagline: "Advisory & Strategy" },
  { value: "Government", icon: Building, tagline: "Public Sector" },
  { value: "Other", icon: MoreHorizontal, tagline: "Other industries" },
];

const MORE_SECTORS = [
  "Telecommunications",
  "Energy & Utilities",
  "Manufacturing",
  "Non-Profit",
  "Media & Entertainment",
  "Agriculture",
  "Logistics & Transport",
];

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: Users,
    title: "Pre-Vetted Talent",
    description: "Access a pool of rigorously screened tech professionals",
  },
  {
    icon: ShieldCheck,
    title: "NITDA Verified",
    description: "Every candidate is certified through the NITDA programme",
  },
  {
    icon: Zap,
    title: "Hire in Days, Not Months",
    description: "AI-powered matching gets you the right fit faster",
  },
];

const MOBILE_BENEFITS = ["Pre-vetted talent", "AI matching", "Fast hiring"];

/* ------------------------------------------------------------------ */
/*  Step config & slide variants                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "Your Organization" },
  { label: "Your Account" },
];

const STEP_HEADERS = [
  {
    heading: "Your Organization",
    subtitle: "Tell us about your company",
  },
  {
    heading: "Your Account",
    subtitle: "Set up your login credentials",
  },
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

/* ------------------------------------------------------------------ */
/*  Celebration particles                                               */
/* ------------------------------------------------------------------ */

const PARTICLE_COUNT = 10;
const PARTICLE_COLORS = [
  "#C4A35A",
  "#A8893D",
  "#FBBF24",
  "#1B7340",
  "#10B981",
  "#8B5CF6",
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
/*  Animated checkmark                                                  */
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
            stroke="#C4A35A"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            fill="#C4A35A"
            fillOpacity="0.08"
          />
          <motion.path
            d="M24 42 L35 53 L56 30"
            fill="none"
            stroke="#C4A35A"
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

function RegistrationSuccess({ companyName }: { companyName: string }) {
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
        Organization Registered!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="text-sm text-[var(--neutral-gray)] mb-1"
      >
        Welcome aboard,{" "}
        <span className="font-semibold text-[var(--foreground)]">
          {companyName}
        </span>
        !
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-2 mt-6 text-sm text-[var(--neutral-gray)]"
      >
        <div className="w-5 h-5 border-2 border-[#C4A35A]/30 border-t-[#C4A35A] rounded-full animate-spin" />
        Redirecting to your dashboard...
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="flex items-center justify-center gap-1.5 mt-4"
      >
        <Sparkles size={14} className="text-[#C4A35A]" />
        <span className="text-xs text-[var(--neutral-gray)]">
          Your hiring journey starts now
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
                    "bg-[#C4A35A] text-white shadow-md shadow-[#C4A35A]/25",
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
                    className="absolute inset-0 rounded-full border-2 border-[#C4A35A]"
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
            Step {currentStep + 1} of 2
          </span>
          <span className="text-xs text-[var(--neutral-gray)]">
            {STEPS[currentStep].label}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#C4A35A] rounded-full"
            initial={false}
            animate={{
              width: `${((currentStep + 1) / 2) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </>
  );
}

/* ================================================================== */
/*  Main page                                                           */
/* ================================================================== */

export default function EmployerRegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showStrongBadge, setShowStrongBadge] = useState(false);
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const prevScoreRef = useRef(0);

  const {
    register,
    handleSubmit,
    watch,
    control,
    trigger,
    formState: { errors, dirtyFields },
  } = useForm<EmployerRegisterForm>({
    resolver: zodResolver(employerRegisterSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      companyName: "",
      website: "",
      sector: "",
      contactName: "",
      email: "",
      password: "",
      consent: false,
    },
  });

  const watchedPassword = watch("password");
  const watchedCompanyName = watch("companyName");
  const strength = getPasswordStrength(watchedPassword);

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

  /* ── Step navigation ── */
  const handleNext = useCallback(async () => {
    const valid = await trigger(["companyName", "website", "sector"]);
    if (!valid) return;
    setDirection(1);
    setCurrentStep(1);
    setError("");
  }, [trigger]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep(0);
    setError("");
  }, []);

  /* ── Submit ── */
  const onSubmit = async (data: EmployerRegisterForm) => {
    setError("");
    setIsLoading(true);
    try {
      const websiteUrl = data.website
        ? data.website.startsWith("http")
          ? data.website
          : `https://${data.website}`
        : undefined;
      const response = await apiClient.post<{ token: string }>(
        "/auth/register",
        {
          companyName: data.companyName,
          contactName: data.contactName,
          email: data.email,
          password: data.password,
          website: websiteUrl,
          sector: data.sector,
          userType: "employer",
          dataProcessingConsent: data.consent,
        },
      );
      setToken(response.token);

      // Create the EmployerOrg and link it to the newly registered user
      await apiClient.post("/employers/register", {
        companyName: data.companyName,
        contactName: data.contactName,
        websiteUrl: websiteUrl,
        sector: data.sector,
      });

      await refreshUser();
      setRegistrationSuccess(true);
      setTimeout(() => {
        router.push("/employer");
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
  };

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "Enter" && !e.shiftKey && target.tagName !== "BUTTON") {
        if (currentStep === 0) {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === "Escape" && currentStep > 0) {
        e.preventDefault();
        handleBack();
      }
    },
    [currentStep, handleNext, handleBack],
  );

  /* ── Field valid helper ── */
  const isFieldValid = (name: keyof EmployerRegisterForm) =>
    !!dirtyFields[name] && !errors[name];

  /* ================================================================ */

  return (
    <div className="min-h-screen flex bg-[var(--surface-1)]">
      {/* ===== Left Side — Immersive Visual Panel ===== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop"
            alt="Modern office workspace"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f00]/90 via-[#2d1a05]/85 to-[#0f2347]/90" />
        </div>

        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-amber-500/20 login-morph" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-yellow-500/15 to-orange-500/15 blur-xl login-float-slow" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/15 to-red-500/10 blur-lg login-float-reverse" />

          {/* Floating particles */}
          <div className="absolute top-[15%] left-[20%] w-2 h-2 rounded-full bg-orange-400/40 login-float" />
          <div className="absolute top-[25%] right-[30%] w-1.5 h-1.5 rounded-full bg-amber-400/50 login-float-slow" />
          <div className="absolute bottom-[35%] left-[40%] w-2.5 h-2.5 rounded-full bg-yellow-400/30 login-float-reverse" />
          <div className="absolute top-[60%] left-[15%] w-1 h-1 rounded-full bg-orange-300/50 login-float" />
          <div className="absolute top-[45%] right-[15%] w-2 h-2 rounded-full bg-amber-300/40 login-float-slow" />
          <div className="absolute bottom-[20%] right-[25%] w-1.5 h-1.5 rounded-full bg-yellow-300/40 login-float" />
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
                <div className="w-12 h-12 rounded-2xl bg-[#C4A35A]/90 backdrop-blur-sm flex items-center justify-center border border-white/20 relative z-10">
                  <Building2 size={22} className="text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold block leading-tight">
                  Digibit
                </span>
                <span className="text-xs text-orange-200/70">
                  Employer Portal
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full login-glass text-sm text-orange-200">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Employer Portal</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
                Hire Verified
                <br />
                <span className="bg-gradient-to-r from-orange-300 via-amber-300 to-yellow-300 bg-clip-text text-transparent">
                  Tech Talent
                </span>
              </h1>
              <p className="text-orange-200/80 text-lg max-w-md leading-relaxed">
                Access Nigeria&apos;s top NITDA-certified graduates and
                streamline your hiring with AI-powered matching.
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
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400/30 to-amber-400/30 flex items-center justify-center flex-shrink-0 group-hover:from-orange-400/50 group-hover:to-amber-400/50 transition-all duration-300">
                    <feature.icon className="w-5 h-5 text-orange-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/95">
                      {feature.title}
                    </h3>
                    <p className="text-orange-200/70 text-sm mt-0.5">
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
            className="flex items-center gap-3 text-orange-200/60 text-sm"
          >
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-orange-400/40" />
            <p>Join 500+ organizations hiring smarter</p>
          </motion.div>
        </div>
      </div>

      {/* ===== Right Side — Registration Form ===== */}
      <div
        className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 relative overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #C4A35A 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-100/40 to-amber-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-indigo-100/20 rounded-full blur-3xl" />

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C4A35A] flex items-center justify-center shadow-lg">
                <Building2 size={22} className="text-white" />
              </div>
              <div className="text-left">
                <span className="text-xl font-bold text-[var(--foreground)] block leading-tight">
                  Digibit
                </span>
                <span className="text-xs text-[var(--neutral-gray)]">
                  Employer Portal
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
                <CheckCircle2 size={12} className="text-[#C4A35A]" />
                {benefit}
              </span>
            ))}
          </div>

          {/* Form card */}
          <AnimatePresence mode="wait">
            {registrationSuccess ? (
              <RegistrationSuccess
                key="success"
                companyName={watchedCompanyName}
              />
            ) : (
              <motion.div
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
                    style={{ background: "rgba(245, 154, 35, 0.1)" }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#C4A35A] to-[#A8893D]">
                      <Building2 className="w-4 h-4 text-white" />
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
                          <Shield className="w-4 h-4 text-red-500" />
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

                {/* Form */}
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <div className="relative">
                    <AnimatePresence mode="wait" custom={direction}>
                      {/* ── Step 1: Your Organization ── */}
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
                          {/* Company name */}
                          <div>
                            <label
                              htmlFor="companyName"
                              className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                            >
                              Company name
                            </label>
                            <div className="relative login-input-glow rounded-xl transition-all duration-300">
                              <Building2
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                              />
                              <input
                                type="text"
                                id="companyName"
                                autoFocus
                                autoComplete="organization"
                                placeholder="Acme Corp"
                                className={cn(
                                  "w-full pl-11 pr-10 py-3.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-all duration-300 bg-[var(--surface-0)] hover:border-[#C4A35A]/30 text-[var(--foreground)]",
                                  errors.companyName
                                    ? "border-[var(--error)]"
                                    : "border-[var(--border)]",
                                )}
                                {...register("companyName")}
                              />
                              <FieldStatusIcon
                                isValid={isFieldValid("companyName")}
                                hasError={!!errors.companyName}
                              />
                            </div>
                            <FieldError
                              message={errors.companyName?.message}
                            />
                          </div>

                          {/* Website with https:// prefix */}
                          <div>
                            <label
                              htmlFor="website"
                              className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                            >
                              Website{" "}
                              <span className="text-[var(--neutral-gray)] font-normal">
                                (optional)
                              </span>
                            </label>
                            <div className="relative login-input-glow rounded-xl transition-all duration-300">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--neutral-gray)] select-none pointer-events-none">
                                https://
                              </span>
                              <input
                                type="text"
                                id="website"
                                autoComplete="url"
                                placeholder="acmecorp.com"
                                className={cn(
                                  "w-full pl-[4.75rem] pr-10 py-3.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-all duration-300 bg-[var(--surface-0)] hover:border-[#C4A35A]/30 text-[var(--foreground)]",
                                  errors.website
                                    ? "border-[var(--error)]"
                                    : "border-[var(--border)]",
                                )}
                                {...register("website")}
                              />
                              <FieldStatusIcon
                                isValid={isFieldValid("website")}
                                hasError={!!errors.website}
                              />
                            </div>
                            <FieldError
                              message={errors.website?.message}
                            />
                          </div>

                          {/* Sector card grid */}
                          <Controller
                            name="sector"
                            control={control}
                            render={({ field }) => (
                              <div>
                                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                                  Sector / Industry
                                </label>
                                <div
                                  className="grid grid-cols-2 gap-2"
                                  role="radiogroup"
                                  aria-label="Industry sector"
                                >
                                  {SECTORS.map((s) => {
                                    const isSelected =
                                      field.value === s.value;
                                    const Icon = s.icon;
                                    return (
                                      <motion.button
                                        type="button"
                                        key={s.value}
                                        onClick={() => {
                                          field.onChange(s.value);
                                          trigger("sector");
                                        }}
                                        role="radio"
                                        aria-checked={isSelected}
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                          "relative flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20",
                                          isSelected
                                            ? "bg-[#C4A35A]/10 border-[#C4A35A] shadow-sm"
                                            : "bg-[var(--surface-1)] border-[var(--border)] hover:bg-[#C4A35A]/5 hover:border-[#C4A35A]/20",
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                                            isSelected
                                              ? "bg-[#C4A35A]/15 text-[#C4A35A]"
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
                                                ? "text-[#C4A35A]"
                                                : "text-[var(--foreground)]",
                                            )}
                                          >
                                            {s.value}
                                          </p>
                                          <p className="text-[10px] text-[var(--neutral-gray)] mt-0.5 leading-tight">
                                            {s.tagline}
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
                                              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#C4A35A] flex items-center justify-center"
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

                                {/* Expanded sectors */}
                                <AnimatePresence>
                                  {showAllSectors && (
                                    <motion.div
                                      initial={{
                                        height: 0,
                                        opacity: 0,
                                      }}
                                      animate={{
                                        height: "auto",
                                        opacity: 1,
                                      }}
                                      exit={{
                                        height: 0,
                                        opacity: 0,
                                      }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden mt-2"
                                    >
                                      <div className="flex flex-wrap gap-2">
                                        {MORE_SECTORS.map((s) => {
                                          const isSelected =
                                            field.value === s;
                                          return (
                                            <button
                                              type="button"
                                              key={s}
                                              onClick={() => {
                                                field.onChange(s);
                                                trigger("sector");
                                              }}
                                              className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                                                isSelected
                                                  ? "bg-[#C4A35A]/10 border-[#C4A35A] text-[#C4A35A]"
                                                  : "bg-[var(--surface-0)] border-[var(--border)] text-[var(--neutral-gray)] hover:border-[#C4A35A]/30 hover:text-[var(--foreground)]",
                                              )}
                                            >
                                              {s}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAllSectors(!showAllSectors)
                                  }
                                  className="flex items-center gap-1 text-xs text-[#C4A35A] font-medium mt-2 hover:text-[#A8893D] transition-colors"
                                >
                                  {showAllSectors
                                    ? "Show less"
                                    : "Show all sectors"}
                                  <ChevronDown
                                    size={12}
                                    className={cn(
                                      "transition-transform duration-200",
                                      showAllSectors && "rotate-180",
                                    )}
                                  />
                                </button>

                                <FieldError
                                  message={errors.sector?.message}
                                />
                              </div>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* ── Step 2: Your Account ── */}
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
                          {/* Contact name */}
                          <div>
                            <label
                              htmlFor="contactName"
                              className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                            >
                              Contact name
                            </label>
                            <div className="relative login-input-glow rounded-xl transition-all duration-300">
                              <User
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                              />
                              <input
                                type="text"
                                id="contactName"
                                autoFocus
                                autoComplete="name"
                                placeholder="Jane Smith"
                                className={cn(
                                  "w-full pl-11 pr-10 py-3.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-all duration-300 bg-[var(--surface-0)] hover:border-[#C4A35A]/30 text-[var(--foreground)]",
                                  errors.contactName
                                    ? "border-[var(--error)]"
                                    : "border-[var(--border)]",
                                )}
                                {...register("contactName")}
                              />
                              <FieldStatusIcon
                                isValid={isFieldValid("contactName")}
                                hasError={!!errors.contactName}
                              />
                            </div>
                            <FieldError
                              message={errors.contactName?.message}
                            />
                          </div>

                          {/* Work email */}
                          <div>
                            <label
                              htmlFor="email"
                              className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                            >
                              Work email
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
                                placeholder="jane@acmecorp.com"
                                className={cn(
                                  "w-full pl-11 pr-10 py-3.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-all duration-300 bg-[var(--surface-0)] hover:border-[#C4A35A]/30 text-[var(--foreground)]",
                                  errors.email
                                    ? "border-[var(--error)]"
                                    : "border-[var(--border)]",
                                )}
                                {...register("email")}
                              />
                              <FieldStatusIcon
                                isValid={isFieldValid("email")}
                                hasError={!!errors.email}
                              />
                            </div>
                            <FieldError
                              message={errors.email?.message}
                            />
                          </div>

                          {/* Password */}
                          <div>
                            <label
                              htmlFor="password"
                              className="block text-sm font-semibold text-[var(--foreground)] mb-2"
                            >
                              Password
                            </label>
                            <div className="relative login-input-glow rounded-xl transition-all duration-300">
                              {/* Strong badge */}
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

                              <Lock
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                              />
                              <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                autoComplete="new-password"
                                placeholder="Minimum 8 characters"
                                className={cn(
                                  "w-full pl-11 pr-12 py-3.5 rounded-xl text-sm focus:outline-none transition-all duration-300 bg-[var(--surface-0)] text-[var(--foreground)] border",
                                  errors.password
                                    ? "border-[var(--error)]"
                                    : "border-[var(--border)]",
                                )}
                                style={
                                  !errors.password && watchedPassword
                                    ? {
                                        borderColor: strength.color,
                                        boxShadow: `0 0 0 3px color-mix(in srgb, ${strength.color} 15%, transparent)`,
                                      }
                                    : undefined
                                }
                                {...register("password")}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={(e) => {
                                  setPasswordFocused(false);
                                  register("password").onBlur(e);
                                }}
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
                            <FieldError
                              message={errors.password?.message}
                            />

                            {/* Strength bar + label */}
                            {watchedPassword && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2.5 mt-2"
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
                                  className="text-xs font-semibold shrink-0 w-12 text-right"
                                  style={{ color: strength.color }}
                                >
                                  {strength.label}
                                </span>
                              </motion.div>
                            )}

                            {/* Requirements checklist */}
                            <AnimatePresence>
                              {watchedPassword && passwordFocused && (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{
                                    height: "auto",
                                    opacity: 1,
                                  }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-1 overflow-hidden mt-2"
                                >
                                  {PW_RULES.map((rule) => {
                                    const met = rule.test(watchedPassword);
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
                          </div>

                          {/* Data consent */}
                          <div className="space-y-3 pt-2">
                            {/* Required consent */}
                            <Controller
                              name="consent"
                              control={control}
                              render={({ field }) => (
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) =>
                                      field.onChange(checked === true)
                                    }
                                    id="consent"
                                    className="mt-1 data-[state=checked]:bg-[#C4A35A] data-[state=checked]:border-[#C4A35A]"
                                  />
                                  <label
                                    htmlFor="consent"
                                    className="text-sm text-[var(--neutral-gray)] leading-relaxed cursor-pointer"
                                  >
                                    I agree to the{" "}
                                    <span
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setTermsOpen(true);
                                      }}
                                      className="text-[#C4A35A] underline underline-offset-2 cursor-pointer hover:text-[#A8893D] transition-colors"
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setTermsOpen(true);
                                        }
                                      }}
                                    >
                                      Terms of Service
                                    </span>{" "}
                                    and authorise Digibit to process
                                    organization data for talent matching
                                  </label>
                                </div>
                              )}
                            />
                            {errors.consent && (
                              <div className="ml-7">
                                <FieldError
                                  message={errors.consent.message}
                                />
                              </div>
                            )}

                            {/* Optional marketing consent */}
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={marketingConsent}
                                onCheckedChange={(checked) =>
                                  setMarketingConsent(checked === true)
                                }
                                id="marketing"
                                className="mt-1 data-[state=checked]:bg-[#C4A35A] data-[state=checked]:border-[#C4A35A]"
                              />
                              <label
                                htmlFor="marketing"
                                className="text-sm text-[var(--neutral-gray)] leading-relaxed cursor-pointer"
                              >
                                Send me hiring tips and platform updates
                              </label>
                            </div>
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
                    {currentStep === 0 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="login-btn-shine flex-1 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#C4A35A] to-[#A8893D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all"
                      >
                        Continue
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="login-btn-shine flex-1 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#C4A35A] to-[#A8893D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            Register Organization
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>

                {/* What Happens Next — Step 2 only */}
                <AnimatePresence>
                  {currentStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="mt-6"
                    >
                      <div className="bg-[var(--surface-1)] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Info size={14} className="text-[#C4A35A]" />
                          <span className="text-xs font-semibold text-[var(--foreground)]">
                            After registration:
                          </span>
                        </div>
                        <ol className="space-y-2">
                          <li className="flex items-start gap-2 text-xs text-[var(--neutral-gray)]">
                            <span className="w-5 h-5 rounded-full bg-[#C4A35A]/10 text-[#C4A35A] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                              1
                            </span>
                            We&apos;ll verify your organization (usually
                            within 24 hours)
                          </li>
                          <li className="flex items-start gap-2 text-xs text-[var(--neutral-gray)]">
                            <span className="w-5 h-5 rounded-full bg-[#C4A35A]/10 text-[#C4A35A] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                              2
                            </span>
                            You&apos;ll get access to browse verified
                            candidates
                          </li>
                          <li className="flex items-start gap-2 text-xs text-[var(--neutral-gray)]">
                            <span className="w-5 h-5 rounded-full bg-[#C4A35A]/10 text-[#C4A35A] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                              3
                            </span>
                            Start sending intro requests and hiring
                          </li>
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login link */}
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
                  Already registered?{" "}
                  <Link
                    href="/auth/login"
                    className="text-[#C4A35A] hover:text-[#A8893D] font-semibold hover:underline underline-offset-4 transition-all duration-200"
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
              We verify all employer accounts before activation
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Terms of Service Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">
              Terms of Service
            </DialogTitle>
            <DialogDescription>
              Summary of Digibit Employer Terms
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-[var(--neutral-gray)] max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Data Processing
              </h3>
              <p>
                By registering, you authorise Digibit to process your
                organization&apos;s data for the purpose of talent matching,
                candidate introductions, and platform analytics.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Account Verification
              </h3>
              <p>
                All employer accounts undergo a verification process. Digibit
                reserves the right to decline registration if the organization
                cannot be verified.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Candidate Privacy
              </h3>
              <p>
                You agree to handle candidate information responsibly and in
                accordance with applicable data protection regulations.
                Candidate data shared through the platform may not be
                redistributed.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Fair Hiring
              </h3>
              <p>
                You commit to fair and non-discriminatory hiring practices when
                engaging with candidates through the Digibit platform.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
