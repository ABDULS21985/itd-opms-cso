package cmdb

import (
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// MEGAHandler exposes MEGA EA XML import/export endpoints.
type MEGAHandler struct {
	svc *MEGAService
}

// NewMEGAHandler creates a MEGA EA integration handler.
func NewMEGAHandler(svc *MEGAService) *MEGAHandler {
	return &MEGAHandler{svc: svc}
}

// Routes mounts MEGA EA integration endpoints under /cmdb/integrations/mega.
func (h *MEGAHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("cmdb.view")).Get("/export", h.ExportXML)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/import", h.ImportXML)
	r.With(middleware.RequirePermission("cmdb.view")).Post("/validate", h.ValidateXML)
}

// ExportXML handles GET /export and streams MEGA EA XML.
func (h *MEGAHandler) ExportXML(w http.ResponseWriter, r *http.Request) {
	if types.GetAuthContext(r.Context()) == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	limit := 1000
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	includeRelationships := true
	if raw := r.URL.Query().Get("includeRelationships"); raw != "" {
		includeRelationships = raw != "false"
	}

	data, count, err := h.svc.ExportXML(r.Context(), MEGAExportRequest{
		Query:                r.URL.Query().Get("q"),
		CIType:               r.URL.Query().Get("ciType"),
		Status:               r.URL.Query().Get("status"),
		Limit:                limit,
		IncludeRelationships: includeRelationships,
	})
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="itd-opms-mega-ci-export.xml"`)
	w.Header().Set("X-CI-Count", strconv.Itoa(count))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// ImportXML handles POST /import with multipart file upload or raw XML body.
func (h *MEGAHandler) ImportXML(w http.ResponseWriter, r *http.Request) {
	if types.GetAuthContext(r.Context()) == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	reader, closer, err := megaXMLReader(r)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	if closer != nil {
		defer closer.Close()
	}

	result, err := h.svc.ImportXML(r.Context(), reader)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

// ValidateXML handles POST /validate with multipart file upload or raw XML body.
func (h *MEGAHandler) ValidateXML(w http.ResponseWriter, r *http.Request) {
	if types.GetAuthContext(r.Context()) == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	reader, closer, err := megaXMLReader(r)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	if closer != nil {
		defer closer.Close()
	}

	result, err := h.svc.ValidateXML(r.Context(), reader)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func megaXMLReader(r *http.Request) (io.Reader, io.Closer, error) {
	contentType := strings.ToLower(r.Header.Get("Content-Type"))
	if strings.Contains(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return nil, nil, err
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			return nil, nil, err
		}
		return file, file, nil
	}

	if r.Body == nil {
		return nil, nil, multipart.ErrMessageTooLarge
	}
	return r.Body, nil, nil
}
