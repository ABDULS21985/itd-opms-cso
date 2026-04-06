package knowledge

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// FeedbackService
// ──────────────────────────────────────────────

// FeedbackService handles business logic for KB article feedback.
type FeedbackService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewFeedbackService creates a new FeedbackService.
func NewFeedbackService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *FeedbackService {
	return &FeedbackService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Feedback CRUD
// ──────────────────────────────────────────────

// CreateFeedback creates a new feedback entry for an article and updates helpful/not_helpful counts.
func (s *FeedbackService) CreateFeedback(ctx context.Context, articleID uuid.UUID, req CreateFeedbackRequest) (KBArticleFeedback, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBArticleFeedback{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Insert feedback record.
	insertQuery := `
		INSERT INTO kb_article_feedback (
			id, article_id, user_id, is_helpful, comment, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6
		)
		RETURNING id, article_id, user_id, is_helpful, comment, created_at`

	var fb KBArticleFeedback
	err := s.pool.QueryRow(ctx, insertQuery,
		id, articleID, auth.UserID, req.IsHelpful, req.Comment, now,
	).Scan(
		&fb.ID, &fb.ArticleID, &fb.UserID, &fb.IsHelpful, &fb.Comment, &fb.CreatedAt,
	)
	if err != nil {
		return KBArticleFeedback{}, apperrors.Internal("failed to create feedback", err)
	}

	// Update article helpful/not_helpful counts.
	if req.IsHelpful {
		_, err = s.pool.Exec(ctx,
			`UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = $1`,
			articleID,
		)
	} else {
		_, err = s.pool.Exec(ctx,
			`UPDATE kb_articles SET not_helpful_count = not_helpful_count + 1 WHERE id = $1`,
			articleID,
		)
	}
	if err != nil {
		slog.ErrorContext(ctx, "failed to update article feedback counts", "error", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"articleId": articleID,
		"isHelpful": req.IsHelpful,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:kb_article_feedback",
		EntityType: "kb_article_feedback",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return fb, nil
}

// ListFeedback returns all feedback entries for a given article.
func (s *FeedbackService) ListFeedback(ctx context.Context, articleID uuid.UUID) ([]KBArticleFeedback, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, article_id, user_id, is_helpful, comment, created_at
		FROM kb_article_feedback
		WHERE article_id = $1
		ORDER BY created_at DESC`

	rows, err := s.pool.Query(ctx, query, articleID)
	if err != nil {
		return nil, apperrors.Internal("failed to list feedback", err)
	}
	defer rows.Close()

	var feedbacks []KBArticleFeedback
	for rows.Next() {
		var fb KBArticleFeedback
		if err := rows.Scan(
			&fb.ID, &fb.ArticleID, &fb.UserID, &fb.IsHelpful, &fb.Comment, &fb.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan feedback", err)
		}
		feedbacks = append(feedbacks, fb)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate feedback", err)
	}

	if feedbacks == nil {
		feedbacks = []KBArticleFeedback{}
	}

	return feedbacks, nil
}

// GetFeedbackStats returns aggregated feedback statistics for an article.
func (s *FeedbackService) GetFeedbackStats(ctx context.Context, articleID uuid.UUID) (FeedbackStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return FeedbackStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COALESCE(SUM(CASE WHEN is_helpful = true THEN 1 ELSE 0 END), 0) AS helpful,
			COALESCE(SUM(CASE WHEN is_helpful = false THEN 1 ELSE 0 END), 0) AS not_helpful
		FROM kb_article_feedback
		WHERE article_id = $1`

	var stats FeedbackStats
	err := s.pool.QueryRow(ctx, query, articleID).Scan(
		&stats.Total, &stats.Helpful, &stats.NotHelpful,
	)
	if err != nil {
		return FeedbackStats{}, apperrors.Internal("failed to get feedback stats", err)
	}

	return stats, nil
}

// DeleteFeedback deletes a feedback entry by ID, verifying it belongs to the given article.
func (s *FeedbackService) DeleteFeedback(ctx context.Context, articleID uuid.UUID, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Get the feedback first to verify ownership and collect counts to decrement.
	var storedArticleID uuid.UUID
	var isHelpful bool
	getQuery := `SELECT article_id, is_helpful FROM kb_article_feedback WHERE id = $1`
	err := s.pool.QueryRow(ctx, getQuery, id).Scan(&storedArticleID, &isHelpful)
	if err != nil {
		return apperrors.NotFound("KBArticleFeedback", id.String())
	}

	// Ensure the feedback belongs to the article specified in the URL path.
	if storedArticleID != articleID {
		return apperrors.NotFound("KBArticleFeedback", id.String())
	}

	// Delete the feedback.
	query := `DELETE FROM kb_article_feedback WHERE id = $1`
	result, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return apperrors.Internal("failed to delete feedback", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("KBArticleFeedback", id.String())
	}

	// Decrement article counts.
	if isHelpful {
		_, err = s.pool.Exec(ctx,
			`UPDATE kb_articles SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = $1`,
			storedArticleID,
		)
	} else {
		_, err = s.pool.Exec(ctx,
			`UPDATE kb_articles SET not_helpful_count = GREATEST(not_helpful_count - 1, 0) WHERE id = $1`,
			storedArticleID,
		)
	}
	if err != nil {
		slog.ErrorContext(ctx, "failed to decrement article feedback counts", "error", err)
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:kb_article_feedback",
		EntityType: "kb_article_feedback",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}
