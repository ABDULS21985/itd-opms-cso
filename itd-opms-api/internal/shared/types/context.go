package types

import (
	"context"

	"github.com/google/uuid"
)

type contextKey string

const (
	authContextKey        contextKey = "auth_context"
	correlationIDKey      contextKey = "correlation_id"
)

// AuthContext holds the authenticated user's identity and permissions.
type AuthContext struct {
	UserID      uuid.UUID `json:"userId"`
	TenantID    uuid.UUID `json:"tenantId"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	Roles       []string  `json:"roles"`
	Permissions []string  `json:"permissions"`
}

// HasPermission checks if the user has a specific permission.
func (a *AuthContext) HasPermission(permission string) bool {
	for _, p := range a.Permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// HasRole checks if the user has a specific role.
func (a *AuthContext) HasRole(role string) bool {
	for _, r := range a.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// SetAuthContext stores the auth context in the request context.
func SetAuthContext(ctx context.Context, auth *AuthContext) context.Context {
	return context.WithValue(ctx, authContextKey, auth)
}

// GetAuthContext retrieves the auth context from the request context.
func GetAuthContext(ctx context.Context) *AuthContext {
	if auth, ok := ctx.Value(authContextKey).(*AuthContext); ok {
		return auth
	}
	return nil
}

// SetCorrelationID stores the correlation ID in the context.
func SetCorrelationID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, correlationIDKey, id)
}

// GetCorrelationID retrieves the correlation ID from the context.
func GetCorrelationID(ctx context.Context) string {
	if id, ok := ctx.Value(correlationIDKey).(string); ok {
		return id
	}
	return ""
}
