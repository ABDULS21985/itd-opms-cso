package people

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Shared error helper
// ──────────────────────────────────────────────

// writeAppError maps an application error to the appropriate HTTP response.
func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	status := apperrors.HTTPStatus(err)
	code := apperrors.Code(err)
	if status >= 500 {
		slog.ErrorContext(r.Context(), "internal error",
			"error", err.Error(),
			"path", r.URL.Path,
			"correlation_id", types.GetCorrelationID(r.Context()),
		)
	}
	types.ErrorMessage(w, status, code, err.Error())
}

// ──────────────────────────────────────────────
// SkillHandler
// ──────────────────────────────────────────────

// SkillHandler handles HTTP requests for skills, user skills, role requirements, and gap analysis.
type SkillHandler struct {
	svc *SkillService
}

// NewSkillHandler creates a new SkillHandler.
func NewSkillHandler(svc *SkillService) *SkillHandler {
	return &SkillHandler{svc: svc}
}

// Routes mounts skill endpoints on the given router.
func (h *SkillHandler) Routes(r chi.Router) {
	// Skill Categories
	r.Route("/categories", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/", h.ListSkillCategories)
		r.With(middleware.RequirePermission("people.view")).Get("/{id}", h.GetSkillCategory)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateSkillCategory)
		r.With(middleware.RequirePermission("people.manage")).Put("/{id}", h.UpdateSkillCategory)
		r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteSkillCategory)
	})

	// Skills (root)
	r.With(middleware.RequirePermission("people.view")).Get("/", h.ListSkills)
	r.With(middleware.RequirePermission("people.view")).Get("/{id}", h.GetSkill)
	r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateSkill)
	r.With(middleware.RequirePermission("people.manage")).Put("/{id}", h.UpdateSkill)
	r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteSkill)

	// User Skills
	r.Route("/user-skills", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/by-skill/{skillId}", h.ListUsersBySkill)
		r.With(middleware.RequirePermission("people.view")).Get("/{userId}", h.ListUserSkills)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateUserSkill)
		r.With(middleware.RequirePermission("people.manage")).Put("/{id}", h.UpdateUserSkill)
		r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteUserSkill)
		r.With(middleware.RequirePermission("people.manage")).Put("/{id}/verify", h.VerifyUserSkill)
	})

	// Role Skill Requirements
	r.Route("/requirements", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/{roleType}", h.ListRoleSkillRequirements)
		r.With(middleware.RequirePermission("people.view")).Get("/{roleType}/gap/{userId}", h.GetSkillGapAnalysis)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateRoleSkillRequirement)
		r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteRoleSkillRequirement)
	})
}

// ──────────────────────────────────────────────
// Skill Category Handlers
// ──────────────────────────────────────────────

// ListSkillCategories handles GET /categories — returns skill categories.
func (h *SkillHandler) ListSkillCategories(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var parentID *uuid.UUID
	if v := r.URL.Query().Get("parent_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid parent_id")
			return
		}
		parentID = &parsed
	}

	categories, err := h.svc.ListSkillCategories(r.Context(), parentID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, categories, nil)
}

// GetSkillCategory handles GET /categories/{id} — retrieves a single category.
func (h *SkillHandler) GetSkillCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	category, err := h.svc.GetSkillCategory(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, category, nil)
}

// CreateSkillCategory handles POST /categories — creates a new category.
func (h *SkillHandler) CreateSkillCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateSkillCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	category, err := h.svc.CreateSkillCategory(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, category)
}

// UpdateSkillCategory handles PUT /categories/{id} — updates a category.
func (h *SkillHandler) UpdateSkillCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	var req UpdateSkillCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	category, err := h.svc.UpdateSkillCategory(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, category, nil)
}

// DeleteSkillCategory handles DELETE /categories/{id} — deletes a category.
func (h *SkillHandler) DeleteSkillCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	if err := h.svc.DeleteSkillCategory(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Skill Handlers
// ──────────────────────────────────────────────

// ListSkills handles GET / — returns a paginated list of skills.
func (h *SkillHandler) ListSkills(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var categoryID *uuid.UUID
	if v := r.URL.Query().Get("category_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category_id")
			return
		}
		categoryID = &parsed
	}

	params := types.ParsePagination(r)

	skills, total, err := h.svc.ListSkills(r.Context(), categoryID, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, skills, types.NewMeta(int64(total), params))
}

// GetSkill handles GET /{id} — retrieves a single skill.
func (h *SkillHandler) GetSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid skill ID")
		return
	}

	skill, err := h.svc.GetSkill(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, skill, nil)
}

// CreateSkill handles POST / — creates a new skill.
func (h *SkillHandler) CreateSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateSkillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	skill, err := h.svc.CreateSkill(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, skill)
}

// UpdateSkill handles PUT /{id} — updates a skill.
func (h *SkillHandler) UpdateSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid skill ID")
		return
	}

	var req UpdateSkillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	skill, err := h.svc.UpdateSkill(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, skill, nil)
}

// DeleteSkill handles DELETE /{id} — deletes a skill.
func (h *SkillHandler) DeleteSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid skill ID")
		return
	}

	if err := h.svc.DeleteSkill(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// User Skill Handlers
// ──────────────────────────────────────────────

// ListUserSkills handles GET /user-skills/{userId} — returns skills for a user.
func (h *SkillHandler) ListUserSkills(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "userId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	skills, err := h.svc.ListUserSkills(r.Context(), userID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, skills, nil)
}

// CreateUserSkill handles POST /user-skills — creates a user skill.
func (h *SkillHandler) CreateUserSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateUserSkillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ProficiencyLevel == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Proficiency level is required")
		return
	}

	userSkill, err := h.svc.CreateUserSkill(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, userSkill)
}

// UpdateUserSkill handles PUT /user-skills/{id} — updates a user skill.
func (h *SkillHandler) UpdateUserSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user skill ID")
		return
	}

	var req UpdateUserSkillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	userSkill, err := h.svc.UpdateUserSkill(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, userSkill, nil)
}

// DeleteUserSkill handles DELETE /user-skills/{id} — deletes a user skill.
func (h *SkillHandler) DeleteUserSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user skill ID")
		return
	}

	if err := h.svc.DeleteUserSkill(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// VerifyUserSkill handles PUT /user-skills/{id}/verify — marks a user skill as verified.
func (h *SkillHandler) VerifyUserSkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user skill ID")
		return
	}

	if err := h.svc.VerifyUserSkill(r.Context(), id, authCtx.UserID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ListUsersBySkill handles GET /user-skills/by-skill/{skillId} — returns users with a given skill.
func (h *SkillHandler) ListUsersBySkill(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	skillID, err := uuid.Parse(chi.URLParam(r, "skillId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid skill ID")
		return
	}

	var proficiency *string
	if v := r.URL.Query().Get("proficiency"); v != "" {
		proficiency = &v
	}

	userSkills, err := h.svc.ListUsersBySkill(r.Context(), skillID, proficiency)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, userSkills, nil)
}

// ──────────────────────────────────────────────
// Role Skill Requirement Handlers
// ──────────────────────────────────────────────

// ListRoleSkillRequirements handles GET /requirements/{roleType} — returns requirements for a role.
func (h *SkillHandler) ListRoleSkillRequirements(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	roleType := chi.URLParam(r, "roleType")
	if roleType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Role type is required")
		return
	}

	reqs, err := h.svc.ListRoleSkillRequirements(r.Context(), roleType)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, reqs, nil)
}

// CreateRoleSkillRequirement handles POST /requirements — creates a role skill requirement.
func (h *SkillHandler) CreateRoleSkillRequirement(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRoleSkillRequirementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.RoleType == "" || req.RequiredLevel == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Role type and required level are required")
		return
	}

	rsr, err := h.svc.CreateRoleSkillRequirement(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, rsr)
}

// DeleteRoleSkillRequirement handles DELETE /requirements/{id} — deletes a role skill requirement.
func (h *SkillHandler) DeleteRoleSkillRequirement(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid requirement ID")
		return
	}

	if err := h.svc.DeleteRoleSkillRequirement(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetSkillGapAnalysis handles GET /requirements/{roleType}/gap/{userId} — returns skill gap analysis.
func (h *SkillHandler) GetSkillGapAnalysis(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	roleType := chi.URLParam(r, "roleType")
	if roleType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Role type is required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "userId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	entries, err := h.svc.GetSkillGapAnalysis(r.Context(), roleType, userID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entries, nil)
}
