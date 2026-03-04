package people

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestHandler() *Handler {
	return NewHandler(nil, nil)
}

// requestWithAuth creates an HTTP request with an AuthContext set.
func requestWithAuth(method, target string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, target, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	authCtx := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@test.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(req.Context(), authCtx)
	return req.WithContext(ctx)
}

// ──────────────────────────────────────────────
// SkillHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestSkillHandler_ListSkillCategories_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/categories", nil)
	w := httptest.NewRecorder()

	h.skill.ListSkillCategories(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_GetSkillCategory_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/categories/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.GetSkillCategory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_CreateSkillCategory_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"name":"Backend"}`
	req := httptest.NewRequest(http.MethodPost, "/categories", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.skill.CreateSkillCategory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_UpdateSkillCategory_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/categories/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.skill.UpdateSkillCategory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteSkillCategory_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/categories/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.DeleteSkillCategory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_ListSkills_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.skill.ListSkills(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_GetSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.GetSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_CreateSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"categoryId":"11111111-1111-1111-1111-111111111111","name":"Go"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.skill.CreateSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_UpdateSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.skill.UpdateSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.DeleteSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_ListUserSkills_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/user-skills/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.ListUserSkills(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_ListUsersBySkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/user-skills/by-skill/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.ListUsersBySkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_CreateUserSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","skillId":"22222222-2222-2222-2222-222222222222","proficiencyLevel":"beginner"}`
	req := httptest.NewRequest(http.MethodPost, "/user-skills", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.skill.CreateUserSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_UpdateUserSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/user-skills/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.skill.UpdateUserSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteUserSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/user-skills/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.DeleteUserSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_VerifyUserSkill_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/user-skills/"+uuid.New().String()+"/verify", nil)
	w := httptest.NewRecorder()

	h.skill.VerifyUserSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_ListRoleSkillRequirements_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/requirements/developer", nil)
	w := httptest.NewRecorder()

	h.skill.ListRoleSkillRequirements(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_CreateRoleSkillRequirement_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"roleType":"developer","skillId":"11111111-1111-1111-1111-111111111111","requiredLevel":"advanced"}`
	req := httptest.NewRequest(http.MethodPost, "/requirements", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.skill.CreateRoleSkillRequirement(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteRoleSkillRequirement_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/requirements/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.DeleteRoleSkillRequirement(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSkillHandler_GetSkillGapAnalysis_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/requirements/developer/gap/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.skill.GetSkillGapAnalysis(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// SkillHandler — input validation (400)
// ──────────────────────────────────────────────

func TestSkillHandler_GetSkillCategory_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.skill.GetSkillCategory)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_UpdateSkillCategory_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.skill.UpdateSkillCategory)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"name":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteSkillCategory_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.skill.DeleteSkillCategory)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_CreateSkillCategory_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/categories", "not-json")
	w := httptest.NewRecorder()

	h.skill.CreateSkillCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestSkillHandler_CreateSkillCategory_MissingName(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/categories", `{"description":"desc"}`)
	w := httptest.NewRecorder()

	h.skill.CreateSkillCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestSkillHandler_GetSkill_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.skill.GetSkill)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_UpdateSkill_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.skill.UpdateSkill)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"name":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteSkill_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.skill.DeleteSkill)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_CreateSkill_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.skill.CreateSkill(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestSkillHandler_CreateSkill_MissingName(t *testing.T) {
	h := newTestHandler()
	body := `{"categoryId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.skill.CreateSkill(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestSkillHandler_ListUserSkills_InvalidUserID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{userId}", h.skill.ListUserSkills)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid user ID, got %d", w.Code)
	}
}

func TestSkillHandler_ListUsersBySkill_InvalidSkillID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{skillId}", h.skill.ListUsersBySkill)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid skill ID, got %d", w.Code)
	}
}

func TestSkillHandler_CreateUserSkill_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/user-skills", "not-json")
	w := httptest.NewRecorder()

	h.skill.CreateUserSkill(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestSkillHandler_CreateUserSkill_MissingProficiency(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","skillId":"22222222-2222-2222-2222-222222222222"}`
	req := requestWithAuth(http.MethodPost, "/user-skills", body)
	w := httptest.NewRecorder()

	h.skill.CreateUserSkill(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing proficiency level, got %d", w.Code)
	}
}

func TestSkillHandler_UpdateUserSkill_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.skill.UpdateUserSkill)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteUserSkill_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.skill.DeleteUserSkill)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_VerifyUserSkill_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/verify", h.skill.VerifyUserSkill)

	req := requestWithAuth(http.MethodPut, "/bad-uuid/verify", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_DeleteRoleSkillRequirement_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.skill.DeleteRoleSkillRequirement)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSkillHandler_CreateRoleSkillRequirement_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/requirements", "not-json")
	w := httptest.NewRecorder()

	h.skill.CreateRoleSkillRequirement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestSkillHandler_CreateRoleSkillRequirement_MissingFields(t *testing.T) {
	h := newTestHandler()
	body := `{"skillId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPost, "/requirements", body)
	w := httptest.NewRecorder()

	h.skill.CreateRoleSkillRequirement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing role type and required level, got %d", w.Code)
	}
}

func TestSkillHandler_GetSkillGapAnalysis_InvalidUserID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{roleType}/gap/{userId}", h.skill.GetSkillGapAnalysis)

	req := requestWithAuth(http.MethodGet, "/developer/gap/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid user ID, got %d", w.Code)
	}
}

func TestSkillHandler_ListSkillCategories_InvalidParentID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/categories?parent_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.skill.ListSkillCategories(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid parent_id, got %d", w.Code)
	}
}

func TestSkillHandler_ListSkills_InvalidCategoryID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/?category_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.skill.ListSkills(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid category_id, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// SkillHandler — route registration
// ──────────────────────────────────────────────

func TestSkillHandler_RoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.skill.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		// Skill categories
		{http.MethodGet, "/categories"},
		{http.MethodGet, "/categories/" + uuid.New().String()},
		{http.MethodPost, "/categories"},
		{http.MethodPut, "/categories/" + uuid.New().String()},
		{http.MethodDelete, "/categories/" + uuid.New().String()},
		// Skills
		{http.MethodGet, "/"},
		{http.MethodGet, "/" + uuid.New().String()},
		{http.MethodPost, "/"},
		{http.MethodPut, "/" + uuid.New().String()},
		{http.MethodDelete, "/" + uuid.New().String()},
		// User skills
		{http.MethodGet, "/user-skills/" + uuid.New().String()},
		{http.MethodGet, "/user-skills/by-skill/" + uuid.New().String()},
		{http.MethodPost, "/user-skills"},
		{http.MethodPut, "/user-skills/" + uuid.New().String()},
		{http.MethodDelete, "/user-skills/" + uuid.New().String()},
		{http.MethodPut, "/user-skills/" + uuid.New().String() + "/verify"},
		// Role skill requirements
		{http.MethodGet, "/requirements/developer"},
		{http.MethodGet, "/requirements/developer/gap/" + uuid.New().String()},
		{http.MethodPost, "/requirements"},
		{http.MethodDelete, "/requirements/" + uuid.New().String()},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned %d, expected route to be registered", tt.method, tt.path, w.Code)
			}
		})
	}
}
