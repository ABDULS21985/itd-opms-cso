package system

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// JSON round-trip tests for key types
// ──────────────────────────────────────────────

func TestUserDetail_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	jobTitle := "Engineer"
	dept := "IT"
	office := "HQ"
	unit := "Dev"
	phone := "+1234567890"
	photo := "https://example.com/photo.jpg"
	entra := "entra-id-123"

	original := UserDetail{
		ID:          uuid.New(),
		EntraID:     &entra,
		Email:       "user@example.com",
		DisplayName: "Test User",
		JobTitle:    &jobTitle,
		Department:  &dept,
		Office:      &office,
		Unit:        &unit,
		TenantID:    uuid.New(),
		TenantName:  "Test Tenant",
		PhotoURL:    &photo,
		Phone:       &phone,
		IsActive:    true,
		LastLoginAt: &now,
		Metadata:    json.RawMessage(`{"key":"value"}`),
		CreatedAt:   now,
		UpdatedAt:   now,
		Roles:       []RoleBinding{},
		Delegations: []Delegation{},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal UserDetail: %v", err)
	}

	var decoded UserDetail
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal UserDetail: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Email != original.Email {
		t.Errorf("Email mismatch: got %q, want %q", decoded.Email, original.Email)
	}
	if decoded.DisplayName != original.DisplayName {
		t.Errorf("DisplayName mismatch: got %q, want %q", decoded.DisplayName, original.DisplayName)
	}
	if decoded.IsActive != original.IsActive {
		t.Errorf("IsActive mismatch: got %v, want %v", decoded.IsActive, original.IsActive)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch: got %s, want %s", decoded.TenantID, original.TenantID)
	}
	if *decoded.EntraID != *original.EntraID {
		t.Errorf("EntraID mismatch: got %q, want %q", *decoded.EntraID, *original.EntraID)
	}
	if *decoded.JobTitle != *original.JobTitle {
		t.Errorf("JobTitle mismatch: got %q, want %q", *decoded.JobTitle, *original.JobTitle)
	}
	if *decoded.Phone != *original.Phone {
		t.Errorf("Phone mismatch: got %q, want %q", *decoded.Phone, *original.Phone)
	}
}

func TestUserDetail_JSONTags(t *testing.T) {
	user := UserDetail{
		ID:          uuid.New(),
		Email:       "test@test.com",
		DisplayName: "Test",
		TenantID:    uuid.New(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Roles:       []RoleBinding{},
		Delegations: []Delegation{},
	}

	data, err := json.Marshal(user)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	// Verify key JSON field names exist.
	expectedFields := []string{
		"id", "email", "displayName", "tenantId", "tenantName",
		"isActive", "createdAt", "updatedAt", "roles", "delegations",
		"entraId", "jobTitle", "department", "office", "unit",
		"photoUrl", "phone", "lastLoginAt", "metadata",
	}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

func TestRoleDetail_JSONRoundTrip(t *testing.T) {
	original := RoleDetail{
		ID:          uuid.New(),
		Name:        "admin",
		Description: strPtr("Administrator role"),
		Permissions: json.RawMessage(`["users.read","users.write"]`),
		IsSystem:    true,
		CreatedAt:   time.Now().UTC().Truncate(time.Second),
		UserCount:   42,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal RoleDetail: %v", err)
	}

	var decoded RoleDetail
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RoleDetail: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.IsSystem != original.IsSystem {
		t.Errorf("IsSystem mismatch: got %v, want %v", decoded.IsSystem, original.IsSystem)
	}
	if decoded.UserCount != original.UserCount {
		t.Errorf("UserCount mismatch: got %d, want %d", decoded.UserCount, original.UserCount)
	}
}

func TestTenantDetail_JSONRoundTrip(t *testing.T) {
	parentID := uuid.New()
	original := TenantDetail{
		ID:         uuid.New(),
		Name:       "Test Tenant",
		Code:       "TST",
		Type:       "organization",
		ParentID:   &parentID,
		ParentName: "Parent Org",
		IsActive:   true,
		Config:     json.RawMessage(`{"feature":"enabled"}`),
		CreatedAt:  time.Now().UTC().Truncate(time.Second),
		UpdatedAt:  time.Now().UTC().Truncate(time.Second),
		UserCount:  10,
		Children:   []TenantSummary{},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal TenantDetail: %v", err)
	}

	var decoded TenantDetail
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal TenantDetail: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.Code != original.Code {
		t.Errorf("Code mismatch: got %q, want %q", decoded.Code, original.Code)
	}
	if decoded.ParentID == nil || *decoded.ParentID != parentID {
		t.Errorf("ParentID mismatch: got %v, want %s", decoded.ParentID, parentID)
	}
}

func TestOrgUnitDetail_JSONRoundTrip(t *testing.T) {
	parentID := uuid.New()
	managerID := uuid.New()
	original := OrgUnitDetail{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		Name:          "Engineering",
		Code:          "ENG",
		Level:         "department",
		ParentID:      &parentID,
		ParentName:    "Company",
		ManagerUserID: &managerID,
		ManagerName:   "Jane Doe",
		IsActive:      true,
		Metadata:      json.RawMessage(`{}`),
		CreatedAt:     time.Now().UTC().Truncate(time.Second),
		UpdatedAt:     time.Now().UTC().Truncate(time.Second),
		ChildCount:    3,
		UserCount:     25,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal OrgUnitDetail: %v", err)
	}

	var decoded OrgUnitDetail
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal OrgUnitDetail: %v", err)
	}

	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.Level != original.Level {
		t.Errorf("Level mismatch: got %q, want %q", decoded.Level, original.Level)
	}
	if decoded.ChildCount != original.ChildCount {
		t.Errorf("ChildCount mismatch: got %d, want %d", decoded.ChildCount, original.ChildCount)
	}
}

func TestAuditEventDetail_JSONOmitempty(t *testing.T) {
	event := AuditEventDetail{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		ActorID:       uuid.New(),
		ActorName:     "Test Actor",
		Action:        "create",
		EntityType:    "user",
		EntityID:      uuid.New(),
		IPAddress:     "127.0.0.1",
		CorrelationID: "corr-123",
		Checksum:      "abc123",
		CreatedAt:     time.Now().UTC().Truncate(time.Second),
		// Changes and PreviousState are nil — should be omitted.
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("failed to marshal AuditEventDetail: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	// Verify omitempty fields are absent when nil.
	if _, ok := raw["changes"]; ok {
		t.Error("expected 'changes' to be omitted when nil")
	}
	if _, ok := raw["previousState"]; ok {
		t.Error("expected 'previousState' to be omitted when nil")
	}

	// Verify required fields are present.
	requiredFields := []string{"id", "tenantId", "actorId", "actorName", "action", "entityType", "entityId", "createdAt"}
	for _, f := range requiredFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

func TestAuditEventDetail_JSONOmitempty_WithData(t *testing.T) {
	event := AuditEventDetail{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		ActorID:       uuid.New(),
		ActorName:     "Test Actor",
		Action:        "update",
		EntityType:    "project",
		EntityID:      uuid.New(),
		Changes:       json.RawMessage(`{"name":{"old":"A","new":"B"}}`),
		PreviousState: json.RawMessage(`{"name":"A"}`),
		CreatedAt:     time.Now().UTC().Truncate(time.Second),
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("failed to marshal AuditEventDetail: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	// Verify omitempty fields are present when populated.
	if _, ok := raw["changes"]; !ok {
		t.Error("expected 'changes' to be present when populated")
	}
	if _, ok := raw["previousState"]; !ok {
		t.Error("expected 'previousState' to be present when populated")
	}
}

func TestPlatformHealth_JSONRoundTrip(t *testing.T) {
	original := PlatformHealth{
		Status:    "healthy",
		Uptime:    "3h25m",
		Version:   "1.0.0",
		GoVersion: "go1.25",
		Services: []ServiceHealth{
			{Name: "postgres", Status: "up", Latency: "2ms", Details: "v16"},
			{Name: "redis", Status: "up", Latency: "1ms", Details: "v7"},
		},
		Timestamp: time.Now().UTC().Truncate(time.Second),
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal PlatformHealth: %v", err)
	}

	var decoded PlatformHealth
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal PlatformHealth: %v", err)
	}

	if decoded.Status != "healthy" {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, "healthy")
	}
	if len(decoded.Services) != 2 {
		t.Errorf("expected 2 services, got %d", len(decoded.Services))
	}
	if decoded.Services[0].Name != "postgres" {
		t.Errorf("first service Name mismatch: got %q, want %q", decoded.Services[0].Name, "postgres")
	}
}

func TestSystemStats_JSONRoundTrip(t *testing.T) {
	original := SystemStats{
		Users: UserStats{
			TotalUsers:    100,
			ActiveUsers:   85,
			InactiveUsers: 15,
			OnlineNow:     10,
			NewThisMonth:  5,
		},
		Sessions: SessionStats{
			ActiveSessions: 50,
			UniqueUsers:    30,
			ByDevice:       map[string]int{"desktop": 35, "mobile": 15},
		},
		AuditEvents: AuditStats{
			TotalEvents:     1000,
			EventsToday:     50,
			EventsThisWeek:  200,
			IntegrityStatus: "verified",
		},
		Storage: StorageStats{
			TotalObjects:  500,
			TotalSize:     "1.2 GB",
			EvidenceItems: 100,
			Attachments:   400,
		},
		Database: DatabaseStats{
			Size:              "500 MB",
			TableCount:        42,
			ActiveConnections: 10,
			MaxConnections:    100,
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SystemStats: %v", err)
	}

	var decoded SystemStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SystemStats: %v", err)
	}

	if decoded.Users.TotalUsers != 100 {
		t.Errorf("TotalUsers mismatch: got %d, want %d", decoded.Users.TotalUsers, 100)
	}
	if decoded.Sessions.ByDevice["desktop"] != 35 {
		t.Errorf("ByDevice[desktop] mismatch: got %d, want %d", decoded.Sessions.ByDevice["desktop"], 35)
	}
	if decoded.Database.TableCount != 42 {
		t.Errorf("TableCount mismatch: got %d, want %d", decoded.Database.TableCount, 42)
	}
}

func TestEmailTemplate_JSONRoundTrip(t *testing.T) {
	tenantID := uuid.New()
	updatedBy := uuid.New()
	bodyText := "Plain text body"
	original := EmailTemplate{
		ID:        uuid.New(),
		TenantID:  &tenantID,
		Name:      "welcome",
		Subject:   "Welcome {{.Name}}",
		BodyHTML:  "<h1>Welcome</h1>",
		BodyText:  &bodyText,
		Variables: json.RawMessage(`["name","email"]`),
		Category:  "onboarding",
		IsActive:  true,
		UpdatedBy: &updatedBy,
		CreatedAt: time.Now().UTC().Truncate(time.Second),
		UpdatedAt: time.Now().UTC().Truncate(time.Second),
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal EmailTemplate: %v", err)
	}

	var decoded EmailTemplate
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal EmailTemplate: %v", err)
	}

	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.Subject != original.Subject {
		t.Errorf("Subject mismatch: got %q, want %q", decoded.Subject, original.Subject)
	}
	if decoded.Category != original.Category {
		t.Errorf("Category mismatch: got %q, want %q", decoded.Category, original.Category)
	}
	if *decoded.BodyText != *original.BodyText {
		t.Errorf("BodyText mismatch: got %q, want %q", *decoded.BodyText, *original.BodyText)
	}
}

func TestActiveSession_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	original := ActiveSession{
		ID:         uuid.New(),
		UserID:     uuid.New(),
		UserName:   "Test User",
		UserEmail:  "test@test.com",
		TenantID:   uuid.New(),
		IPAddress:  "192.168.1.1",
		UserAgent:  "Mozilla/5.0",
		DeviceInfo: json.RawMessage(`{"os":"macOS","browser":"Chrome"}`),
		Location:   "New York, US",
		CreatedAt:  now,
		LastActive: now,
		ExpiresAt:  now.Add(24 * time.Hour),
		IsRevoked:  false,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ActiveSession: %v", err)
	}

	var decoded ActiveSession
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ActiveSession: %v", err)
	}

	if decoded.UserName != original.UserName {
		t.Errorf("UserName mismatch: got %q, want %q", decoded.UserName, original.UserName)
	}
	if decoded.IPAddress != original.IPAddress {
		t.Errorf("IPAddress mismatch: got %q, want %q", decoded.IPAddress, original.IPAddress)
	}
	if decoded.IsRevoked != original.IsRevoked {
		t.Errorf("IsRevoked mismatch: got %v, want %v", decoded.IsRevoked, original.IsRevoked)
	}
}

func TestSystemSetting_JSONRoundTrip(t *testing.T) {
	tenantID := uuid.New()
	updatedBy := uuid.New()
	desc := "Timezone setting"
	original := SystemSetting{
		ID:          uuid.New(),
		TenantID:    &tenantID,
		Category:    "general",
		Key:         "timezone",
		Value:       json.RawMessage(`"UTC"`),
		Description: &desc,
		IsSecret:    false,
		UpdatedBy:   &updatedBy,
		UpdatedAt:   time.Now().UTC().Truncate(time.Second),
		CreatedAt:   time.Now().UTC().Truncate(time.Second),
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SystemSetting: %v", err)
	}

	var decoded SystemSetting
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SystemSetting: %v", err)
	}

	if decoded.Category != original.Category {
		t.Errorf("Category mismatch: got %q, want %q", decoded.Category, original.Category)
	}
	if decoded.Key != original.Key {
		t.Errorf("Key mismatch: got %q, want %q", decoded.Key, original.Key)
	}
	if decoded.IsSecret != original.IsSecret {
		t.Errorf("IsSecret mismatch: got %v, want %v", decoded.IsSecret, original.IsSecret)
	}
}

// ──────────────────────────────────────────────
// Request type JSON parsing tests
// ──────────────────────────────────────────────

func TestCreateRoleRequest_JSONParse(t *testing.T) {
	input := `{"name":"viewer","description":"Read-only access","permissions":["system.view","projects.view"]}`
	var req CreateRoleRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateRoleRequest: %v", err)
	}

	if req.Name != "viewer" {
		t.Errorf("Name mismatch: got %q, want %q", req.Name, "viewer")
	}
	if len(req.Permissions) != 2 {
		t.Errorf("expected 2 permissions, got %d", len(req.Permissions))
	}
}

func TestUpdateUserRequest_JSONParse(t *testing.T) {
	input := `{"displayName":"New Name","isActive":false}`
	var req UpdateUserRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateUserRequest: %v", err)
	}

	if req.DisplayName == nil || *req.DisplayName != "New Name" {
		t.Errorf("DisplayName mismatch: got %v", req.DisplayName)
	}
	if req.IsActive == nil || *req.IsActive != false {
		t.Errorf("IsActive mismatch: got %v", req.IsActive)
	}
	// Fields not in JSON should remain nil.
	if req.JobTitle != nil {
		t.Errorf("expected JobTitle to be nil, got %v", req.JobTitle)
	}
}

func TestAssignRoleRequest_JSONParse(t *testing.T) {
	roleID := uuid.New()
	scopeID := uuid.New()
	input := `{"roleId":"` + roleID.String() + `","scopeType":"project","scopeId":"` + scopeID.String() + `"}`
	var req AssignRoleRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal AssignRoleRequest: %v", err)
	}

	if req.RoleID != roleID {
		t.Errorf("RoleID mismatch: got %s, want %s", req.RoleID, roleID)
	}
	if req.ScopeType != "project" {
		t.Errorf("ScopeType mismatch: got %q, want %q", req.ScopeType, "project")
	}
	if req.ScopeID == nil || *req.ScopeID != scopeID {
		t.Errorf("ScopeID mismatch: got %v, want %s", req.ScopeID, scopeID)
	}
}

func TestCreateTenantRequest_JSONParse(t *testing.T) {
	input := `{"name":"New Org","code":"NWO","type":"organization","config":{"key":"val"}}`
	var req CreateTenantRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateTenantRequest: %v", err)
	}

	if req.Name != "New Org" {
		t.Errorf("Name mismatch: got %q", req.Name)
	}
	if req.Code != "NWO" {
		t.Errorf("Code mismatch: got %q", req.Code)
	}
	if req.ParentID != nil {
		t.Errorf("expected ParentID to be nil, got %v", req.ParentID)
	}
}

func TestMoveOrgUnitRequest_JSONParse(t *testing.T) {
	newParentID := uuid.New()
	input := `{"newParentId":"` + newParentID.String() + `"}`
	var req MoveOrgUnitRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal MoveOrgUnitRequest: %v", err)
	}

	if req.NewParentID != newParentID {
		t.Errorf("NewParentID mismatch: got %s, want %s", req.NewParentID, newParentID)
	}
}

func TestTemplatePreviewRequest_JSONParse(t *testing.T) {
	input := `{"variables":{"name":"John","email":"john@test.com"}}`
	var req TemplatePreviewRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal TemplatePreviewRequest: %v", err)
	}

	if req.Variables["name"] != "John" {
		t.Errorf("Variables[name] mismatch: got %q", req.Variables["name"])
	}
	if req.Variables["email"] != "john@test.com" {
		t.Errorf("Variables[email] mismatch: got %q", req.Variables["email"])
	}
}

func TestOrgTreeNode_JSONWithChildren(t *testing.T) {
	node := OrgTreeNode{
		ID:          uuid.New(),
		Name:        "Root",
		Code:        "ROOT",
		Level:       "organization",
		ManagerName: "CEO",
		UserCount:   100,
		Children: []OrgTreeNode{
			{
				ID:        uuid.New(),
				Name:      "Engineering",
				Code:      "ENG",
				Level:     "department",
				UserCount: 50,
				Children:  []OrgTreeNode{},
			},
		},
	}

	data, err := json.Marshal(node)
	if err != nil {
		t.Fatalf("failed to marshal OrgTreeNode: %v", err)
	}

	var decoded OrgTreeNode
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal OrgTreeNode: %v", err)
	}

	if len(decoded.Children) != 1 {
		t.Fatalf("expected 1 child, got %d", len(decoded.Children))
	}
	if decoded.Children[0].Name != "Engineering" {
		t.Errorf("child Name mismatch: got %q, want %q", decoded.Children[0].Name, "Engineering")
	}
}

func TestDirectorySyncStatus_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	next := now.Add(1 * time.Hour)
	original := DirectorySyncStatus{
		Enabled:        true,
		LastSync:       &now,
		LastSyncStatus: "success",
		NextScheduled:  &next,
		UsersAdded:     5,
		UsersUpdated:   10,
		UsersRemoved:   2,
		SyncHistory: []SyncRun{
			{
				ID:           uuid.New(),
				Status:       "success",
				StartedAt:    now.Add(-1 * time.Hour),
				CompletedAt:  &now,
				UsersAdded:   5,
				UsersUpdated: 10,
				UsersRemoved: 2,
				Errors:       0,
			},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal DirectorySyncStatus: %v", err)
	}

	var decoded DirectorySyncStatus
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal DirectorySyncStatus: %v", err)
	}

	if decoded.Enabled != original.Enabled {
		t.Errorf("Enabled mismatch: got %v, want %v", decoded.Enabled, original.Enabled)
	}
	if decoded.LastSyncStatus != "success" {
		t.Errorf("LastSyncStatus mismatch: got %q", decoded.LastSyncStatus)
	}
	if len(decoded.SyncHistory) != 1 {
		t.Fatalf("expected 1 sync run, got %d", len(decoded.SyncHistory))
	}
}

func TestPermissionCatalog_JSONRoundTrip(t *testing.T) {
	original := PermissionCatalog{
		Module:      "system",
		Permissions: []string{"system.view", "system.manage"},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal PermissionCatalog: %v", err)
	}

	var decoded PermissionCatalog
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal PermissionCatalog: %v", err)
	}

	if decoded.Module != "system" {
		t.Errorf("Module mismatch: got %q", decoded.Module)
	}
	if len(decoded.Permissions) != 2 {
		t.Errorf("expected 2 permissions, got %d", len(decoded.Permissions))
	}
}

func TestAuditStatsResponse_JSONRoundTrip(t *testing.T) {
	original := AuditStatsResponse{
		EventsPerDay: []AuditDayStat{{Date: "2025-01-01", Count: 100}},
		TopActors:    []AuditActorStat{{ActorID: uuid.New(), ActorName: "Admin", Count: 50}},
		TopEntities:  []AuditEntityStat{{EntityType: "user", Count: 30}},
		TopActions:   []AuditActionStat{{Action: "create", Count: 20}},
		TotalEvents:  1000,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AuditStatsResponse: %v", err)
	}

	var decoded AuditStatsResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AuditStatsResponse: %v", err)
	}

	if decoded.TotalEvents != 1000 {
		t.Errorf("TotalEvents mismatch: got %d, want %d", decoded.TotalEvents, 1000)
	}
	if len(decoded.EventsPerDay) != 1 {
		t.Errorf("expected 1 EventsPerDay, got %d", len(decoded.EventsPerDay))
	}
}

// ──────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────

func strPtr(s string) *string {
	return &s
}
