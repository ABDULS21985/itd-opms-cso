package knowledge

import (
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Article status constants
// ──────────────────────────────────────────────

const (
	ArticleStatusDraft     = "draft"
	ArticleStatusInReview  = "in_review"
	ArticleStatusPublished = "published"
	ArticleStatusArchived  = "archived"
	ArticleStatusRetired   = "retired"
)

// ──────────────────────────────────────────────
// Article type constants
// ──────────────────────────────────────────────

const (
	ArticleTypeHowTo          = "how_to"
	ArticleTypeTroubleshooting = "troubleshooting"
	ArticleTypeFAQ            = "faq"
	ArticleTypeBestPractice   = "best_practice"
	ArticleTypeRunbook        = "runbook"
)

// ──────────────────────────────────────────────
// Announcement priority constants
// ──────────────────────────────────────────────

const (
	AnnouncementPriorityLow      = "low"
	AnnouncementPriorityNormal   = "normal"
	AnnouncementPriorityHigh     = "high"
	AnnouncementPriorityCritical = "critical"
)

// ──────────────────────────────────────────────
// Announcement target audience constants
// ──────────────────────────────────────────────

const (
	AudienceAll      = "all"
	AudienceDivision = "division"
	AudienceUnit     = "unit"
	AudienceRole     = "role"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// KBCategory represents a hierarchical knowledge base category.
type KBCategory struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
	Icon        *string    `json:"icon"`
	SortOrder   int        `json:"sortOrder"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// KBArticle represents a knowledge base article.
type KBArticle struct {
	ID              uuid.UUID   `json:"id"`
	TenantID        uuid.UUID   `json:"tenantId"`
	CategoryID      *uuid.UUID  `json:"categoryId"`
	Title           string      `json:"title"`
	Slug            string      `json:"slug"`
	Content         string      `json:"content"`
	Status          string      `json:"status"`
	Version         int         `json:"version"`
	Type            string      `json:"type"`
	Tags            []string    `json:"tags"`
	AuthorID        uuid.UUID   `json:"authorId"`
	ReviewerID      *uuid.UUID  `json:"reviewerId"`
	PublishedAt     *time.Time  `json:"publishedAt"`
	ViewCount       int         `json:"viewCount"`
	HelpfulCount    int         `json:"helpfulCount"`
	NotHelpfulCount int         `json:"notHelpfulCount"`
	LinkedTicketIDs []uuid.UUID `json:"linkedTicketIds"`
	OrgUnitID       *uuid.UUID  `json:"orgUnitId,omitempty"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
}

// KBArticleVersion represents a historical version of an article's content.
type KBArticleVersion struct {
	ID        uuid.UUID `json:"id"`
	ArticleID uuid.UUID `json:"articleId"`
	Version   int       `json:"version"`
	Content   string    `json:"content"`
	ChangedBy uuid.UUID `json:"changedBy"`
	CreatedAt time.Time `json:"createdAt"`
}

// KBArticleFeedback represents user feedback on a knowledge base article.
type KBArticleFeedback struct {
	ID        uuid.UUID `json:"id"`
	ArticleID uuid.UUID `json:"articleId"`
	UserID    uuid.UUID `json:"userId"`
	IsHelpful bool      `json:"isHelpful"`
	Comment   *string   `json:"comment"`
	CreatedAt time.Time `json:"createdAt"`
}

// FeedbackStats holds aggregated feedback statistics for an article.
type FeedbackStats struct {
	Total      int `json:"total"`
	Helpful    int `json:"helpful"`
	NotHelpful int `json:"notHelpful"`
}

// Announcement represents a targeted announcement to users.
type Announcement struct {
	ID             uuid.UUID   `json:"id"`
	TenantID       uuid.UUID   `json:"tenantId"`
	Title          string      `json:"title"`
	Content        string      `json:"content"`
	Priority       string      `json:"priority"`
	TargetAudience string      `json:"targetAudience"`
	TargetIDs      []uuid.UUID `json:"targetIds"`
	PublishedAt    *time.Time  `json:"publishedAt"`
	ExpiresAt      *time.Time  `json:"expiresAt"`
	AuthorID       uuid.UUID   `json:"authorId"`
	IsActive       bool        `json:"isActive"`
	OrgUnitID      *uuid.UUID  `json:"orgUnitId,omitempty"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateKBCategoryRequest is the payload for creating a knowledge base category.
type CreateKBCategoryRequest struct {
	Name        string     `json:"name" validate:"required"`
	Description *string    `json:"description,omitempty"`
	ParentID    *uuid.UUID `json:"parentId,omitempty"`
	Icon        *string    `json:"icon,omitempty"`
	SortOrder   *int       `json:"sortOrder,omitempty"`
}

// UpdateKBCategoryRequest is the payload for updating a knowledge base category.
type UpdateKBCategoryRequest struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
	Icon        *string    `json:"icon"`
	SortOrder   *int       `json:"sortOrder"`
}

// CreateKBArticleRequest is the payload for creating a knowledge base article.
type CreateKBArticleRequest struct {
	CategoryID *uuid.UUID `json:"categoryId,omitempty"`
	Title      string     `json:"title" validate:"required"`
	Slug       string     `json:"slug" validate:"required"`
	Content    string     `json:"content" validate:"required"`
	Type       string     `json:"type" validate:"required"`
	Tags       []string   `json:"tags,omitempty"`
}

// UpdateKBArticleRequest is the payload for updating a knowledge base article.
type UpdateKBArticleRequest struct {
	CategoryID *uuid.UUID `json:"categoryId"`
	Title      *string    `json:"title"`
	Slug       *string    `json:"slug"`
	Content    *string    `json:"content"`
	Type       *string    `json:"type"`
	Tags       []string   `json:"tags"`
	ReviewerID *uuid.UUID `json:"reviewerId"`
}

// CreateFeedbackRequest is the payload for submitting article feedback.
type CreateFeedbackRequest struct {
	IsHelpful bool    `json:"isHelpful"`
	Comment   *string `json:"comment,omitempty"`
}

// CreateAnnouncementRequest is the payload for creating an announcement.
type CreateAnnouncementRequest struct {
	Title          string      `json:"title" validate:"required"`
	Content        string      `json:"content" validate:"required"`
	Priority       string      `json:"priority" validate:"required"`
	TargetAudience string      `json:"targetAudience" validate:"required"`
	TargetIDs      []uuid.UUID `json:"targetIds,omitempty"`
	ExpiresAt      *time.Time  `json:"expiresAt,omitempty"`
}

// UpdateAnnouncementRequest is the payload for updating an announcement.
type UpdateAnnouncementRequest struct {
	Title          *string     `json:"title"`
	Content        *string     `json:"content"`
	Priority       *string     `json:"priority"`
	TargetAudience *string     `json:"targetAudience"`
	TargetIDs      []uuid.UUID `json:"targetIds"`
	IsActive       *bool       `json:"isActive"`
	ExpiresAt      *time.Time  `json:"expiresAt"`
}
