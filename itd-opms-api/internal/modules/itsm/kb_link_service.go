package itsm

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// KBLinkService handles business logic for ticket ↔ KB article links.
type KBLinkService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewKBLinkService creates a new KBLinkService.
func NewKBLinkService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *KBLinkService {
	return &KBLinkService{pool: pool, auditSvc: auditSvc}
}

// LinkArticle links a KB article to a ticket.
func (s *KBLinkService) LinkArticle(ctx context.Context, ticketID uuid.UUID, req LinkArticleRequest) (*TicketKBLink, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Default link type.
	linkType := req.LinkType
	if linkType == "" {
		linkType = "reference"
	}
	if linkType != "reference" && linkType != "resolution" && linkType != "workaround" {
		return nil, apperrors.BadRequest("linkType must be one of: reference, resolution, workaround")
	}

	// Verify ticket exists and belongs to tenant.
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM tickets WHERE id = $1 AND tenant_id = $2)`,
		ticketID, auth.TenantID,
	).Scan(&exists)
	if err != nil || !exists {
		return nil, apperrors.NotFound("ticket", ticketID.String())
	}

	// Verify article exists and belongs to tenant.
	var articleTitle string
	err = s.pool.QueryRow(ctx,
		`SELECT title FROM kb_articles WHERE id = $1 AND tenant_id = $2`,
		req.ArticleID, auth.TenantID,
	).Scan(&articleTitle)
	if err != nil {
		return nil, apperrors.NotFound("kb_article", req.ArticleID.String())
	}

	// Insert or update (upsert) the link — allows changing link_type on existing link.
	var link TicketKBLink
	err = s.pool.QueryRow(ctx,
		`INSERT INTO ticket_kb_links (ticket_id, article_id, linked_by, link_type)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (ticket_id, article_id)
		 DO UPDATE SET link_type = EXCLUDED.link_type, linked_by = EXCLUDED.linked_by
		 RETURNING id, ticket_id, article_id, linked_by, link_type, created_at`,
		ticketID, req.ArticleID, auth.UserID, linkType,
	).Scan(&link.ID, &link.TicketID, &link.ArticleID, &link.LinkedBy, &link.LinkType, &link.CreatedAt)
	if err != nil {
		return nil, apperrors.Internal("failed to link article", err)
	}

	// Enrich with article and user info.
	_ = s.pool.QueryRow(ctx,
		`SELECT a.title, a.slug, a.status, a.type, u.display_name
		 FROM kb_articles a, users u
		 WHERE a.id = $1 AND u.id = $2`,
		req.ArticleID, auth.UserID,
	).Scan(&link.ArticleTitle, &link.ArticleSlug, &link.ArticleStatus, &link.ArticleType, &link.LinkedByName)

	// If link_type is 'resolution', auto-increment the article's helpful_count
	// and add an automatic comment to the ticket documenting the resolution article.
	if linkType == "resolution" {
		if _, err := s.pool.Exec(ctx,
			`UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = $1`,
			req.ArticleID,
		); err != nil {
			slog.Warn("failed to increment helpful_count", "article_id", req.ArticleID, "error", err)
		}

		// Auto-add a resolution comment to the ticket.
		commentContent := fmt.Sprintf("Linked KB article as resolution: **%s** (`%s`)", articleTitle, link.ArticleSlug)
		if _, err := s.pool.Exec(ctx,
			`INSERT INTO ticket_comments (id, ticket_id, tenant_id, author_id, content, is_internal, attachments, created_at)
			 VALUES ($1, $2, $3, $4, $5, false, '{}', $6)`,
			uuid.New(), ticketID, auth.TenantID, auth.UserID, commentContent, time.Now().UTC(),
		); err != nil {
			slog.Warn("failed to add resolution comment", "ticket_id", ticketID, "error", err)
		}
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"ticket_id":  ticketID,
		"article_id": req.ArticleID,
		"link_type":  linkType,
	})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:ticket_kb_link",
		EntityType: "ticket_kb_link",
		EntityID:   link.ID,
		Changes:    changes,
	})

	return &link, nil
}

// UnlinkArticle removes a KB link from a ticket.
func (s *KBLinkService) UnlinkArticle(ctx context.Context, ticketID, linkID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tag, err := s.pool.Exec(ctx,
		`DELETE FROM ticket_kb_links WHERE id = $1 AND ticket_id = $2`,
		linkID, ticketID,
	)
	if err != nil {
		return apperrors.Internal("failed to unlink article", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("ticket_kb_link", linkID.String())
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:ticket_kb_link",
		EntityType: "ticket_kb_link",
		EntityID:   linkID,
	})

	return nil
}

// GetTicketKBLinks returns all KB articles linked to a ticket.
func (s *KBLinkService) GetTicketKBLinks(ctx context.Context, ticketID uuid.UUID) ([]TicketKBLink, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT l.id, l.ticket_id, l.article_id, l.linked_by, l.link_type, l.created_at,
		        a.title, a.slug, a.status, a.type,
		        COALESCE(u.display_name, '') AS linked_by_name
		 FROM ticket_kb_links l
		 JOIN kb_articles a ON a.id = l.article_id
		 LEFT JOIN users u ON u.id = l.linked_by
		 WHERE l.ticket_id = $1
		 ORDER BY l.created_at DESC`,
		ticketID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to get KB links", err)
	}
	defer rows.Close()

	var links []TicketKBLink
	for rows.Next() {
		var l TicketKBLink
		if err := rows.Scan(
			&l.ID, &l.TicketID, &l.ArticleID, &l.LinkedBy, &l.LinkType, &l.CreatedAt,
			&l.ArticleTitle, &l.ArticleSlug, &l.ArticleStatus, &l.ArticleType, &l.LinkedByName,
		); err != nil {
			return nil, apperrors.Internal("failed to scan KB link", err)
		}
		links = append(links, l)
	}
	if links == nil {
		links = []TicketKBLink{}
	}
	return links, nil
}

// SuggestArticles returns KB articles matching the ticket's title and description
// using PostgreSQL full-text search (plainto_tsquery against GIN index).
func (s *KBLinkService) SuggestArticles(ctx context.Context, ticketID uuid.UUID) ([]KBSuggestion, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Fetch the ticket's title for search terms.
	var title string
	err := s.pool.QueryRow(ctx,
		`SELECT title FROM tickets WHERE id = $1 AND tenant_id = $2`,
		ticketID, auth.TenantID,
	).Scan(&title)
	if err != nil {
		return nil, apperrors.NotFound("ticket", ticketID.String())
	}

	// Use OR-joined tsquery so articles matching ANY keyword are surfaced.
	// plainto_tsquery uses AND which is too strict for suggestions.
	rows, err := s.pool.Query(ctx,
		`WITH q AS (
		   SELECT to_tsquery('english',
		     array_to_string(
		       ARRAY(SELECT lexeme FROM unnest(to_tsvector('english', $1))),
		       ' | '
		     )
		   ) AS tsq
		 )
		 SELECT a.id, a.title, a.slug, a.type, a.status, a.view_count, a.helpful_count,
		        ts_rank(to_tsvector('english', a.title || ' ' || a.content), q.tsq) AS rank
		 FROM kb_articles a, q
		 WHERE a.tenant_id = $2
		   AND a.status = 'published'
		   AND to_tsvector('english', a.title || ' ' || a.content) @@ q.tsq
		   AND a.id NOT IN (SELECT article_id FROM ticket_kb_links WHERE ticket_id = $3)
		 ORDER BY rank DESC, a.helpful_count DESC
		 LIMIT 10`,
		title, auth.TenantID, ticketID,
	)
	if err != nil {
		return nil, fmt.Errorf("suggest articles: %w", err)
	}
	defer rows.Close()

	var suggestions []KBSuggestion
	for rows.Next() {
		var s KBSuggestion
		if err := rows.Scan(&s.ID, &s.Title, &s.Slug, &s.Type, &s.Status,
			&s.ViewCount, &s.HelpfulCount, &s.Rank); err != nil {
			return nil, fmt.Errorf("scan suggestion: %w", err)
		}
		suggestions = append(suggestions, s)
	}
	if suggestions == nil {
		suggestions = []KBSuggestion{}
	}
	return suggestions, nil
}

// SearchArticles performs a direct KB search for linking from the ticket detail page.
func (s *KBLinkService) SearchArticles(ctx context.Context, query string, limit int) ([]KBSuggestion, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if limit <= 0 || limit > 20 {
		limit = 10
	}

	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.title, a.slug, a.type, a.status, a.view_count, a.helpful_count,
		        ts_rank(to_tsvector('english', a.title || ' ' || a.content), q) AS rank
		 FROM kb_articles a,
		      plainto_tsquery('english', $1) q
		 WHERE a.tenant_id = $2
		   AND a.status = 'published'
		   AND (
		       to_tsvector('english', a.title || ' ' || a.content) @@ q
		       OR a.title ILIKE '%' || $1 || '%'
		   )
		 ORDER BY rank DESC, a.helpful_count DESC
		 LIMIT $3`,
		query, auth.TenantID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("search articles: %w", err)
	}
	defer rows.Close()

	var results []KBSuggestion
	for rows.Next() {
		var s KBSuggestion
		if err := rows.Scan(&s.ID, &s.Title, &s.Slug, &s.Type, &s.Status,
			&s.ViewCount, &s.HelpfulCount, &s.Rank); err != nil {
			return nil, fmt.Errorf("scan search result: %w", err)
		}
		results = append(results, s)
	}
	if results == nil {
		results = []KBSuggestion{}
	}
	return results, nil
}
