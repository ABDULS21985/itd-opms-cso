package export

import (
	"encoding/csv"
	"fmt"
	"net/http"
)

// CSVColumn defines a column header and its corresponding field name.
type CSVColumn struct {
	Header string
	Field  string
}

// WriteCSV streams a CSV file as an HTTP response with BOM for Excel compatibility.
func WriteCSV(w http.ResponseWriter, filename string, columns []CSVColumn, rows [][]string) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Write([]byte{0xEF, 0xBB, 0xBF}) // UTF-8 BOM

	writer := csv.NewWriter(w)
	defer writer.Flush()

	headers := make([]string, len(columns))
	for i, col := range columns {
		headers[i] = col.Header
	}
	writer.Write(headers)

	for _, row := range rows {
		writer.Write(row)
	}
}
