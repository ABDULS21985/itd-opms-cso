package export_test

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/itd-cbn/itd-opms-api/internal/shared/export"
)

func TestWriteCSV_BasicOutput(t *testing.T) {
	w := httptest.NewRecorder()
	columns := []export.CSVColumn{
		{Header: "Name", Field: "name"},
		{Header: "Email", Field: "email"},
	}
	rows := [][]string{
		{"Alice", "alice@example.com"},
		{"Bob", "bob@example.com"},
	}

	export.WriteCSV(w, "users.csv", columns, rows)

	body := w.Body.String()
	// Skip UTF-8 BOM (3 bytes)
	if len(body) < 3 {
		t.Fatal("response body too short")
	}
	content := body[3:] // Skip BOM

	lines := strings.Split(strings.TrimSpace(content), "\n")
	if len(lines) != 3 {
		t.Errorf("expected 3 lines (header + 2 rows), got %d", len(lines))
	}
	if lines[0] != "Name,Email" {
		t.Errorf("expected header 'Name,Email', got %q", lines[0])
	}
	if lines[1] != "Alice,alice@example.com" {
		t.Errorf("expected first row 'Alice,alice@example.com', got %q", lines[1])
	}
}

func TestWriteCSV_ContentTypeHeader(t *testing.T) {
	w := httptest.NewRecorder()
	export.WriteCSV(w, "test.csv", []export.CSVColumn{{Header: "A", Field: "a"}}, nil)

	ct := w.Header().Get("Content-Type")
	if ct != "text/csv; charset=utf-8" {
		t.Errorf("expected Content-Type 'text/csv; charset=utf-8', got %q", ct)
	}
}

func TestWriteCSV_ContentDispositionHeader(t *testing.T) {
	w := httptest.NewRecorder()
	export.WriteCSV(w, "report.csv", []export.CSVColumn{{Header: "A", Field: "a"}}, nil)

	cd := w.Header().Get("Content-Disposition")
	expected := `attachment; filename="report.csv"`
	if cd != expected {
		t.Errorf("expected Content-Disposition %q, got %q", expected, cd)
	}
}

func TestWriteCSV_UTF8BOM(t *testing.T) {
	w := httptest.NewRecorder()
	export.WriteCSV(w, "test.csv", []export.CSVColumn{{Header: "A", Field: "a"}}, nil)

	body := w.Body.Bytes()
	if len(body) < 3 || body[0] != 0xEF || body[1] != 0xBB || body[2] != 0xBF {
		t.Error("expected UTF-8 BOM at start of response")
	}
}

func TestWriteCSV_EmptyRows(t *testing.T) {
	w := httptest.NewRecorder()
	columns := []export.CSVColumn{
		{Header: "Name", Field: "name"},
	}

	export.WriteCSV(w, "empty.csv", columns, nil)

	body := w.Body.String()[3:] // Skip BOM
	lines := strings.Split(strings.TrimSpace(body), "\n")
	if len(lines) != 1 {
		t.Errorf("expected 1 line (header only), got %d", len(lines))
	}
	if lines[0] != "Name" {
		t.Errorf("expected header 'Name', got %q", lines[0])
	}
}

func TestWriteCSV_SpecialCharacters(t *testing.T) {
	w := httptest.NewRecorder()
	columns := []export.CSVColumn{
		{Header: "Value", Field: "value"},
	}
	rows := [][]string{
		{`has "quotes"`},
		{"has,comma"},
		{"has\nnewline"},
	}

	export.WriteCSV(w, "special.csv", columns, rows)

	body := w.Body.String()[3:] // Skip BOM
	// CSV should properly quote fields with special characters
	if !strings.Contains(body, `"has ""quotes"""`) {
		t.Errorf("expected escaped quotes in CSV output, got: %s", body)
	}
	if !strings.Contains(body, `"has,comma"`) {
		t.Errorf("expected quoted comma field in CSV output, got: %s", body)
	}
}

func TestWriteCSV_UnicodeContent(t *testing.T) {
	w := httptest.NewRecorder()
	columns := []export.CSVColumn{
		{Header: "Name", Field: "name"},
	}
	rows := [][]string{
		{"\u00e9\u00e8\u00ea"}, // French accented characters
		{"\u4e16\u754c"},       // Chinese characters
	}

	export.WriteCSV(w, "unicode.csv", columns, rows)

	body := w.Body.String()[3:]
	if !strings.Contains(body, "\u00e9\u00e8\u00ea") {
		t.Error("expected unicode characters in output")
	}
}
