package people

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// SkillCategory represents a hierarchical skill category.
type SkillCategory struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// Skill represents a specific skill within a category.
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

// RoleSkillRequirement defines the skill requirements for a given role type.
type RoleSkillRequirement struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenantId"`
	RoleType      string    `json:"roleType"`
	SkillID       uuid.UUID `json:"skillId"`
	RequiredLevel string    `json:"requiredLevel"`
	CreatedAt     time.Time `json:"createdAt"`
}

// SkillGapEntry represents one entry in a skill gap analysis result.
type SkillGapEntry struct {
	SkillID       uuid.UUID `json:"skillId"`
	SkillName     string    `json:"skillName"`
	RequiredLevel string    `json:"requiredLevel"`
	CurrentLevel  *string   `json:"currentLevel"`
	HasGap        bool      `json:"hasGap"`
}

// ChecklistTemplate represents a reusable checklist template for onboarding/offboarding.
type ChecklistTemplate struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  uuid.UUID       `json:"tenantId"`
	Type      string          `json:"type"`
	RoleType  *string         `json:"roleType"`
	Name      string          `json:"name"`
	Tasks     json.RawMessage `json:"tasks"`
	IsActive  bool            `json:"isActive"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// Checklist represents an instantiated checklist for a specific user.
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

// ChecklistTask represents an individual task within a checklist.
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

// LeaveRecord represents a user's leave/absence record.
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

// CapacityAllocation represents a user's capacity allocation to a project.
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

// TrainingRecord represents a user's training, certification, or course record.
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
	Description *string    `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
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
	Description *string   `json:"description"`
}

// UpdateSkillRequest is the payload for updating a skill.
type UpdateSkillRequest struct {
	CategoryID  *uuid.UUID `json:"categoryId"`
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
}

// CreateUserSkillRequest is the payload for creating a user skill record.
type CreateUserSkillRequest struct {
	UserID              uuid.UUID `json:"userId" validate:"required"`
	SkillID             uuid.UUID `json:"skillId" validate:"required"`
	ProficiencyLevel    string    `json:"proficiencyLevel" validate:"required"`
	Certified           *bool     `json:"certified"`
	CertificationName   *string   `json:"certificationName"`
	CertificationExpiry *string   `json:"certificationExpiry"` // date string
}

// UpdateUserSkillRequest is the payload for updating a user skill record.
type UpdateUserSkillRequest struct {
	ProficiencyLevel    *string `json:"proficiencyLevel"`
	Certified           *bool   `json:"certified"`
	CertificationName   *string `json:"certificationName"`
	CertificationExpiry *string `json:"certificationExpiry"` // date string
}

// CreateRoleSkillRequirementRequest is the payload for creating a role skill requirement.
type CreateRoleSkillRequirementRequest struct {
	RoleType      string    `json:"roleType" validate:"required"`
	SkillID       uuid.UUID `json:"skillId" validate:"required"`
	RequiredLevel string    `json:"requiredLevel" validate:"required"`
}

// CreateChecklistTemplateRequest is the payload for creating a checklist template.
type CreateChecklistTemplateRequest struct {
	Type     string          `json:"type" validate:"required"`
	RoleType *string         `json:"roleType"`
	Name     string          `json:"name" validate:"required"`
	Tasks    json.RawMessage `json:"tasks"`
	IsActive *bool           `json:"isActive"`
}

// UpdateChecklistTemplateRequest is the payload for updating a checklist template.
type UpdateChecklistTemplateRequest struct {
	Type     *string         `json:"type"`
	RoleType *string         `json:"roleType"`
	Name     *string         `json:"name"`
	Tasks    json.RawMessage `json:"tasks"`
	IsActive *bool           `json:"isActive"`
}

// CreateChecklistRequest is the payload for creating a checklist instance.
type CreateChecklistRequest struct {
	TemplateID *uuid.UUID `json:"templateId"`
	UserID     uuid.UUID  `json:"userId" validate:"required"`
	Type       string     `json:"type" validate:"required"`
}

// UpdateChecklistStatusRequest is the payload for updating a checklist's status.
type UpdateChecklistStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

// CreateChecklistTaskRequest is the payload for creating a checklist task.
type CreateChecklistTaskRequest struct {
	ChecklistID   uuid.UUID  `json:"checklistId" validate:"required"`
	Title         string     `json:"title" validate:"required"`
	Description   *string    `json:"description"`
	AssigneeID    *uuid.UUID `json:"assigneeId"`
	DueDate       *string    `json:"dueDate"` // date string
	SortOrder     *int       `json:"sortOrder"`
}

// UpdateChecklistTaskRequest is the payload for updating a checklist task.
type UpdateChecklistTaskRequest struct {
	Title         *string    `json:"title"`
	Description   *string    `json:"description"`
	AssigneeID    *uuid.UUID `json:"assigneeId"`
	Status        *string    `json:"status"`
	DueDate       *string    `json:"dueDate"` // date string
	Notes         *string    `json:"notes"`
	EvidenceDocID *uuid.UUID `json:"evidenceDocId"`
	SortOrder     *int       `json:"sortOrder"`
}

// CompleteChecklistTaskRequest is the payload for completing a checklist task.
type CompleteChecklistTaskRequest struct {
	Notes         *string    `json:"notes"`
	EvidenceDocID *uuid.UUID `json:"evidenceDocId"`
}

// CreateRosterRequest is the payload for creating a roster.
type CreateRosterRequest struct {
	TeamID      *uuid.UUID      `json:"teamId"`
	Name        string          `json:"name" validate:"required"`
	PeriodStart string          `json:"periodStart" validate:"required"` // date string
	PeriodEnd   string          `json:"periodEnd" validate:"required"`   // date string
	Status      *string         `json:"status"`
	Shifts      json.RawMessage `json:"shifts"`
}

// UpdateRosterRequest is the payload for updating a roster.
type UpdateRosterRequest struct {
	TeamID      *uuid.UUID      `json:"teamId"`
	Name        *string         `json:"name"`
	PeriodStart *string         `json:"periodStart"` // date string
	PeriodEnd   *string         `json:"periodEnd"`   // date string
	Status      *string         `json:"status"`
	Shifts      json.RawMessage `json:"shifts"`
}

// CreateLeaveRecordRequest is the payload for creating a leave record.
type CreateLeaveRecordRequest struct {
	UserID    uuid.UUID `json:"userId" validate:"required"`
	LeaveType string    `json:"leaveType" validate:"required"`
	StartDate string    `json:"startDate" validate:"required"` // date string
	EndDate   string    `json:"endDate" validate:"required"`   // date string
	Notes     *string   `json:"notes"`
}

// UpdateLeaveRecordStatusRequest is the payload for updating a leave record status.
type UpdateLeaveRecordStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

// CreateCapacityAllocationRequest is the payload for creating a capacity allocation.
type CreateCapacityAllocationRequest struct {
	UserID        uuid.UUID  `json:"userId" validate:"required"`
	ProjectID     *uuid.UUID `json:"projectId"`
	AllocationPct float64    `json:"allocationPct" validate:"required"`
	PeriodStart   string     `json:"periodStart" validate:"required"` // date string
	PeriodEnd     string     `json:"periodEnd" validate:"required"`   // date string
}

// UpdateCapacityAllocationRequest is the payload for updating a capacity allocation.
type UpdateCapacityAllocationRequest struct {
	ProjectID     *uuid.UUID `json:"projectId"`
	AllocationPct *float64   `json:"allocationPct"`
	PeriodStart   *string    `json:"periodStart"` // date string
	PeriodEnd     *string    `json:"periodEnd"`   // date string
}

// CreateTrainingRecordRequest is the payload for creating a training record.
type CreateTrainingRecordRequest struct {
	UserID           uuid.UUID  `json:"userId" validate:"required"`
	Title            string     `json:"title" validate:"required"`
	Provider         *string    `json:"provider"`
	Type             string     `json:"type" validate:"required"`
	Status           *string    `json:"status"`
	ExpiryDate       *string    `json:"expiryDate"` // date string
	CertificateDocID *uuid.UUID `json:"certificateDocId"`
	Cost             *float64   `json:"cost"`
}

// UpdateTrainingRecordRequest is the payload for updating a training record.
type UpdateTrainingRecordRequest struct {
	Title            *string    `json:"title"`
	Provider         *string    `json:"provider"`
	Type             *string    `json:"type"`
	Status           *string    `json:"status"`
	CompletedAt      *string    `json:"completedAt"` // timestamp string
	ExpiryDate       *string    `json:"expiryDate"`  // date string
	CertificateDocID *uuid.UUID `json:"certificateDocId"`
	Cost             *float64   `json:"cost"`
}
