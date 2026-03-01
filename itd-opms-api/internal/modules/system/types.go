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

// CreateUserRequest is the payload for creating a new user.
type CreateUserRequest struct {
	Email       string  `json:"email"`
	DisplayName string  `json:"displayName"`
	JobTitle    *string `json:"jobTitle"`
	Department  *string `json:"department"`
	Office      *string `json:"office"`
	Unit        *string `json:"unit"`
	Phone       *string `json:"phone"`
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

// ──────────────────────────────────────────────
// Tenant Management Types
// ──────────────────────────────────────────────

// TenantDetail is the full tenant view for admin.
type TenantDetail struct {
	ID         uuid.UUID       `json:"id"`
	Name       string          `json:"name"`
	Code       string          `json:"code"`
	Type       string          `json:"type"`
	ParentID   *uuid.UUID      `json:"parentId"`
	ParentName string          `json:"parentName"`
	IsActive   bool            `json:"isActive"`
	Config     json.RawMessage `json:"config"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
	UserCount  int             `json:"userCount"`
	Children   []TenantSummary `json:"children"`
}

// TenantSummary is a minimal tenant view for tree/children.
type TenantSummary struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	Type      string    `json:"type"`
	IsActive  bool      `json:"isActive"`
	UserCount int       `json:"userCount"`
}

// CreateTenantRequest is the payload for creating a tenant.
type CreateTenantRequest struct {
	Name     string          `json:"name"`
	Code     string          `json:"code"`
	Type     string          `json:"type"`
	ParentID *uuid.UUID      `json:"parentId"`
	Config   json.RawMessage `json:"config"`
}

// UpdateTenantRequest is the payload for updating a tenant.
type UpdateTenantRequest struct {
	Name     *string          `json:"name"`
	Config   *json.RawMessage `json:"config"`
	IsActive *bool            `json:"isActive"`
}

// ──────────────────────────────────────────────
// Org Unit Management Types
// ──────────────────────────────────────────────

// OrgUnitDetail is the full org unit view for admin.
type OrgUnitDetail struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenantId"`
	Name          string          `json:"name"`
	Code          string          `json:"code"`
	Level         string          `json:"level"`
	ParentID      *uuid.UUID      `json:"parentId"`
	ParentName    string          `json:"parentName"`
	ManagerUserID *uuid.UUID      `json:"managerUserId"`
	ManagerName   string          `json:"managerName"`
	IsActive      bool            `json:"isActive"`
	Metadata      json.RawMessage `json:"metadata"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
	ChildCount    int             `json:"childCount"`
	UserCount     int             `json:"userCount"`
}

// OrgTreeNode represents a node in the org hierarchy tree.
type OrgTreeNode struct {
	ID          uuid.UUID     `json:"id"`
	Name        string        `json:"name"`
	Code        string        `json:"code"`
	Level       string        `json:"level"`
	ManagerName string        `json:"managerName"`
	UserCount   int           `json:"userCount"`
	Children    []OrgTreeNode `json:"children"`
}

// CreateOrgUnitRequest is the payload for creating an org unit.
type CreateOrgUnitRequest struct {
	Name          string     `json:"name"`
	Code          string     `json:"code"`
	Level         string     `json:"level"`
	ParentID      *uuid.UUID `json:"parentId"`
	ManagerUserID *uuid.UUID `json:"managerUserId"`
}

// UpdateOrgUnitRequest is the payload for updating an org unit.
type UpdateOrgUnitRequest struct {
	Name          *string    `json:"name"`
	ManagerUserID *uuid.UUID `json:"managerUserId"`
	IsActive      *bool      `json:"isActive"`
}

// MoveOrgUnitRequest is the payload for moving an org unit in the hierarchy.
type MoveOrgUnitRequest struct {
	NewParentID uuid.UUID `json:"newParentId"`
}

// ──────────────────────────────────────────────
// Platform Health Types
// ──────────────────────────────────────────────

// PlatformHealth is the comprehensive health check response.
type PlatformHealth struct {
	Status    string          `json:"status"` // healthy, degraded, unhealthy
	Uptime    string          `json:"uptime"`
	Version   string          `json:"version"`
	GoVersion string          `json:"goVersion"`
	Services  []ServiceHealth `json:"services"`
	Timestamp time.Time       `json:"timestamp"`
}

// ServiceHealth is the health status for a single infrastructure service.
type ServiceHealth struct {
	Name    string `json:"name"`    // postgres, redis, minio, nats
	Status  string `json:"status"`  // up, down, degraded
	Latency string `json:"latency"` // "2ms"
	Details string `json:"details"` // version, connection count, etc.
}

// ──────────────────────────────────────────────
// System Statistics Types
// ──────────────────────────────────────────────

// SystemStats holds cross-module statistics for the system dashboard.
type SystemStats struct {
	Users       UserStats     `json:"users"`
	Sessions    SessionStats  `json:"sessions"`
	AuditEvents AuditStats    `json:"auditEvents"`
	Storage     StorageStats  `json:"storage"`
	Database    DatabaseStats `json:"database"`
	Modules     []ModuleStats `json:"modules"`
}

// UserStats holds user count breakdowns.
type UserStats struct {
	TotalUsers    int `json:"totalUsers"`
	ActiveUsers   int `json:"activeUsers"`
	InactiveUsers int `json:"inactiveUsers"`
	OnlineNow     int `json:"onlineNow"`
	NewThisMonth  int `json:"newThisMonth"`
}

// SessionStats holds active session information.
type SessionStats struct {
	ActiveSessions int            `json:"activeSessions"`
	UniqueUsers    int            `json:"uniqueUsers"`
	ByDevice       map[string]int `json:"byDevice"`
}

// AuditStats holds audit event statistics.
type AuditStats struct {
	TotalEvents     int64      `json:"totalEvents"`
	EventsToday     int        `json:"eventsToday"`
	EventsThisWeek  int        `json:"eventsThisWeek"`
	IntegrityStatus string     `json:"integrityStatus"` // verified, unverified, failed
	LastVerified    *time.Time `json:"lastVerified"`
}

// StorageStats holds object storage metrics.
type StorageStats struct {
	TotalObjects  int64  `json:"totalObjects"`
	TotalSize     string `json:"totalSize"` // human-readable
	EvidenceItems int    `json:"evidenceItems"`
	Attachments   int    `json:"attachments"`
}

// DatabaseStats holds database-level metrics.
type DatabaseStats struct {
	Size              string `json:"size"` // database size
	TableCount        int    `json:"tableCount"`
	ActiveConnections int    `json:"activeConnections"`
	MaxConnections    int    `json:"maxConnections"`
}

// ModuleStats holds per-module record counts and activity.
type ModuleStats struct {
	Name         string     `json:"name"`
	RecordCount  int64      `json:"recordCount"`
	ActiveItems  int        `json:"activeItems"`
	LastActivity *time.Time `json:"lastActivity"`
}

// ──────────────────────────────────────────────
// Directory Sync Types
// ──────────────────────────────────────────────

// DirectorySyncStatus holds the current Entra ID directory sync info.
type DirectorySyncStatus struct {
	Enabled        bool       `json:"enabled"`
	LastSync       *time.Time `json:"lastSync"`
	LastSyncStatus string     `json:"lastSyncStatus"` // success, failed, partial
	NextScheduled  *time.Time `json:"nextScheduled"`
	UsersAdded     int        `json:"usersAdded"`
	UsersUpdated   int        `json:"usersUpdated"`
	UsersRemoved   int        `json:"usersRemoved"`
	SyncHistory    []SyncRun  `json:"syncHistory"`
}

// SyncRun represents a single directory sync run record.
type SyncRun struct {
	ID           uuid.UUID  `json:"id"`
	Status       string     `json:"status"`
	StartedAt    time.Time  `json:"startedAt"`
	CompletedAt  *time.Time `json:"completedAt"`
	UsersAdded   int        `json:"usersAdded"`
	UsersUpdated int        `json:"usersUpdated"`
	UsersRemoved int        `json:"usersRemoved"`
	Errors       int        `json:"errors"`
	ErrorDetails string     `json:"errorDetails"`
}

// ──────────────────────────────────────────────
// System Settings Types
// ──────────────────────────────────────────────

// SystemSetting represents a single system setting.
type SystemSetting struct {
	ID          uuid.UUID       `json:"id"`
	TenantID    *uuid.UUID      `json:"tenantId"`
	Category    string          `json:"category"`
	Key         string          `json:"key"`
	Value       json.RawMessage `json:"value"`
	Description *string         `json:"description"`
	IsSecret    bool            `json:"isSecret"`
	UpdatedBy   *uuid.UUID      `json:"updatedBy"`
	UpdatedAt   time.Time       `json:"updatedAt"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// UpdateSettingRequest is the payload for updating a setting value.
type UpdateSettingRequest struct {
	Value json.RawMessage `json:"value"`
}

// ──────────────────────────────────────────────
// Audit Explorer Types
// ──────────────────────────────────────────────

// AuditExplorerParams holds query params for the advanced audit log explorer.
type AuditExplorerParams struct {
	Page       int        `json:"page"`
	PageSize   int        `json:"pageSize"`
	DateFrom   *time.Time `json:"dateFrom"`
	DateTo     *time.Time `json:"dateTo"`
	ActorID    string     `json:"actorId"`
	EntityType string     `json:"entityType"`
	EntityID   string     `json:"entityId"`
	Action     string     `json:"action"`
	Search     string     `json:"search"`
	SortBy     string     `json:"sortBy"`
	SortOrder  string     `json:"sortOrder"`
}

// AuditEventDetail is an enhanced audit event with actor display name.
type AuditEventDetail struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenantId"`
	ActorID       uuid.UUID       `json:"actorId"`
	ActorName     string          `json:"actorName"`
	ActorRole     string          `json:"actorRole"`
	Action        string          `json:"action"`
	EntityType    string          `json:"entityType"`
	EntityID      uuid.UUID       `json:"entityId"`
	Changes       json.RawMessage `json:"changes,omitempty"`
	PreviousState json.RawMessage `json:"previousState,omitempty"`
	IPAddress     string          `json:"ipAddress"`
	UserAgent     string          `json:"userAgent"`
	CorrelationID string          `json:"correlationId"`
	Checksum      string          `json:"checksum"`
	CreatedAt     time.Time       `json:"createdAt"`
}

// AuditStatsResponse holds aggregated audit statistics for the dashboard.
type AuditStatsResponse struct {
	EventsPerDay []AuditDayStat    `json:"eventsPerDay"`
	TopActors    []AuditActorStat  `json:"topActors"`
	TopEntities  []AuditEntityStat `json:"topEntities"`
	TopActions   []AuditActionStat `json:"topActions"`
	TotalEvents  int64             `json:"totalEvents"`
}

// AuditDayStat is the count of audit events for a single day.
type AuditDayStat struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// AuditActorStat is an actor's event count.
type AuditActorStat struct {
	ActorID   uuid.UUID `json:"actorId"`
	ActorName string    `json:"actorName"`
	Count     int       `json:"count"`
}

// AuditEntityStat is an entity type event count.
type AuditEntityStat struct {
	EntityType string `json:"entityType"`
	Count      int    `json:"count"`
}

// AuditActionStat is an action event count.
type AuditActionStat struct {
	Action string `json:"action"`
	Count  int    `json:"count"`
}

// IntegrityVerifyRequest is the payload for verifying audit integrity.
type IntegrityVerifyRequest struct {
	DateFrom *time.Time `json:"dateFrom"`
	DateTo   *time.Time `json:"dateTo"`
}

// ──────────────────────────────────────────────
// Session Management Types
// ──────────────────────────────────────────────

// ActiveSession represents an active user session.
type ActiveSession struct {
	ID         uuid.UUID       `json:"id"`
	UserID     uuid.UUID       `json:"userId"`
	UserName   string          `json:"userName"`
	UserEmail  string          `json:"userEmail"`
	TenantID   uuid.UUID       `json:"tenantId"`
	IPAddress  string          `json:"ipAddress"`
	UserAgent  string          `json:"userAgent"`
	DeviceInfo json.RawMessage `json:"deviceInfo"`
	Location   string          `json:"location"`
	CreatedAt  time.Time       `json:"createdAt"`
	LastActive time.Time       `json:"lastActive"`
	ExpiresAt  time.Time       `json:"expiresAt"`
	IsRevoked  bool            `json:"isRevoked"`
}

// ──────────────────────────────────────────────
// Email Template Types
// ──────────────────────────────────────────────

// EmailTemplate represents an email template.
type EmailTemplate struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  *uuid.UUID      `json:"tenantId"`
	Name      string          `json:"name"`
	Subject   string          `json:"subject"`
	BodyHTML  string          `json:"bodyHtml"`
	BodyText  *string         `json:"bodyText"`
	Variables json.RawMessage `json:"variables"`
	Category  string          `json:"category"`
	IsActive  bool            `json:"isActive"`
	UpdatedBy *uuid.UUID      `json:"updatedBy"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// CreateEmailTemplateRequest is the payload for creating an email template.
type CreateEmailTemplateRequest struct {
	Name      string          `json:"name"`
	Subject   string          `json:"subject"`
	BodyHTML  string          `json:"bodyHtml"`
	BodyText  string          `json:"bodyText"`
	Variables json.RawMessage `json:"variables"`
	Category  string          `json:"category"`
}

// UpdateEmailTemplateRequest is the payload for updating an email template.
type UpdateEmailTemplateRequest struct {
	Subject   *string          `json:"subject"`
	BodyHTML  *string          `json:"bodyHtml"`
	BodyText  *string          `json:"bodyText"`
	Variables *json.RawMessage `json:"variables"`
	IsActive  *bool            `json:"isActive"`
}

// TemplatePreviewRequest is the payload for previewing a rendered template.
type TemplatePreviewRequest struct {
	Variables map[string]string `json:"variables"`
}

// ──────────────────────────────────────────────
// Org Analytics Types
// ──────────────────────────────────────────────

// OrgAnalyticsResponse contains aggregated org structure analytics.
type OrgAnalyticsResponse struct {
	TotalUnits       int                `json:"totalUnits"`
	ActiveUnits      int                `json:"activeUnits"`
	InactiveUnits    int                `json:"inactiveUnits"`
	MaxDepth         int                `json:"maxDepth"`
	AvgSpanOfControl float64            `json:"avgSpanOfControl"`
	VacantLeadership float64            `json:"vacantLeadership"`
	TotalHeadcount   int                `json:"totalHeadcount"`
	HeadcountByLevel []LevelHeadcount   `json:"headcountByLevel"`
	SpanDistribution []SpanRange        `json:"spanDistribution"`
	UnitsByLevel     []LevelCount       `json:"unitsByLevel"`
	RecentChanges    []OrgRecentChange  `json:"recentChanges"`
	GrowthTimeline   []OrgGrowthPoint   `json:"growthTimeline"`
}

// LevelHeadcount holds headcount and unit count for a single org level.
type LevelHeadcount struct {
	Level     string `json:"level"`
	Count     int    `json:"count"`
	UnitCount int    `json:"unitCount"`
}

// SpanRange holds the count of parent units within a span-of-control range.
type SpanRange struct {
	Range string `json:"range"`
	Count int    `json:"count"`
}

// LevelCount holds a count of org units at a given level.
type LevelCount struct {
	Level string `json:"level"`
	Count int    `json:"count"`
}

// OrgRecentChange represents a recent audit event for an org unit.
type OrgRecentChange struct {
	Action    string `json:"action"`
	UnitName  string `json:"unitName"`
	ChangedBy string `json:"changedBy"`
	ChangedAt string `json:"changedAt"`
}

// OrgGrowthPoint represents cumulative org unit count at a point in time.
type OrgGrowthPoint struct {
	Month      string `json:"month"`
	Cumulative int    `json:"cumulative"`
}
