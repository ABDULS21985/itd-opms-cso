package system

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// User Management Types
// ──────────────────────────────────────────────

// ListUsersParams holds query params for the user listing endpoint.
type ListUsersParams struct {
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
	Search     string `json:"search"`
	RoleFilter string `json:"role"`
	Status     string `json:"status"`
	Department string `json:"department"`
	SortBy     string `json:"sortBy"`
	SortOrder  string `json:"sortOrder"`
}

// UserDetail is the full user profile returned for admin views.
type UserDetail struct {
	ID          uuid.UUID       `json:"id"`
	EntraID     *string         `json:"entraId"`
	Email       string          `json:"email"`
	DisplayName string          `json:"displayName"`
	JobTitle    *string         `json:"jobTitle"`
	Department  *string         `json:"department"`
	Office      *string         `json:"office"`
	Unit        *string         `json:"unit"`
	TenantID    uuid.UUID       `json:"tenantId"`
	TenantName  string          `json:"tenantName"`
	PhotoURL    *string         `json:"photoUrl"`
	Phone       *string         `json:"phone"`
	IsActive    bool            `json:"isActive"`
	LastLoginAt *time.Time      `json:"lastLoginAt"`
	Metadata    json.RawMessage `json:"metadata"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
	Roles       []RoleBinding   `json:"roles"`
	Delegations []Delegation    `json:"delegations"`
}

// UserSearchResult is the minimal user info for autocomplete.
type UserSearchResult struct {
	ID          uuid.UUID `json:"id"`
	DisplayName string    `json:"displayName"`
	Email       string    `json:"email"`
	PhotoURL    *string   `json:"photoUrl"`
	Department  *string   `json:"department"`
	IsActive    bool      `json:"isActive"`
}

// UpdateUserRequest is the admin user update payload.
type UpdateUserRequest struct {
	DisplayName *string `json:"displayName"`
	JobTitle    *string `json:"jobTitle"`
	Department  *string `json:"department"`
	Office      *string `json:"office"`
	Unit        *string `json:"unit"`
	Phone       *string `json:"phone"`
	IsActive    *bool   `json:"isActive"`
}

// AssignRoleRequest is the payload for assigning a role to a user.
type AssignRoleRequest struct {
	RoleID    uuid.UUID  `json:"roleId"`
	ScopeType string     `json:"scopeType"`
	ScopeID   *uuid.UUID `json:"scopeId"`
	ExpiresAt *time.Time `json:"expiresAt"`
}

// CreateDelegationRequest is the payload for creating a delegation.
type CreateDelegationRequest struct {
	DelegateID uuid.UUID `json:"delegateId"`
	RoleID     uuid.UUID `json:"roleId"`
	Reason     string    `json:"reason"`
	StartsAt   time.Time `json:"startsAt"`
	EndsAt     time.Time `json:"endsAt"`
}

// ──────────────────────────────────────────────
// Role Management Types
// ──────────────────────────────────────────────

// RoleDetail is the full role view for admin.
type RoleDetail struct {
	ID          uuid.UUID       `json:"id"`
	Name        string          `json:"name"`
	Description *string         `json:"description"`
	Permissions json.RawMessage `json:"permissions"`
	IsSystem    bool            `json:"isSystem"`
	CreatedAt   time.Time       `json:"createdAt"`
	UserCount   int64           `json:"userCount"`
}

// CreateRoleRequest is the payload for creating a custom role.
type CreateRoleRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

// UpdateRoleRequest is the payload for updating a role.
type UpdateRoleRequest struct {
	Description *string  `json:"description"`
	Permissions []string `json:"permissions"`
}

// RoleBinding represents a user-role assignment.
type RoleBinding struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"userId"`
	RoleID    uuid.UUID  `json:"roleId"`
	RoleName  string     `json:"roleName"`
	TenantID  uuid.UUID  `json:"tenantId"`
	ScopeType string     `json:"scopeType"`
	ScopeID   *uuid.UUID `json:"scopeId"`
	GrantedBy *uuid.UUID `json:"grantedBy"`
	GrantedAt time.Time  `json:"grantedAt"`
	ExpiresAt *time.Time `json:"expiresAt"`
	IsActive  bool       `json:"isActive"`
}

// Delegation represents a time-bound role delegation.
type Delegation struct {
	ID            uuid.UUID  `json:"id"`
	DelegatorID   uuid.UUID  `json:"delegatorId"`
	DelegatorName string     `json:"delegatorName"`
	DelegateID    uuid.UUID  `json:"delegateId"`
	DelegateName  string     `json:"delegateName"`
	RoleID        uuid.UUID  `json:"roleId"`
	RoleName      string     `json:"roleName"`
	TenantID      uuid.UUID  `json:"tenantId"`
	Reason        string     `json:"reason"`
	ApprovedBy    *uuid.UUID `json:"approvedBy"`
	StartsAt      time.Time  `json:"startsAt"`
	EndsAt        time.Time  `json:"endsAt"`
	IsActive      bool       `json:"isActive"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// PermissionCatalog groups permissions by module.
type PermissionCatalog struct {
	Module      string   `json:"module"`
	Permissions []string `json:"permissions"`
}
