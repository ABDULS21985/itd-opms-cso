package system

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"runtime"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// appStartTime records when the application started for uptime calculation.
var appStartTime = time.Now()

// HealthService provides platform health checks, system statistics, and
// directory sync status.
type HealthService struct {
	pool  *pgxpool.Pool
	redis *redis.Client
	nats  *nats.Conn
	minio *minio.Client
}

// NewHealthService creates a new HealthService. Infrastructure dependencies
// may be nil — the service will report them as "down".
func NewHealthService(pool *pgxpool.Pool, redisClient *redis.Client, natsConn *nats.Conn, minioClient *minio.Client) *HealthService {
	return &HealthService{
		pool:  pool,
		redis: redisClient,
		nats:  natsConn,
		minio: minioClient,
	}
}

// ──────────────────────────────────────────────
// Platform Health
// ──────────────────────────────────────────────

// GetPlatformHealth checks all services and returns a comprehensive health report.
func (s *HealthService) GetPlatformHealth(ctx context.Context) *PlatformHealth {
	services := make([]ServiceHealth, 0, 4)
	overall := "healthy"

	pgHealth := s.checkPostgres(ctx)
	services = append(services, pgHealth)
	if pgHealth.Status != "up" {
		overall = "unhealthy"
	}

	redisHealth := s.checkRedis(ctx)
	services = append(services, redisHealth)
	if redisHealth.Status == "down" && overall != "unhealthy" {
		overall = "degraded"
	}

	natsHealth := s.checkNATS()
	services = append(services, natsHealth)
	if natsHealth.Status == "down" && overall != "unhealthy" {
		overall = "degraded"
	}

	minioHealth := s.checkMinIO(ctx)
	services = append(services, minioHealth)
	if minioHealth.Status == "down" && overall != "unhealthy" {
		overall = "degraded"
	}

	return &PlatformHealth{
		Status:    overall,
		Uptime:    time.Since(appStartTime).Truncate(time.Second).String(),
		Version:   "0.1.0",
		GoVersion: runtime.Version(),
		Services:  services,
		Timestamp: time.Now(),
	}
}

func (s *HealthService) checkPostgres(ctx context.Context) ServiceHealth {
	if s.pool == nil {
		return ServiceHealth{Name: "postgres", Status: "down", Details: "pool not configured"}
	}
	start := time.Now()
	err := s.pool.Ping(ctx)
	latency := time.Since(start)

	if err != nil {
		return ServiceHealth{Name: "postgres", Status: "down", Latency: latency.String(), Details: err.Error()}
	}

	stat := s.pool.Stat()
	return ServiceHealth{
		Name:    "postgres",
		Status:  "up",
		Latency: latency.String(),
		Details: fmt.Sprintf("conns: %d/%d idle: %d", stat.AcquiredConns(), stat.MaxConns(), stat.IdleConns()),
	}
}

func (s *HealthService) checkRedis(ctx context.Context) ServiceHealth {
	if s.redis == nil {
		return ServiceHealth{Name: "redis", Status: "down", Details: "not configured"}
	}
	start := time.Now()
	err := s.redis.Ping(ctx).Err()
	latency := time.Since(start)

	if err != nil {
		return ServiceHealth{Name: "redis", Status: "down", Latency: latency.String(), Details: err.Error()}
	}
	return ServiceHealth{Name: "redis", Status: "up", Latency: latency.String()}
}

func (s *HealthService) checkNATS() ServiceHealth {
	if s.nats == nil {
		return ServiceHealth{Name: "nats", Status: "down", Details: "not configured"}
	}
	if s.nats.IsConnected() {
		return ServiceHealth{Name: "nats", Status: "up"}
	}
	return ServiceHealth{Name: "nats", Status: "down", Details: "not connected"}
}

func (s *HealthService) checkMinIO(ctx context.Context) ServiceHealth {
	if s.minio == nil {
		return ServiceHealth{Name: "minio", Status: "down", Details: "not configured"}
	}
	start := time.Now()
	_, err := s.minio.ListBuckets(ctx)
	latency := time.Since(start)

	if err != nil {
		return ServiceHealth{Name: "minio", Status: "down", Latency: latency.String(), Details: err.Error()}
	}
	return ServiceHealth{Name: "minio", Status: "up", Latency: latency.String()}
}

// ──────────────────────────────────────────────
// System Statistics
// ──────────────────────────────────────────────

// GetSystemStats aggregates cross-module statistics.
func (s *HealthService) GetSystemStats(ctx context.Context) (*SystemStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, fmt.Errorf("authentication required")
	}
	tenantID := auth.TenantID

	stats := &SystemStats{
		Sessions: SessionStats{ByDevice: map[string]int{}},
	}

	// User stats.
	var totalUsers, activeUsers, inactiveUsers, newThisMonth int64
	err := s.pool.QueryRow(ctx,
		`SELECT
			(SELECT COUNT(*) FROM users WHERE tenant_id = $1) AS total_users,
			(SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true) AS active_users,
			(SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = false) AS inactive_users,
			(SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)) AS new_this_month`,
		tenantID,
	).Scan(&totalUsers, &activeUsers, &inactiveUsers, &newThisMonth)
	if err != nil {
		slog.Error("failed to get user stats", "error", err)
	}
	stats.Users = UserStats{
		TotalUsers:    int(totalUsers),
		ActiveUsers:   int(activeUsers),
		InactiveUsers: int(inactiveUsers),
		NewThisMonth:  int(newThisMonth),
	}

	// Online count (distinct users active in last 15 min).
	var onlineCount int64
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(DISTINCT actor_id) FROM audit_log WHERE created_at > NOW() - INTERVAL '15 minutes'`,
	).Scan(&onlineCount)
	stats.Users.OnlineNow = int(onlineCount)

	// Audit stats.
	var totalEvents int64
	var eventsToday, eventsThisWeek int
	err = s.pool.QueryRow(ctx,
		`SELECT
			(SELECT COUNT(*) FROM audit_log),
			(SELECT COUNT(*)::int FROM audit_log WHERE created_at >= CURRENT_DATE),
			(SELECT COUNT(*)::int FROM audit_log WHERE created_at >= date_trunc('week', CURRENT_DATE))`,
	).Scan(&totalEvents, &eventsToday, &eventsThisWeek)
	if err != nil {
		slog.Error("failed to get audit stats", "error", err)
	}
	stats.AuditEvents = AuditStats{
		TotalEvents:     totalEvents,
		EventsToday:     eventsToday,
		EventsThisWeek:  eventsThisWeek,
		IntegrityStatus: "unverified",
	}

	// Database stats.
	var dbSize string
	_ = s.pool.QueryRow(ctx, `SELECT pg_size_pretty(pg_database_size(current_database()))`).Scan(&dbSize)

	var tableCount int
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
	).Scan(&tableCount)

	var activeConns, maxConns int
	_ = s.pool.QueryRow(ctx,
		`SELECT
			(SELECT COUNT(*)::int FROM pg_stat_activity WHERE state = 'active'),
			(SELECT setting::int FROM pg_settings WHERE name = 'max_connections')`,
	).Scan(&activeConns, &maxConns)

	stats.Database = DatabaseStats{
		Size:              dbSize,
		TableCount:        tableCount,
		ActiveConnections: activeConns,
		MaxConnections:    maxConns,
	}

	// Module stats.
	rows, err := s.pool.Query(ctx,
		`SELECT module_name, record_count, active_items, last_activity FROM (
			SELECT 'tickets'::text AS module_name, COUNT(*) AS record_count,
				COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled'))::int AS active_items,
				MAX(updated_at) AS last_activity FROM tickets WHERE tenant_id = $1
			UNION ALL
			SELECT 'assets', COUNT(*), COUNT(*) FILTER (WHERE status = 'active')::int, MAX(updated_at) FROM assets WHERE tenant_id = $1
			UNION ALL
			SELECT 'projects', COUNT(*), COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled'))::int, MAX(updated_at) FROM projects WHERE tenant_id = $1
			UNION ALL
			SELECT 'policies', COUNT(*), COUNT(*) FILTER (WHERE status = 'active')::int, MAX(updated_at) FROM policies WHERE tenant_id = $1
			UNION ALL
			SELECT 'risks', COUNT(*), COUNT(*) FILTER (WHERE status = 'open')::int, MAX(updated_at) FROM risks WHERE tenant_id = $1
			UNION ALL
			SELECT 'articles', COUNT(*), COUNT(*) FILTER (WHERE status = 'published')::int, MAX(updated_at) FROM kb_articles WHERE tenant_id = $1
		) AS module_stats ORDER BY module_name`,
		tenantID,
	)
	if err != nil {
		slog.Error("failed to get module stats", "error", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var m ModuleStats
			if err := rows.Scan(&m.Name, &m.RecordCount, &m.ActiveItems, &m.LastActivity); err != nil {
				slog.Error("failed to scan module stat", "error", err)
				continue
			}
			stats.Modules = append(stats.Modules, m)
		}
	}
	if stats.Modules == nil {
		stats.Modules = []ModuleStats{}
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// Directory Sync Status
// ──────────────────────────────────────────────

// GetDirectorySyncStatus returns the current directory sync status and recent history.
func (s *HealthService) GetDirectorySyncStatus(ctx context.Context, page, pageSize int) (*DirectorySyncStatus, int64, error) {
	status := &DirectorySyncStatus{
		Enabled:     false,
		SyncHistory: []SyncRun{},
	}

	// Check if directory sync is configured (NATS presence is a reasonable proxy).
	if s.nats != nil {
		status.Enabled = true
	}

	// Get latest sync run.
	var latest SyncRun
	var errorDetails string
	err := s.pool.QueryRow(ctx,
		`SELECT id, started_at, completed_at, users_created, users_updated, users_deactivated,
				COALESCE(jsonb_array_length(errors), 0)::int, errors::text, status
		 FROM directory_sync_runs ORDER BY started_at DESC LIMIT 1`,
	).Scan(&latest.ID, &latest.StartedAt, &latest.CompletedAt,
		&latest.UsersAdded, &latest.UsersUpdated, &latest.UsersRemoved,
		&latest.Errors, &errorDetails, &latest.Status)

	if err == nil {
		status.LastSync = &latest.StartedAt
		status.LastSyncStatus = latest.Status
		status.UsersAdded = latest.UsersAdded
		status.UsersUpdated = latest.UsersUpdated
		status.UsersRemoved = latest.UsersRemoved
	}

	// Count total.
	var total int64
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM directory_sync_runs`).Scan(&total)

	// Get paginated history.
	offset := (page - 1) * pageSize
	rows, err := s.pool.Query(ctx,
		`SELECT id, started_at, completed_at, users_created, users_updated, users_deactivated,
				COALESCE(jsonb_array_length(errors), 0)::int, errors::text, status
		 FROM directory_sync_runs ORDER BY started_at DESC LIMIT $1 OFFSET $2`,
		pageSize, offset,
	)
	if err != nil {
		return status, total, nil
	}
	defer rows.Close()

	for rows.Next() {
		var run SyncRun
		var errDet string
		if err := rows.Scan(&run.ID, &run.StartedAt, &run.CompletedAt,
			&run.UsersAdded, &run.UsersUpdated, &run.UsersRemoved,
			&run.Errors, &errDet, &run.Status); err != nil {
			continue
		}
		// Parse error count from JSON array.
		var errArr []json.RawMessage
		if json.Unmarshal([]byte(errDet), &errArr) == nil && len(errArr) > 0 {
			run.ErrorDetails = errDet
		}
		status.SyncHistory = append(status.SyncHistory, run)
	}

	return status, total, nil
}
