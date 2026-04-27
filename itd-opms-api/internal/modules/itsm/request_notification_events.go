package itsm

import (
	"context"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func (s *RequestService) publishServiceRequestEvent(
	ctx context.Context,
	auth *types.AuthContext,
	request ServiceRequest,
	previousStatus string,
	newStatus string,
	eventType string,
	comment *string,
) {
	publishITSMLifecycleEvent(
		ctx,
		s.js,
		"notify."+eventType,
		eventType,
		auth.TenantID,
		auth.UserID,
		"service_request",
		request.ID,
		map[string]any{
			"requestId":       request.ID.String(),
			"requestNumber":   request.RequestNumber,
			"catalogItemId":   request.CatalogItemID.String(),
			"catalogItemName": request.CatalogItemName,
			"previousStatus":  previousStatus,
			"newStatus":       newStatus,
			"comment":         comment,
			"requesterId":     request.RequesterID.String(),
			"assignedTo":      uuidStringPtr(request.AssignedTo),
			"recipientIds":    notificationRecipientIDs(&request.RequesterID, request.AssignedTo),
			"actionUrl":       notificationServiceRequestURL(request.ID),
		},
	)
}
