package system

import (
	"time"

	"github.com/google/uuid"
)

const ERPDirectorySourceSystem = "oracle_erp_dump"

// ERPDirectoryImportRequest controls a server-side ERP directory import.
// SourcePath points to the SQL Server dump on the API server host.
type ERPDirectoryImportRequest struct {
	SourcePath          string `json:"sourcePath"`
	DeactivateUnmatched *bool  `json:"deactivateUnmatched,omitempty"`
}

// ERPDirectoryImportPreview is returned before applying a reset.
type ERPDirectoryImportPreview struct {
	SourcePath                         string                    `json:"sourcePath"`
	SourceChecksum                     string                    `json:"sourceChecksum"`
	TotalRows                          int                       `json:"totalRows"`
	ParseErrors                        int                       `json:"parseErrors"`
	EmployeesTotal                     int                       `json:"employeesTotal"`
	ActiveEmployees                    int                       `json:"activeEmployees"`
	InactiveEmployees                  int                       `json:"inactiveEmployees"`
	MissingEmails                      int                       `json:"missingEmails"`
	InvalidEmails                      int                       `json:"invalidEmails"`
	DuplicateEmails                    int                       `json:"duplicateEmails"`
	PlaceholderEmails                  int                       `json:"placeholderEmails"`
	LoginEligibleEmployees             int                       `json:"loginEligibleEmployees"`
	Departments                        int                       `json:"departments"`
	Divisions                          int                       `json:"divisions"`
	Offices                            int                       `json:"offices"`
	Supervisors                        int                       `json:"supervisors"`
	HeadsOfDivision                    int                       `json:"headsOfDivision"`
	ElevatedAdmins                     int                       `json:"elevatedAdmins"`
	ServiceDeskAnalysts                int                       `json:"serviceDeskAnalysts"`
	SeniorServiceDeskAnalysts          int                       `json:"seniorServiceDeskAnalysts"`
	ServiceDeskSpecialists             int                       `json:"serviceDeskSpecialists"`
	EndUserSupportSpecialists          int                       `json:"endUserSupportSpecialists"`
	SecondLevelSupportSpecialists      int                       `json:"secondLevelSupportSpecialists"`
	ITServiceCenterSpecialists         int                       `json:"itServiceCenterSpecialists"`
	SeniorITServiceCenterSpecialists   int                       `json:"seniorItServiceCenterSpecialists"`
	ITServiceSupportSpecialists        int                       `json:"itServiceSupportSpecialists"`
	ChangeRequestors                   int                       `json:"changeRequestors"`
	BusinessAnalysts                   int                       `json:"businessAnalysts"`
	BusinessRelationshipManagers       int                       `json:"businessRelationshipManagers"`
	ChangeManagers                     int                       `json:"changeManagers"`
	TestManagementSpecialists          int                       `json:"testManagementSpecialists"`
	SubjectMatterExperts               int                       `json:"subjectMatterExperts"`
	ITComplianceSpecialists            int                       `json:"itComplianceSpecialists"`
	CABMembers                         int                       `json:"cabMembers"`
	CABMeetingSecretaries              int                       `json:"cabMeetingSecretaries"`
	ReleaseManagers                    int                       `json:"releaseManagers"`
	ReleaseManagementLeads             int                       `json:"releaseManagementLeads"`
	SolutionsDeliverySpecialists       int                       `json:"solutionsDeliverySpecialists"`
	SeniorReleaseManagementSpecialists int                       `json:"seniorReleaseManagementSpecialists"`
	DITDApprovers                      int                       `json:"ditdApprovers"`
	ChangeApprovers                    int                       `json:"changeApprovers"`
	SupportAnalysts                    int                       `json:"supportAnalysts"`
	Warnings                           []string                  `json:"warnings"`
	Samples                            []ERPDirectoryPreviewUser `json:"samples"`
}

type ERPDirectoryPreviewUser struct {
	EmployeeNumber string `json:"employeeNumber"`
	DisplayName    string `json:"displayName"`
	Email          string `json:"email"`
	EmailQuality   string `json:"emailQuality"`
	JobTitle       string `json:"jobTitle"`
	Status         string `json:"status"`
	Department     string `json:"department"`
	Division       string `json:"division"`
	Office         string `json:"office"`
	IsActive       bool   `json:"isActive"`
	IsElevated     bool   `json:"isElevated"`
}

// ERPDirectoryImportResult is returned after applying an import.
type ERPDirectoryImportResult struct {
	RunID             uuid.UUID                 `json:"runId"`
	Preview           ERPDirectoryImportPreview `json:"preview"`
	UsersCreated      int                       `json:"usersCreated"`
	UsersUpdated      int                       `json:"usersUpdated"`
	UsersDeactivated  int                       `json:"usersDeactivated"`
	OrgUnitsUpserted  int                       `json:"orgUnitsUpserted"`
	RoleBindingsAdded int                       `json:"roleBindingsAdded"`
	CompletedAt       time.Time                 `json:"completedAt"`
}

type ERPDirectoryImportRun struct {
	ID                uuid.UUID  `json:"id"`
	TenantID          uuid.UUID  `json:"tenantId"`
	SourcePath        string     `json:"sourcePath"`
	SourceChecksum    string     `json:"sourceChecksum"`
	Status            string     `json:"status"`
	Mode              string     `json:"mode"`
	StartedAt         time.Time  `json:"startedAt"`
	CompletedAt       *time.Time `json:"completedAt,omitempty"`
	TriggeredBy       *uuid.UUID `json:"triggeredBy,omitempty"`
	TotalRows         int        `json:"totalRows"`
	UsersCreated      int        `json:"usersCreated"`
	UsersUpdated      int        `json:"usersUpdated"`
	UsersDeactivated  int        `json:"usersDeactivated"`
	UsersInactive     int        `json:"usersInactive"`
	OrgUnitsUpserted  int        `json:"orgUnitsUpserted"`
	RoleBindingsAdded int        `json:"roleBindingsAdded"`
	WarningsCount     int        `json:"warningsCount"`
	ErrorsCount       int        `json:"errorsCount"`
}

type erpEmployeeRecord struct {
	RowNumber             int
	OrganizationID        *int
	PersonID              *int
	UserName              string
	EmailAddress          string
	Title                 string
	FirstName             string
	MiddleNames           string
	LastName              string
	EmployeeNumber        string
	AssignmentNumber      string
	OriginalDateOfHire    *time.Time
	OfficeID              *int
	SupervisorID          string
	JobName               string
	HeadOfOfficeID        string
	LocationID            *int
	LocationCode          string
	MobileNumber          string
	Status                string
	TerminationDate       *time.Time
	DepartmentID          *int
	DepartmentName        string
	HeadOfDeptID          string
	HeadOfDeptName        string
	DivisionID            *int
	DivisionName          string
	HeadOfDivID           string
	HeadOfDivName         string
	OfficeName            string
	GradeID               *int
	Grade                 string
	FullName              string
	EffectiveEmail        string
	EmailQuality          string
	EmailValidationErrors []string
	AssignedOrgUnitCode   string
	AssignedOrgUnitID     uuid.UUID
	DepartmentOrgUnitCode string
	DivisionOrgUnitCode   string
	OfficeOrgUnitCode     string
}

func (r erpEmployeeRecord) isActiveAssignment() bool {
	return r.Status == "Active Assignment"
}

func (r erpEmployeeRecord) displayName() string {
	return formatERPDisplayName(r.FullName, r.EmployeeNumber, r.Title, r.FirstName, r.MiddleNames, r.LastName)
}

type preparedERPDirectory struct {
	Preview                            ERPDirectoryImportPreview
	Employees                          []erpEmployeeRecord
	OrgUnits                           []preparedERPOrgUnit
	EmployeeIDs                        map[string]uuid.UUID
	Supervisors                        map[string]struct{}
	DivHeads                           map[string]struct{}
	OfficeHeads                        map[string]struct{}
	Elevated                           map[string]struct{}
	RoleEligible                       map[string]struct{}
	ServiceDeskAnalysts                map[string]struct{}
	SeniorServiceDeskAnalysts          map[string]struct{}
	ServiceDeskSpecialists             map[string]struct{}
	EndUserSupportSpecialists          map[string]struct{}
	SecondLevelSupportSpecialists      map[string]struct{}
	ITServiceCenterSpecialists         map[string]struct{}
	SeniorITServiceCenterSpecialists   map[string]struct{}
	ITServiceSupportSpecialists        map[string]struct{}
	ChangeRequestors                   map[string]struct{}
	BusinessAnalysts                   map[string]struct{}
	BusinessRelationshipManagers       map[string]struct{}
	ChangeManagers                     map[string]struct{}
	TestManagementSpecialists          map[string]struct{}
	SubjectMatterExperts               map[string]struct{}
	ITComplianceSpecialists            map[string]struct{}
	CABMembers                         map[string]struct{}
	CABMeetingSecretaries              map[string]struct{}
	ReleaseManagers                    map[string]struct{}
	ReleaseManagementLeads             map[string]struct{}
	SolutionsDeliverySpecialists       map[string]struct{}
	SeniorReleaseManagementSpecialists map[string]struct{}
	DITDApprovers                      map[string]struct{}
	ChangeApprovers                    map[string]struct{}
	SupportAnalysts                    map[string]struct{}
}

type preparedERPOrgUnit struct {
	ID                  uuid.UUID
	Code                string
	Name                string
	Level               string
	ParentCode          string
	ParentID            *uuid.UUID
	ManagerEmployeeNo   string
	ManagerUserID       *uuid.UUID
	ERPDepartmentID     *int
	ERPDivisionID       *int
	ERPOfficeID         *int
	SourceLevel         string
	ActiveEmployeeCount int
}
