package planning

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestDocumentHandler() *DocumentHandler {
	return NewDocumentHandler(nil)
}

// ──────────────────────────────────────────────
// DocumentHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestDocumentHandler_UploadDocument_NoAuth(t *testing.T) {
	h := newTestDocumentHandler()
	req := httptest.NewRequest(http.MethodPost, "/projects/123/documents", nil)
	w := httptest.NewRecorder()

	h.UploadDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDocumentHandler_ListDocuments_NoAuth(t *testing.T) {
	h := newTestDocumentHandler()
	req := httptest.NewRequest(http.MethodGet, "/projects/123/documents", nil)
	w := httptest.NewRecorder()

	h.ListDocuments(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDocumentHandler_GetDocument_NoAuth(t *testing.T) {
	h := newTestDocumentHandler()
	req := httptest.NewRequest(http.MethodGet, "/projects/123/documents/456", nil)
	w := httptest.NewRecorder()

	h.GetDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDocumentHandler_UpdateDocument_NoAuth(t *testing.T) {
	h := newTestDocumentHandler()
	req := httptest.NewRequest(http.MethodPut, "/projects/123/documents/456", nil)
	w := httptest.NewRecorder()

	h.UpdateDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDocumentHandler_DeleteDocument_NoAuth(t *testing.T) {
	h := newTestDocumentHandler()
	req := httptest.NewRequest(http.MethodDelete, "/projects/123/documents/456", nil)
	w := httptest.NewRecorder()

	h.DeleteDocument(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDocumentHandler_GetDownloadURL_NoAuth(t *testing.T) {
	h := newTestDocumentHandler()
	req := httptest.NewRequest(http.MethodGet, "/projects/123/documents/456/download", nil)
	w := httptest.NewRecorder()

	h.GetDownloadURL(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDocumentHandler_GetCategoryCounts_NoAuth(t *testing.T) {
	h := newTestDocumentHandler()
	req := httptest.NewRequest(http.MethodGet, "/projects/123/documents/categories", nil)
	w := httptest.NewRecorder()

	h.GetCategoryCounts(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// DocumentHandler — invalid project ID (400)
// ──────────────────────────────────────────────

func TestDocumentHandler_UploadDocument_InvalidProjectID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Post("/projects/{id}/documents", h.UploadDocument)

	req := requestWithAuth(http.MethodPost, "/projects/not-a-uuid/documents", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_ListDocuments_InvalidProjectID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Get("/projects/{id}/documents", h.ListDocuments)

	req := requestWithAuth(http.MethodGet, "/projects/not-a-uuid/documents", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_GetDocument_InvalidProjectID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Get("/projects/{id}/documents/{docId}", h.GetDocument)

	req := requestWithAuth(http.MethodGet, "/projects/not-a-uuid/documents/00000000-0000-0000-0000-000000000001", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_GetDocument_InvalidDocID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Get("/projects/{id}/documents/{docId}", h.GetDocument)

	req := requestWithAuth(http.MethodGet, "/projects/00000000-0000-0000-0000-000000000001/documents/bad-doc-id", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_UpdateDocument_InvalidProjectID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Put("/projects/{id}/documents/{docId}", h.UpdateDocument)

	req := requestWithAuth(http.MethodPut, "/projects/not-a-uuid/documents/00000000-0000-0000-0000-000000000001", `{"category":"charter"}`)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_UpdateDocument_InvalidDocID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Put("/projects/{id}/documents/{docId}", h.UpdateDocument)

	req := requestWithAuth(http.MethodPut, "/projects/00000000-0000-0000-0000-000000000001/documents/bad-doc-id", `{"category":"charter"}`)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_UpdateDocument_InvalidBody(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Put("/projects/{id}/documents/{docId}", h.UpdateDocument)

	req := requestWithAuth(http.MethodPut,
		"/projects/00000000-0000-0000-0000-000000000001/documents/00000000-0000-0000-0000-000000000002",
		"not-json",
	)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_DeleteDocument_InvalidProjectID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Delete("/projects/{id}/documents/{docId}", h.DeleteDocument)

	req := requestWithAuth(http.MethodDelete, "/projects/not-a-uuid/documents/00000000-0000-0000-0000-000000000001", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_DeleteDocument_InvalidDocID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Delete("/projects/{id}/documents/{docId}", h.DeleteDocument)

	req := requestWithAuth(http.MethodDelete, "/projects/00000000-0000-0000-0000-000000000001/documents/bad-doc-id", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_GetDownloadURL_InvalidProjectID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Get("/projects/{id}/documents/{docId}/download", h.GetDownloadURL)

	req := requestWithAuth(http.MethodGet, "/projects/not-a-uuid/documents/00000000-0000-0000-0000-000000000001/download", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_GetDownloadURL_InvalidDocID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Get("/projects/{id}/documents/{docId}/download", h.GetDownloadURL)

	req := requestWithAuth(http.MethodGet, "/projects/00000000-0000-0000-0000-000000000001/documents/bad-doc-id/download", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDocumentHandler_GetCategoryCounts_InvalidProjectID(t *testing.T) {
	h := newTestDocumentHandler()

	r := chi.NewRouter()
	r.Get("/projects/{id}/documents/categories", h.GetCategoryCounts)

	req := requestWithAuth(http.MethodGet, "/projects/not-a-uuid/documents/categories", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
