package notification

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// NewSSEHandler
// ──────────────────────────────────────────────

func TestNewSSEHandler_ReturnsNonNil(t *testing.T) {
	h := NewSSEHandler(nil)
	if h == nil {
		t.Fatal("expected non-nil SSEHandler")
	}
	if h.clients == nil {
		t.Error("expected initialized clients map")
	}
}

// ──────────────────────────────────────────────
// SSEHandler.ServeHTTP – unauthorized
// ──────────────────────────────────────────────

func TestSSEHandler_Unauthorized(t *testing.T) {
	h := NewSSEHandler(nil)

	req := httptest.NewRequest(http.MethodGet, "/sse", nil)
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// SSEHandler.ServeHTTP – sets SSE headers and initial keepalive
// ──────────────────────────────────────────────

func TestSSEHandler_SetsHeadersAndKeepalive(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := uuid.New()

	// Create a cancellable context so the handler returns quickly.
	ctx, cancel := context.WithCancel(context.Background())

	req := httptest.NewRequest(http.MethodGet, "/sse", nil)
	req = req.WithContext(ctx)
	req = req.WithContext(types.SetAuthContext(req.Context(), &types.AuthContext{
		UserID:   userID,
		TenantID: uuid.New(),
		Email:    "user@example.com",
	}))

	w := httptest.NewRecorder()

	// Run the handler in a goroutine, cancel after a short delay.
	done := make(chan struct{})
	go func() {
		h.ServeHTTP(w, req)
		close(done)
	}()

	// Give the handler a moment to set headers and write keepalive.
	time.Sleep(50 * time.Millisecond)
	cancel()

	<-done

	if ct := w.Header().Get("Content-Type"); ct != "text/event-stream" {
		t.Errorf("Content-Type: expected text/event-stream, got %q", ct)
	}
	if cc := w.Header().Get("Cache-Control"); cc != "no-cache" {
		t.Errorf("Cache-Control: expected no-cache, got %q", cc)
	}
	if conn := w.Header().Get("Connection"); conn != "keep-alive" {
		t.Errorf("Connection: expected keep-alive, got %q", conn)
	}
	if xab := w.Header().Get("X-Accel-Buffering"); xab != "no" {
		t.Errorf("X-Accel-Buffering: expected no, got %q", xab)
	}

	body := w.Body.String()
	if !strings.Contains(body, ": keepalive") {
		t.Errorf("expected initial keepalive comment in body, got: %q", body)
	}
}

// ──────────────────────────────────────────────
// SSEHandler.ServeHTTP – client registration and cleanup
// ──────────────────────────────────────────────

func TestSSEHandler_ClientRegistrationAndCleanup(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := uuid.New()

	ctx, cancel := context.WithCancel(context.Background())

	req := httptest.NewRequest(http.MethodGet, "/sse", nil)
	req = req.WithContext(types.SetAuthContext(ctx, &types.AuthContext{
		UserID:   userID,
		TenantID: uuid.New(),
		Email:    "user@example.com",
	}))

	w := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		h.ServeHTTP(w, req)
		close(done)
	}()

	// Give the handler time to register the client.
	time.Sleep(50 * time.Millisecond)

	h.mu.RLock()
	clients, exists := h.clients[userID.String()]
	clientCount := len(clients)
	h.mu.RUnlock()

	if !exists || clientCount != 1 {
		t.Errorf("expected 1 registered client for user %s, got %d (exists=%v)", userID, clientCount, exists)
	}

	// Cancel context to trigger disconnect and cleanup.
	cancel()
	<-done

	h.mu.RLock()
	_, exists = h.clients[userID.String()]
	h.mu.RUnlock()

	if exists {
		t.Error("expected client map entry to be removed after disconnect")
	}
}

// ──────────────────────────────────────────────
// SSEHandler.ServeHTTP – receives events
// ──────────────────────────────────────────────

func TestSSEHandler_ReceivesEvents(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := uuid.New()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	req := httptest.NewRequest(http.MethodGet, "/sse", nil)
	req = req.WithContext(types.SetAuthContext(ctx, &types.AuthContext{
		UserID:   userID,
		TenantID: uuid.New(),
		Email:    "user@example.com",
	}))

	w := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		h.ServeHTTP(w, req)
		close(done)
	}()

	// Wait for the client to be registered.
	time.Sleep(50 * time.Millisecond)

	// Broadcast an event to this user.
	h.Broadcast(userID.String(), SSEEvent{
		Type: "test_event",
		Data: `{"msg":"hello"}`,
	})

	// Give it a moment to flush.
	time.Sleep(50 * time.Millisecond)

	cancel()
	<-done

	body := w.Body.String()
	if !strings.Contains(body, "event: test_event") {
		t.Errorf("expected 'event: test_event' in body, got: %q", body)
	}
	if !strings.Contains(body, `data: {"msg":"hello"}`) {
		t.Errorf("expected data payload in body, got: %q", body)
	}
}

// ──────────────────────────────────────────────
// Broadcast
// ──────────────────────────────────────────────

func TestBroadcast_NoClientsDoesNotPanic(t *testing.T) {
	h := NewSSEHandler(nil)
	// Should not panic when no clients are registered.
	h.Broadcast("nonexistent-user", SSEEvent{Type: "test", Data: "data"})
}

func TestBroadcast_MultipleClients(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := "user-123"

	ch1 := make(chan SSEEvent, 64)
	ch2 := make(chan SSEEvent, 64)

	h.mu.Lock()
	h.clients[userID] = []chan SSEEvent{ch1, ch2}
	h.mu.Unlock()

	event := SSEEvent{Type: "update", Data: `{"count":5}`}
	h.Broadcast(userID, event)

	select {
	case got := <-ch1:
		if got.Type != "update" {
			t.Errorf("ch1: expected type 'update', got %q", got.Type)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("ch1: timed out waiting for event")
	}

	select {
	case got := <-ch2:
		if got.Type != "update" {
			t.Errorf("ch2: expected type 'update', got %q", got.Type)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("ch2: timed out waiting for event")
	}
}

func TestBroadcast_FullBufferDropsEvent(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := "user-456"

	// Create a channel with buffer size 1 and fill it.
	ch := make(chan SSEEvent, 1)
	ch <- SSEEvent{Type: "filler", Data: "{}"}

	h.mu.Lock()
	h.clients[userID] = []chan SSEEvent{ch}
	h.mu.Unlock()

	// This broadcast should drop the event (buffer full) without blocking.
	h.Broadcast(userID, SSEEvent{Type: "dropped", Data: "{}"})

	// Drain the original event.
	got := <-ch
	if got.Type != "filler" {
		t.Errorf("expected 'filler' event, got %q", got.Type)
	}

	// Channel should now be empty (the new event was dropped).
	select {
	case evt := <-ch:
		t.Errorf("expected channel to be empty, got event: %+v", evt)
	default:
		// This is the expected path.
	}
}

// ──────────────────────────────────────────────
// BroadcastNotification
// ──────────────────────────────────────────────

func TestBroadcastNotification(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := "user-789"

	ch := make(chan SSEEvent, 64)
	h.mu.Lock()
	h.clients[userID] = []chan SSEEvent{ch}
	h.mu.Unlock()

	notifID := uuid.New()
	tenantID := uuid.New()
	now := time.Now()

	notif := InAppNotification{
		ID:        notifID,
		TenantID:  tenantID,
		Type:      "itsm.ticket.assigned",
		Title:     "Ticket Assigned",
		Message:   "You have been assigned ticket INC-001",
		IsRead:    false,
		CreatedAt: now,
	}

	h.BroadcastNotification(userID, notif)

	select {
	case got := <-ch:
		if got.Type != "notification" {
			t.Errorf("expected event type 'notification', got %q", got.Type)
		}

		// Verify the data is valid JSON and contains expected fields.
		var decoded InAppNotification
		if err := json.Unmarshal([]byte(got.Data), &decoded); err != nil {
			t.Fatalf("failed to unmarshal SSE data: %v", err)
		}
		if decoded.ID != notifID {
			t.Errorf("ID: expected %s, got %s", notifID, decoded.ID)
		}
		if decoded.Title != "Ticket Assigned" {
			t.Errorf("Title: expected 'Ticket Assigned', got %q", decoded.Title)
		}
		if decoded.IsRead != false {
			t.Error("IsRead: expected false")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("timed out waiting for broadcast notification")
	}
}

func TestBroadcastNotification_NoClients(t *testing.T) {
	h := NewSSEHandler(nil)
	// Should not panic.
	h.BroadcastNotification("nobody", InAppNotification{
		ID:    uuid.New(),
		Title: "Test",
	})
}

// ──────────────────────────────────────────────
// removeClient
// ──────────────────────────────────────────────

func TestRemoveClient_SingleClient(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := "user-remove-1"
	ch := make(chan SSEEvent, 1)

	h.mu.Lock()
	h.clients[userID] = []chan SSEEvent{ch}
	h.mu.Unlock()

	h.removeClient(userID, ch)

	h.mu.RLock()
	_, exists := h.clients[userID]
	h.mu.RUnlock()

	if exists {
		t.Error("expected user entry to be deleted when last client removed")
	}
}

func TestRemoveClient_MultipleClients(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := "user-remove-2"
	ch1 := make(chan SSEEvent, 1)
	ch2 := make(chan SSEEvent, 1)

	h.mu.Lock()
	h.clients[userID] = []chan SSEEvent{ch1, ch2}
	h.mu.Unlock()

	h.removeClient(userID, ch1)

	h.mu.RLock()
	channels := h.clients[userID]
	h.mu.RUnlock()

	if len(channels) != 1 {
		t.Fatalf("expected 1 remaining channel, got %d", len(channels))
	}

	// The remaining channel should be ch2.
	if channels[0] != ch2 {
		t.Error("expected ch2 to remain after removing ch1")
	}
}

func TestRemoveClient_NonexistentChannel(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := "user-remove-3"
	ch1 := make(chan SSEEvent, 1)
	ch2 := make(chan SSEEvent, 1)

	h.mu.Lock()
	h.clients[userID] = []chan SSEEvent{ch1}
	h.mu.Unlock()

	// Removing a channel that is not in the list should not panic.
	h.removeClient(userID, ch2)

	h.mu.RLock()
	channels := h.clients[userID]
	h.mu.RUnlock()

	if len(channels) != 1 {
		t.Errorf("expected 1 channel to remain, got %d", len(channels))
	}
}

// ──────────────────────────────────────────────
// SSEEvent struct
// ──────────────────────────────────────────────

func TestSSEEvent_Fields(t *testing.T) {
	event := SSEEvent{
		Type: "notification",
		Data: `{"id":"123"}`,
	}
	if event.Type != "notification" {
		t.Errorf("expected Type 'notification', got %q", event.Type)
	}
	if event.Data != `{"id":"123"}` {
		t.Errorf("expected Data '%s', got %q", `{"id":"123"}`, event.Data)
	}
}

// ──────────────────────────────────────────────
// Concurrent broadcast safety
// ──────────────────────────────────────────────

func TestBroadcast_ConcurrentSafety(t *testing.T) {
	h := NewSSEHandler(nil)
	userID := "user-concurrent"

	ch := make(chan SSEEvent, 256)
	h.mu.Lock()
	h.clients[userID] = []chan SSEEvent{ch}
	h.mu.Unlock()

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			h.Broadcast(userID, SSEEvent{Type: "ping", Data: "{}"})
		}()
	}
	wg.Wait()

	// Drain all events and count them.
	close(ch)
	count := 0
	for range ch {
		count++
	}
	if count != 50 {
		t.Errorf("expected 50 events, got %d", count)
	}
}
