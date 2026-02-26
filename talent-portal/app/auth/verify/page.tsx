"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { OtpInput } from "@digibit/ui/components";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { setToken } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const MAX_FAIL_HINT = 3;

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <VerifyPageInner />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Countdown ring                                                     */
/* ------------------------------------------------------------------ */

function CountdownRing({
  seconds,
  total,
}: {
  seconds: number;
  total: number;
}) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
      {/* Background track */}
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="2.5"
      />
      {/* Progress arc */}
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform="rotate(-90 14 14)"
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
      {/* Center text */}
      <text
        x="14"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-[var(--neutral-gray)] text-[8px] font-semibold"
      >
        {seconds}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Verification success overlay                                       */
/* ------------------------------------------------------------------ */

function VerificationSuccess() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="text-center py-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 mx-auto rounded-full bg-[var(--success)]/10 flex items-center justify-center mb-5"
      >
        <svg viewBox="0 0 48 48" className="w-10 h-10">
          <motion.path
            d="M14 26 L21 33 L34 18"
            fill="none"
            stroke="var(--success)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ShieldCheck size={20} className="mx-auto text-[var(--success)] mb-2" />
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Verified!
        </h2>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">
          Redirecting you now...
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main inner component                                               */
/* ------------------------------------------------------------------ */

function VerifyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const email = searchParams.get("email") || "";
  const userType = searchParams.get("type") || "candidate";

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [shakeError, setShakeError] = useState(false);
  const otpRef = useRef<HTMLDivElement>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = useCallback(
    async (verificationCode: string) => {
      if (verificationCode.length < CODE_LENGTH) return;
      setIsVerifying(true);
      setError("");

      try {
        const response = await apiClient.post<{ token: string }>(
          "/auth/verify",
          {
            email,
            code: verificationCode,
            userType,
          }
        );
        setToken(response.token);
        await refreshUser();
        toast.success("Email verified successfully!");
        setVerified(true);
        setTimeout(() => {
          router.push(userType === "employer" ? "/employer" : "/dashboard");
        }, 1500);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Invalid verification code. Please try again.";
        setError(message);
        setFailedAttempts((prev) => prev + 1);

        // Trigger shake animation
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);

        // Clear code and refocus
        setCode("");
      } finally {
        setIsVerifying(false);
      }
    },
    [email, userType, refreshUser, router]
  );

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    setError("");

    try {
      await apiClient.post("/auth/resend-code", { email, userType });
      toast.success("A new code has been sent to your email.");
      setCountdown(RESEND_COOLDOWN);
      setCode("");
      setFailedAttempts(0);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to resend code. Please try again.";
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-1)] flex items-center justify-center p-4">
      {/* Skip to form link */}
      <a
        href="#verify-form"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--primary)] focus:text-white focus:outline-none focus:shadow-lg"
      >
        Skip to form
      </a>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={cycleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] text-[var(--neutral-gray)] hover:text-[var(--foreground)] shadow-sm transition-colors"
        aria-label="Toggle dark mode"
      >
        {theme === "dark" ? (
          <Moon size={18} />
        ) : theme === "light" ? (
          <Sun size={18} />
        ) : (
          <Monitor size={18} />
        )}
      </button>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--primary)]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[var(--warning)]/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
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

        {/* Card */}
        <div className="login-glass-card rounded-2xl shadow-xl border border-[var(--border)] p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {verified ? (
              <VerificationSuccess key="success" />
            ) : (
              <motion.div
                key="form"
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Mail icon */}
                <div className="flex justify-center mb-5">
                  <div className="login-float w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                    <Mail size={28} className="text-white" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-[var(--foreground)] text-center mb-2">
                  Check your inbox
                </h1>
                <p className="text-sm text-[var(--neutral-gray)] text-center mb-8">
                  {email ? (
                    <>
                      We&apos;ve sent a 6-digit code to{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {email}
                      </span>
                    </>
                  ) : (
                    "Enter the 6-digit verification code sent to your email."
                  )}
                </p>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      role="alert" aria-live="assertive" className="bg-[var(--error-light)] text-[var(--error-dark)] text-sm px-4 py-3 rounded-xl mb-5 text-center"
                    >
                      {error}
                      {failedAttempts >= MAX_FAIL_HINT && (
                        <p className="mt-1.5 text-xs opacity-80">
                          Having trouble? Check your spam folder or request a
                          new code below.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* OTP Input */}
                <div
                  role="group" aria-label="Verification code"
                  className={cn(
                    "mb-6",
                    shakeError && "animate-shake-error"
                  )}
                >
                  <OtpInput
                    ref={otpRef}
                    length={CODE_LENGTH}
                    value={code}
                    onChange={setCode}
                    onComplete={handleVerify}
                    error={!!error}
                    disabled={isVerifying}
                  />
                </div>

                {/* Verify button */}
                <button
                  type="button"
                  onClick={() => handleVerify(code)}
                  disabled={isVerifying || code.length !== CODE_LENGTH}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--secondary)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                >
                  {isVerifying ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify Code
                      <ShieldCheck size={16} />
                    </>
                  )}
                </button>

                {/* Resend section */}
                <div className="mt-7 text-center">
                  <p className="text-sm text-[var(--neutral-gray)] mb-3">
                    Didn&apos;t receive it?
                  </p>

                  {countdown > 0 ? (
                    <div className="inline-flex items-center gap-2.5">
                      <CountdownRing
                        seconds={countdown}
                        total={RESEND_COOLDOWN}
                      />
                      <span className="text-sm text-[var(--neutral-gray)]" aria-live="polite">
                        Resend in {countdown}s
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={isResending}
                      className="login-pulse-glow inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:text-[var(--secondary)] disabled:text-[var(--neutral-gray)] disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2"
                    >
                      {isResending ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Resend Code
                    </button>
                  )}
                </div>

                {/* Back to login */}
                <div className="mt-7 pt-6 border-t border-[var(--border)] text-center">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Back to Sign In
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
