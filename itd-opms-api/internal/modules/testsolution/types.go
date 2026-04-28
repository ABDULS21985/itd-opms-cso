package testsolution

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type TestSolutionRun struct {
	ID                      uuid.UUID       `json:"id"`
	TenantID                uuid.UUID       `json:"tenantId"`
	RunNumber               string          `json:"runNumber"`
	Title                   string          `json:"title"`
	Description             *string         `json:"description,omitempty"`
	SourceType              string          `json:"sourceType"`
	SourceID                *uuid.UUID      `json:"sourceId,omitempty"`
	ReleaseID               *uuid.UUID      `json:"releaseId,omitempty"`
	ChangeTicketID          *uuid.UUID      `json:"changeTicketId,omitempty"`
	Status                  string          `json:"status"`
	RequiredTestTypes       []string        `json:"requiredTestTypes"`
	AuthorizedTestTypes     []string        `json:"authorizedTestTypes"`
	TestManagerID           *uuid.UUID      `json:"testManagerId,omitempty"`
	TestLeadID              *uuid.UUID      `json:"testLeadId,omitempty"`
	ReleaseManagementLeadID *uuid.UUID      `json:"releaseManagementLeadId,omitempty"`
	Requirements            json.RawMessage `json:"requirements,omitempty"`
	TestPlan                json.RawMessage `json:"testPlan,omitempty"`
	ReadinessChecklist      json.RawMessage `json:"readinessChecklist,omitempty"`
	Evidence                json.RawMessage `json:"evidence,omitempty"`
	UATSignoff              json.RawMessage `json:"uatSignoff,omitempty"`
	OverallOutcome          string          `json:"overallOutcome"`
	FailureReason           *string         `json:"failureReason,omitempty"`
	CreatedBy               uuid.UUID       `json:"createdBy"`
	CreatedAt               time.Time       `json:"createdAt"`
	UpdatedAt               time.Time       `json:"updatedAt"`

	TestManagerName           *string `json:"testManagerName,omitempty"`
	TestLeadName              *string `json:"testLeadName,omitempty"`
	ReleaseManagementLeadName *string `json:"releaseManagementLeadName,omitempty"`
	CreatedByName             *string `json:"createdByName,omitempty"`
	ReleaseNumber             *string `json:"releaseNumber,omitempty"`
	ChangeTicketNumber        *string `json:"changeTicketNumber,omitempty"`
}

type TestSolutionCase struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenantId"`
	RunID           uuid.UUID       `json:"runId"`
	TestType        string          `json:"testType"`
	Title           string          `json:"title"`
	ScriptReference *string         `json:"scriptReference,omitempty"`
	Status          string          `json:"status"`
	AssignedTo      *uuid.UUID      `json:"assignedTo,omitempty"`
	Evidence        json.RawMessage `json:"evidence,omitempty"`
	StartedAt       *time.Time      `json:"startedAt,omitempty"`
	CompletedAt     *time.Time      `json:"completedAt,omitempty"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
	AssignedToName  *string         `json:"assignedToName,omitempty"`
}

type TestSolutionSignoff struct {
	ID         uuid.UUID       `json:"id"`
	TenantID   uuid.UUID       `json:"tenantId"`
	RunID      uuid.UUID       `json:"runId"`
	TestType   string          `json:"testType"`
	SignerID   uuid.UUID       `json:"signerId"`
	RoleName   string          `json:"roleName"`
	Status     string          `json:"status"`
	Comments   *string         `json:"comments,omitempty"`
	Evidence   json.RawMessage `json:"evidence,omitempty"`
	SignedAt   *time.Time      `json:"signedAt,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
	SignerName *string         `json:"signerName,omitempty"`
}

type TestSolutionRunWithDetails struct {
	TestSolutionRun
	Cases    []TestSolutionCase    `json:"cases"`
	Signoffs []TestSolutionSignoff `json:"signoffs"`
}

type TestSolutionStats struct {
	Intake         int `json:"intake"`
	Planning       int `json:"planning"`
	Authorized     int `json:"authorized"`
	InExecution    int `json:"inExecution"`
	ReleaseHandoff int `json:"releaseHandoff"`
	BuildRework    int `json:"buildRework"`
	Closed         int `json:"closed"`
	Cancelled      int `json:"cancelled"`
	Total          int `json:"total"`
}

type CreateTestSolutionRunRequest struct {
	Title                   string          `json:"title"`
	Description             *string         `json:"description,omitempty"`
	SourceType              string          `json:"sourceType,omitempty"`
	SourceID                *uuid.UUID      `json:"sourceId,omitempty"`
	ReleaseID               *uuid.UUID      `json:"releaseId,omitempty"`
	ChangeTicketID          *uuid.UUID      `json:"changeTicketId,omitempty"`
	RequiredTestTypes       []string        `json:"requiredTestTypes,omitempty"`
	AuthorizedTestTypes     []string        `json:"authorizedTestTypes,omitempty"`
	TestManagerID           *uuid.UUID      `json:"testManagerId,omitempty"`
	TestLeadID              *uuid.UUID      `json:"testLeadId,omitempty"`
	ReleaseManagementLeadID *uuid.UUID      `json:"releaseManagementLeadId,omitempty"`
	Requirements            json.RawMessage `json:"requirements,omitempty"`
	TestPlan                json.RawMessage `json:"testPlan,omitempty"`
}

type UpdateTestSolutionRunRequest struct {
	Title                   *string         `json:"title,omitempty"`
	Description             *string         `json:"description,omitempty"`
	SourceType              *string         `json:"sourceType,omitempty"`
	SourceID                *uuid.UUID      `json:"sourceId,omitempty"`
	ReleaseID               *uuid.UUID      `json:"releaseId,omitempty"`
	ChangeTicketID          *uuid.UUID      `json:"changeTicketId,omitempty"`
	RequiredTestTypes       []string        `json:"requiredTestTypes,omitempty"`
	AuthorizedTestTypes     []string        `json:"authorizedTestTypes,omitempty"`
	TestManagerID           *uuid.UUID      `json:"testManagerId,omitempty"`
	TestLeadID              *uuid.UUID      `json:"testLeadId,omitempty"`
	ReleaseManagementLeadID *uuid.UUID      `json:"releaseManagementLeadId,omitempty"`
	Requirements            json.RawMessage `json:"requirements,omitempty"`
	TestPlan                json.RawMessage `json:"testPlan,omitempty"`
	ReadinessChecklist      json.RawMessage `json:"readinessChecklist,omitempty"`
	Evidence                json.RawMessage `json:"evidence,omitempty"`
	UATSignoff              json.RawMessage `json:"uatSignoff,omitempty"`
	OverallOutcome          *string         `json:"overallOutcome,omitempty"`
	FailureReason           *string         `json:"failureReason,omitempty"`
}

type TransitionTestSolutionRunRequest struct {
	TargetStatus  string          `json:"targetStatus"`
	Comment       *string         `json:"comment,omitempty"`
	Evidence      json.RawMessage `json:"evidence,omitempty"`
	UATSignoff    json.RawMessage `json:"uatSignoff,omitempty"`
	FailureReason *string         `json:"failureReason,omitempty"`
	Outcome       *string         `json:"outcome,omitempty"`
}

type CreateTestSolutionCaseRequest struct {
	TestType        string          `json:"testType"`
	Title           string          `json:"title"`
	ScriptReference *string         `json:"scriptReference,omitempty"`
	Status          string          `json:"status,omitempty"`
	AssignedTo      *uuid.UUID      `json:"assignedTo,omitempty"`
	Evidence        json.RawMessage `json:"evidence,omitempty"`
}

type UpdateTestSolutionCaseRequest struct {
	Title           *string         `json:"title,omitempty"`
	ScriptReference *string         `json:"scriptReference,omitempty"`
	Status          *string         `json:"status,omitempty"`
	AssignedTo      *uuid.UUID      `json:"assignedTo,omitempty"`
	Evidence        json.RawMessage `json:"evidence,omitempty"`
}

type CreateTestSolutionSignoffRequest struct {
	TestType string          `json:"testType"`
	SignerID uuid.UUID       `json:"signerId"`
	RoleName string          `json:"roleName"`
	Comments *string         `json:"comments,omitempty"`
	Evidence json.RawMessage `json:"evidence,omitempty"`
}

type DecideTestSolutionSignoffRequest struct {
	Status   string          `json:"status"`
	Comments *string         `json:"comments,omitempty"`
	Evidence json.RawMessage `json:"evidence,omitempty"`
}
