package people

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Proficiency level constants
// ──────────────────────────────────────────────

const (
	ProficiencyLevelBeginner     = "beginner"
	ProficiencyLevelIntermediate = "intermediate"
	ProficiencyLevelAdvanced     = "advanced"
	ProficiencyLevelExpert       = "expert"
)

// ──────────────────────────────────────────────
// Checklist type constants
// ──────────────────────────────────────────────

const (
	ChecklistTypeOnboarding  = "onboarding"
	ChecklistTypeOffboarding = "offboarding"
)

// ──────────────────────────────────────────────
// Checklist status constants
// ──────────────────────────────────────────────

const (
	ChecklistStatusPending    = "pending"
	ChecklistStatusInProgress = "in_progress"
	ChecklistStatusCompleted  = "completed"
	ChecklistStatusCancelled  = "cancelled"
)

// ──────────────────────────────────────────────
// Task status constants
// ──────────────────────────────────────────────

const (
	TaskStatusPending    = "pending"
	TaskStatusInProgress = "in_progress"
	TaskStatusCompleted  = "completed"
	TaskStatusSkipped    = "skipped"
)

// ──────────────────────────────────────────────
// Roster status constants
// ──────────────────────────────────────────────

const (
	RosterStatusDraft     = "draft"
	RosterStatusPublished = "published"
	RosterStatusArchived  = "archived"
)

// ──────────────────────────────────────────────
// Leave status constants
// ──────────────────────────────────────────────

const (
	LeaveStatusPending   = "pending"
	LeaveStatusApproved  = "approved"
	LeaveStatusRejected  = "rejected"
	LeaveStatusCancelled = "cancelled"
)

// ──────────────────────────────────────────────
// Training type constants
// ──────────────────────────────────────────────

const (
	TrainingTypeCourse        = "course"
	TrainingTypeCertification = "certification"
	TrainingTypeWorkshop      = "workshop"
	TrainingTypeConference    = "conference"
)

// ──────────────────────────────────────────────
// Training status constants
// ──────────────────────────────────────────────

const (
	TrainingStatusPlanned    = "planned"
	TrainingStatusInProgress = "in_progress"
	TrainingStatusCompleted  = "completed"
	TrainingStatusExpired    = "expired"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// SkillCategory represents a hierarchical grouping of skills.
type SkillCategory struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// Skill represents an individual skill within a category.
type Skill struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	CategoryID  uuid.UUID `json:"categoryId"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// UserSkill represents a user's proficiency in a specific skill.
type UserSkill struct {
	ID                  uuid.UUID  `json:"id"`
	TenantID            uuid.UUID  `json:"tenantId"`
	UserID              uuid.UUID  `json:"userId"`
	SkillID             uuid.UUID  `json:"skillId"`
	ProficiencyLevel    string     `json:"proficiencyLevel"`
	Certified           bool       `json:"certified"`
	CertificationName   *string    `json:"certificationName"`
	CertificationExpiry *time.Time `json:"certificationExpiry"`
	VerifiedBy          *uuid.UUID `json:"verifiedBy"`
	VerifiedAt          *time.Time `json:"verifiedAt"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// RoleSkillRequirement defines the required skill level for a specific role type.
type RoleSkillRequirement struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenantId"`
	RoleType      string    `json:"roleType"`
	SkillID       uuid.UUID `json:"skillId"`
	RequiredLevel string    `json:"requiredLevel"`
	CreatedAt     time.Time `json:"createdAt"`
}

// SkillGapEntry represents a single row in the skill gap analysis result.
type SkillGapEntry struct {
	SkillName     string `json:"skillName"`
	RequiredLevel string `json:"requiredLevel"`
	CurrentLevel  string `json:"currentLevel"`
}

// ChecklistTemplate defines a reusable onboarding/offboarding checklist template.
type ChecklistTemplate struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  uuid.UUID       `json:"tenantId"`
	Type      string          `json:"type"`
	Name      string          `json:"name"`
	RoleType  *string         `json:"roleType"`
	Tasks     json.RawMessage `json:"tasks"`
	IsActive  bool            `json:"isActive"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// Checklist represents an instantiated onboarding/offboarding checklist for a user.
type Checklist struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenantId"`
	TemplateID    *uuid.UUID `json:"templateId"`
	UserID        uuid.UUID  `json:"userId"`
	Type          string     `json:"type"`
	Status        string     `json:"status"`
	CompletionPct float64    `json:"completionPct"`
	StartedAt     *time.Time `json:"startedAt"`
	CompletedAt   *time.Time `json:"completedAt"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// ChecklistTask represents a single task within a checklist.
type ChecklistTask struct {
	ID            uuid.UUID  `json:"id"`
	ChecklistID   uuid.UUID  `json:"checklistId"`
	Title         string     `json:"title"`
	Description   *string    `json:"description"`
	AssigneeID    *uuid.UUID `json:"assigneeId"`
	Status        string     `json:"status"`
	DueDate       *time.Time `json:"dueDate"`
	CompletedAt   *time.Time `json:"completedAt"`
	CompletedBy   *uuid.UUID `json:"completedBy"`
	EvidenceDocID *uuid.UUID `json:"evidenceDocId"`
	Notes         *string    `json:"notes"`
	SortOrder     int        `json:"sortOrder"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// Roster represents a team shift roster for a given period.
type Roster struct {
	ID          uuid.UUID       `json:"id"`
	TenantID    uuid.UUID       `json:"tenantId"`
	TeamID      *uuid.UUID      `json:"teamId"`
	Name        string          `json:"name"`
	PeriodStart time.Time       `json:"periodStart"`
	PeriodEnd   time.Time       `json:"periodEnd"`
	Status      string          `json:"status"`
	Shifts      json.RawMessage `json:"shifts"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

// LeaveRecord represents a leave/absence request for a user.
type LeaveRecord struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	UserID     uuid.UUID  `json:"userId"`
	LeaveType  string     `json:"leaveType"`
	StartDate  time.Time  `json:"startDate"`
	EndDate    time.Time  `json:"endDate"`
	Status     string     `json:"status"`
	ApprovedBy *uuid.UUID `json:"approvedBy"`
	Notes      *string    `json:"notes"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

// CapacityAllocation represents a user's allocation percentage to a project for a period.
type CapacityAllocation struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenantId"`
	UserID        uuid.UUID  `json:"userId"`
	ProjectID     *uuid.UUID `json:"projectId"`
	AllocationPct float64    `json:"allocationPct"`
	PeriodStart   time.Time  `json:"periodStart"`
	PeriodEnd     time.Time  `json:"periodEnd"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// TrainingRecord represents a training activity (course, certification, workshop, conference).
type TrainingRecord struct {
	ID               uuid.UUID  `json:"id"`
	TenantID         uuid.UUID  `json:"tenantId"`
	UserID           uuid.UUID  `json:"userId"`
	Title            string     `json:"title"`
	Provider         *string    `json:"provider"`
	Type             string     `json:"type"`
	Status           string     `json:"status"`
	CompletedAt      *time.Time `json:"completedAt"`
	ExpiryDate       *time.Time `json:"expiryDate"`
	CertificateDocID *uuid.UUID `json:"certificateDocId"`
	Cost             *float64   `json:"cost"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateSkillCategoryRequest is the payload for creating a skill category.
type CreateSkillCategoryRequest struct {
	Name        string     `json:"name" validate:"required"`
	Description *string    `json:"description,omitempty"`
	ParentID    *uuid.UUID `json:"parentId,omitempty"`
}

// UpdateSkillCategoryRequest is the payload for updating a skill category.
type UpdateSkillCategoryRequest struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
}

// CreateSkillRequest is the payload for creating a skill.
type CreateSkillRequest struct {
	CategoryID  uuid.UUID `json:"categoryId" validate:"required"`
	Name        string    `json:"name" validate:"required"`
	Description *string   `json:"description,omitempty"`
}

// UpdateSkillRequest is the payload for updating a skill.
type UpdateSkillRequest struct {
	Name        *string    `json:"name"`
	CategoryID  *uuid.UUID `json:"categoryId"`
	Description *string    `json:"description"`
}

// CreateUserSkillRequest is the payload for adding a skill to a user.
type CreateUserSkillRequest struct {
	UserID              uuid.UUID  `json:"userId" validate:"required"`
	SkillID             uuid.UUID  `json:"skillId" validate:"required"`
	ProficiencyLevel    string     `json:"proficiencyLevel" validate:"required"`
	Certified           *bool      `json:"certified,omitempty"`
	CertificationName   *string    `json:"certificationName,omitempty"`
	CertificationExpiry *time.Time `json:"certificationExpiry,omitempty"`
}

// UpdateUserSkillRequest is the payload for updating a user's skill record.
type UpdateUserSkillRequest struct {
	ProficiencyLevel    *string    `json:"proficiencyLevel"`
	Certified           *bool      `json:"certified"`
	CertificationName   *string    `json:"certificationName"`
	CertificationExpiry *time.Time `json:"certificationExpiry"`
}

// CreateRoleSkillRequirementRequest is the payload for defining a role skill requirement.
type CreateRoleSkillRequirementRequest struct {
	RoleType      string    `json:"roleType" validate:"required"`
	SkillID       uuid.UUID `json:"skillId" validate:"required"`
	RequiredLevel string    `json:"requiredLevel" validate:"required"`
}

// CreateChecklistTemplateRequest is the payload for creating a checklist template.
type CreateChecklistTemplateRequest struct {
	Type     string           `json:"type" validate:"required"`
	Name     string           `json:"name" validate:"required"`
	RoleType *string          `json:"roleType,omitempty"`
	Tasks    *json.RawMessage `json:"tasks,omitempty"`
	IsActive *bool            `json:"isActive,omitempty"`
}

// UpdateChecklistTemplateRequest is the payload for updating a checklist template.
type UpdateChecklistTemplateRequest struct {
	Name     *string          `json:"name"`
	RoleType *string          `json:"roleType"`
	Tasks    *json.RawMessage `json:"tasks"`
	IsActive *bool            `json:"isActive"`
}

// CreateChecklistRequest is the payload for creating a checklist instance.
type CreateChecklistRequest struct {
	TemplateID *uuid.UUID `json:"templateId,omitempty"`
	UserID     uuid.UUID  `json:"userId" validate:"required"`
	Type       string     `json:"type" validate:"required"`
}

// UpdateChecklistStatusRequest is the payload for updating checklist status and progress.
type UpdateChecklistStatusRequest struct {
	Status        string     `json:"status" validate:"required"`
	CompletionPct *float64   `json:"completionPct,omitempty"`
	StartedAt     *time.Time `json:"startedAt,omitempty"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
}

// CreateChecklistTaskRequest is the payload for adding a task to a checklist.
type CreateChecklistTaskRequest struct {
	ChecklistID uuid.UUID  `json:"checklistId" validate:"required"`
	Title       string     `json:"title" validate:"required"`
	Description *string    `json:"description,omitempty"`
	AssigneeID  *uuid.UUID `json:"assigneeId,omitempty"`
	DueDate     *time.Time `json:"dueDate,omitempty"`
	SortOrder   *int       `json:"sortOrder,omitempty"`
}

// UpdateChecklistTaskRequest is the payload for updating a checklist task.
type UpdateChecklistTaskRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	AssigneeID  *uuid.UUID `json:"assigneeId"`
	Status      *string    `json:"status"`
	DueDate     *time.Time `json:"dueDate"`
	Notes       *string    `json:"notes"`
	SortOrder   *int       `json:"sortOrder"`
}

// CompleteChecklistTaskRequest is the payload for completing a checklist task.
type CompleteChecklistTaskRequest struct {
	EvidenceDocID *uuid.UUID `json:"evidenceDocId,omitempty"`
	Notes         *string    `json:"notes,omitempty"`
}

// CreateRosterRequest is the payload for creating a roster.
type CreateRosterRequest struct {
	TeamID      *uuid.UUID       `json:"teamId,omitempty"`
	Name        string           `json:"name" validate:"required"`
	PeriodStart time.Time        `json:"periodStart" validate:"required"`
	PeriodEnd   time.Time        `json:"periodEnd" validate:"required"`
	Shifts      *json.RawMessage `json:"shifts,omitempty"`
}

// UpdateRosterRequest is the payload for updating a roster.
type UpdateRosterRequest struct {
	Name        *string          `json:"name"`
	Status      *string          `json:"status"`
	PeriodStart *time.Time       `json:"periodStart"`
	PeriodEnd   *time.Time       `json:"periodEnd"`
	Shifts      *json.RawMessage `json:"shifts"`
}

// CreateLeaveRecordRequest is the payload for creating a leave record.
type CreateLeaveRecordRequest struct {
	UserID    uuid.UUID `json:"userId" validate:"required"`
	LeaveType string    `json:"leaveType" validate:"required"`
	StartDate time.Time `json:"startDate" validate:"required"`
	EndDate   time.Time `json:"endDate" validate:"required"`
	Notes     *string   `json:"notes,omitempty"`
}

// UpdateLeaveRecordStatusRequest is the payload for approving/rejecting a leave record.
type UpdateLeaveRecordStatusRequest struct {
	Status     string     `json:"status" validate:"required"`
	ApprovedBy *uuid.UUID `json:"approvedBy,omitempty"`
}

// CreateCapacityAllocationRequest is the payload for creating a capacity allocation.
type CreateCapacityAllocationRequest struct {
	UserID        uuid.UUID  `json:"userId" validate:"required"`
	ProjectID     *uuid.UUID `json:"projectId,omitempty"`
	AllocationPct float64    `json:"allocationPct" validate:"required"`
	PeriodStart   time.Time  `json:"periodStart" validate:"required"`
	PeriodEnd     time.Time  `json:"periodEnd" validate:"required"`
}

// UpdateCapacityAllocationRequest is the payload for updating a capacity allocation.
type UpdateCapacityAllocationRequest struct {
	ProjectID     *uuid.UUID `json:"projectId"`
	AllocationPct *float64   `json:"allocationPct"`
	PeriodStart   *time.Time `json:"periodStart"`
	PeriodEnd     *time.Time `json:"periodEnd"`
}

// CreateTrainingRecordRequest is the payload for creating a training record.
type CreateTrainingRecordRequest struct {
	UserID      uuid.UUID  `json:"userId" validate:"required"`
	Title       string     `json:"title" validate:"required"`
	Provider    *string    `json:"provider,omitempty"`
	Type        string     `json:"type" validate:"required"`
	Status      *string    `json:"status,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	Cost        *float64   `json:"cost,omitempty"`
	ExpiryDate  *time.Time `json:"expiryDate,omitempty"`
}

// UpdateTrainingRecordRequest is the payload for updating a training record.
type UpdateTrainingRecordRequest struct {
	Title            *string    `json:"title"`
	Provider         *string    `json:"provider"`
	Type             *string    `json:"type"`
	Status           *string    `json:"status"`
	CompletedAt      *time.Time `json:"completedAt"`
	ExpiryDate       *time.Time `json:"expiryDate"`
	CertificateDocID *uuid.UUID `json:"certificateDocId"`
	Cost             *float64   `json:"cost"`
}
