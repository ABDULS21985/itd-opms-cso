package types

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type contextKey string

const (
	authContextKey        contextKey = "auth_context"
	correlationIDKey      contextKey = "correlation_id"
	clientIPKey           contextKey = "client_ip"
)

// AuthContext holds the authenticated user's identity, permissions, and org scope.
type AuthContext struct {
	UserID      uuid.UUID `json:"userId"`
	TenantID    uuid.UUID `json:"tenantId"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	Roles       []string  `json:"roles"`
	Permissions []string  `json:"permissions"`
	IssuedAt    time.Time `json:"issuedAt"`

	// Org scope fields — populated by OrgScope middleware, NOT stored in JWT.
	OrgUnitID     uuid.UUID   `json:"orgUnitId"`
	OrgLevel      string      `json:"orgLevel"`
	VisibleOrgIDs []uuid.UUID `json:"-"`
	IsGlobalScope bool        `json:"isGlobalScope"`
}

// HasPermission checks if the user has a specific permission.
func (a *AuthContext) HasPermission(permission string) bool {
	for _, p := range a.Permissions {
		if p == "*" || p == permission {
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

// HasOrgAccess checks if the user can access records belonging to the given org unit.
// Returns true if: the user has global scope, the orgUnitID is nil (tenant-visible),
// or the orgUnitID is in the user's visible org unit list.
func (a *AuthContext) HasOrgAccess(orgUnitID uuid.UUID) bool {
	if a.IsGlobalScope {
		return true
	}
	if orgUnitID == uuid.Nil {
		return true
	}
	for _, id := range a.VisibleOrgIDs {
		if id == orgUnitID {
			return true
		}
	}
	return false
}

// OrgScopeFilter returns the list of visible org unit IDs for use in SQL
// WHERE org_unit_id = ANY($N) clauses. Returns nil for global-scope users
// (caller should skip the org filter entirely).
func (a *AuthContext) OrgScopeFilter() []uuid.UUID {
	if a.IsGlobalScope {
		return nil
	}
	return a.VisibleOrgIDs
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

// SetClientIP stores the client IP address in the context.
func SetClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, clientIPKey, ip)
}

// GetClientIP retrieves the client IP address from the context.
func GetClientIP(ctx context.Context) string {
	if ip, ok := ctx.Value(clientIPKey).(string); ok {
		return ip
	}
	return ""
}
