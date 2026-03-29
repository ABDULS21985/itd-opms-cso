"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, AlertCircle, RefreshCw } from "lucide-react";
import { setAuthenticatedFlag, setAuthMode } from "@/lib/auth";

import { API_BASE_URL } from "@/lib/api-client";

type CallbackStatus = "processing" | "success" | "error";

function OIDCCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState("");
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React strict mode
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    async function exchangeCode() {
      try {
        // 1. Read code and state from URL search params
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const urlError = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // Handle error response from Entra ID
        if (urlError) {
          throw new Error(
            errorDescription || `Authentication error: ${urlError}`,
          );
        }

        if (!code || !state) {
          throw new Error(
            "Missing authorization code or state parameter. The authentication response is incomplete.",
          );
        }

        // 2. Validate state matches stored state (CSRF protection)
        const storedState = sessionStorage.getItem("opms-pkce-state");
        if (!storedState || storedState !== state) {
          throw new Error(
            "State mismatch — possible CSRF attack. Please try signing in again.",
          );
        }

        // 3. Retrieve code_verifier from sessionStorage
        const codeVerifier = sessionStorage.getItem("opms-pkce-verifier");
        if (!codeVerifier) {
          throw new Error(
            "Missing PKCE code verifier. Your session may have expired. Please try signing in again.",
          );
        }

        // 4. Exchange authorization code for tokens via backend
        const redirectUri = `${window.location.origin}/auth/callback`;
        const response = await fetch(`${API_BASE_URL}/auth/oidc/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Include cookies for httpOnly token storage
          body: JSON.stringify({
            code,
            codeVerifier,
            redirectUri,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
            `Token exchange failed (${response.status}). Please try again.`,
          );
        }

        const data = await response.json();
        const userData = data.data !== undefined ? data.data : data;

        // 5. Store user data and set authenticated flag
        if (userData?.user) {
          sessionStorage.setItem("opms-user-cache", JSON.stringify(userData.user));
        }

        setAuthenticatedFlag();
        setAuthMode("oidc");

        // Clean up PKCE artifacts from sessionStorage
        sessionStorage.removeItem("opms-pkce-verifier");
        sessionStorage.removeItem("opms-pkce-state");

        setStatus("success");

        // Redirect to dashboard after brief success indication
        setTimeout(() => {
          router.replace("/dashboard");
        }, 500);
      } catch (err) {
        console.error("OIDC callback error:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during authentication.",
        );

        // Clean up PKCE artifacts on error
        sessionStorage.removeItem("opms-pkce-verifier");
        sessionStorage.removeItem("opms-pkce-state");
      }
    }

    exchangeCode();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)]">
      {/* Background decorations */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#1B7340]/10 to-[#C4A962]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-[#C4A962]/10 to-[#1B7340]/10 rounded-full blur-3xl" />

      <motion.div
        className="w-full max-w-md mx-4 relative z-10"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="rounded-3xl shadow-2xl shadow-black/5 p-8 sm:p-10 border border-[var(--border)] bg-[var(--surface-0)]">
          {/* Processing State */}
          {status === "processing" && (
            <motion.div
              className="text-center space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1B7340]/10 mx-auto">
                <div className="w-10 h-10 border-3 border-[#1B7340]/20 border-t-[#1B7340] rounded-full animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Completing Sign In
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mt-2">
                  Securely exchanging your credentials with Microsoft Entra
                  ID...
                </p>
              </div>

              {/* Animated progress dots */}
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#1B7340]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Success State */}
          {status === "success" && (
            <motion.div
              className="text-center space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mx-auto">
                <Shield className="w-8 h-8 text-[#1B7340]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Signed In Successfully
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mt-2">
                  Redirecting you to the dashboard...
                </p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {status === "error" && (
            <motion.div
              className="text-center space-y-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mx-auto">
                <AlertCircle className="w-8 h-8 text-[var(--error)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Sign In Failed
                </h2>
                <p className="text-sm text-[var(--error)] mt-2 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  <RefreshCw size={16} />
                  Try Again
                </a>
                <a
                  href="/auth/login"
                  className="text-sm text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-colors"
                >
                  Return to sign in page
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function CallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)]">
      <div className="w-10 h-10 border-3 border-[#1B7340]/20 border-t-[#1B7340] rounded-full animate-spin" />
    </div>
  );
}

export default function OIDCCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <OIDCCallbackContent />
    </Suspense>
  );
}
