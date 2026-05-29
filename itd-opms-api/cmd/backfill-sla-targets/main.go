// Command backfill-sla-targets computes SLA response/resolution targets for
// open tickets that predate SLA target auto-calculation (their targets are
// NULL). It reuses the exact resolution + business-hours logic from the itsm
// module, so backfilled targets are identical to those a freshly created
// ticket would receive. The operation is idempotent and safe to re-run.
//
// Usage:
//
//	go run ./cmd/backfill-sla-targets
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/itd-cbn/itd-opms-api/internal/modules/itsm"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/database"
)

func main() {
	if err := run(); err != nil {
		slog.Error("SLA target backfill failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx := context.Background()

	pool, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	defer pool.Close()

	res, err := itsm.BackfillTicketSLATargets(ctx, pool)
	if err != nil {
		return err
	}

	slog.Info("SLA target backfill finished",
		"scanned", res.Scanned,
		"updated", res.Updated,
		"skipped_no_policy", res.NoPolicy,
		"skipped_no_targets", res.NoTargets,
	)
	fmt.Printf("Backfill complete: %d scanned, %d updated, %d skipped (no policy), %d skipped (no priority target)\n",
		res.Scanned, res.Updated, res.NoPolicy, res.NoTargets)
	return nil
}
