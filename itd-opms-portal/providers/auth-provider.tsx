"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/api-client";
import {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  clearSession,
  setAuthenticatedFlag,
  fetchOIDCConfig,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizeURL,
  getAuthMode,
  setAuthMode,
  type OIDCConfig,
} from "@/lib/auth";
import type { User } from "@/types";

// =============================================================================
// Session timeout — 30 minutes of inactivity
// =============================================================================
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// =============================================================================
// Auth Context Type
// =============================================================================
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  /** Dev-mode login via email/password. */
  login: (email: string, password: string) => Promise<void>;
  /** Initiate Microsoft Entra ID OIDC/PKCE login flow. */
  loginWithEntraID: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Whether Entra ID OIDC is available and enabled. */
  isEntraIDEnabled: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  login: async () => {},
  loginWithEntraID: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  isEntraIDEnabled: false,
});

// =============================================================================
// Auth Provider
// =============================================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntraIDEnabled, setIsEntraIDEnabled] = useState(false);
  const [oidcConfig, setOidcConfig] = useState<OIDCConfig | null>(null);

  // Inactivity timeout refs
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggedInRef = useRef(false);

  // Keep ref in sync with user state
  useEffect(() => {
    isLoggedInRef.current = !!user;
  }, [user]);

  // ---------------------------------------------------------------------------
  // Refresh user from /auth/me
  // ---------------------------------------------------------------------------
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiClient.get<User>("/auth/me");
      setUser(userData);
    } catch {
      setUser(null);
      // Clear both auth modes on failure
      removeToken();
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Dev-mode login (email + password)
  // ---------------------------------------------------------------------------
  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient.post<{ token: string }>(
        "/auth/login",
        { email, password },
      );
      setToken(response.token);
      setAuthMode("dev");
      await refreshUser();
    },
    [refreshUser],
  );

  // ---------------------------------------------------------------------------
  // OIDC login — redirect to Microsoft Entra ID
  // ---------------------------------------------------------------------------
  const loginWithEntraID = useCallback(async () => {
    // Fetch config if we don't have it yet
    let config = oidcConfig;
    if (!config) {
      config = await fetchOIDCConfig();
      setOidcConfig(config);
    }

    // Generate PKCE pair
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE artifacts in sessionStorage for the callback page
    sessionStorage.setItem("opms-pkce-verifier", codeVerifier);
    sessionStorage.setItem("opms-pkce-state", state);

    // Build and redirect to the authorization URL
    const authorizeUrl = buildAuthorizeURL(config, codeChallenge, state);
    window.location.href = authorizeUrl;
  }, [oidcConfig]);

  // ---------------------------------------------------------------------------
  // Logout — handles both OIDC and dev modes
  // ---------------------------------------------------------------------------
  const logout = useCallback(() => {
    const authMode = getAuthMode();
    const config = oidcConfig;

    // Clear dev-mode token
    removeToken();
    // Clear OIDC session
    clearSession();
    // Clear user state
    setUser(null);

    // Call backend logout endpoint (fire-and-forget)
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    fetch(`${apiBase}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // Ignore errors — we're logging out anyway
    });

    // If OIDC was used and we have a logout URL, redirect to Entra ID logout
    if (authMode === "oidc" && config?.logoutUrl) {
      const postLogoutRedirectUri = `${window.location.origin}/auth/login`;
      const logoutParams = new URLSearchParams({
        post_logout_redirect_uri: postLogoutRedirectUri,
      });
      window.location.href = `${config.logoutUrl}?${logoutParams.toString()}`;
    } else {
      window.location.href = "/auth/login";
    }
  }, [oidcConfig]);

  // ---------------------------------------------------------------------------
  // Inactivity timeout — 30 minutes
  // ---------------------------------------------------------------------------
  const resetInactivityTimer = useCallback(() => {
    if (!isLoggedInRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isLoggedInRef.current) {
        // Session timed out — clean up and redirect
        removeToken();
        clearSession();
        setUser(null);
        window.location.href = "/auth/login?reason=timeout";
      }
    }, SESSION_TIMEOUT_MS);
  }, []);

  // Set up inactivity listeners
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];

    const handleActivity = () => {
      // Refresh the authenticated cookie expiry on activity
      if (isLoggedInRef.current && getAuthMode() === "oidc") {
        setAuthenticatedFlag(); // Resets the 30-min cookie expiry
      }
      resetInactivityTimer();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start timer if already logged in
    if (isLoggedInRef.current) {
      resetInactivityTimer();
    }

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Start/stop timer when login state changes
  useEffect(() => {
    if (user) {
      resetInactivityTimer();
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [user, resetInactivityTimer]);

  // ---------------------------------------------------------------------------
  // Initialization — detect auth mode, check OIDC availability
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      // 1. Try to fetch OIDC config to determine if Entra ID is enabled
      try {
        const config = await fetchOIDCConfig();
        if (!cancelled) {
          setOidcConfig(config);
          setIsEntraIDEnabled(true);
        }
      } catch {
        // OIDC not available — fall back to dev mode
        if (!cancelled) {
          setIsEntraIDEnabled(false);
        }
      }

      // 2. Check if user has an existing session (either mode)
      if (!cancelled) {
        if (isAuthenticated()) {
          try {
            const userData = await apiClient.get<User>("/auth/me");
            if (!cancelled) {
              setUser(userData);
            }
          } catch {
            if (!cancelled) {
              setUser(null);
              removeToken();
              clearSession();
            }
          }
        }
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        login,
        loginWithEntraID,
        logout,
        refreshUser,
        isEntraIDEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
