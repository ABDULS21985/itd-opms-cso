package types

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// ScopedQuery helps build SQL queries with both tenant and org-scope filtering.
// It manages parameter indices automatically.
//
// Usage:
//
//	sq := types.NewScopedQuery(auth)
//	whereClause := sq.Where()               // "tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"
//	statusParam := sq.AddParam(statusValue)  // "$3"
//	query := fmt.Sprintf("SELECT * FROM tickets WHERE %s AND status = %s", whereClause, statusParam)
//	rows, err := pool.Query(ctx, query, sq.Args()...)
type ScopedQuery struct {
	auth       *AuthContext
	args       []interface{}
	nextIdx    int
	orgClause  string
	orgColName string
}

// NewScopedQuery creates a ScopedQuery that enforces tenant and org scope.
// The orgColumn parameter specifies the column name for org filtering (e.g., "org_unit_id").
// Pass empty string to skip org filtering for this query.
func NewScopedQuery(auth *AuthContext, orgColumn string) *ScopedQuery {
	sq := &ScopedQuery{
		auth:       auth,
		nextIdx:    1,
		orgColName: orgColumn,
	}

	// Always add tenant filter as $1.
	sq.args = append(sq.args, auth.TenantID)
	sq.nextIdx = 2

	// Build org scope clause.
	if orgColumn != "" && !auth.IsGlobalScope {
		visibleIDs := auth.OrgScopeFilter()
		if len(visibleIDs) > 0 {
			sq.args = append(sq.args, visibleIDs)
			sq.orgClause = fmt.Sprintf("(%s = ANY($%d) OR %s IS NULL)", orgColumn, sq.nextIdx, orgColumn)
			sq.nextIdx++
		} else {
			// No visible orgs and not global — only show records with NULL org_unit_id
			// (backward compat: unscoped records remain visible).
			sq.orgClause = fmt.Sprintf("%s IS NULL", orgColumn)
		}
	}

	return sq
}

// Where returns the complete WHERE clause (without the "WHERE" keyword).
// Example: "tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"
func (sq *ScopedQuery) Where() string {
	parts := []string{"tenant_id = $1"}
	if sq.orgClause != "" {
		parts = append(parts, sq.orgClause)
	}
	return strings.Join(parts, " AND ")
}

// TenantOnly returns just the tenant filter clause.
func (sq *ScopedQuery) TenantOnly() string {
	return "tenant_id = $1"
}

// AddParam adds a parameter and returns its placeholder string (e.g. "$3").
func (sq *ScopedQuery) AddParam(value interface{}) string {
	sq.args = append(sq.args, value)
	placeholder := fmt.Sprintf("$%d", sq.nextIdx)
	sq.nextIdx++
	return placeholder
}

// Args returns all accumulated query parameters.
func (sq *ScopedQuery) Args() []interface{} {
	return sq.args
}

// NextParamIndex returns the next available parameter index.
func (sq *ScopedQuery) NextParamIndex() int {
	return sq.nextIdx
}

// OrgFilterClause returns just the org scope part of the filter, or empty string
// if the user has global scope or no org column was specified.
func (sq *ScopedQuery) OrgFilterClause() string {
	return sq.orgClause
}

// BuildOrgFilter is a standalone helper that returns an org-scope SQL clause and
// its parameter for embedding in existing queries. Returns empty string and nil
// if the user has global scope (caller should skip the filter).
//
// Usage:
//
//	clause, param := types.BuildOrgFilter(auth, "t.org_unit_id", 3)
//	if clause != "" {
//	    query += " AND " + clause
//	    args = append(args, param)
//	}
func BuildOrgFilter(auth *AuthContext, columnExpr string, paramIndex int) (string, interface{}) {
	if auth.IsGlobalScope {
		return "", nil
	}
	visibleIDs := auth.OrgScopeFilter()
	if len(visibleIDs) > 0 {
		clause := fmt.Sprintf("(%s = ANY($%d) OR %s IS NULL)", columnExpr, paramIndex, columnExpr)
		return clause, uuidSlice(visibleIDs)
	}
	// No visible orgs — only show NULL org_unit records.
	return fmt.Sprintf("%s IS NULL", columnExpr), nil
}

// uuidSlice converts []uuid.UUID for use as a pgx array parameter.
func uuidSlice(ids []uuid.UUID) []uuid.UUID {
	return ids
}
