package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// OrgScope holds the resolved organizational scope for a user.
type OrgScope struct {
	OrgUnitID     uuid.UUID   // User's direct org unit assignment
	OrgLevel      string      // Level of the user's org unit (e.g. "division", "office")
	VisibleOrgIDs []uuid.UUID // All org_unit_ids this user can see
	IsGlobalScope bool        // True if user has global/auditor/director bypass
}

// ResolveOrgScope computes the full set of org_unit_ids visible to a user
// based on their org_unit_id, role bindings (scope_type/scope_id), and
// active delegations. Uses the org_hierarchy closure table for traversal.
func ResolveOrgScope(ctx context.Context, pool *pgxpool.Pool, userID, tenantID uuid.UUID) (*OrgScope, error) {
	scope := &OrgScope{}

	// 1. Get user's own org_unit_id and its level.
	var orgUnitID *uuid.UUID
	var orgLevel *string
	err := pool.QueryRow(ctx, `
		SELECT u.org_unit_id, o.level::text
		FROM users u
		LEFT JOIN org_units o ON o.id = u.org_unit_id
		WHERE u.id = $1`,
		userID,
	).Scan(&orgUnitID, &orgLevel)
	if err != nil {
		return nil, fmt.Errorf("resolve user org unit: %w", err)
	}

	if orgUnitID != nil {
		scope.OrgUnitID = *orgUnitID
	}
	if orgLevel != nil {
		scope.OrgLevel = *orgLevel
	}

	// 2. Check for global bypass roles.
	var hasGlobal bool
	err = pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM role_bindings rb
			JOIN roles r ON r.id = rb.role_id
			WHERE rb.user_id = $1
			  AND rb.is_active = true
			  AND (rb.expires_at IS NULL OR rb.expires_at > NOW())
			  AND (r.name IN ('global_admin', 'auditor', 'itd_director')
			       OR rb.scope_type = 'global')
		)`, userID,
	).Scan(&hasGlobal)
	if err != nil {
		return nil, fmt.Errorf("check global scope: %w", err)
	}
	scope.IsGlobalScope = hasGlobal

	if hasGlobal {
		// Global users don't need a visible IDs list — they bypass filtering.
		return scope, nil
	}

	// 3. Resolve visible org_unit_ids via the SQL function.
	rows, err := pool.Query(ctx,
		`SELECT org_unit_id FROM fn_resolve_visible_org_units($1, $2)`,
		userID, tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("resolve visible org units: %w", err)
	}
	defer rows.Close()

	seen := make(map[uuid.UUID]bool)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan visible org unit: %w", err)
		}
		if !seen[id] {
			scope.VisibleOrgIDs = append(scope.VisibleOrgIDs, id)
			seen[id] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate visible org units: %w", err)
	}

	// Ensure user's own org unit is always included.
	if scope.OrgUnitID != uuid.Nil && !seen[scope.OrgUnitID] {
		scope.VisibleOrgIDs = append(scope.VisibleOrgIDs, scope.OrgUnitID)
	}

	return scope, nil
}
