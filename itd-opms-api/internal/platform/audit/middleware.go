package audit

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// AuditMiddleware returns a middleware that automatically logs mutating HTTP
// requests (POST, PUT, PATCH, DELETE) to the audit service. Non-mutating
// requests (GET, HEAD, OPTIONS) are passed through without logging.
func AuditMiddleware(service *AuditService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only log mutating requests.
			if !isMutatingMethod(r.Method) {
				next.ServeHTTP(w, r)
				return
			}

			// Serve the request first so downstream handlers execute.
			next.ServeHTTP(w, r)

			// Extract identity from context (set by auth middleware).
			auth := types.GetAuthContext(r.Context())
			if auth == nil {
				// No authenticated user; skip audit logging.
				return
			}

			// Derive entity information from the request URL.
			entityType, entityID := extractEntityInfo(r)

			// Determine the actor's primary role.
			actorRole := ""
			if len(auth.Roles) > 0 {
				actorRole = auth.Roles[0]
			}

			// Build the action string from the HTTP method and path.
			action := buildAction(r.Method, r.URL.Path)

			entry := AuditEntry{
				TenantID:      auth.TenantID,
				ActorID:       auth.UserID,
				ActorRole:     actorRole,
				Action:        action,
				EntityType:    entityType,
				EntityID:      entityID,
				IPAddress:     clientIP(r),
				UserAgent:     r.UserAgent(),
				CorrelationID: types.GetCorrelationID(r.Context()),
			}

			if err := service.Log(r.Context(), entry); err != nil {
				slog.ErrorContext(r.Context(), "failed to log audit event",
					"error", err,
					"action", action,
					"entity_type", entityType,
				)
			}
		})
	}
}

// isMutatingMethod returns true for HTTP methods that modify state.
func isMutatingMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

// extractEntityInfo derives an entity type and entity ID from the request URL.
// It looks at chi route context URL params and path segments.
func extractEntityInfo(r *http.Request) (entityType string, entityID uuid.UUID) {
	// Try to extract a meaningful entity type from the URL path.
	// Example: /api/v1/governance/policies/abc-123 -> entityType="policies", entityID=abc-123
	segments := strings.Split(strings.Trim(r.URL.Path, "/"), "/")

	// Walk backwards to find UUID-like ID and preceding entity name.
	for i := len(segments) - 1; i >= 0; i-- {
		if parsed, err := uuid.Parse(segments[i]); err == nil {
			entityID = parsed
			if i > 0 {
				entityType = segments[i-1]
			}
			return
		}
	}

	// Fall back to chi route params if available.
	rctx := chi.RouteContext(r.Context())
	if rctx != nil {
		params := rctx.URLParams
		for i, key := range params.Keys {
			if i < len(params.Values) {
				if parsed, err := uuid.Parse(params.Values[i]); err == nil {
					entityID = parsed
					// Use param key as a hint for entity type.
					entityType = strings.TrimSuffix(key, "ID")
					return
				}
			}
		}
	}

	// If no UUID found, use the last path segment as entity type.
	if len(segments) > 0 {
		entityType = segments[len(segments)-1]
	}

	return
}

// buildAction creates a human-readable action string from the HTTP method and
// URL path. For example: POST /api/v1/governance/policies -> "create:policies".
func buildAction(method, path string) string {
	verb := methodVerb(method)

	segments := strings.Split(strings.Trim(path, "/"), "/")
	// Find the resource segment (skip api, version, module prefix).
	resource := "unknown"
	for i := len(segments) - 1; i >= 0; i-- {
		seg := segments[i]
		// Skip UUID-like segments.
		if _, err := uuid.Parse(seg); err != nil {
			resource = seg
			break
		}
	}

	return verb + ":" + resource
}

// methodVerb maps an HTTP method to a CRUD verb.
func methodVerb(method string) string {
	switch method {
	case http.MethodPost:
		return "create"
	case http.MethodPut:
		return "update"
	case http.MethodPatch:
		return "update"
	case http.MethodDelete:
		return "delete"
	default:
		return "unknown"
	}
}

// clientIP extracts the client IP address from the request, preferring
// the X-Forwarded-For and X-Real-IP headers over RemoteAddr.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return xrip
	}
	// RemoteAddr may include port; strip it.
	addr := r.RemoteAddr
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		return addr[:idx]
	}
	return addr
}

// init registers json.RawMessage as a known type (prevents import cycle issues).
var _ json.RawMessage
