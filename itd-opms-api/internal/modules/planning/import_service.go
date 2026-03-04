package planning

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xuri/excelize/v2"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const maxImportFileSize = 10 * 1024 * 1024 // 10 MB
const maxImportRows = 500

// ImportService handles bulk project import operations.
type ImportService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewImportService creates a new ImportService.
func NewImportService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ImportService {
	return &ImportService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Template Generation
// ──────────────────────────────────────────────

// GenerateCSVTemplate generates a CSV template with headers and an instruction row.
func (s *ImportService) GenerateCSVTemplate() ([]byte, error) {
	var buf bytes.Buffer
	// Write BOM for Excel compatibility.
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(&buf)
	defer writer.Flush()

	// Header row.
	headers := make([]string, len(ProjectTemplateColumns))
	for i, col := range ProjectTemplateColumns {
		headers[i] = col.Header
	}
	if err := writer.Write(headers); err != nil {
		return nil, fmt.Errorf("write headers: %w", err)
	}

	// Example row.
	examples := make([]string, len(ProjectTemplateColumns))
	for i, col := range ProjectTemplateColumns {
		examples[i] = col.Example
	}
	if err := writer.Write(examples); err != nil {
		return nil, fmt.Errorf("write examples: %w", err)
	}

	writer.Flush()
	return buf.Bytes(), nil
}

// GenerateXLSXTemplate generates an XLSX template with headers, formatting, and instructions.
func (s *ImportService) GenerateXLSXTemplate() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	dataSheet := "Projects"
	f.SetSheetName("Sheet1", dataSheet)

	// Write headers with styling.
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 11, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"1B7340"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})

	requiredStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 11, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"C0392B"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})

	exampleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Color: "888888"},
	})

	for i, col := range ProjectTemplateColumns {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(dataSheet, cell, col.Header)
		if col.Required {
			f.SetCellStyle(dataSheet, cell, cell, requiredStyle)
		} else {
			f.SetCellStyle(dataSheet, cell, cell, headerStyle)
		}

		// Set column width.
		colName, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(dataSheet, colName, colName, 22)

		// Write example values in row 2.
		if col.Example != "" {
			exCell, _ := excelize.CoordinatesToCellName(i+1, 2)
			f.SetCellValue(dataSheet, exCell, col.Example)
			f.SetCellStyle(dataSheet, exCell, exCell, exampleStyle)
		}
	}

	// Freeze header row.
	f.SetPanes(dataSheet, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	// Create Import Guide sheet.
	guideSheet := "Import Guide"
	guideIdx, _ := f.NewSheet(guideSheet)
	_ = guideIdx

	guideTitleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14, Color: "1B7340"},
	})
	guideHeaderStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 11},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"E8F5E9"}, Pattern: 1},
	})

	f.SetCellValue(guideSheet, "A1", "Project Import Template Guide")
	f.SetCellStyle(guideSheet, "A1", "A1", guideTitleStyle)
	f.SetColWidth(guideSheet, "A", "A", 25)
	f.SetColWidth(guideSheet, "B", "B", 20)
	f.SetColWidth(guideSheet, "C", "C", 50)
	f.SetColWidth(guideSheet, "D", "D", 30)

	// Guide headers.
	guideHeaders := []string{"Column", "Required", "Description", "Example / Allowed Values"}
	for i, h := range guideHeaders {
		cell, _ := excelize.CoordinatesToCellName(i+1, 3)
		f.SetCellValue(guideSheet, cell, h)
		f.SetCellStyle(guideSheet, cell, cell, guideHeaderStyle)
	}

	for i, col := range ProjectTemplateColumns {
		row := i + 4
		f.SetCellValue(guideSheet, fmt.Sprintf("A%d", row), col.Header)
		req := "No"
		if col.Required {
			req = "Yes"
		}
		f.SetCellValue(guideSheet, fmt.Sprintf("B%d", row), req)
		f.SetCellValue(guideSheet, fmt.Sprintf("C%d", row), col.Description)
		f.SetCellValue(guideSheet, fmt.Sprintf("D%d", row), col.Example)
	}

	// Additional instructions.
	noteRow := len(ProjectTemplateColumns) + 6
	f.SetCellValue(guideSheet, fmt.Sprintf("A%d", noteRow), "Important Notes:")
	f.SetCellStyle(guideSheet, fmt.Sprintf("A%d", noteRow), fmt.Sprintf("A%d", noteRow), guideTitleStyle)
	notes := []string{
		"1. Red headers indicate REQUIRED fields.",
		"2. Dates must be in YYYY-MM-DD format (e.g. 2026-04-01).",
		"3. Portfolio Name, Division Name, Sponsor Email, and PM Email must match existing records.",
		"4. Status values: proposed, approved, active, on_hold, completed, cancelled.",
		"5. Priority values: critical, high, medium, low.",
		"6. Project Code must be unique within your organization.",
		"7. Maximum 500 rows per upload.",
		"8. Maximum file size: 10 MB.",
		"9. Delete the example row (row 2) before uploading.",
	}
	for i, note := range notes {
		f.SetCellValue(guideSheet, fmt.Sprintf("A%d", noteRow+1+i), note)
	}

	// Set active sheet to Projects.
	f.SetActiveSheet(0)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("write xlsx: %w", err)
	}
	return buf.Bytes(), nil
}

// ──────────────────────────────────────────────
// File Parsing
// ──────────────────────────────────────────────

// ParseUploadedFile parses a multipart file and returns import rows.
func (s *ImportService) ParseUploadedFile(file multipart.File, header *multipart.FileHeader) ([]ImportRow, string, error) {
	// Validate file size.
	if header.Size > maxImportFileSize {
		return nil, "", apperrors.BadRequest(fmt.Sprintf("file size exceeds maximum of %d MB", maxImportFileSize/(1024*1024)))
	}

	// Determine format from extension.
	fileName := header.Filename
	var format string
	lowerName := strings.ToLower(fileName)
	switch {
	case strings.HasSuffix(lowerName, ".xlsx"):
		format = "xlsx"
	case strings.HasSuffix(lowerName, ".csv"):
		format = "csv"
	default:
		return nil, "", apperrors.BadRequest("unsupported file format: only .xlsx and .csv are accepted")
	}

	// Read file content.
	data, err := io.ReadAll(io.LimitReader(file, maxImportFileSize+1))
	if err != nil {
		return nil, "", apperrors.Internal("failed to read file", err)
	}
	if int64(len(data)) > maxImportFileSize {
		return nil, "", apperrors.BadRequest(fmt.Sprintf("file size exceeds maximum of %d MB", maxImportFileSize/(1024*1024)))
	}

	var rows []ImportRow
	switch format {
	case "csv":
		rows, err = parseCSV(data)
	case "xlsx":
		rows, err = parseXLSX(data)
	}
	if err != nil {
		return nil, format, err
	}

	if len(rows) == 0 {
		return nil, format, apperrors.BadRequest("file contains no data rows")
	}
	if len(rows) > maxImportRows {
		return nil, format, apperrors.BadRequest(fmt.Sprintf("file exceeds maximum of %d rows", maxImportRows))
	}

	return rows, format, nil
}

func parseCSV(data []byte) ([]ImportRow, error) {
	reader := csv.NewReader(bytes.NewReader(data))
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		return nil, apperrors.BadRequest("failed to parse CSV: " + err.Error())
	}

	if len(records) < 2 {
		return nil, apperrors.BadRequest("CSV must have at least a header row and one data row")
	}

	// Build header index.
	headerIdx := buildHeaderIndex(records[0])

	var rows []ImportRow
	for i, record := range records[1:] {
		row := mapRecordToRow(headerIdx, record, i+2)
		rows = append(rows, row)
	}
	return rows, nil
}

func parseXLSX(data []byte) ([]ImportRow, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, apperrors.BadRequest("failed to parse XLSX: " + err.Error())
	}
	defer f.Close()

	// Get first sheet.
	sheetName := f.GetSheetName(0)
	if sheetName == "" {
		return nil, apperrors.BadRequest("XLSX file has no sheets")
	}

	xlsxRows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, apperrors.BadRequest("failed to read XLSX sheet: " + err.Error())
	}

	if len(xlsxRows) < 2 {
		return nil, apperrors.BadRequest("XLSX must have at least a header row and one data row")
	}

	headerIdx := buildHeaderIndex(xlsxRows[0])

	var rows []ImportRow
	for i, record := range xlsxRows[1:] {
		row := mapRecordToRow(headerIdx, record, i+2)
		rows = append(rows, row)
	}
	return rows, nil
}

// buildHeaderIndex maps normalized header names to column indices.
func buildHeaderIndex(headers []string) map[string]int {
	idx := make(map[string]int, len(headers))
	for i, h := range headers {
		// Strip BOM if present.
		h = strings.TrimPrefix(h, "\xEF\xBB\xBF")
		normalized := strings.TrimSpace(strings.ToLower(h))
		idx[normalized] = i
	}
	return idx
}

// mapRecordToRow converts a CSV/XLSX record to an ImportRow using the header index.
func mapRecordToRow(headerIdx map[string]int, record []string, rowNum int) ImportRow {
	get := func(header string) string {
		if i, ok := headerIdx[strings.ToLower(header)]; ok && i < len(record) {
			return strings.TrimSpace(record[i])
		}
		return ""
	}

	return ImportRow{
		RowNumber:           rowNum,
		Title:               get("project title"),
		Code:                get("project code"),
		Description:         get("description"),
		PortfolioName:       get("portfolio name"),
		DivisionName:        get("division name"),
		SponsorEmail:        get("sponsor email"),
		ProjectManagerEmail: get("project manager email"),
		Status:              get("status"),
		Priority:            get("priority"),
		PlannedStart:        get("planned start date"),
		PlannedEnd:          get("planned end date"),
		BudgetApproved:      get("budget approved"),
		Charter:             get("charter"),
		Scope:               get("scope"),
		BusinessCase:        get("business case"),
		IsValid:             true,
	}
}

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

// referenceCache holds resolved reference lookups for validation.
type referenceCache struct {
	portfoliosByName map[string]uuid.UUID
	divisionsByName  map[string]uuid.UUID
	usersByEmail     map[string]uuid.UUID
	existingCodes    map[string]bool
}

// ValidateImport validates rows, creates a batch record, and returns the result.
func (s *ImportService) ValidateImport(ctx context.Context, rows []ImportRow, fileName, format string) (*ValidateImportResponse, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Load reference data.
	cache, err := s.loadReferenceData(ctx, auth.TenantID)
	if err != nil {
		return nil, err
	}

	// Track codes within the uploaded file for intra-file duplicate detection.
	seenCodes := make(map[string]int)

	validCount := 0
	invalidCount := 0

	for i := range rows {
		row := &rows[i]
		row.Errors = nil
		row.IsValid = true

		s.validateRow(row, cache, seenCodes)

		if row.IsValid {
			validCount++
		} else {
			invalidCount++
		}

		// Track code for duplicate detection.
		if row.Code != "" {
			if prevRow, exists := seenCodes[strings.ToLower(row.Code)]; exists {
				row.addError("Project Code", "DUPLICATE_IN_FILE", fmt.Sprintf("duplicate project code in file (also on row %d)", prevRow))
			} else {
				seenCodes[strings.ToLower(row.Code)] = row.RowNumber
			}
		}
	}

	// Recount after duplicate pass.
	validCount = 0
	invalidCount = 0
	for _, row := range rows {
		if row.IsValid {
			validCount++
		} else {
			invalidCount++
		}
	}

	// Create batch record.
	batchID := uuid.New()
	now := time.Now().UTC()

	previewJSON, _ := json.Marshal(rows)

	_, err = s.pool.Exec(ctx, `
		INSERT INTO project_import_batches (id, tenant_id, uploaded_by, file_name, file_format, status, total_rows, valid_rows, invalid_rows, preview_data, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		batchID, auth.TenantID, auth.UserID, fileName, format, ImportStatusValidated, len(rows), validCount, invalidCount, previewJSON, now,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create import batch", err)
	}

	// Persist row errors.
	for _, row := range rows {
		for _, re := range row.Errors {
			_, _ = s.pool.Exec(ctx, `
				INSERT INTO project_import_batch_errors (id, batch_id, row_number, column_name, error_code, message)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				uuid.New(), batchID, row.RowNumber, re.Column, re.Code, re.Message,
			)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"fileName":    fileName,
		"format":      format,
		"totalRows":   len(rows),
		"validRows":   validCount,
		"invalidRows": invalidCount,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "validate:project_import",
		EntityType: "project_import_batch",
		EntityID:   batchID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &ValidateImportResponse{
		BatchID:     batchID,
		FileName:    fileName,
		FileFormat:  format,
		TotalRows:   len(rows),
		ValidRows:   validCount,
		InvalidRows: invalidCount,
		Rows:        rows,
	}, nil
}

func (s *ImportService) validateRow(row *ImportRow, cache *referenceCache, seenCodes map[string]int) {
	// Required fields.
	if row.Title == "" {
		row.addError("Project Title", "REQUIRED", "Project Title is required")
	} else if len(row.Title) > 255 {
		row.addError("Project Title", "TOO_LONG", "Project Title must be 255 characters or less")
	}

	if row.Code == "" {
		row.addError("Project Code", "REQUIRED", "Project Code is required")
	} else if len(row.Code) > 50 {
		row.addError("Project Code", "TOO_LONG", "Project Code must be 50 characters or less")
	} else if _, exists := cache.existingCodes[strings.ToLower(row.Code)]; exists {
		row.addError("Project Code", "DUPLICATE_EXISTS", "Project code already exists in the system")
	}

	// Status validation.
	if row.Status != "" {
		if !validProjectStatuses[strings.ToLower(row.Status)] {
			row.addError("Status", "INVALID_VALUE", fmt.Sprintf("invalid status '%s': allowed values are proposed, approved, active, on_hold, completed, cancelled", row.Status))
		} else {
			row.Status = strings.ToLower(row.Status)
		}
	}

	// Priority validation.
	if row.Priority != "" {
		if !validPriorities[strings.ToLower(row.Priority)] {
			row.addError("Priority", "INVALID_VALUE", fmt.Sprintf("invalid priority '%s': allowed values are critical, high, medium, low", row.Priority))
		} else {
			row.Priority = strings.ToLower(row.Priority)
		}
	}

	// Date validations.
	var plannedStart, plannedEnd time.Time
	if row.PlannedStart != "" {
		parsed, err := time.Parse("2006-01-02", row.PlannedStart)
		if err != nil {
			row.addError("Planned Start Date", "INVALID_DATE", "date must be in YYYY-MM-DD format")
		} else {
			plannedStart = parsed
		}
	}
	if row.PlannedEnd != "" {
		parsed, err := time.Parse("2006-01-02", row.PlannedEnd)
		if err != nil {
			row.addError("Planned End Date", "INVALID_DATE", "date must be in YYYY-MM-DD format")
		} else {
			plannedEnd = parsed
		}
	}
	if !plannedStart.IsZero() && !plannedEnd.IsZero() && plannedEnd.Before(plannedStart) {
		row.addError("Planned End Date", "INVALID_RANGE", "planned end date cannot be before planned start date")
	}

	// Budget validation.
	if row.BudgetApproved != "" {
		val, err := strconv.ParseFloat(row.BudgetApproved, 64)
		if err != nil {
			row.addError("Budget Approved", "INVALID_NUMBER", "budget must be a valid number")
		} else if val < 0 {
			row.addError("Budget Approved", "INVALID_VALUE", "budget cannot be negative")
		}
	}

	// Reference validations.
	if row.PortfolioName != "" {
		if _, ok := cache.portfoliosByName[strings.ToLower(row.PortfolioName)]; !ok {
			row.addError("Portfolio Name", "NOT_FOUND", fmt.Sprintf("portfolio '%s' not found", row.PortfolioName))
		}
	}
	if row.DivisionName != "" {
		if _, ok := cache.divisionsByName[strings.ToLower(row.DivisionName)]; !ok {
			row.addError("Division Name", "NOT_FOUND", fmt.Sprintf("division '%s' not found", row.DivisionName))
		}
	}
	if row.SponsorEmail != "" {
		if _, ok := cache.usersByEmail[strings.ToLower(row.SponsorEmail)]; !ok {
			row.addError("Sponsor Email", "NOT_FOUND", fmt.Sprintf("user with email '%s' not found", row.SponsorEmail))
		}
	}
	if row.ProjectManagerEmail != "" {
		if _, ok := cache.usersByEmail[strings.ToLower(row.ProjectManagerEmail)]; !ok {
			row.addError("Project Manager Email", "NOT_FOUND", fmt.Sprintf("user with email '%s' not found", row.ProjectManagerEmail))
		}
	}

	// Text length limits.
	if len(row.Description) > 5000 {
		row.addError("Description", "TOO_LONG", "Description must be 5000 characters or less")
	}
	if len(row.Charter) > 10000 {
		row.addError("Charter", "TOO_LONG", "Charter must be 10000 characters or less")
	}
	if len(row.Scope) > 10000 {
		row.addError("Scope", "TOO_LONG", "Scope must be 10000 characters or less")
	}
	if len(row.BusinessCase) > 10000 {
		row.addError("Business Case", "TOO_LONG", "Business Case must be 10000 characters or less")
	}
}

func (r *ImportRow) addError(column, code, message string) {
	r.IsValid = false
	r.Errors = append(r.Errors, RowError{Column: column, Code: code, Message: message})
}

// loadReferenceData loads all lookup data needed for validation.
func (s *ImportService) loadReferenceData(ctx context.Context, tenantID uuid.UUID) (*referenceCache, error) {
	cache := &referenceCache{
		portfoliosByName: make(map[string]uuid.UUID),
		divisionsByName:  make(map[string]uuid.UUID),
		usersByEmail:     make(map[string]uuid.UUID),
		existingCodes:    make(map[string]bool),
	}

	// Load portfolios.
	rows, err := s.pool.Query(ctx, `SELECT id, name FROM portfolios WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to load portfolios", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, apperrors.Internal("failed to scan portfolio", err)
		}
		cache.portfoliosByName[strings.ToLower(name)] = id
	}

	// Load org_units / divisions.
	rows, err = s.pool.Query(ctx, `SELECT id, name FROM org_units WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to load org units", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, apperrors.Internal("failed to scan org unit", err)
		}
		cache.divisionsByName[strings.ToLower(name)] = id
	}

	// Load users.
	rows, err = s.pool.Query(ctx, `SELECT id, email FROM users WHERE tenant_id = $1 AND is_active = true`, tenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to load users", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		var email string
		if err := rows.Scan(&id, &email); err != nil {
			return nil, apperrors.Internal("failed to scan user", err)
		}
		cache.usersByEmail[strings.ToLower(email)] = id
	}

	// Load existing project codes.
	rows, err = s.pool.Query(ctx, `SELECT LOWER(code) FROM projects WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to load existing project codes", err)
	}
	defer rows.Close()
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, apperrors.Internal("failed to scan project code", err)
		}
		cache.existingCodes[code] = true
	}

	return cache, nil
}

// ──────────────────────────────────────────────
// Import Execution
// ──────────────────────────────────────────────

// CommitImport executes the bulk import for a validated batch.
func (s *ImportService) CommitImport(ctx context.Context, batchID uuid.UUID) (*CommitImportResponse, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Retrieve batch.
	var batch ImportBatch
	var previewData []byte
	err := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, uploaded_by, file_name, file_format, status, total_rows, valid_rows, invalid_rows, preview_data
		FROM project_import_batches
		WHERE id = $1 AND tenant_id = $2`,
		batchID, auth.TenantID,
	).Scan(&batch.ID, &batch.TenantID, &batch.UploadedBy, &batch.FileName, &batch.FileFormat, &batch.Status,
		&batch.TotalRows, &batch.ValidRows, &batch.InvalidRows, &previewData)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("ImportBatch", batchID.String())
		}
		return nil, apperrors.Internal("failed to retrieve batch", err)
	}

	if batch.Status != ImportStatusValidated {
		return nil, apperrors.BadRequest(fmt.Sprintf("batch is in '%s' status; only 'validated' batches can be committed", batch.Status))
	}
	if batch.ValidRows == 0 {
		return nil, apperrors.BadRequest("no valid rows to import")
	}

	// Parse preview data.
	var rows []ImportRow
	if err := json.Unmarshal(previewData, &rows); err != nil {
		return nil, apperrors.Internal("failed to parse batch preview data", err)
	}

	// Update batch status to importing.
	_, _ = s.pool.Exec(ctx, `UPDATE project_import_batches SET status = $1 WHERE id = $2`, ImportStatusImporting, batchID)

	// Load reference data for resolving IDs.
	cache, err := s.loadReferenceData(ctx, auth.TenantID)
	if err != nil {
		_, _ = s.pool.Exec(ctx, `UPDATE project_import_batches SET status = $1 WHERE id = $2`, ImportStatusFailed, batchID)
		return nil, err
	}

	// Execute import in a transaction.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		_, _ = s.pool.Exec(ctx, `UPDATE project_import_batches SET status = $1 WHERE id = $2`, ImportStatusFailed, batchID)
		return nil, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	var createdIDs []uuid.UUID
	importedCount := 0
	failedCount := 0
	now := time.Now().UTC()

	for _, row := range rows {
		if !row.IsValid {
			failedCount++
			continue
		}

		id := uuid.New()

		// Resolve references.
		var portfolioID *uuid.UUID
		if row.PortfolioName != "" {
			if pid, ok := cache.portfoliosByName[strings.ToLower(row.PortfolioName)]; ok {
				portfolioID = &pid
			}
		}

		var divisionID *uuid.UUID
		if row.DivisionName != "" {
			if did, ok := cache.divisionsByName[strings.ToLower(row.DivisionName)]; ok {
				divisionID = &did
			}
		} else if auth.OrgUnitID != uuid.Nil {
			// Auto-set from auth context.
			did := auth.OrgUnitID
			divisionID = &did
		}

		var sponsorID *uuid.UUID
		if row.SponsorEmail != "" {
			if sid, ok := cache.usersByEmail[strings.ToLower(row.SponsorEmail)]; ok {
				sponsorID = &sid
			}
		}

		var pmID *uuid.UUID
		if row.ProjectManagerEmail != "" {
			if pid, ok := cache.usersByEmail[strings.ToLower(row.ProjectManagerEmail)]; ok {
				pmID = &pid
			}
		}

		status := "proposed"
		if row.Status != "" {
			status = row.Status
		}

		priority := "medium"
		if row.Priority != "" {
			priority = row.Priority
		}

		var plannedStart, plannedEnd *time.Time
		if row.PlannedStart != "" {
			if t, err := time.Parse("2006-01-02", row.PlannedStart); err == nil {
				plannedStart = &t
			}
		}
		if row.PlannedEnd != "" {
			if t, err := time.Parse("2006-01-02", row.PlannedEnd); err == nil {
				plannedEnd = &t
			}
		}

		var budgetApproved *float64
		if row.BudgetApproved != "" {
			if val, err := strconv.ParseFloat(row.BudgetApproved, 64); err == nil {
				budgetApproved = &val
			}
		}

		var description, charter, scope, businessCase *string
		if row.Description != "" {
			description = &row.Description
		}
		if row.Charter != "" {
			charter = &row.Charter
		}
		if row.Scope != "" {
			scope = &row.Scope
		}
		if row.BusinessCase != "" {
			businessCase = &row.BusinessCase
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO projects (
				id, tenant_id, portfolio_id, division_id, title, code, description, charter, scope, business_case,
				sponsor_id, project_manager_id, status, rag_status, priority,
				planned_start, planned_end, budget_approved, metadata,
				created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
				$11, $12, $13, $14, $15,
				$16, $17, $18, $19,
				$20, $21
			)`,
			id, auth.TenantID, portfolioID, divisionID, row.Title, row.Code, description, charter, scope, businessCase,
			sponsorID, pmID, status, "green", priority,
			plannedStart, plannedEnd, budgetApproved, nil,
			now, now,
		)
		if err != nil {
			// Log row-level import error but continue.
			slog.ErrorContext(ctx, "failed to insert project during import",
				"row", row.RowNumber, "code", row.Code, "error", err)
			failedCount++

			_, _ = s.pool.Exec(ctx, `
				INSERT INTO project_import_batch_errors (id, batch_id, row_number, column_name, error_code, message)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				uuid.New(), batchID, row.RowNumber, "", "IMPORT_FAILED", err.Error(),
			)

			// Rollback and switch to row-by-row mode.
			tx.Rollback(ctx)

			return s.commitRowByRow(ctx, auth, batchID, rows, cache)
		}

		createdIDs = append(createdIDs, id)
		importedCount++
	}

	if err := tx.Commit(ctx); err != nil {
		_, _ = s.pool.Exec(ctx, `UPDATE project_import_batches SET status = $1 WHERE id = $2`, ImportStatusFailed, batchID)
		return nil, apperrors.Internal("failed to commit transaction", err)
	}

	// Update batch.
	completedAt := time.Now().UTC()
	_, _ = s.pool.Exec(ctx, `
		UPDATE project_import_batches SET status = $1, imported_rows = $2, failed_rows = $3, completed_at = $4
		WHERE id = $5`,
		ImportStatusCompleted, importedCount, failedCount, completedAt, batchID,
	)

	// Log audit.
	changes, _ := json.Marshal(map[string]any{
		"batchId":      batchID,
		"importedRows": importedCount,
		"failedRows":   failedCount,
		"totalRows":    len(rows),
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "commit:project_import",
		EntityType: "project_import_batch",
		EntityID:   batchID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &CommitImportResponse{
		BatchID:      batchID,
		TotalRows:    len(rows),
		ImportedRows: importedCount,
		FailedRows:   failedCount,
		CreatedIDs:   createdIDs,
		Status:       ImportStatusCompleted,
	}, nil
}

// commitRowByRow falls back to row-by-row inserts when the batch transaction fails.
func (s *ImportService) commitRowByRow(ctx context.Context, auth *types.AuthContext, batchID uuid.UUID, rows []ImportRow, cache *referenceCache) (*CommitImportResponse, error) {
	var createdIDs []uuid.UUID
	importedCount := 0
	failedCount := 0
	now := time.Now().UTC()

	for _, row := range rows {
		if !row.IsValid {
			failedCount++
			continue
		}

		id := uuid.New()

		var portfolioID *uuid.UUID
		if row.PortfolioName != "" {
			if pid, ok := cache.portfoliosByName[strings.ToLower(row.PortfolioName)]; ok {
				portfolioID = &pid
			}
		}

		var divisionID *uuid.UUID
		if row.DivisionName != "" {
			if did, ok := cache.divisionsByName[strings.ToLower(row.DivisionName)]; ok {
				divisionID = &did
			}
		} else if auth.OrgUnitID != uuid.Nil {
			did := auth.OrgUnitID
			divisionID = &did
		}

		var sponsorID *uuid.UUID
		if row.SponsorEmail != "" {
			if sid, ok := cache.usersByEmail[strings.ToLower(row.SponsorEmail)]; ok {
				sponsorID = &sid
			}
		}

		var pmID *uuid.UUID
		if row.ProjectManagerEmail != "" {
			if pid, ok := cache.usersByEmail[strings.ToLower(row.ProjectManagerEmail)]; ok {
				pmID = &pid
			}
		}

		status := "proposed"
		if row.Status != "" {
			status = row.Status
		}

		priority := "medium"
		if row.Priority != "" {
			priority = row.Priority
		}

		var plannedStart, plannedEnd *time.Time
		if row.PlannedStart != "" {
			if t, err := time.Parse("2006-01-02", row.PlannedStart); err == nil {
				plannedStart = &t
			}
		}
		if row.PlannedEnd != "" {
			if t, err := time.Parse("2006-01-02", row.PlannedEnd); err == nil {
				plannedEnd = &t
			}
		}

		var budgetApproved *float64
		if row.BudgetApproved != "" {
			if val, err := strconv.ParseFloat(row.BudgetApproved, 64); err == nil {
				budgetApproved = &val
			}
		}

		var description, charter, scope, businessCase *string
		if row.Description != "" {
			description = &row.Description
		}
		if row.Charter != "" {
			charter = &row.Charter
		}
		if row.Scope != "" {
			scope = &row.Scope
		}
		if row.BusinessCase != "" {
			businessCase = &row.BusinessCase
		}

		_, err := s.pool.Exec(ctx, `
			INSERT INTO projects (
				id, tenant_id, portfolio_id, division_id, title, code, description, charter, scope, business_case,
				sponsor_id, project_manager_id, status, rag_status, priority,
				planned_start, planned_end, budget_approved, metadata,
				created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
				$11, $12, $13, $14, $15,
				$16, $17, $18, $19,
				$20, $21
			)`,
			id, auth.TenantID, portfolioID, divisionID, row.Title, row.Code, description, charter, scope, businessCase,
			sponsorID, pmID, status, "green", priority,
			plannedStart, plannedEnd, budgetApproved, nil,
			now, now,
		)
		if err != nil {
			failedCount++
			_, _ = s.pool.Exec(ctx, `
				INSERT INTO project_import_batch_errors (id, batch_id, row_number, column_name, error_code, message)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				uuid.New(), batchID, row.RowNumber, "", "IMPORT_FAILED", err.Error(),
			)
		} else {
			createdIDs = append(createdIDs, id)
			importedCount++
		}
	}

	completedAt := time.Now().UTC()
	status := ImportStatusCompleted
	if importedCount == 0 {
		status = ImportStatusFailed
	}

	_, _ = s.pool.Exec(ctx, `
		UPDATE project_import_batches SET status = $1, imported_rows = $2, failed_rows = $3, completed_at = $4
		WHERE id = $5`,
		status, importedCount, failedCount, completedAt, batchID,
	)

	changes, _ := json.Marshal(map[string]any{
		"batchId":      batchID,
		"importedRows": importedCount,
		"failedRows":   failedCount,
		"mode":         "row_by_row",
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "commit:project_import",
		EntityType: "project_import_batch",
		EntityID:   batchID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &CommitImportResponse{
		BatchID:      batchID,
		TotalRows:    len(rows),
		ImportedRows: importedCount,
		FailedRows:   failedCount,
		CreatedIDs:   createdIDs,
		Status:       status,
	}, nil
}

// ──────────────────────────────────────────────
// Batch Queries
// ──────────────────────────────────────────────

// GetImportBatch retrieves a single import batch.
func (s *ImportService) GetImportBatch(ctx context.Context, batchID uuid.UUID) (*ImportBatch, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	var batch ImportBatch
	err := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, uploaded_by, file_name, file_format, status, total_rows, valid_rows, invalid_rows, imported_rows, failed_rows, created_at, completed_at
		FROM project_import_batches
		WHERE id = $1 AND tenant_id = $2`,
		batchID, auth.TenantID,
	).Scan(&batch.ID, &batch.TenantID, &batch.UploadedBy, &batch.FileName, &batch.FileFormat, &batch.Status,
		&batch.TotalRows, &batch.ValidRows, &batch.InvalidRows, &batch.ImportedRows, &batch.FailedRows,
		&batch.CreatedAt, &batch.CompletedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("ImportBatch", batchID.String())
		}
		return nil, apperrors.Internal("failed to get batch", err)
	}

	return &batch, nil
}

// GetImportBatchErrors retrieves errors for a batch.
func (s *ImportService) GetImportBatchErrors(ctx context.Context, batchID uuid.UUID) ([]ImportBatchError, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify batch belongs to tenant.
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM project_import_batches WHERE id = $1 AND tenant_id = $2)`, batchID, auth.TenantID).Scan(&exists)
	if err != nil {
		return nil, apperrors.Internal("failed to check batch", err)
	}
	if !exists {
		return nil, apperrors.NotFound("ImportBatch", batchID.String())
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, batch_id, row_number, COALESCE(column_name, ''), COALESCE(field_value, ''), error_code, message
		FROM project_import_batch_errors
		WHERE batch_id = $1
		ORDER BY row_number, id`, batchID)
	if err != nil {
		return nil, apperrors.Internal("failed to get batch errors", err)
	}
	defer rows.Close()

	var errors []ImportBatchError
	for rows.Next() {
		var e ImportBatchError
		if err := rows.Scan(&e.ID, &e.BatchID, &e.RowNumber, &e.ColumnName, &e.FieldValue, &e.ErrorCode, &e.Message); err != nil {
			return nil, apperrors.Internal("failed to scan batch error", err)
		}
		errors = append(errors, e)
	}

	return errors, nil
}

// GenerateErrorReportCSV generates a CSV error report for a batch.
func (s *ImportService) GenerateErrorReportCSV(ctx context.Context, batchID uuid.UUID) ([]byte, string, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, "", apperrors.Unauthorized("authentication required")
	}

	batch, err := s.GetImportBatch(ctx, batchID)
	if err != nil {
		return nil, "", err
	}

	errors, err := s.GetImportBatchErrors(ctx, batchID)
	if err != nil {
		return nil, "", err
	}

	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(&buf)
	defer writer.Flush()

	writer.Write([]string{"Row Number", "Column", "Error Code", "Message"})
	for _, e := range errors {
		writer.Write([]string{
			strconv.Itoa(e.RowNumber),
			e.ColumnName,
			e.ErrorCode,
			e.Message,
		})
	}
	writer.Flush()

	filename := fmt.Sprintf("import-errors-%s-%s.csv", batch.FileName, batchID.String()[:8])
	return buf.Bytes(), filename, nil
}
