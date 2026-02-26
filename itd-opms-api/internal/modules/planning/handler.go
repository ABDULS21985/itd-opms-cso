package planning

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Handler handles HTTP requests for the planning module.
type Handler struct{}

// NewHandler creates a new planning Handler.
func NewHandler() *Handler {
	return &Handler{}
}

// Routes mounts planning endpoints on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.index)
}

func (h *Handler) index(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "info",
		"message": "planning module - not yet implemented",
		"data":    nil,
	})
}
