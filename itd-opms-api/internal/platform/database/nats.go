package database

import (
	"fmt"
	"log/slog"

	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

// NewNATSConnection creates a new NATS connection with JetStream.
func NewNATSConnection(cfg config.NATSConfig) (*nats.Conn, nats.JetStreamContext, error) {
	nc, err := nats.Connect(cfg.URL,
		nats.Name("itd-opms-api"),
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(-1),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("connect to NATS: %w", err)
	}

	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		return nil, nil, fmt.Errorf("create JetStream context: %w", err)
	}

	// Ensure core streams exist
	streams := []struct {
		name     string
		subjects []string
	}{
		{name: "AUDIT", subjects: []string{"audit.>"}},
		{name: "NOTIFICATIONS", subjects: []string{"notify.>"}},
		{name: "WORKFLOW", subjects: []string{"workflow.>"}},
	}

	for _, s := range streams {
		_, err := js.AddStream(&nats.StreamConfig{
			Name:     s.name,
			Subjects: s.subjects,
			Storage:  nats.FileStorage,
		})
		if err != nil {
			slog.Warn("stream may already exist", "stream", s.name, "error", err)
		}
	}

	slog.Info("connected to NATS JetStream", "url", cfg.URL)
	return nc, js, nil
}
