"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isLoggedIn) {
      router.replace("/dashboard");
    } else {
      router.replace("/auth/login");
    }
  }, [isLoggedIn, isLoading, router]);

  // Loading state while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] flex items-center justify-center shadow-lg shadow-[#1B7340]/20">
          <span className="text-white font-bold text-lg">CBN</span>
        </div>
        <div className="w-8 h-8 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
}
