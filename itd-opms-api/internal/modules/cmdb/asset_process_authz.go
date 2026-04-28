package cmdb

import (
	"fmt"

	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const (
	assistantITFacilitiesSpecialistRole = "assistant_it_facilities_specialist"
	itFacilitiesSpecialistRole          = "it_facilities_specialist"
	seniorITFacilitiesSpecialistRole    = "senior_it_facilities_specialist"
	itFacilitiesLeadRole                = "it_facilities_lead"
	assetDisposalCommitteeRole          = "asset_disposal_committee"
	inventoryOfficerRole                = "inventory_officer"
)

func isAssetProcessPrivileged(auth *types.AuthContext) bool {
	if auth == nil {
		return false
	}
	return auth.HasPermission("*") ||
		auth.HasRole("admin") ||
		auth.HasRole("tenant_admin") ||
		auth.HasRole("global_admin")
}

func hasAssetProcessResponsibility(auth *types.AuthContext) bool {
	if isAssetProcessPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(assistantITFacilitiesSpecialistRole) ||
		auth.HasRole(itFacilitiesSpecialistRole) ||
		auth.HasRole(seniorITFacilitiesSpecialistRole) ||
		auth.HasRole(itFacilitiesLeadRole) ||
		auth.HasRole(inventoryOfficerRole) ||
		auth.HasPermission("cmdb.asset_process.manage")
}

func hasAssetProcessAccountability(auth *types.AuthContext) bool {
	if isAssetProcessPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(itFacilitiesLeadRole) ||
		auth.HasRole(seniorITFacilitiesSpecialistRole) ||
		auth.HasRole(assetDisposalCommitteeRole) ||
		auth.HasPermission("cmdb.asset_process.approve")
}

func ensureAssetProcessResponsibility(auth *types.AuthContext, action string) error {
	if hasAssetProcessResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires Assistant IT Facilities Specialist, IT Facilities Specialist, Inventory Officer, or IT Facilities Lead responsibility", action))
}

func ensureAssetProcessAccountability(auth *types.AuthContext, action string) error {
	if hasAssetProcessAccountability(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires IT Facilities Lead, Senior IT Facilities Specialist, or Asset Disposal Committee accountability", action))
}

func ensureAssetProcessTransitionResponsibility(auth *types.AuthContext, targetStatus string) error {
	switch targetStatus {
	case workflow.AssetProcessApprovalReview,
		workflow.AssetProcessBuybackApproval,
		workflow.AssetProcessDataWipe,
		workflow.AssetProcessDegaussingReported,
		workflow.AssetProcessManagementReported:
		if hasAssetProcessResponsibility(auth) || hasAssetProcessAccountability(auth) {
			return nil
		}
		return ensureAssetProcessAccountability(auth, "asset process transition")
	case workflow.AssetProcessRejected,
		workflow.AssetProcessCancelled:
		return ensureAssetProcessAccountability(auth, "asset process rejection or cancellation")
	default:
		return ensureAssetProcessResponsibility(auth, "asset process transition")
	}
}
