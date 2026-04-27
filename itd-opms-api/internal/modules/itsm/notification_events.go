package itsm

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func publishITSMLifecycleEvent(
	ctx context.Context,
	js nats.JetStreamContext,
	subject string,
	eventType string,
	tenantID uuid.UUID,
	actorID uuid.UUID,
	entityType string,
	entityID uuid.UUID,
	data map[string]any,
) {
	if js == nil {
		return
	}
	if data == nil {
		data = map[string]any{}
	}
	if _, ok := data["actorId"]; !ok {
		data["actorId"] = actorID.String()
	}

	eventData, err := json.Marshal(data)
	if err != nil {
		slog.ErrorContext(ctx, "failed to serialize ITSM notification data", "event_type", eventType, "error", err)
		return
	}

	payload, err := json.Marshal(map[string]any{
		"type":          eventType,
		"tenantId":      tenantID,
		"actorId":       actorID,
		"entityType":    entityType,
		"entityId":      entityID,
		"data":          json.RawMessage(eventData),
		"correlationId": types.GetCorrelationID(ctx),
		"timestamp":     time.Now().UTC(),
	})
	if err != nil {
		slog.ErrorContext(ctx, "failed to serialize ITSM notification envelope", "event_type", eventType, "error", err)
		return
	}

	if _, err := js.Publish(subject, payload); err != nil {
		slog.ErrorContext(ctx, "failed to publish ITSM lifecycle event", "subject", subject, "event_type", eventType, "error", err)
	}
}

func notificationRecipientIDs(ids ...*uuid.UUID) []string {
	seen := map[uuid.UUID]struct{}{}
	recipients := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == nil || *id == uuid.Nil {
			continue
		}
		if _, ok := seen[*id]; ok {
			continue
		}
		seen[*id] = struct{}{}
		recipients = append(recipients, id.String())
	}
	return recipients
}

func notificationRecipientIDsFromValues(ids ...uuid.UUID) []string {
	pointers := make([]*uuid.UUID, 0, len(ids))
	for i := range ids {
		pointers = append(pointers, &ids[i])
	}
	return notificationRecipientIDs(pointers...)
}

func notificationTicketURL(id uuid.UUID) string {
	return "/dashboard/itsm/tickets/" + id.String()
}

func notificationProblemURL(id uuid.UUID) string {
	return "/dashboard/itsm/problems/" + id.String()
}

func notificationChangeURL(id uuid.UUID) string {
	return "/dashboard/itsm/changes/" + id.String()
}

func notificationServiceRequestURL(id uuid.UUID) string {
	return "/dashboard/itsm/service-catalog/my-requests/" + id.String()
}
