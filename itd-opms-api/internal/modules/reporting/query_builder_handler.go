package reporting

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// QueryBuilderHandler
// ──────────────────────────────────────────────

// QueryBuilderHandler handles HTTP requests for the ad-hoc query builder.
type QueryBuilderHandler struct {
	svc *QueryBuilderService
}

// NewQueryBuilderHandler creates a new QueryBuilderHandler.
func NewQueryBuilderHandler(svc *QueryBuilderService) *QueryBuilderHandler {
	return &QueryBuilderHandler{svc: svc}
}

// Routes mounts query builder endpoints on the given router.
func (h *QueryBuilderHandler) Routes(r chi.Router) {
	// Query execution.
	r.With(middleware.RequirePermission("reporting.view")).Post("/query/preview", h.PreviewQuery)
	r.With(middleware.RequirePermission("reporting.view")).Post("/query/export", h.ExportCSV)
	r.With(middleware.RequirePermission("reporting.view")).Post("/query/export-excel", h.ExportExcel)
	r.With(middleware.RequirePermission("reporting.view")).Post("/query/export-pdf", h.ExportPDF)
	r.With(middleware.RequirePermission("reporting.view")).Get("/query/schema", h.GetSchema)

	// Saved queries CRUD.
	r.Route("/saved-queries", func(r chi.Router) {
		r.With(middleware.RequirePermission("reporting.view")).Get("/", h.ListSavedQueries)
		r.With(middleware.RequirePermission("reporting.manage")).Post("/", h.CreateSavedQuery)
		r.With(middleware.RequirePermission("reporting.view")).Get("/{id}", h.GetSavedQuery)
		r.With(middleware.RequirePermission("reporting.manage")).Put("/{id}", h.UpdateSavedQuery)
		r.With(middleware.RequirePermission("reporting.manage")).Delete("/{id}", h.DeleteSavedQuery)
		r.With(middleware.RequirePermission("reporting.view")).Post("/{id}/run", h.RunSavedQuery)
	})
}

// ──────────────────────────────────────────────
// Query execution handlers
// ──────────────────────────────────────────────

// PreviewQuery handles POST /query/preview — execute ad-hoc query and return up to 100 rows.
func (h *QueryBuilderHandler) PreviewQuery(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req ExecuteQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.EntityType == "" || len(req.Columns) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "entityType and columns are required")
		return
	}

	result, err := h.svc.PreviewQuery(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}

// ExportCSV handles POST /query/export — execute query and return CSV.
func (h *QueryBuilderHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req ExecuteQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.EntityType == "" || len(req.Columns) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "entityType and columns are required")
		return
	}

	result, err := h.svc.ExportQuery(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	csvBytes, err := resultToCSV(result)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s_export.csv\"", req.EntityType))
	w.WriteHeader(http.StatusOK)
	w.Write(csvBytes)
}

// ExportExcel handles POST /query/export-excel — execute query and return XLSX.
func (h *QueryBuilderHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req ExecuteQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.EntityType == "" || len(req.Columns) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "entityType and columns are required")
		return
	}

	result, err := h.svc.ExportQuery(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	xlsxBytes, err := resultToExcel(result, req.EntityType)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s_export.xlsx\"", req.EntityType))
	w.WriteHeader(http.StatusOK)
	w.Write(xlsxBytes)
}

// ExportPDF handles POST /query/export-pdf — execute query and return a print-ready HTML document.
func (h *QueryBuilderHandler) ExportPDF(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req ExecuteQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.EntityType == "" || len(req.Columns) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "entityType and columns are required")
		return
	}

	result, err := h.svc.ExportQuery(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	pdfHTML := resultToPrintHTML(result, req.EntityType)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s_export.html\"", req.EntityType))
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(pdfHTML))
}

// GetSchema handles GET /query/schema — returns available entity types and their fields.
func (h *QueryBuilderHandler) GetSchema(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityFilter := r.URL.Query().Get("entityType")

	var schemas []EntitySchema
	entityTypes := []string{
		"tickets", "assets", "cmdb_items", "problems", "changes",
		"releases", "service_requests", "kb_articles",
	}

	for _, et := range entityTypes {
		if entityFilter != "" && et != entityFilter {
			continue
		}
		fields := GetFieldsForEntityType(et)
		sort.Strings(fields)

		fieldInfos := make([]EntityFieldInfo, 0, len(fields))
		for _, f := range fields {
			fieldInfos = append(fieldInfos, EntityFieldInfo{
				Name: f,
				Type: inferFieldType(f),
			})
		}

		schemas = append(schemas, EntitySchema{
			EntityType: et,
			Fields:     fieldInfos,
		})
	}

	types.OK(w, schemas, nil)
}

// ──────────────────────────────────────────────
// Saved query CRUD handlers
// ──────────────────────────────────────────────

// ListSavedQueries handles GET /saved-queries.
func (h *QueryBuilderHandler) ListSavedQueries(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	var entityType *string
	if v := r.URL.Query().Get("entityType"); v != "" {
		entityType = &v
	}

	queries, total, err := h.svc.ListSavedQueries(r.Context(), entityType, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, queries, types.NewMeta(total, params))
}

// CreateSavedQuery handles POST /saved-queries.
func (h *QueryBuilderHandler) CreateSavedQuery(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateSavedQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" || req.EntityType == "" || len(req.Columns) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "name, entityType, and columns are required")
		return
	}

	sq, err := h.svc.CreateSavedQuery(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, sq)
}

// GetSavedQuery handles GET /saved-queries/{id}.
func (h *QueryBuilderHandler) GetSavedQuery(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid query ID")
		return
	}

	sq, err := h.svc.GetSavedQuery(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, sq, nil)
}

// UpdateSavedQuery handles PUT /saved-queries/{id}.
func (h *QueryBuilderHandler) UpdateSavedQuery(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid query ID")
		return
	}

	var req UpdateSavedQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	sq, err := h.svc.UpdateSavedQuery(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, sq, nil)
}

// DeleteSavedQuery handles DELETE /saved-queries/{id}.
func (h *QueryBuilderHandler) DeleteSavedQuery(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid query ID")
		return
	}

	if err := h.svc.DeleteSavedQuery(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// RunSavedQuery handles POST /saved-queries/{id}/run — executes a saved query.
func (h *QueryBuilderHandler) RunSavedQuery(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid query ID")
		return
	}

	result, err := h.svc.RunSavedQuery(r.Context(), id, 0)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// resultToCSV converts a QueryResult into CSV bytes.
func resultToCSV(result QueryResult) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Header row.
	if err := w.Write(result.Columns); err != nil {
		return nil, fmt.Errorf("failed to write CSV header: %w", err)
	}

	// Data rows.
	for _, row := range result.Rows {
		record := make([]string, len(result.Columns))
		for i, col := range result.Columns {
			v := row[col]
			if v == nil {
				record[i] = ""
			} else {
				record[i] = fmt.Sprint(v)
			}
		}
		if err := w.Write(record); err != nil {
			return nil, fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("CSV flush error: %w", err)
	}

	return buf.Bytes(), nil
}

// resultToExcel converts a QueryResult into an XLSX workbook.
func resultToExcel(result QueryResult, entityType string) ([]byte, error) {
	f := excelize.NewFile()
	sheet := "Query Results"
	f.SetSheetName("Sheet1", sheet)

	// Header style.
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"#E2E8F0"}},
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "#94A3B8", Style: 1},
		},
	})

	// Write header row.
	for i, col := range result.Columns {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, col)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
		colName, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, colName, colName, 18)
	}

	// Write data rows.
	for rowIdx, row := range result.Rows {
		for colIdx, col := range result.Columns {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+2)
			v := row[col]
			if v == nil {
				f.SetCellValue(sheet, cell, "")
			} else {
				f.SetCellValue(sheet, cell, fmt.Sprint(v))
			}
		}
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("failed to write XLSX: %w", err)
	}
	return buf.Bytes(), nil
}

// resultToPrintHTML converts a QueryResult into a self-contained, print-friendly HTML document
// suitable for browser File → Print → Save as PDF.
func resultToPrintHTML(result QueryResult, entityType string) string {
	var sb bytes.Buffer

	sb.WriteString(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Query Export — ` + entityType + `</title>
<style>
  @page { size: landscape; margin: 1cm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #1e293b; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
  td { padding: 5px 8px; border: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
</style></head><body>
`)
	sb.WriteString(fmt.Sprintf("<h1>%s Query Export</h1>\n", entityType))
	sb.WriteString(fmt.Sprintf("<div class=\"meta\">%d rows &middot; Generated by ITD-OPMS Query Builder</div>\n", result.RowCount))
	sb.WriteString("<table><thead><tr>")

	for _, col := range result.Columns {
		sb.WriteString("<th>")
		sb.WriteString(col)
		sb.WriteString("</th>")
	}
	sb.WriteString("</tr></thead><tbody>")

	for _, row := range result.Rows {
		sb.WriteString("<tr>")
		for _, col := range result.Columns {
			sb.WriteString("<td>")
			v := row[col]
			if v == nil {
				sb.WriteString("—")
			} else {
				sb.WriteString(fmt.Sprint(v))
			}
			sb.WriteString("</td>")
		}
		sb.WriteString("</tr>")
	}

	sb.WriteString("</tbody></table></body></html>")
	return sb.String()
}

// inferFieldType provides a basic type hint for the query builder UI.
func inferFieldType(field string) string {
	switch {
	case
		field == "created_at" || field == "updated_at" || field == "resolved_at" ||
			field == "closed_at" || field == "first_response_at" || field == "published_at" ||
			field == "purchase_date" || field == "warranty_end" ||
			field == "planned_start" || field == "planned_end":
		return "datetime"
	case
		field == "id" || field == "reporter_id" || field == "assignee_id" ||
			field == "owner_id" || field == "author_id" || field == "team_queue_id" ||
			field == "org_unit_id" || field == "sla_policy_id" || field == "category_id" ||
			field == "release_manager_id":
		return "uuid"
	case
		field == "view_count" || field == "helpful_count" || field == "purchase_cost":
		return "number"
	case
		field == "status" || field == "priority" || field == "urgency" || field == "impact" ||
			field == "channel" || field == "type" || field == "asset_type" || field == "ci_type" ||
			field == "environment" || field == "criticality" || field == "change_type" ||
			field == "risk_level" || field == "release_type" || field == "sort_order" ||
			field == "chart_type":
		return "enum"
	default:
		return "string"
	}
}
