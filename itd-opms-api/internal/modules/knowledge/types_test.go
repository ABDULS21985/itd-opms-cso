package knowledge

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Constant value tests
// ──────────────────────────────────────────────

func TestArticleStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Draft":     "draft",
		"InReview":  "in_review",
		"Published": "published",
		"Archived":  "archived",
		"Retired":   "retired",
	}
	actual := map[string]string{
		"Draft":     ArticleStatusDraft,
		"InReview":  ArticleStatusInReview,
		"Published": ArticleStatusPublished,
		"Archived":  ArticleStatusArchived,
		"Retired":   ArticleStatusRetired,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("ArticleStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestArticleTypeConstants(t *testing.T) {
	expected := map[string]string{
		"HowTo":          "how_to",
		"Troubleshooting": "troubleshooting",
		"FAQ":            "faq",
		"BestPractice":   "best_practice",
		"Runbook":        "runbook",
	}
	actual := map[string]string{
		"HowTo":          ArticleTypeHowTo,
		"Troubleshooting": ArticleTypeTroubleshooting,
		"FAQ":            ArticleTypeFAQ,
		"BestPractice":   ArticleTypeBestPractice,
		"Runbook":        ArticleTypeRunbook,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("ArticleType%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestAnnouncementPriorityConstants(t *testing.T) {
	expected := map[string]string{
		"Low":      "low",
		"Normal":   "normal",
		"High":     "high",
		"Critical": "critical",
	}
	actual := map[string]string{
		"Low":      AnnouncementPriorityLow,
		"Normal":   AnnouncementPriorityNormal,
		"High":     AnnouncementPriorityHigh,
		"Critical": AnnouncementPriorityCritical,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("AnnouncementPriority%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestAudienceConstants(t *testing.T) {
	expected := map[string]string{
		"All":      "all",
		"Division": "division",
		"Unit":     "unit",
		"Role":     "role",
	}
	actual := map[string]string{
		"All":      AudienceAll,
		"Division": AudienceDivision,
		"Unit":     AudienceUnit,
		"Role":     AudienceRole,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("Audience%s = %q, want %q", name, actual[name], want)
		}
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestKBArticleJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	categoryID := uuid.New()
	authorID := uuid.New()
	reviewerID := uuid.New()
	ticketID := uuid.New()

	original := KBArticle{
		ID:              id,
		TenantID:        tenantID,
		CategoryID:      &categoryID,
		Title:           "How to Reset Password",
		Slug:            "how-to-reset-password",
		Content:         "# Steps\n1. Go to settings\n2. Click reset",
		Status:          ArticleStatusPublished,
		Version:         3,
		Type:            ArticleTypeHowTo,
		Tags:            []string{"password", "security", "self-service"},
		AuthorID:        authorID,
		ReviewerID:      &reviewerID,
		PublishedAt:     &now,
		ViewCount:       150,
		HelpfulCount:    42,
		NotHelpfulCount: 3,
		LinkedTicketIDs: []uuid.UUID{ticketID},
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal KBArticle: %v", err)
	}

	var decoded KBArticle
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal KBArticle: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch: got %s, want %s", decoded.TenantID, original.TenantID)
	}
	if decoded.CategoryID == nil || *decoded.CategoryID != categoryID {
		t.Errorf("CategoryID mismatch: got %v, want %v", decoded.CategoryID, &categoryID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.Slug != original.Slug {
		t.Errorf("Slug mismatch: got %q, want %q", decoded.Slug, original.Slug)
	}
	if decoded.Content != original.Content {
		t.Errorf("Content mismatch: got %q, want %q", decoded.Content, original.Content)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, original.Status)
	}
	if decoded.Version != original.Version {
		t.Errorf("Version mismatch: got %d, want %d", decoded.Version, original.Version)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: got %q, want %q", decoded.Type, original.Type)
	}
	if len(decoded.Tags) != 3 {
		t.Errorf("Tags length mismatch: got %d, want 3", len(decoded.Tags))
	}
	if decoded.AuthorID != original.AuthorID {
		t.Errorf("AuthorID mismatch: got %s, want %s", decoded.AuthorID, original.AuthorID)
	}
	if decoded.ReviewerID == nil || *decoded.ReviewerID != reviewerID {
		t.Errorf("ReviewerID mismatch: got %v, want %v", decoded.ReviewerID, &reviewerID)
	}
	if decoded.ViewCount != original.ViewCount {
		t.Errorf("ViewCount mismatch: got %d, want %d", decoded.ViewCount, original.ViewCount)
	}
	if decoded.HelpfulCount != original.HelpfulCount {
		t.Errorf("HelpfulCount mismatch: got %d, want %d", decoded.HelpfulCount, original.HelpfulCount)
	}
	if decoded.NotHelpfulCount != original.NotHelpfulCount {
		t.Errorf("NotHelpfulCount mismatch: got %d, want %d", decoded.NotHelpfulCount, original.NotHelpfulCount)
	}
	if len(decoded.LinkedTicketIDs) != 1 {
		t.Errorf("LinkedTicketIDs length mismatch: got %d, want 1", len(decoded.LinkedTicketIDs))
	}
}

func TestKBArticleJSON_FieldNames(t *testing.T) {
	article := KBArticle{
		ID:       uuid.New(),
		TenantID: uuid.New(),
		Title:    "Test",
		Slug:     "test",
		Content:  "Content",
		Status:   ArticleStatusDraft,
		Type:     ArticleTypeFAQ,
		AuthorID: uuid.New(),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(article)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "categoryId", "title", "slug", "content",
		"status", "version", "type", "tags", "authorId", "reviewerId",
		"publishedAt", "viewCount", "helpfulCount", "notHelpfulCount",
		"linkedTicketIds", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized KBArticle", field)
		}
	}
}

func TestKBCategoryJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	parentID := uuid.New()
	desc := "Network troubleshooting articles"
	icon := "network"

	original := KBCategory{
		ID:          id,
		TenantID:    tenantID,
		Name:        "Networking",
		Description: &desc,
		ParentID:    &parentID,
		Icon:        &icon,
		SortOrder:   2,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal KBCategory: %v", err)
	}

	var decoded KBCategory
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal KBCategory: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch: got %v, want %q", decoded.Description, desc)
	}
	if decoded.ParentID == nil || *decoded.ParentID != parentID {
		t.Errorf("ParentID mismatch: got %v, want %v", decoded.ParentID, &parentID)
	}
	if decoded.Icon == nil || *decoded.Icon != icon {
		t.Errorf("Icon mismatch: got %v, want %q", decoded.Icon, icon)
	}
	if decoded.SortOrder != original.SortOrder {
		t.Errorf("SortOrder mismatch: got %d, want %d", decoded.SortOrder, original.SortOrder)
	}
}

func TestKBArticleVersionJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	articleID := uuid.New()
	changedBy := uuid.New()

	original := KBArticleVersion{
		ID:        id,
		ArticleID: articleID,
		Version:   5,
		Content:   "Updated content for version 5",
		ChangedBy: changedBy,
		CreatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal KBArticleVersion: %v", err)
	}

	var decoded KBArticleVersion
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal KBArticleVersion: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.ArticleID != original.ArticleID {
		t.Errorf("ArticleID mismatch: got %s, want %s", decoded.ArticleID, original.ArticleID)
	}
	if decoded.Version != original.Version {
		t.Errorf("Version mismatch: got %d, want %d", decoded.Version, original.Version)
	}
	if decoded.Content != original.Content {
		t.Errorf("Content mismatch: got %q, want %q", decoded.Content, original.Content)
	}
	if decoded.ChangedBy != original.ChangedBy {
		t.Errorf("ChangedBy mismatch: got %s, want %s", decoded.ChangedBy, original.ChangedBy)
	}
}

func TestKBArticleFeedbackJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	articleID := uuid.New()
	userID := uuid.New()
	comment := "Very helpful article!"

	original := KBArticleFeedback{
		ID:        id,
		ArticleID: articleID,
		UserID:    userID,
		IsHelpful: true,
		Comment:   &comment,
		CreatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal KBArticleFeedback: %v", err)
	}

	var decoded KBArticleFeedback
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal KBArticleFeedback: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.ArticleID != original.ArticleID {
		t.Errorf("ArticleID mismatch: got %s, want %s", decoded.ArticleID, original.ArticleID)
	}
	if decoded.UserID != original.UserID {
		t.Errorf("UserID mismatch: got %s, want %s", decoded.UserID, original.UserID)
	}
	if decoded.IsHelpful != original.IsHelpful {
		t.Errorf("IsHelpful mismatch: got %v, want %v", decoded.IsHelpful, original.IsHelpful)
	}
	if decoded.Comment == nil || *decoded.Comment != comment {
		t.Errorf("Comment mismatch: got %v, want %q", decoded.Comment, comment)
	}
}

func TestFeedbackStatsJSON_RoundTrip(t *testing.T) {
	original := FeedbackStats{
		Total:      100,
		Helpful:    85,
		NotHelpful: 15,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal FeedbackStats: %v", err)
	}

	var decoded FeedbackStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal FeedbackStats: %v", err)
	}

	if decoded.Total != original.Total {
		t.Errorf("Total mismatch: got %d, want %d", decoded.Total, original.Total)
	}
	if decoded.Helpful != original.Helpful {
		t.Errorf("Helpful mismatch: got %d, want %d", decoded.Helpful, original.Helpful)
	}
	if decoded.NotHelpful != original.NotHelpful {
		t.Errorf("NotHelpful mismatch: got %d, want %d", decoded.NotHelpful, original.NotHelpful)
	}
}

func TestFeedbackStatsJSON_FieldNames(t *testing.T) {
	stats := FeedbackStats{Total: 10, Helpful: 7, NotHelpful: 3}

	data, err := json.Marshal(stats)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{"total", "helpful", "notHelpful"}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized FeedbackStats", field)
		}
	}
}

func TestAnnouncementJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	authorID := uuid.New()
	targetID := uuid.New()
	expiresAt := now.Add(24 * time.Hour)

	original := Announcement{
		ID:             id,
		TenantID:       tenantID,
		Title:          "System Maintenance Scheduled",
		Content:        "The system will be under maintenance on Saturday.",
		Priority:       AnnouncementPriorityHigh,
		TargetAudience: AudienceDivision,
		TargetIDs:      []uuid.UUID{targetID},
		PublishedAt:    &now,
		ExpiresAt:      &expiresAt,
		AuthorID:       authorID,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Announcement: %v", err)
	}

	var decoded Announcement
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Announcement: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch: got %s, want %s", decoded.TenantID, original.TenantID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.Content != original.Content {
		t.Errorf("Content mismatch: got %q, want %q", decoded.Content, original.Content)
	}
	if decoded.Priority != original.Priority {
		t.Errorf("Priority mismatch: got %q, want %q", decoded.Priority, original.Priority)
	}
	if decoded.TargetAudience != original.TargetAudience {
		t.Errorf("TargetAudience mismatch: got %q, want %q", decoded.TargetAudience, original.TargetAudience)
	}
	if len(decoded.TargetIDs) != 1 {
		t.Errorf("TargetIDs length mismatch: got %d, want 1", len(decoded.TargetIDs))
	}
	if decoded.AuthorID != original.AuthorID {
		t.Errorf("AuthorID mismatch: got %s, want %s", decoded.AuthorID, original.AuthorID)
	}
	if decoded.IsActive != original.IsActive {
		t.Errorf("IsActive mismatch: got %v, want %v", decoded.IsActive, original.IsActive)
	}
	if decoded.PublishedAt == nil {
		t.Error("PublishedAt should not be nil")
	}
	if decoded.ExpiresAt == nil {
		t.Error("ExpiresAt should not be nil")
	}
}

func TestAnnouncementJSON_FieldNames(t *testing.T) {
	now := time.Now().UTC()
	announcement := Announcement{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		Title:          "Test",
		Content:        "Body",
		Priority:       AnnouncementPriorityNormal,
		TargetAudience: AudienceAll,
		AuthorID:       uuid.New(),
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(announcement)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "title", "content", "priority",
		"targetAudience", "targetIds", "publishedAt", "expiresAt",
		"authorId", "isActive", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized Announcement", field)
		}
	}
}

func TestKBArticleJSON_NilOptionalFields(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	original := KBArticle{
		ID:       uuid.New(),
		TenantID: uuid.New(),
		Title:    "Minimal Article",
		Slug:     "minimal",
		Content:  "Content",
		Status:   ArticleStatusDraft,
		Type:     ArticleTypeFAQ,
		AuthorID: uuid.New(),
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded KBArticle
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.CategoryID != nil {
		t.Errorf("expected nil CategoryID, got %v", decoded.CategoryID)
	}
	if decoded.ReviewerID != nil {
		t.Errorf("expected nil ReviewerID, got %v", decoded.ReviewerID)
	}
	if decoded.PublishedAt != nil {
		t.Errorf("expected nil PublishedAt, got %v", decoded.PublishedAt)
	}
}

// ──────────────────────────────────────────────
// Request type JSON tests
// ──────────────────────────────────────────────

func TestCreateKBArticleRequestJSON_RoundTrip(t *testing.T) {
	catID := uuid.New()
	original := CreateKBArticleRequest{
		CategoryID: &catID,
		Title:      "New Article",
		Slug:       "new-article",
		Content:    "Article content here",
		Type:       ArticleTypeRunbook,
		Tags:       []string{"ops", "runbook"},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateKBArticleRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.Slug != original.Slug {
		t.Errorf("Slug mismatch: got %q, want %q", decoded.Slug, original.Slug)
	}
	if decoded.Content != original.Content {
		t.Errorf("Content mismatch: got %q, want %q", decoded.Content, original.Content)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: got %q, want %q", decoded.Type, original.Type)
	}
	if len(decoded.Tags) != 2 {
		t.Errorf("Tags length mismatch: got %d, want 2", len(decoded.Tags))
	}
	if decoded.CategoryID == nil || *decoded.CategoryID != catID {
		t.Errorf("CategoryID mismatch")
	}
}

func TestCreateAnnouncementRequestJSON_RoundTrip(t *testing.T) {
	targetID := uuid.New()
	expiresAt := time.Now().Add(48 * time.Hour).Truncate(time.Millisecond).UTC()

	original := CreateAnnouncementRequest{
		Title:          "Urgent Announcement",
		Content:        "Please read carefully.",
		Priority:       AnnouncementPriorityCritical,
		TargetAudience: AudienceRole,
		TargetIDs:      []uuid.UUID{targetID},
		ExpiresAt:      &expiresAt,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateAnnouncementRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.Priority != original.Priority {
		t.Errorf("Priority mismatch: got %q, want %q", decoded.Priority, original.Priority)
	}
	if decoded.TargetAudience != original.TargetAudience {
		t.Errorf("TargetAudience mismatch: got %q, want %q", decoded.TargetAudience, original.TargetAudience)
	}
	if len(decoded.TargetIDs) != 1 {
		t.Errorf("TargetIDs length mismatch: got %d, want 1", len(decoded.TargetIDs))
	}
	if decoded.ExpiresAt == nil {
		t.Error("ExpiresAt should not be nil")
	}
}

func TestCreateFeedbackRequestJSON_RoundTrip(t *testing.T) {
	comment := "Very insightful"
	original := CreateFeedbackRequest{
		IsHelpful: true,
		Comment:   &comment,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateFeedbackRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.IsHelpful != original.IsHelpful {
		t.Errorf("IsHelpful mismatch: got %v, want %v", decoded.IsHelpful, original.IsHelpful)
	}
	if decoded.Comment == nil || *decoded.Comment != comment {
		t.Errorf("Comment mismatch: got %v, want %q", decoded.Comment, comment)
	}
}

func TestCreateFeedbackRequestJSON_NoComment(t *testing.T) {
	input := `{"isHelpful":false}`
	var req CreateFeedbackRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if req.IsHelpful != false {
		t.Errorf("IsHelpful mismatch: got %v, want false", req.IsHelpful)
	}
	if req.Comment != nil {
		t.Errorf("expected nil Comment, got %v", req.Comment)
	}
}

// ──────────────────────────────────────────────
// Update request type JSON parsing tests
// ──────────────────────────────────────────────

func TestUpdateKBCategoryRequestJSON_Parse(t *testing.T) {
	input := `{"name":"Updated Cat","description":"New desc"}`
	var req UpdateKBCategoryRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name == nil || *req.Name != "Updated Cat" {
		t.Errorf("Name mismatch: got %v", req.Name)
	}
	if req.Description == nil || *req.Description != "New desc" {
		t.Errorf("Description mismatch: got %v", req.Description)
	}
	// Fields not in JSON should remain nil.
	if req.ParentID != nil {
		t.Errorf("expected nil ParentID, got %v", req.ParentID)
	}
	if req.Icon != nil {
		t.Errorf("expected nil Icon, got %v", req.Icon)
	}
	if req.SortOrder != nil {
		t.Errorf("expected nil SortOrder, got %v", req.SortOrder)
	}
}

func TestUpdateKBCategoryRequestJSON_WithAllFields(t *testing.T) {
	parentID := uuid.New()
	input := `{"name":"Full","description":"Full desc","parentId":"` + parentID.String() + `","icon":"folder","sortOrder":5}`
	var req UpdateKBCategoryRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name == nil || *req.Name != "Full" {
		t.Errorf("Name mismatch")
	}
	if req.ParentID == nil || *req.ParentID != parentID {
		t.Errorf("ParentID mismatch: got %v, want %s", req.ParentID, parentID)
	}
	if req.Icon == nil || *req.Icon != "folder" {
		t.Errorf("Icon mismatch: got %v", req.Icon)
	}
	if req.SortOrder == nil || *req.SortOrder != 5 {
		t.Errorf("SortOrder mismatch: got %v", req.SortOrder)
	}
}

func TestUpdateKBArticleRequestJSON_Parse(t *testing.T) {
	input := `{"title":"Updated Title","content":"New content","tags":["go","api"]}`
	var req UpdateKBArticleRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Title == nil || *req.Title != "Updated Title" {
		t.Errorf("Title mismatch: got %v", req.Title)
	}
	if req.Content == nil || *req.Content != "New content" {
		t.Errorf("Content mismatch: got %v", req.Content)
	}
	if len(req.Tags) != 2 {
		t.Errorf("Tags length mismatch: got %d, want 2", len(req.Tags))
	}
	// Fields not in JSON should remain nil.
	if req.CategoryID != nil {
		t.Errorf("expected nil CategoryID, got %v", req.CategoryID)
	}
	if req.Slug != nil {
		t.Errorf("expected nil Slug, got %v", req.Slug)
	}
	if req.Type != nil {
		t.Errorf("expected nil Type, got %v", req.Type)
	}
	if req.ReviewerID != nil {
		t.Errorf("expected nil ReviewerID, got %v", req.ReviewerID)
	}
}

func TestUpdateKBArticleRequestJSON_WithAllFields(t *testing.T) {
	catID := uuid.New()
	reviewerID := uuid.New()
	input := `{
		"categoryId":"` + catID.String() + `",
		"title":"Full Title",
		"slug":"full-title",
		"content":"Full content",
		"type":"runbook",
		"tags":["ops"],
		"reviewerId":"` + reviewerID.String() + `"
	}`
	var req UpdateKBArticleRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.CategoryID == nil || *req.CategoryID != catID {
		t.Errorf("CategoryID mismatch")
	}
	if req.Title == nil || *req.Title != "Full Title" {
		t.Errorf("Title mismatch")
	}
	if req.Slug == nil || *req.Slug != "full-title" {
		t.Errorf("Slug mismatch")
	}
	if req.Content == nil || *req.Content != "Full content" {
		t.Errorf("Content mismatch")
	}
	if req.Type == nil || *req.Type != "runbook" {
		t.Errorf("Type mismatch")
	}
	if len(req.Tags) != 1 || req.Tags[0] != "ops" {
		t.Errorf("Tags mismatch: got %v", req.Tags)
	}
	if req.ReviewerID == nil || *req.ReviewerID != reviewerID {
		t.Errorf("ReviewerID mismatch")
	}
}

func TestUpdateAnnouncementRequestJSON_Parse(t *testing.T) {
	input := `{"title":"Updated","isActive":false}`
	var req UpdateAnnouncementRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Title == nil || *req.Title != "Updated" {
		t.Errorf("Title mismatch: got %v", req.Title)
	}
	if req.IsActive == nil || *req.IsActive != false {
		t.Errorf("IsActive mismatch: got %v", req.IsActive)
	}
	// Fields not in JSON should remain nil.
	if req.Content != nil {
		t.Errorf("expected nil Content, got %v", req.Content)
	}
	if req.Priority != nil {
		t.Errorf("expected nil Priority, got %v", req.Priority)
	}
	if req.TargetAudience != nil {
		t.Errorf("expected nil TargetAudience, got %v", req.TargetAudience)
	}
	if req.ExpiresAt != nil {
		t.Errorf("expected nil ExpiresAt, got %v", req.ExpiresAt)
	}
}

func TestUpdateAnnouncementRequestJSON_WithTargetIDs(t *testing.T) {
	targetID := uuid.New()
	input := `{"priority":"critical","targetAudience":"division","targetIds":["` + targetID.String() + `"]}`
	var req UpdateAnnouncementRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Priority == nil || *req.Priority != "critical" {
		t.Errorf("Priority mismatch")
	}
	if req.TargetAudience == nil || *req.TargetAudience != "division" {
		t.Errorf("TargetAudience mismatch")
	}
	if len(req.TargetIDs) != 1 || req.TargetIDs[0] != targetID {
		t.Errorf("TargetIDs mismatch: got %v", req.TargetIDs)
	}
}

// ──────────────────────────────────────────────
// Category field name tests
// ──────────────────────────────────────────────

func TestKBCategoryJSON_FieldNames(t *testing.T) {
	cat := KBCategory{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Name:      "Test",
		SortOrder: 1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(cat)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "name", "description", "parentId",
		"icon", "sortOrder", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized KBCategory", field)
		}
	}
}

func TestKBArticleVersionJSON_FieldNames(t *testing.T) {
	v := KBArticleVersion{
		ID:        uuid.New(),
		ArticleID: uuid.New(),
		Version:   1,
		Content:   "content",
		ChangedBy: uuid.New(),
		CreatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{"id", "articleId", "version", "content", "changedBy", "createdAt"}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized KBArticleVersion", field)
		}
	}
}

func TestKBArticleFeedbackJSON_FieldNames(t *testing.T) {
	fb := KBArticleFeedback{
		ID:        uuid.New(),
		ArticleID: uuid.New(),
		UserID:    uuid.New(),
		IsHelpful: true,
		CreatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(fb)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{"id", "articleId", "userId", "isHelpful", "comment", "createdAt"}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized KBArticleFeedback", field)
		}
	}
}

// ──────────────────────────────────────────────
// Nil and empty list tests
// ──────────────────────────────────────────────

func TestAnnouncementJSON_NilOptionalFields(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	original := Announcement{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		Title:          "Minimal",
		Content:        "Body",
		Priority:       AnnouncementPriorityLow,
		TargetAudience: AudienceAll,
		AuthorID:       uuid.New(),
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded Announcement
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.PublishedAt != nil {
		t.Errorf("expected nil PublishedAt, got %v", decoded.PublishedAt)
	}
	if decoded.ExpiresAt != nil {
		t.Errorf("expected nil ExpiresAt, got %v", decoded.ExpiresAt)
	}
}

func TestKBArticleJSON_EmptyTags(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	original := KBArticle{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Title:     "No Tags",
		Slug:      "no-tags",
		Content:   "Content",
		Status:    ArticleStatusDraft,
		Type:      ArticleTypeFAQ,
		Tags:      []string{},
		AuthorID:  uuid.New(),
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded KBArticle
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Tags == nil {
		t.Error("expected non-nil empty Tags slice after round-trip")
	}
	if len(decoded.Tags) != 0 {
		t.Errorf("expected empty Tags, got %v", decoded.Tags)
	}
}

func TestCreateKBArticleRequestJSON_MinimalFields(t *testing.T) {
	input := `{"title":"Min","slug":"min","content":"c","type":"faq"}`
	var req CreateKBArticleRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Title != "Min" {
		t.Errorf("Title mismatch: got %q", req.Title)
	}
	if req.CategoryID != nil {
		t.Errorf("expected nil CategoryID, got %v", req.CategoryID)
	}
	if req.Tags != nil {
		t.Errorf("expected nil Tags for missing field, got %v", req.Tags)
	}
}

func TestCreateKBCategoryRequestJSON_Parse(t *testing.T) {
	parentID := uuid.New()
	sortOrder := 3
	input := `{"name":"Networking","description":"Network articles","parentId":"` + parentID.String() + `","icon":"wifi","sortOrder":` + fmt.Sprintf("%d", sortOrder) + `}`
	var req CreateKBCategoryRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name != "Networking" {
		t.Errorf("Name mismatch: got %q", req.Name)
	}
	if req.Description == nil || *req.Description != "Network articles" {
		t.Errorf("Description mismatch: got %v", req.Description)
	}
	if req.ParentID == nil || *req.ParentID != parentID {
		t.Errorf("ParentID mismatch")
	}
	if req.Icon == nil || *req.Icon != "wifi" {
		t.Errorf("Icon mismatch")
	}
	if req.SortOrder == nil || *req.SortOrder != sortOrder {
		t.Errorf("SortOrder mismatch")
	}
}

func TestCreateKBCategoryRequestJSON_Minimal(t *testing.T) {
	input := `{"name":"Simple"}`
	var req CreateKBCategoryRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name != "Simple" {
		t.Errorf("Name mismatch: got %q", req.Name)
	}
	if req.Description != nil {
		t.Errorf("expected nil Description, got %v", req.Description)
	}
	if req.ParentID != nil {
		t.Errorf("expected nil ParentID, got %v", req.ParentID)
	}
	if req.Icon != nil {
		t.Errorf("expected nil Icon, got %v", req.Icon)
	}
	if req.SortOrder != nil {
		t.Errorf("expected nil SortOrder, got %v", req.SortOrder)
	}
}
