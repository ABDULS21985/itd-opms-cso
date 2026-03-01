package people

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the People & Workforce module.
// It composes all sub-handlers for skills, checklists, rosters, training, and heatmap.
type Handler struct {
	skill     *SkillHandler
	checklist *ChecklistHandler
	roster    *RosterHandler
	training  *TrainingHandler
	heatmap   *HeatmapHandler
}

// NewHandler creates a new People Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	skillSvc := NewSkillService(pool, auditSvc)
	checklistSvc := NewChecklistService(pool, auditSvc)
	rosterSvc := NewRosterService(pool, auditSvc)
	trainingSvc := NewTrainingService(pool, auditSvc)
	heatmapSvc := NewHeatmapService(pool, auditSvc)

	return &Handler{
		skill:     NewSkillHandler(skillSvc),
		checklist: NewChecklistHandler(checklistSvc),
		roster:    NewRosterHandler(rosterSvc),
		training:  NewTrainingHandler(trainingSvc),
		heatmap:   NewHeatmapHandler(heatmapSvc),
	}
}

// Routes mounts all People sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Skills — categories, skills, user skills, role requirements, gap analysis
	r.Route("/skills", func(r chi.Router) {
		h.skill.Routes(r)
	})

	// Checklists — templates, checklists, tasks
	r.Route("/checklists", func(r chi.Router) {
		h.checklist.Routes(r)
	})

	// Rosters, Leave Records, Capacity Allocations, and Heatmap
	h.roster.Routes(r) // mounts /rosters, /leave, /capacity (basic CRUD)

	// Capacity Heatmap & Enriched Allocations (mounted under /capacity via heatmap handler)
	h.heatmap.MountRoutes(r) // adds /capacity/heatmap, /capacity/allocations

	// Training Records
	r.Route("/training", func(r chi.Router) {
		h.training.Routes(r)
	})
}
