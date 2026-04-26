package cmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/connectors"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// MEGAService imports and exports CMDB data using the MEGA EA XML exchange format.
type MEGAService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewMEGAService creates a MEGA EA integration service.
func NewMEGAService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *MEGAService {
	return &MEGAService{pool: pool, auditSvc: auditSvc}
}

// ExportXML exports CMDB items and relationships as MEGA EA-compatible XML.
func (s *MEGAService) ExportXML(ctx context.Context, req MEGAExportRequest) ([]byte, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 1000
	}
	if limit > 5000 {
		limit = 5000
	}

	searchPattern := "%"
	if strings.TrimSpace(req.Query) != "" {
		searchPattern = "%" + strings.TrimSpace(req.Query) + "%"
	}

	rows, err := s.pool.Query(ctx, `
		SELECT `+cmdbItemColumns+`
		FROM cmdb_items
		WHERE tenant_id = $1
		  AND ($2::text IS NULL OR ci_type = $2)
		  AND ($3::text IS NULL OR status = $3)
		  AND ($4::text = '%%' OR name ILIKE $4 OR ci_type ILIKE $4 OR attributes::text ILIKE $4)
		ORDER BY name ASC
		LIMIT $5`,
		auth.TenantID, emptyToNil(req.CIType), emptyToNil(req.Status), searchPattern, limit,
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to load CMDB items for MEGA export", err)
	}
	defer rows.Close()

	items, err := scanCMDBItems(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan CMDB items for MEGA export", err)
	}

	itemIDs := make([]uuid.UUID, 0, len(items))
	externalIDs := make(map[uuid.UUID]string, len(items))
	for _, item := range items {
		itemIDs = append(itemIDs, item.ID)
		externalIDs[item.ID] = megaExternalID(item)
	}

	relationships := []CMDBRelationship{}
	if len(itemIDs) > 0 && req.IncludeRelationships {
		relRows, err := s.pool.Query(ctx, `
			SELECT `+relationshipColumns+`
			FROM cmdb_relationships
			WHERE tenant_id = $1
			  AND source_ci_id = ANY($2)
			  AND target_ci_id = ANY($2)
			ORDER BY created_at ASC`,
			auth.TenantID, itemIDs,
		)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to load CMDB relationships for MEGA export", err)
		}
		defer relRows.Close()

		relationships, err = scanCMDBRelationships(relRows)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to scan CMDB relationships for MEGA export", err)
		}
	}

	relsBySource := map[uuid.UUID][]CMDBRelationship{}
	for _, rel := range relationships {
		relsBySource[rel.SourceCIID] = append(relsBySource[rel.SourceCIID], rel)
	}

	megaItems := make([]connectors.MEGAConfigurationItem, 0, len(items))
	for _, item := range items {
		megaItem := cmdbItemToMEGA(item)
		for _, rel := range relsBySource[item.ID] {
			targetExternalID, ok := externalIDs[rel.TargetCIID]
			if !ok {
				continue
			}
			name := ""
			if rel.Description != nil {
				name = *rel.Description
			}
			megaItem.Relations = append(megaItem.Relations, connectors.MEGARelationship{
				Type:     rel.RelationshipType,
				TargetID: targetExternalID,
				Name:     name,
			})
		}
		megaItems = append(megaItems, megaItem)
	}

	data, err := connectors.ExportCIsToMEGA(megaItems)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to encode MEGA XML", err)
	}

	s.logAudit(ctx, auth, "export:mega_ea", uuid.New(), map[string]any{
		"count":                len(megaItems),
		"includeRelationships": req.IncludeRelationships,
		"ciType":               req.CIType,
		"status":               req.Status,
	})

	return data, len(megaItems), nil
}

// ValidateXML parses MEGA XML without changing CMDB state.
func (s *MEGAService) ValidateXML(ctx context.Context, reader io.Reader) (MEGAValidationResult, error) {
	if types.GetAuthContext(ctx) == nil {
		return MEGAValidationResult{}, apperrors.Unauthorized("authentication required")
	}

	items, err := connectors.ImportFromMEGA(reader)
	if err != nil {
		return MEGAValidationResult{}, apperrors.BadRequest(fmt.Sprintf("invalid MEGA XML: %v", err))
	}

	relationshipCount := 0
	for _, item := range items {
		relationshipCount += len(item.Relations)
	}

	return MEGAValidationResult{
		Valid:             true,
		ItemCount:         len(items),
		RelationshipCount: relationshipCount,
	}, nil
}

// ImportXML imports MEGA EA XML into the CMDB and upserts matching CIs.
func (s *MEGAService) ImportXML(ctx context.Context, reader io.Reader) (MEGAImportResult, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MEGAImportResult{}, apperrors.Unauthorized("authentication required")
	}

	megaItems, err := connectors.ImportFromMEGA(reader)
	if err != nil {
		return MEGAImportResult{}, apperrors.BadRequest(fmt.Sprintf("invalid MEGA XML: %v", err))
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MEGAImportResult{}, apperrors.Internal("failed to start MEGA import transaction", err)
	}
	defer tx.Rollback(ctx)

	result := MEGAImportResult{Errors: []string{}}
	externalToCIID := make(map[string]uuid.UUID, len(megaItems))

	for _, item := range megaItems {
		externalID := normalizedMEGAExternalID(item)
		if externalID == "" {
			result.Skipped++
			result.Errors = append(result.Errors, fmt.Sprintf("skipped CI %q: missing MEGA id and name", item.Name))
			continue
		}

		attrs := megaItemAttributes(item, externalID)
		attrsJSON, _ := json.Marshal(attrs)
		status := normalizeMEGAStatus(item.Status)
		ciType := strings.TrimSpace(item.CIType)
		if ciType == "" {
			ciType = "application"
		}

		existingID, lookupErr := s.findMEGACI(ctx, tx, auth.TenantID, externalID, item.Name, ciType)
		if lookupErr != nil {
			return MEGAImportResult{}, lookupErr
		}

		now := time.Now().UTC()
		if existingID == uuid.Nil {
			id := uuid.New()
			_, err := tx.Exec(ctx, `
				INSERT INTO cmdb_items (
					id, tenant_id, ci_type, name, status, attributes,
					version, created_at, updated_at
				) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $7)`,
				id, auth.TenantID, ciType, firstNonEmptyString(item.Name, externalID), status, attrsJSON, now,
			)
			if err != nil {
				return MEGAImportResult{}, apperrors.Internal("failed to create MEGA CI", err)
			}
			externalToCIID[externalID] = id
			result.Created++
			continue
		}

		_, err := tx.Exec(ctx, `
			UPDATE cmdb_items
			SET ci_type = $1,
			    name = $2,
			    status = $3,
			    attributes = COALESCE(attributes, '{}'::jsonb) || $4::jsonb,
			    version = version + 1,
			    updated_at = $5
			WHERE id = $6 AND tenant_id = $7`,
			ciType, firstNonEmptyString(item.Name, externalID), status, attrsJSON, now, existingID, auth.TenantID,
		)
		if err != nil {
			return MEGAImportResult{}, apperrors.Internal("failed to update MEGA CI", err)
		}
		externalToCIID[externalID] = existingID
		result.Updated++
	}

	for _, item := range megaItems {
		sourceID := externalToCIID[normalizedMEGAExternalID(item)]
		if sourceID == uuid.Nil {
			continue
		}

		for _, rel := range item.Relations {
			targetID := externalToCIID[strings.TrimSpace(rel.TargetID)]
			if targetID == uuid.Nil || targetID == sourceID {
				result.Skipped++
				result.Errors = append(result.Errors, fmt.Sprintf("skipped relationship from %s to %s: target CI was not imported", item.ID, rel.TargetID))
				continue
			}

			created, err := s.ensureMEGARelationship(ctx, tx, auth.TenantID, sourceID, targetID, rel)
			if err != nil {
				return MEGAImportResult{}, err
			}
			if created {
				result.RelationshipsCreated++
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return MEGAImportResult{}, apperrors.Internal("failed to commit MEGA import", err)
	}

	s.logAudit(ctx, auth, "import:mega_ea", uuid.New(), map[string]any{
		"created":              result.Created,
		"updated":              result.Updated,
		"skipped":              result.Skipped,
		"relationshipsCreated": result.RelationshipsCreated,
	})

	return result, nil
}

func (s *MEGAService) findMEGACI(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, externalID, name, ciType string) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.QueryRow(ctx, `
		SELECT id
		FROM cmdb_items
		WHERE tenant_id = $1
		  AND attributes->>'megaExternalId' = $2
		LIMIT 1`,
		tenantID, externalID,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != pgx.ErrNoRows {
		return uuid.Nil, apperrors.Internal("failed to find MEGA CI by external id", err)
	}

	if strings.TrimSpace(name) == "" {
		return uuid.Nil, nil
	}

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM cmdb_items
		WHERE tenant_id = $1
		  AND lower(name) = lower($2)
		  AND ci_type = $3
		LIMIT 1`,
		tenantID, name, ciType,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err == pgx.ErrNoRows {
		return uuid.Nil, nil
	}
	return uuid.Nil, apperrors.Internal("failed to find MEGA CI by name", err)
}

func (s *MEGAService) ensureMEGARelationship(ctx context.Context, tx pgx.Tx, tenantID, sourceID, targetID uuid.UUID, rel connectors.MEGARelationship) (bool, error) {
	relationshipType := normalizeMEGARelationshipType(rel.Type)

	var exists bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM cmdb_relationships
			WHERE tenant_id = $1
			  AND source_ci_id = $2
			  AND target_ci_id = $3
			  AND relationship_type = $4
		)`,
		tenantID, sourceID, targetID, relationshipType,
	).Scan(&exists); err != nil {
		return false, apperrors.Internal("failed to check MEGA relationship", err)
	}
	if exists {
		return false, nil
	}

	description := strings.TrimSpace(rel.Name)
	var descriptionPtr *string
	if description != "" {
		descriptionPtr = &description
	}

	_, err := tx.Exec(ctx, `
		INSERT INTO cmdb_relationships (
			id, tenant_id, source_ci_id, target_ci_id,
			relationship_type, description, is_active, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
		uuid.New(), tenantID, sourceID, targetID, relationshipType, descriptionPtr, time.Now().UTC(),
	)
	if err != nil {
		return false, apperrors.Internal("failed to create MEGA relationship", err)
	}
	return true, nil
}

func (s *MEGAService) logAudit(ctx context.Context, auth *types.AuthContext, action string, entityID uuid.UUID, payload map[string]any) {
	changes, _ := json.Marshal(payload)
	if err := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     action,
		EntityType: "mega_ea_integration",
		EntityID:   entityID,
		Changes:    changes,
	}); err != nil {
		slog.ErrorContext(ctx, "failed to log MEGA EA audit event", "error", err)
	}
}

func cmdbItemToMEGA(item CMDBItem) connectors.MEGAConfigurationItem {
	attrs := map[string]any{}
	if len(item.Attributes) > 0 {
		_ = json.Unmarshal(item.Attributes, &attrs)
	}

	osName := attrString(attrs, "osName", "os_name")
	osVersion := attrString(attrs, "osVersion", "os_version")
	var osInfo *connectors.MEGAOperatingSystem
	if osName != "" || osVersion != "" {
		osInfo = &connectors.MEGAOperatingSystem{Name: osName, Version: osVersion}
	}

	return connectors.MEGAConfigurationItem{
		ID:           megaExternalID(item),
		Name:         item.Name,
		Description:  attrString(attrs, "description", "megaDescription"),
		CIType:       item.CIType,
		Status:       item.Status,
		Environment:  attrString(attrs, "environment", "Environment"),
		Owner:        attrString(attrs, "owner", "Owner"),
		Criticality:  attrString(attrs, "criticality", "Criticality"),
		IPAddress:    attrString(attrs, "ipAddress", "ip_address", "IPAddress"),
		MACAddress:   attrString(attrs, "macAddress", "mac_address", "MACAddress"),
		Manufacturer: attrString(attrs, "manufacturer", "Manufacturer"),
		Model:        attrString(attrs, "model", "Model"),
		SerialNumber: attrString(attrs, "serialNumber", "serial_number", "SerialNumber"),
		OS:           osInfo,
		Location:     attrString(attrs, "location", "Location"),
		Department:   attrString(attrs, "department", "Department"),
		Attributes:   megaAttributesFromMap(attrs),
		ExportedAt:   time.Now().UTC().Format(time.RFC3339),
	}
}

func megaExternalID(item CMDBItem) string {
	attrs := map[string]any{}
	if len(item.Attributes) > 0 {
		_ = json.Unmarshal(item.Attributes, &attrs)
	}
	if externalID := attrString(attrs, "megaExternalId", "mega_external_id"); externalID != "" {
		return externalID
	}
	return item.ID.String()
}

func megaItemAttributes(item connectors.MEGAConfigurationItem, externalID string) map[string]any {
	custom := map[string]string{}
	for _, attr := range item.Attributes {
		if strings.TrimSpace(attr.Name) == "" {
			continue
		}
		custom[attr.Name] = attr.Value
	}

	attrs := map[string]any{
		"source":         "mega_ea",
		"megaExternalId": externalID,
		"megaExportedAt": item.ExportedAt,
		"description":    item.Description,
		"environment":    item.Environment,
		"owner":          item.Owner,
		"criticality":    item.Criticality,
		"ipAddress":      item.IPAddress,
		"macAddress":     item.MACAddress,
		"manufacturer":   item.Manufacturer,
		"model":          item.Model,
		"serialNumber":   item.SerialNumber,
		"location":       item.Location,
		"department":     item.Department,
		"megaAttributes": custom,
	}
	if item.OS != nil {
		attrs["osName"] = item.OS.Name
		attrs["osVersion"] = item.OS.Version
	}
	return attrs
}

func normalizedMEGAExternalID(item connectors.MEGAConfigurationItem) string {
	if strings.TrimSpace(item.ID) != "" {
		return strings.TrimSpace(item.ID)
	}
	if strings.TrimSpace(item.Name) == "" {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(item.CIType) + ":" + strings.TrimSpace(item.Name))
}

func normalizeMEGAStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "inactive", "disabled":
		return CIStatusInactive
	case "planned", "proposed":
		return CIStatusPlanned
	case "decommissioned", "retired", "disposed":
		return CIStatusDecommissioned
	default:
		return CIStatusActive
	}
}

func normalizeMEGARelationshipType(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")

	switch normalized {
	case CIRelationshipRunsOn, "hosted_on", "deployed_on":
		return CIRelationshipRunsOn
	case CIRelationshipConnectedTo, "connected", "network_link":
		return CIRelationshipConnectedTo
	case CIRelationshipManagedBy, "owned_by", "supported_by":
		return CIRelationshipManagedBy
	case CIRelationshipContains, "parent_of", "includes":
		return CIRelationshipContains
	case CIRelationshipUses, "consumes":
		return CIRelationshipUses
	default:
		return CIRelationshipDependsOn
	}
}

func attrString(attrs map[string]any, keys ...string) string {
	for _, key := range keys {
		if value, ok := attrs[key]; ok && value != nil {
			if text := strings.TrimSpace(fmt.Sprintf("%v", value)); text != "" {
				return text
			}
		}
	}
	return ""
}

func megaAttributesFromMap(attrs map[string]any) []connectors.MEGAAttribute {
	excluded := map[string]struct{}{
		"megaExternalId": {}, "mega_external_id": {}, "source": {}, "megaExportedAt": {},
		"description": {}, "megaDescription": {}, "environment": {}, "Environment": {},
		"owner": {}, "Owner": {}, "criticality": {}, "Criticality": {},
		"ipAddress": {}, "ip_address": {}, "IPAddress": {},
		"macAddress": {}, "mac_address": {}, "MACAddress": {},
		"manufacturer": {}, "Manufacturer": {}, "model": {}, "Model": {},
		"serialNumber": {}, "serial_number": {}, "SerialNumber": {},
		"osName": {}, "os_name": {}, "osVersion": {}, "os_version": {},
		"location": {}, "Location": {}, "department": {}, "Department": {},
		"megaAttributes": {},
	}

	var out []connectors.MEGAAttribute
	for key, value := range attrs {
		if _, skip := excluded[key]; skip || value == nil {
			continue
		}
		out = append(out, connectors.MEGAAttribute{
			Name:  key,
			Value: fmt.Sprintf("%v", value),
		})
	}
	if nested, ok := attrs["megaAttributes"].(map[string]any); ok {
		for key, value := range nested {
			out = append(out, connectors.MEGAAttribute{Name: key, Value: fmt.Sprintf("%v", value)})
		}
	}
	return out
}

func emptyToNil(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	trimmed := strings.TrimSpace(value)
	return &trimmed
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
