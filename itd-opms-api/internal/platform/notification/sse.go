package notification

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// SSEEvent represents a Server-Sent Event payload.
type SSEEvent struct {
	Type string
	Data string
}

// SSEHandler provides a Server-Sent Events endpoint for real-time notifications.
type SSEHandler struct {
	svc     *Service
	clients map[string][]chan SSEEvent // userID -> channels
	mu      sync.RWMutex
}

// NewSSEHandler creates a new SSEHandler.
func NewSSEHandler(svc *Service) *SSEHandler {
	return &SSEHandler{
		svc:     svc,
		clients: make(map[string][]chan SSEEvent),
	}
}

// ServeHTTP is the SSE endpoint handler. Clients connect here to receive
// real-time notification events via Server-Sent Events.
func (h *SSEHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Ensure the response writer supports flushing.
	flusher, ok := w.(http.Flusher)
	if !ok {
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Streaming not supported")
		return
	}

	// Set SSE headers.
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	// Create a channel for this client and register it.
	ch := make(chan SSEEvent, 64)
	userID := authCtx.UserID.String()

	h.mu.Lock()
	h.clients[userID] = append(h.clients[userID], ch)
	h.mu.Unlock()

	slog.Info("SSE client connected",
		"user_id", userID,
	)

	// Ensure cleanup on disconnect.
	defer func() {
		h.removeClient(userID, ch)
		close(ch)
		slog.Info("SSE client disconnected",
			"user_id", userID,
		)
	}()

	// Send an initial keepalive so the client knows the connection is alive.
	fmt.Fprintf(w, ": keepalive\n\n")
	flusher.Flush()

	// Keepalive ticker to prevent proxy/load-balancer timeouts.
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return

		case event, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, event.Data)
			flusher.Flush()

		case <-ticker.C:
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

// Broadcast sends an SSE event to all connected clients for the given user.
func (h *SSEHandler) Broadcast(userID string, event SSEEvent) {
	h.mu.RLock()
	channels, ok := h.clients[userID]
	h.mu.RUnlock()

	if !ok {
		return
	}

	for _, ch := range channels {
		select {
		case ch <- event:
		default:
			// Channel buffer is full; drop the event to avoid blocking.
			slog.Warn("SSE event dropped, client buffer full",
				"user_id", userID,
				"event_type", event.Type,
			)
		}
	}
}

// BroadcastNotification is a convenience method that broadcasts an
// InAppNotification as a JSON-encoded SSE event to the given user.
func (h *SSEHandler) BroadcastNotification(userID string, n InAppNotification) {
	data, err := json.Marshal(n)
	if err != nil {
		slog.Error("failed to marshal notification for SSE",
			"user_id", userID,
			"notification_id", n.ID,
			"error", err,
		)
		return
	}

	h.Broadcast(userID, SSEEvent{
		Type: "notification",
		Data: string(data),
	})
}

// removeClient removes a specific channel from a user's client list.
func (h *SSEHandler) removeClient(userID string, ch chan SSEEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()

	channels := h.clients[userID]
	for i, c := range channels {
		if c == ch {
			h.clients[userID] = append(channels[:i], channels[i+1:]...)
			break
		}
	}

	// Clean up the map entry if no clients remain for this user.
	if len(h.clients[userID]) == 0 {
		delete(h.clients, userID)
	}
}
