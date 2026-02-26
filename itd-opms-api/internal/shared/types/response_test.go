package types_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func TestOKResponse(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"name": "test"}

	types.OK(w, data, nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if resp["status"] != "success" {
		t.Errorf("expected status success, got %v", resp["status"])
	}

	dataMap, ok := resp["data"].(map[string]any)
	if !ok {
		t.Fatal("expected data to be a map")
	}
	if dataMap["name"] != "test" {
		t.Errorf("expected data.name=test, got %v", dataMap["name"])
	}
}

func TestOKResponseWithMeta(t *testing.T) {
	w := httptest.NewRecorder()
	data := []string{"a", "b"}
	meta := &types.Meta{Page: 1, Limit: 10, Total: 2, TotalPages: 1}

	types.OK(w, data, meta)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	metaObj, ok := resp["meta"].(map[string]any)
	if !ok {
		t.Fatal("expected meta to be present in response")
	}
	if metaObj["page"] != float64(1) {
		t.Errorf("expected meta.page=1, got %v", metaObj["page"])
	}
}

func TestCreatedResponse(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"id": "123"}

	types.Created(w, data)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if resp["status"] != "success" {
		t.Errorf("expected status success, got %v", resp["status"])
	}
	if resp["message"] != "Resource created" {
		t.Errorf("expected message 'Resource created', got %v", resp["message"])
	}
}

func TestNoContentResponse(t *testing.T) {
	w := httptest.NewRecorder()

	types.NoContent(w)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}

	if w.Body.Len() != 0 {
		t.Errorf("expected empty body, got %d bytes", w.Body.Len())
	}
}

func TestErrorMessageResponse(t *testing.T) {
	w := httptest.NewRecorder()

	types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid input")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if resp["status"] != "error" {
		t.Errorf("expected status error, got %v", resp["status"])
	}

	errors, ok := resp["errors"].([]any)
	if !ok || len(errors) != 1 {
		t.Fatalf("expected 1 error detail, got %v", resp["errors"])
	}

	errDetail, ok := errors[0].(map[string]any)
	if !ok {
		t.Fatal("expected error detail to be a map")
	}
	if errDetail["code"] != "BAD_REQUEST" {
		t.Errorf("expected code BAD_REQUEST, got %v", errDetail["code"])
	}
	if errDetail["message"] != "invalid input" {
		t.Errorf("expected message 'invalid input', got %v", errDetail["message"])
	}
}

func TestErrorResponse(t *testing.T) {
	w := httptest.NewRecorder()

	types.Error(w, http.StatusUnprocessableEntity,
		types.ErrorDetail{Code: "VALIDATION_ERROR", Message: "name required", Field: "name"},
		types.ErrorDetail{Code: "VALIDATION_ERROR", Message: "email required", Field: "email"},
	)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	errors, ok := resp["errors"].([]any)
	if !ok || len(errors) != 2 {
		t.Fatalf("expected 2 error details, got %v", resp["errors"])
	}
}

func TestContentTypeHeader(t *testing.T) {
	w := httptest.NewRecorder()
	types.OK(w, nil, nil)

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
}

func TestPaginationOffset(t *testing.T) {
	tests := []struct {
		name    string
		page    int
		limit   int
		wantOff int
	}{
		{"page 1 limit 10", 1, 10, 0},
		{"page 2 limit 10", 2, 10, 10},
		{"page 3 limit 25", 3, 25, 50},
		{"page 1 limit 1", 1, 1, 0},
		{"page 5 limit 20", 5, 20, 80},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			params := types.PaginationParams{Page: tt.page, Limit: tt.limit}
			if params.Offset() != tt.wantOff {
				t.Errorf("expected offset %d, got %d", tt.wantOff, params.Offset())
			}
		})
	}
}

func TestDefaultPagination(t *testing.T) {
	p := types.DefaultPagination()

	if p.Page != 1 {
		t.Errorf("expected default page 1, got %d", p.Page)
	}
	if p.Limit != 20 {
		t.Errorf("expected default limit 20, got %d", p.Limit)
	}
	if p.Sort != "created_at" {
		t.Errorf("expected default sort 'created_at', got %q", p.Sort)
	}
	if p.Order != "desc" {
		t.Errorf("expected default order 'desc', got %q", p.Order)
	}
}

func TestParsePagination(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test?page=3&limit=50&sort=name&order=asc", nil)
	p := types.ParsePagination(req)

	if p.Page != 3 {
		t.Errorf("expected page 3, got %d", p.Page)
	}
	if p.Limit != 50 {
		t.Errorf("expected limit 50, got %d", p.Limit)
	}
	if p.Sort != "name" {
		t.Errorf("expected sort 'name', got %q", p.Sort)
	}
	if p.Order != "asc" {
		t.Errorf("expected order 'asc', got %q", p.Order)
	}
}

func TestParsePaginationDefaults(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	p := types.ParsePagination(req)

	if p.Page != 1 || p.Limit != 20 {
		t.Errorf("expected defaults (page=1, limit=20), got (page=%d, limit=%d)", p.Page, p.Limit)
	}
}

func TestParsePaginationLimitClamped(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test?limit=999", nil)
	p := types.ParsePagination(req)

	// limit > 100 should fall back to default (20)
	if p.Limit != 20 {
		t.Errorf("expected limit to fall back to 20 for out-of-range value, got %d", p.Limit)
	}
}

func TestNewMeta(t *testing.T) {
	params := types.PaginationParams{Page: 2, Limit: 10}
	meta := types.NewMeta(45, params)

	if meta.Total != 45 {
		t.Errorf("expected total 45, got %d", meta.Total)
	}
	if meta.Page != 2 {
		t.Errorf("expected page 2, got %d", meta.Page)
	}
	if meta.Limit != 10 {
		t.Errorf("expected limit 10, got %d", meta.Limit)
	}
	if meta.TotalPages != 5 {
		t.Errorf("expected 5 total pages, got %d", meta.TotalPages)
	}
}

func TestNewMetaPartialPage(t *testing.T) {
	params := types.PaginationParams{Page: 1, Limit: 10}
	meta := types.NewMeta(3, params)

	if meta.TotalPages != 1 {
		t.Errorf("expected 1 total page for 3 items with limit 10, got %d", meta.TotalPages)
	}
}

func TestNewMetaExactPage(t *testing.T) {
	params := types.PaginationParams{Page: 1, Limit: 10}
	meta := types.NewMeta(30, params)

	if meta.TotalPages != 3 {
		t.Errorf("expected 3 total pages for 30 items with limit 10, got %d", meta.TotalPages)
	}
}
