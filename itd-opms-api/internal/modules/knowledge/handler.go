package knowledge

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the Knowledge Management module.
// It composes all sub-handlers for articles, feedback, and announcements.
type Handler struct {
	article      *ArticleHandler
	feedback     *FeedbackHandler
	announcement *AnnouncementHandler
}

// NewHandler creates a new Knowledge Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	articleSvc := NewArticleService(pool, auditSvc)
	feedbackSvc := NewFeedbackService(pool, auditSvc)
	announcementSvc := NewAnnouncementService(pool, auditSvc)

	return &Handler{
		article:      NewArticleHandler(articleSvc),
		feedback:     NewFeedbackHandler(feedbackSvc),
		announcement: NewAnnouncementHandler(announcementSvc),
	}
}

// Routes mounts all Knowledge sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// KB categories & articles (FR-F001 to FR-F005)
	h.article.Routes(r)

	// Article feedback
	h.feedback.Routes(r)

	// Announcements (FR-F008)
	r.Route("/announcements", func(r chi.Router) {
		h.announcement.Routes(r)
	})
}
