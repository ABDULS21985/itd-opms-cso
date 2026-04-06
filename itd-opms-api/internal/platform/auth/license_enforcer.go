package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/metrics"
)

const licenseRedisKey = "opms:license:active_count"

// ErrLicenseCapacityReached is returned when the concurrent license limit is hit.
var ErrLicenseCapacityReached = errors.New("concurrent license capacity reached")

// LicenseUtilization represents the current license usage state.
type LicenseUtilization struct {
	Current      int       `json:"current"`
	Max          int       `json:"max"`
	Ratio        float64   `json:"ratio"`
	LastSyncedAt time.Time `json:"lastSyncedAt"`
}

// LicenseEnforcer checks and enforces the maximum concurrent license limit.
// It uses a Redis counter for fast, atomic checks and periodically syncs the
// count from the database (active_sessions) for crash recovery.
type LicenseEnforcer struct {
	pool  *pgxpool.Pool
	redis *redis.Client
	cfg   config.LicenseConfig

	stopCh chan struct{}
	wg     sync.WaitGroup

	mu           sync.RWMutex
	lastSyncedAt time.Time
}

// checkAndIncrScript is a Lua script for atomic check-and-increment.
// Returns 1 if allowed (incremented), 0 if at capacity.
var checkAndIncrScript = redis.NewScript(`
local current = redis.call('GET', KEYS[1])
if current and tonumber(current) >= tonumber(ARGV[1]) then
    return 0
end
redis.call('INCR', KEYS[1])
return 1
`)

// NewLicenseEnforcer creates a new LicenseEnforcer.
func NewLicenseEnforcer(pool *pgxpool.Pool, redisClient *redis.Client, cfg config.LicenseConfig) *LicenseEnforcer {
	return &LicenseEnforcer{
		pool:   pool,
		redis:  redisClient,
		cfg:    cfg,
		stopCh: make(chan struct{}),
	}
}

// Start begins the background sync loop that periodically reconciles the
// Redis counter with the actual active_sessions count in PostgreSQL.
func (e *LicenseEnforcer) Start(ctx context.Context) {
	// Initial sync from DB to Redis.
	if err := e.SyncFromDB(ctx); err != nil {
		slog.ErrorContext(ctx, "license: initial sync failed", "error", err)
	}

	e.wg.Add(1)
	go func() {
		defer e.wg.Done()
		ticker := time.NewTicker(e.cfg.SyncInterval)
		defer ticker.Stop()

		slog.Info("license enforcer started",
			"max_concurrent", e.cfg.MaxConcurrent,
			"sync_interval", e.cfg.SyncInterval.String(),
		)

		for {
			select {
			case <-e.stopCh:
				return
			case <-ticker.C:
				if err := e.SyncFromDB(ctx); err != nil {
					slog.ErrorContext(ctx, "license: periodic sync failed", "error", err)
				}
			}
		}
	}()
}

// Stop signals the enforcer to shut down and waits.
func (e *LicenseEnforcer) Stop() {
	close(e.stopCh)
	e.wg.Wait()
}

// CheckAndIncrement atomically checks if adding one more session would
// exceed the license limit. If within capacity, it increments the counter.
// Returns ErrLicenseCapacityReached if at the limit.
func (e *LicenseEnforcer) CheckAndIncrement(ctx context.Context) error {
	result, err := checkAndIncrScript.Run(ctx, e.redis,
		[]string{licenseRedisKey},
		e.cfg.MaxConcurrent,
	).Int()
	if err != nil {
		return fmt.Errorf("license check redis lua: %w", err)
	}
	if result == 0 {
		return ErrLicenseCapacityReached
	}
	return nil
}

// Decrement reduces the active session counter by one (called on logout).
func (e *LicenseEnforcer) Decrement(ctx context.Context) {
	val, err := e.redis.Decr(ctx, licenseRedisKey).Result()
	if err != nil {
		slog.ErrorContext(ctx, "license: decrement failed", "error", err)
		return
	}
	// Guard against going negative (can happen if Redis was reset).
	if val < 0 {
		e.redis.Set(ctx, licenseRedisKey, 0, 0)
	}
}

// SyncFromDB counts active sessions in PostgreSQL and sets the Redis counter
// to match. This recovers from crashes or Redis restarts.
func (e *LicenseEnforcer) SyncFromDB(ctx context.Context) error {
	var count int
	err := e.pool.QueryRow(ctx, `SELECT COUNT(*) FROM active_sessions`).Scan(&count)
	if err != nil {
		return fmt.Errorf("count active sessions: %w", err)
	}

	if err := e.redis.Set(ctx, licenseRedisKey, count, 0).Err(); err != nil {
		return fmt.Errorf("set redis license count: %w", err)
	}

	now := time.Now().UTC()

	// Update the license_pool table.
	_, err = e.pool.Exec(ctx, `
		UPDATE license_pool
		SET current_count = $1, last_synced_at = $2, updated_at = $2
		WHERE id = 1`, count, now)
	if err != nil {
		return fmt.Errorf("update license pool: %w", err)
	}

	e.mu.Lock()
	e.lastSyncedAt = now
	e.mu.Unlock()

	// Update Prometheus gauges.
	metrics.LicenseActiveSessions.Set(float64(count))
	if e.cfg.MaxConcurrent > 0 {
		metrics.LicenseUtilizationRatio.Set(float64(count) / float64(e.cfg.MaxConcurrent))
	}

	slog.Debug("license: synced from DB", "active_sessions", count, "max", e.cfg.MaxConcurrent)
	return nil
}

// Utilization returns the current license usage for the health dashboard.
func (e *LicenseEnforcer) Utilization(ctx context.Context) (*LicenseUtilization, error) {
	count, err := e.redis.Get(ctx, licenseRedisKey).Int()
	if err != nil && !errors.Is(err, redis.Nil) {
		return nil, fmt.Errorf("get license count: %w", err)
	}

	e.mu.RLock()
	lastSync := e.lastSyncedAt
	e.mu.RUnlock()

	ratio := 0.0
	if e.cfg.MaxConcurrent > 0 {
		ratio = float64(count) / float64(e.cfg.MaxConcurrent)
	}

	return &LicenseUtilization{
		Current:      count,
		Max:          e.cfg.MaxConcurrent,
		Ratio:        ratio,
		LastSyncedAt: lastSync,
	}, nil
}
