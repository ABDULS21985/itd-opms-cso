package database

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TenantTx begins a transaction with the RLS session variable set for the given tenant.
// All queries within the returned transaction are scoped to the tenant by RLS policies.
// The caller must Commit() or Rollback() the transaction when done.
func TenantTx(ctx context.Context, pool *pgxpool.Pool, tenantID uuid.UUID) (pgx.Tx, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tenant tx: %w", err)
	}

	// SET LOCAL is transaction-scoped — it automatically resets when the
	// transaction ends, so the connection is clean when returned to the pool.
	_, err = tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tenantID.String())
	if err != nil {
		tx.Rollback(ctx)
		return nil, fmt.Errorf("set tenant context: %w", err)
	}

	return tx, nil
}
