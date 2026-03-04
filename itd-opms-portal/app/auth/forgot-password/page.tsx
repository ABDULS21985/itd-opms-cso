"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Send, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089/api/v1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data?.errors?.[0]?.message || "Something went wrong. Please try again.";
        toast.error("Request failed", { description: errorMsg });
        return;
      }

      setIsSubmitted(true);

      // In dev mode, the API returns the reset URL directly.
      if (data?.data?.resetUrl) {
        setResetUrl(data.data.resetUrl);
      }

      toast.success("Request received", {
        description: "Check below for further instructions.",
        duration: 5000,
      });
    } catch {
      toast.error("Connection error", {
        description: "Unable to reach the server. Please check your network and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
              Forgot Password
            </h1>
            <p className="text-sm text-[var(--neutral-gray)] mt-2 leading-relaxed">
              {isSubmitted
                ? "We've processed your request."
                : "Enter your email address and we'll help you reset your password."}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              /* ─── Email Form ─── */
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="space-y-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div>
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
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@cbn.gov.ng"
                      autoFocus
                      className="w-full pl-11 pr-4 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                    />
                  </div>
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
                        <Send size={16} />
                        Send Reset Link
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              /* ─── Success State ─── */
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                {/* Success banner */}
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-semibold">Request submitted</p>
                    <p className="text-sm text-green-600 mt-1 leading-relaxed">
                      If an account exists for <strong>{email}</strong>, a password reset link has been generated.
                    </p>
                  </div>
                </div>

                {/* Dev mode: direct reset link */}
                {resetUrl && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-blue-700 font-semibold">Development Mode</p>
                      <p className="text-sm text-blue-600 mt-1 leading-relaxed">
                        Email delivery is not configured. Use the link below to reset your password:
                      </p>
                      <Link
                        href={resetUrl}
                        className="inline-block mt-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--secondary)] underline break-all"
                      >
                        Click here to reset your password
                      </Link>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {!resetUrl && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-700 font-semibold">What to do next</p>
                      <p className="text-sm text-amber-600 mt-1 leading-relaxed">
                        Contact your IT administrator to receive the password reset link, or check your email if delivery has been configured.
                      </p>
                    </div>
                  </div>
                )}

                {/* Try again */}
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setResetUrl(null);
                    setEmail("");
                  }}
                  className="w-full py-3 rounded-xl text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all duration-200"
                >
                  Try a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
