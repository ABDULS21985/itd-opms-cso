"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { isAuthenticated } from "@/lib/auth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Guard: redirect unauthenticated visitors to the login page so they receive
  // a proper redirect rather than a confusing 401 from the API call.
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login?redirect=/auth/change-password");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed!", {
        description: "You can now sign in with your new password.",
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to change password. Please try again.";
      setError(message);
      toast.error("Password change failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)] p-6">
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
                Change Your Password
              </h1>
            </div>
            <p className="text-sm text-[var(--neutral-gray)]">
              Your account requires a password change before you can continue.
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 overflow-hidden"
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter current password"
                  className="w-full pl-11 pr-4 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter new password (min. 8 characters)"
                  className="w-full pl-11 pr-4 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-4 py-3.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all duration-300 bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound size={16} />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
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
