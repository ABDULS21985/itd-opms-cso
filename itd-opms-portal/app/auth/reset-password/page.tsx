"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength indicators
  const checks = {
    length: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  };
  const passedChecks = Object.values(checks).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data?.errors?.[0]?.message || "Failed to reset password. Please try again.";
        setError(errorMsg);
        toast.error("Reset failed", { description: errorMsg });
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successful", {
        description: "You can now sign in with your new password.",
        duration: 6000,
      });

      // Redirect to login after a brief pause.
      setTimeout(() => {
        router.push("/auth/login?reason=password-reset");
      }, 3000);
    } catch {
      setError("Unable to reach the server. Please check your network and try again.");
      toast.error("Connection error", {
        description: "Unable to reach the server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-amber-700 font-semibold">Missing reset token</p>
            <p className="text-sm text-amber-600 mt-1 leading-relaxed">
              This page requires a valid password reset link. Please use the
              &quot;Forgot password?&quot; link on the login page to request a
              new one.
            </p>
          </div>
        </div>

        <Link
          href="/auth/forgot-password"
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          <KeyRound size={16} />
          Request Password Reset
        </Link>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isSuccess ? (
        /* ─── Reset Form ─── */
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          className="space-y-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-[var(--error)]/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-[var(--error)]" />
                  </div>
                  <p className="text-sm text-[var(--error)] font-medium pt-1 leading-relaxed">
                    {error}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              New Password
            </label>
            <div className="relative login-input-glow rounded-xl transition-all duration-300">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter new password"
                autoFocus
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

            {/* Password strength indicator */}
            {newPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 space-y-2"
              >
                {/* Strength bar */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        passedChecks >= level
                          ? passedChecks <= 2
                            ? "bg-orange-400"
                            : passedChecks === 3
                            ? "bg-yellow-400"
                            : "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                {/* Check list */}
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { key: "length", label: "8+ characters" },
                    { key: "hasUpper", label: "Uppercase letter" },
                    { key: "hasLower", label: "Lowercase letter" },
                    { key: "hasNumber", label: "Number" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
                        checks[item.key as keyof typeof checks]
                          ? "text-green-600"
                          : "text-[var(--neutral-gray)]"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Confirm Password
            </label>
            <div className="relative login-input-glow rounded-xl transition-all duration-300">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Re-enter your new password"
                className="w-full pl-11 pr-4 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
              />
            </div>
            {/* Match indicator */}
            {confirmPassword && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${
                  newPassword === confirmPassword ? "text-green-600" : "text-[var(--error)]"
                }`}
              >
                {newPassword === confirmPassword ? (
                  <>
                    <CheckCircle2 size={12} />
                    Passwords match
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} />
                    Passwords do not match
                  </>
                )}
              </motion.p>
            )}
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="login-btn-shine w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  Reset Password
                </>
              )}
            </button>
          </div>
        </motion.form>
      ) : (
        /* ─── Success State ─── */
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Password Reset Complete
            </h2>
            <p className="text-sm text-[var(--neutral-gray)] mt-2 leading-relaxed">
              Your password has been updated successfully. You will be
              redirected to the sign-in page shortly.
            </p>
          </div>

          <Link
            href="/auth/login?reason=password-reset"
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Continue to Sign In
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)] p-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#1B7340]/10 to-[#C4A962]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-[#C4A962]/10 to-[#1B7340]/10 rounded-full blur-3xl" />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-glass-card rounded-3xl shadow-2xl shadow-black/5 p-8 sm:p-10 border border-[var(--border)]">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <motion.div className="inline-flex items-center justify-center mb-5">
              <Image
                src="/logo.jpeg"
                alt="CBN Logo"
                width={80}
                height={80}
                className="rounded-2xl"
              />
            </motion.div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-[#C4A962]" />
              <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                Reset Your Password
              </h1>
            </div>
            <p className="text-sm text-[var(--neutral-gray)]">
              Choose a strong password for your OPMS account.
            </p>
          </motion.div>

          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>

          {/* Back to login */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--secondary)] hover:underline transition-all duration-200"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </motion.div>
        </div>

        {/* Security badge */}
        <motion.div
          className="mt-6 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface-0)]/80 shadow-sm border border-[var(--border)] text-xs text-[var(--neutral-gray)]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>Secured with 256-bit encryption</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
