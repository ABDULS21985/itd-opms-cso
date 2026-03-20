/* =============================================================================
   Authentication Utilities — ITD-OPMS Portal

   Dual-mode authentication:
   1. OIDC/PKCE flow with Microsoft Entra ID (production)
      - Tokens stored in httpOnly cookies (set by backend)
      - Lightweight 'opms-authenticated' flag cookie for client-side checks
   2. Dev-mode JWT auth via email/password
      - Token stored in localStorage under 'opms-token'
   ============================================================================= */

const TOKEN_KEY = "opms-token";
const REFRESH_TOKEN_KEY = "opms-refresh-token";
const AUTH_FLAG_COOKIE = "opms-authenticated";
const AUTH_MODE_KEY = "opms-auth-mode"; // "oidc" | "dev"

// =============================================================================
// PKCE Helpers
// =============================================================================

const PKCE_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * Generate a cryptographically random code verifier for PKCE.
 * Returns a 128-character string using unreserved URI characters.
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(128);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => PKCE_CHARSET[byte % PKCE_CHARSET.length])
    .join("");
}

/**
 * Derive a code challenge from a code verifier using SHA-256 + base64url encoding.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  // Convert ArrayBuffer to base64url string
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a random state parameter for CSRF protection.
 * Returns a 32-character hex string.
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// =============================================================================
// OIDC Configuration
// =============================================================================

export interface OIDCConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  authorizeUrl: string;
  tokenUrl: string;
  logoutUrl?: string;
}

import { API_BASE_URL } from "@/lib/api-client";

/**
 * Fetch OIDC configuration from the backend.
 * Returns the Entra ID endpoints and client configuration.
 */
export async function fetchOIDCConfig(): Promise<OIDCConfig> {
  const response = await fetch(`${API_BASE_URL}/auth/oidc/config`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch OIDC configuration");
  }

  const data = await response.json();
  // Handle envelope response format { status, data }
  return data.data !== undefined ? data.data : data;
}

/**
 * Build the Microsoft Entra ID authorization URL with PKCE parameters.
 */
export function buildAuthorizeURL(
  config: OIDCConfig,
  codeChallenge: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    response_mode: "query",
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

// =============================================================================
// Token Storage — Cookie-based (OIDC mode)
// =============================================================================

/**
 * Check if the user is authenticated.
 * In OIDC mode: checks for the 'opms-authenticated' flag cookie.
 * In dev mode: checks for a valid JWT in localStorage.
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;

  // Check OIDC cookie flag
  if (getCookie(AUTH_FLAG_COOKIE) === "true") {
    return true;
  }

  // Fall back to dev-mode localStorage JWT check
  const token = getToken();
  if (!token) return false;

  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return false;
    return (payload.exp as number) * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Set the authenticated flag cookie (non-httpOnly, readable by JS).
 * This is set after successful OIDC callback to indicate active session.
 */
export function setAuthenticatedFlag(): void {
  if (typeof window === "undefined") return;
  // Set cookie with SameSite=Lax, expires in 30 minutes
  const expires = new Date(Date.now() + 30 * 60 * 1000).toUTCString();
  document.cookie = `${AUTH_FLAG_COOKIE}=true; path=/; expires=${expires}; SameSite=Lax`;
}

/**
 * Clear the session — remove flag cookie and auth mode indicator.
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  // Remove the flag cookie by setting expired date
  document.cookie = `${AUTH_FLAG_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  // Also clean up sessionStorage PKCE artifacts
  sessionStorage.removeItem("opms-pkce-verifier");
  sessionStorage.removeItem("opms-pkce-state");
  // Remove auth mode
  localStorage.removeItem(AUTH_MODE_KEY);
}

/**
 * Get the current auth mode.
 */
export function getAuthMode(): "oidc" | "dev" | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_MODE_KEY) as "oidc" | "dev" | null;
}

/**
 * Set the current auth mode.
 */
export function setAuthMode(mode: "oidc" | "dev"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_MODE_KEY, mode);
}

// =============================================================================
// Cookie Helpers
// =============================================================================

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

// =============================================================================
// Dev-Mode JWT Token Helpers (localStorage-based)
// These are used only when Entra ID OIDC is not available.
// =============================================================================

/** [DEV-MODE ONLY] Get the JWT token from localStorage. */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** [DEV-MODE ONLY] Store a JWT token in localStorage. */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/** [DEV-MODE ONLY] Remove the JWT token from localStorage. */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** [DEV-MODE ONLY] Store the refresh token in localStorage. */
export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/** [DEV-MODE ONLY] Get the refresh token from localStorage. */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Decode a JWT payload without verification.
 * Only for reading claims client-side — never trust this for auth decisions on the server.
 */
export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
