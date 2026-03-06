package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type authContextKey string

const publicRouteKey authContextKey = "public_route"

// AuthConfig holds the configuration needed by the dual-mode auth middleware.
type AuthConfig struct {
	JWTSecret         string
	EntraIDEnabled    bool
	OIDCValidator     *auth.OIDCValidator
	Pool              *pgxpool.Pool
	RevocationService *auth.RevocationService
}

// Auth returns a middleware that validates JWT Bearer tokens from the
// Authorization header using the dev-mode HS256 secret.
// For dual-mode (Entra ID + dev JWT), use AuthDualMode instead.
func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return AuthDualMode(AuthConfig{
		JWTSecret:      jwtSecret,
		EntraIDEnabled: false,
	})
}

// AuthDualMode returns a middleware that supports both dev JWT and Entra ID OIDC.
// When Entra ID is enabled it tries RS256 OIDC validation first, then falls back
// to HS256 dev JWT. On success it populates the request context with an AuthContext.
func AuthDualMode(cfg AuthConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for routes marked as public.
			if isPublic, ok := r.Context().Value(publicRouteKey).(bool); ok && isPublic {
				next.ServeHTTP(w, r)
				return
			}

			tokenString := extractBearerToken(r)
			if tokenString == "" {
				slog.Warn("missing or malformed authorization header",
					"path", r.URL.Path,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusUnauthorized,
					"UNAUTHORIZED", "Missing or invalid authorization token",
				)
				return
			}

			var authCtx *types.AuthContext

			// Try Entra ID OIDC validation first (if enabled).
			if cfg.EntraIDEnabled && cfg.OIDCValidator != nil {
				entraClaims, err := cfg.OIDCValidator.ValidateToken(r.Context(), tokenString)
				if err == nil {
					authCtx, err = resolveEntraUser(r.Context(), cfg.Pool, entraClaims)
					if err != nil {
						slog.Warn("failed to resolve Entra ID user",
							"error", err.Error(),
							"oid", entraClaims.OID,
							"path", r.URL.Path,
						)
						types.ErrorMessage(w, http.StatusUnauthorized,
							"UNAUTHORIZED", "User account not found or inactive",
						)
						return
					}
				} else {
					slog.Debug("Entra ID validation failed, trying dev JWT",
						"error", err.Error(),
						"path", r.URL.Path,
					)
				}
			}

			// Fallback to dev JWT if Entra validation didn't succeed.
			if authCtx == nil {
				claims, err := auth.ValidateToken(tokenString, cfg.JWTSecret)
				if err != nil {
					slog.Warn("invalid JWT token",
						"error", err.Error(),
						"path", r.URL.Path,
						"correlation_id", types.GetCorrelationID(r.Context()),
					)
					types.ErrorMessage(w, http.StatusUnauthorized,
						"UNAUTHORIZED", "Invalid or expired token",
					)
					return
				}

				authCtx = &types.AuthContext{
					UserID:      claims.UserID,
					TenantID:    claims.TenantID,
					Email:       claims.Email,
					Roles:       claims.Roles,
					Permissions: claims.Permissions,
					IssuedAt:    claims.IssuedAt.Time,
				}

				// Check if token has been revoked.
				if claims.ID != "" && cfg.RevocationService != nil {
					if cfg.RevocationService.IsRevoked(r.Context(), claims.ID) {
						types.ErrorMessage(w, http.StatusUnauthorized,
							"TOKEN_REVOKED", "Token has been revoked",
						)
						return
					}
				}
			}

			ctx := types.SetAuthContext(r.Context(), authCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// resolveEntraUser looks up the local user by their Entra ID object ID (oid)
// and returns an AuthContext populated with their roles and permissions.
func resolveEntraUser(ctx context.Context, pool *pgxpool.Pool, claims *auth.EntraClaims) (*types.AuthContext, error) {
	if pool == nil {
		return nil, fmt.Errorf("database pool not available")
	}

	var (
		userID   uuid.UUID
		tenantID uuid.UUID
		email    string
	)

	err := pool.QueryRow(ctx,
		`SELECT id, tenant_id, email FROM users WHERE entra_id = $1 AND is_active = true`,
		claims.OID,
	).Scan(&userID, &tenantID, &email)
	if err != nil {
		if err == pgx.ErrNoRows {
			lookupEmail := claims.PreferredUsername
			if lookupEmail == "" {
				lookupEmail = claims.Email
			}
			err = pool.QueryRow(ctx,
				`SELECT id, tenant_id, email FROM users WHERE email = $1 AND is_active = true`,
				lookupEmail,
			).Scan(&userID, &tenantID, &email)
			if err != nil {
				return nil, fmt.Errorf("user not found by entra_id or email: %w", err)
			}
		} else {
			return nil, fmt.Errorf("query user: %w", err)
		}
	}

	// Fetch roles and permissions using an ephemeral AuthService.
	authService := auth.NewAuthService(pool, config.JWTConfig{}, nil, config.MinIOConfig{})
	roles, permissions, err := authService.GetUserRolesAndPermissions(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch roles: %w", err)
	}

	return &types.AuthContext{
		UserID:      userID,
		TenantID:    tenantID,
		Email:       email,
		Roles:       roles,
		Permissions: permissions,
		IssuedAt:    time.Now(), // Entra tokens are validated on each request
	}, nil
}

// PublicRoute marks the wrapped routes as public so the Auth middleware
// will skip token validation.
func PublicRoute(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), publicRouteKey, true)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// extractBearerToken pulls the token from the "Authorization: Bearer <token>" header.
// Falls back to the "token" query parameter for SSE connections (EventSource cannot
// set custom headers).
func extractBearerToken(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if header != "" {
		parts := strings.SplitN(header, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
	}

	// Fallback: check query parameter (used by EventSource/SSE).
	if token := r.URL.Query().Get("token"); token != "" {
		return token
	}

	return ""
}
