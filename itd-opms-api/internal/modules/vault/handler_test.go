package vault

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestHandler() *Handler {
	return NewHandler(nil, nil, config.MinIOConfig{}, nil)
}

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
		DisplayName: "Test User",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(req.Context(), authCtx)
	return req.WithContext(ctx)
}

// ══════════════════════════════════════════════
// Document handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestListDocuments_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents", nil)
	w := httptest.NewRecorder()

	h.ListDocuments(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUploadDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents", nil)
	w := httptest.NewRecorder()

	h.UploadDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUpdateDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/documents/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDeleteDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/documents/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetDownloadURL_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String()+"/download", nil)
	w := httptest.NewRecorder()

	h.GetDownloadURL(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetPreviewURL_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String()+"/preview", nil)
	w := httptest.NewRecorder()

	h.GetPreviewURL(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUploadVersion_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/version", nil)
	w := httptest.NewRecorder()

	h.UploadVersion(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestListVersions_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String()+"/versions", nil)
	w := httptest.NewRecorder()

	h.ListVersions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestLockDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/lock", nil)
	w := httptest.NewRecorder()

	h.LockDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUnlockDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/unlock", nil)
	w := httptest.NewRecorder()

	h.UnlockDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMoveDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"folderId":"11111111-1111-1111-1111-111111111111"}`
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/move", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.MoveDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestShareDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"permission":"view"}`
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/share", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ShareDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestListShares_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String()+"/shares", nil)
	w := httptest.NewRecorder()

	h.ListShares(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRevokeShare_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/documents/"+uuid.New().String()+"/shares/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.RevokeShare(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetAccessLog_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String()+"/access-log", nil)
	w := httptest.NewRecorder()

	h.GetAccessLog(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRestoreDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/restore", nil)
	w := httptest.NewRecorder()

	h.RestoreDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestArchiveDocument_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/archive", nil)
	w := httptest.NewRecorder()

	h.ArchiveDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTransitionStatus_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/transition", strings.NewReader(`{"toStatus":"approved"}`))
	w := httptest.NewRecorder()

	h.TransitionStatus(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetLifecycleLog_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String()+"/lifecycle", nil)
	w := httptest.NewRecorder()

	h.GetLifecycleLog(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAddComment_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/documents/"+uuid.New().String()+"/comments", strings.NewReader(`{"content":"test"}`))
	w := httptest.NewRecorder()

	h.AddComment(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestListComments_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/documents/"+uuid.New().String()+"/comments", nil)
	w := httptest.NewRecorder()

	h.ListComments(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Folder handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestListFolders_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/folders", nil)
	w := httptest.NewRecorder()

	h.ListFolders(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCreateFolder_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"name":"test"}`
	req := httptest.NewRequest(http.MethodPost, "/folders", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateFolder(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUpdateFolder_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/folders/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateFolder(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDeleteFolder_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/folders/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteFolder(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Search/Recent/Stats — auth guard (401)
// ══════════════════════════════════════════════

func TestSearchDocuments_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/search?q=test", nil)
	w := httptest.NewRecorder()

	h.SearchDocuments(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetRecentDocuments_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/recent", nil)
	w := httptest.NewRecorder()

	h.GetRecentDocuments(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetStats_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()

	h.GetStats(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Input validation (400)
// ══════════════════════════════════════════════

func TestGetDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetDocument)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestUpdateDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateDocument)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"title":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDeleteDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteDocument)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestGetDownloadURL_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}/download", h.GetDownloadURL)

	req := requestWithAuth(http.MethodGet, "/bad-uuid/download", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestGetPreviewURL_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}/preview", h.GetPreviewURL)

	req := requestWithAuth(http.MethodGet, "/bad-uuid/preview", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestLockDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/lock", h.LockDocument)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/lock", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestUnlockDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/unlock", h.UnlockDocument)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/unlock", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestMoveDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/move", h.MoveDocument)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/move", `{"folderId":null}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestShareDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/share", h.ShareDocument)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/share", `{"permission":"view"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRestoreDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/restore", h.RestoreDocument)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/restore", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestArchiveDocument_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/archive", h.ArchiveDocument)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/archive", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestTransitionStatus_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/transition", h.TransitionStatus)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/transition", `{"toStatus":"approved"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestAddComment_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/comments", h.AddComment)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/comments", `{"content":"test"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestListComments_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}/comments", h.ListComments)

	req := requestWithAuth(http.MethodGet, "/bad-uuid/comments", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestGetLifecycleLog_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}/lifecycle", h.GetLifecycleLog)

	req := requestWithAuth(http.MethodGet, "/bad-uuid/lifecycle", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestListShares_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}/shares", h.ListShares)

	req := requestWithAuth(http.MethodGet, "/bad-uuid/shares", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRevokeShare_InvalidDocID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}/shares/{shareId}", h.RevokeShare)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid/shares/"+uuid.New().String(), "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid doc UUID, got %d", w.Code)
	}
}

func TestRevokeShare_InvalidShareID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}/shares/{shareId}", h.RevokeShare)

	req := requestWithAuth(http.MethodDelete, "/"+uuid.New().String()+"/shares/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid share UUID, got %d", w.Code)
	}
}

func TestUpdateFolder_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateFolder)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"name":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDeleteFolder_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteFolder)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestSearchDocuments_MissingQuery(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/search", "")
	w := httptest.NewRecorder()

	h.SearchDocuments(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing query, got %d", w.Code)
	}
}

func TestUpdateDocument_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateDocument)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String(), "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestCreateFolder_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/folders", "not-json")
	w := httptest.NewRecorder()

	h.CreateFolder(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestShareDocument_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/share", h.ShareDocument)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/share", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestMoveDocument_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/move", h.MoveDocument)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/move", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestTransitionStatus_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/transition", h.TransitionStatus)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/transition", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestAddComment_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/comments", h.AddComment)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/comments", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Route registration
// ══════════════════════════════════════════════

func TestHandler_RoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.Routes(r)

	docID := uuid.New().String()
	shareID := uuid.New().String()

	tests := []struct {
		method string
		path   string
	}{
		// Documents
		{http.MethodGet, "/documents/"},
		{http.MethodPost, "/documents/"},
		{http.MethodGet, "/documents/" + docID},
		{http.MethodPut, "/documents/" + docID},
		{http.MethodDelete, "/documents/" + docID},
		{http.MethodGet, "/documents/" + docID + "/download"},
		{http.MethodGet, "/documents/" + docID + "/preview"},
		{http.MethodPost, "/documents/" + docID + "/version"},
		{http.MethodGet, "/documents/" + docID + "/versions"},
		{http.MethodPost, "/documents/" + docID + "/lock"},
		{http.MethodPost, "/documents/" + docID + "/unlock"},
		{http.MethodPost, "/documents/" + docID + "/move"},
		{http.MethodPost, "/documents/" + docID + "/share"},
		{http.MethodGet, "/documents/" + docID + "/shares"},
		{http.MethodDelete, "/documents/" + docID + "/shares/" + shareID},
		{http.MethodGet, "/documents/" + docID + "/access-log"},
		{http.MethodPost, "/documents/" + docID + "/restore"},
		{http.MethodPost, "/documents/" + docID + "/archive"},
		{http.MethodPost, "/documents/" + docID + "/transition"},
		{http.MethodGet, "/documents/" + docID + "/lifecycle"},
		{http.MethodPost, "/documents/" + docID + "/comments"},
		{http.MethodGet, "/documents/" + docID + "/comments"},
		// Folders
		{http.MethodGet, "/folders/"},
		{http.MethodPost, "/folders/"},
		{http.MethodPut, "/folders/" + uuid.New().String()},
		{http.MethodDelete, "/folders/" + uuid.New().String()},
		// Search, Recent, Stats
		{http.MethodGet, "/search"},
		{http.MethodGet, "/recent"},
		{http.MethodGet, "/stats"},
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
