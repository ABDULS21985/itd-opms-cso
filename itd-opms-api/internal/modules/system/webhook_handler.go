package system

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

/* ------------------------------------------------------------------ */
/*  Admin handler                                                      */
/* ------------------------------------------------------------------ */

// WebhookHandler handles admin CRUD for webhook endpoints.
type WebhookHandler struct {
	svc      *WebhookService
	receiver *WebhookReceiverHandler
}

// NewWebhookHandler creates a new webhook admin handler.
func NewWebhookHandler(svc *WebhookService, receiver *WebhookReceiverHandler) *WebhookHandler {
	return &WebhookHandler{svc: svc, receiver: receiver}
}

// Routes mounts webhook admin routes.
func (h *WebhookHandler) Routes(r chi.Router) {
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)
	r.Post("/{id}/regenerate-secret", h.RegenerateSecret)
	r.Get("/{id}/logs", h.ListLogs)
	r.Post("/{id}/test", h.Test)
}

/* ------------------------------------------------------------------ */
/*  Handlers                                                           */
/* ------------------------------------------------------------------ */

// List handles GET /system/webhooks
func (h *WebhookHandler) List(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pagination := types.ParsePagination(r)

	endpoints, total, err := h.svc.ListEndpoints(r.Context(), auth.TenantID, pagination.Limit, pagination.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, endpoints, types.NewMeta(int64(total), pagination))
}

// Create handles POST /system/webhooks
func (h *WebhookHandler) Create(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateWebhookEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	ep, err := h.svc.CreateEndpoint(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, ep)
}

// Get handles GET /system/webhooks/{id}
func (h *WebhookHandler) Get(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return
	}

	ep, err := h.svc.GetEndpoint(r.Context(), auth.TenantID, id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ep, nil)
}

// Update handles PUT /system/webhooks/{id}
func (h *WebhookHandler) Update(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return
	}

	var req UpdateWebhookEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	ep, err := h.svc.UpdateEndpoint(r.Context(), auth.TenantID, id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ep, nil)
}

// Delete handles DELETE /system/webhooks/{id}
func (h *WebhookHandler) Delete(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return
	}

	if err := h.svc.DeleteEndpoint(r.Context(), auth.TenantID, id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]bool{"deleted": true}, nil)
}

// RegenerateSecret handles POST /system/webhooks/{id}/regenerate-secret
func (h *WebhookHandler) RegenerateSecret(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return
	}

	secret, err := h.svc.RegenerateSecret(r.Context(), auth.TenantID, id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"secret": secret}, nil)
}

// ListLogs handles GET /system/webhooks/{id}/logs
func (h *WebhookHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return
	}

	// Verify endpoint belongs to tenant.
	if _, err := h.svc.GetEndpoint(r.Context(), auth.TenantID, id); err != nil {
		writeAppError(w, r, err)
		return
	}

	pagination := types.ParsePagination(r)

	logs, total, err := h.svc.ListLogs(r.Context(), id, pagination.Limit, pagination.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, logs, types.NewMeta(int64(total), pagination))
}

// Test handles POST /system/webhooks/{id}/test
func (h *WebhookHandler) Test(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return
	}

	ep, err := h.svc.GetEndpoint(r.Context(), auth.TenantID, id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	var req TestWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	var payload map[string]any
	if err := json.Unmarshal(req.Payload, &payload); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON payload")
		return
	}

	result, execErr := h.receiver.ExecuteActionForTest(r.Context(), ep, payload)

	// Log the test invocation.
	actionTaken := ep.TargetAction + " (test)"
	var errStr *string
	if execErr != nil {
		e := execErr.Error()
		errStr = &e
	}
	resultJSON, _ := json.Marshal(result)

	logEntry := WebhookLog{
		EndpointID:     ep.ID,
		SourceIP:       strPtr("test"),
		Payload:        req.Payload,
		SignatureValid: boolPtr(true),
		ActionTaken:    &actionTaken,
		ActionResult:   resultJSON,
		Error:          errStr,
	}
	_, _ = h.svc.InsertLog(r.Context(), logEntry)

	resp := map[string]any{
		"status": "ok",
		"action": ep.TargetAction,
		"result": result,
	}
	if execErr != nil {
		resp["status"] = "error"
		resp["error"] = execErr.Error()
	}

	types.OK(w, resp, nil)
}

func boolPtr(b bool) *bool {
	return &b
}
