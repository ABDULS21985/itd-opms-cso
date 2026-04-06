package cmdb

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
)

const (
	defaultDiscoveryScheduleInterval = 5 * time.Minute
	discoveryScheduleLockKey         = int64(82001503)
)

// DiscoveryScheduler periodically executes due discovery profiles.
type DiscoveryScheduler struct {
	svc      *DiscoveryService
	interval time.Duration
}

// NewDiscoveryScheduler creates a discovery scheduler.
func NewDiscoveryScheduler(svc *DiscoveryService, interval time.Duration) *DiscoveryScheduler {
	if interval <= 0 {
		interval = defaultDiscoveryScheduleInterval
	}
	return &DiscoveryScheduler{svc: svc, interval: interval}
}

// Start runs the scheduler loop until context cancellation.
func (s *DiscoveryScheduler) Start(ctx context.Context) {
	if s == nil || s.svc == nil {
		return
	}

	go func() {
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case t := <-ticker.C:
				triggered, err := s.svc.RunDueScheduledProfiles(ctx, t)
				if err != nil {
					slog.ErrorContext(ctx, "scheduled discovery execution failed", "error", err)
					continue
				}
				if triggered > 0 {
					slog.InfoContext(ctx, "scheduled discovery runs triggered", "count", triggered, "at", t.UTC())
				}
			}
		}
	}()
}

// RunDueScheduledProfiles executes all discovery profiles whose cron matches the current minute.
func (s *DiscoveryService) RunDueScheduledProfiles(ctx context.Context, at time.Time) (int, error) {
	scheduledAt := at.UTC().Truncate(time.Minute)

	var acquired bool
	if err := s.pool.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, discoveryScheduleLockKey).Scan(&acquired); err != nil {
		return 0, apperrors.Internal("failed to acquire discovery scheduler lock", err)
	}
	if !acquired {
		return 0, nil
	}
	defer func() {
		if _, err := s.pool.Exec(ctx, `SELECT pg_advisory_unlock($1)`, discoveryScheduleLockKey); err != nil {
			slog.Warn("failed to release discovery scheduler lock", "error", err)
		}
	}()

	rows, err := s.pool.Query(ctx,
		`SELECT id, schedule, last_run_at
		 FROM discovery_profiles
		 WHERE is_active = true
		   AND schedule IS NOT NULL
		   AND BTRIM(schedule) <> ''`,
	)
	if err != nil {
		return 0, apperrors.Internal("failed to list scheduled discovery profiles", err)
	}
	defer rows.Close()

	var triggered int
	for rows.Next() {
		var (
			profileID uuid.UUID
			schedule  string
			lastRunAt *time.Time
		)
		if err := rows.Scan(&profileID, &schedule, &lastRunAt); err != nil {
			return triggered, apperrors.Internal("failed to scan scheduled discovery profile", err)
		}

		match, err := discoveryCronMatches(schedule, scheduledAt)
		if err != nil {
			slog.WarnContext(ctx, "skipping discovery profile with unsupported schedule", "profile_id", profileID, "schedule", schedule, "error", err)
			continue
		}
		if !match {
			continue
		}
		if lastRunAt != nil && lastRunAt.UTC().Truncate(time.Minute).Equal(scheduledAt) {
			continue
		}

		if _, err := s.RunDiscovery(ctx, profileID); err != nil {
			slog.ErrorContext(ctx, "scheduled discovery run failed", "profile_id", profileID, "error", err)
			continue
		}
		triggered++
	}

	if err := rows.Err(); err != nil {
		return triggered, apperrors.Internal("failed to iterate scheduled discovery profiles", err)
	}

	return triggered, nil
}

func discoveryCronMatches(schedule string, at time.Time) (bool, error) {
	parts := strings.Fields(strings.TrimSpace(schedule))
	if len(parts) != 5 {
		return false, fmt.Errorf("unsupported cron format")
	}

	checks := []struct {
		expr    string
		value   int
		min     int
		max     int
		weekday bool
	}{
		{expr: parts[0], value: at.Minute(), min: 0, max: 59},
		{expr: parts[1], value: at.Hour(), min: 0, max: 23},
		{expr: parts[2], value: at.Day(), min: 1, max: 31},
		{expr: parts[3], value: int(at.Month()), min: 1, max: 12},
		{expr: parts[4], value: int(at.Weekday()), min: 0, max: 7, weekday: true},
	}

	for _, check := range checks {
		match, err := discoveryCronFieldMatches(check.expr, check.value, check.min, check.max, check.weekday)
		if err != nil {
			return false, err
		}
		if !match {
			return false, nil
		}
	}

	return true, nil
}

func discoveryCronFieldMatches(expr string, value, min, max int, weekday bool) (bool, error) {
	fields := strings.Split(expr, ",")
	for _, token := range fields {
		token = strings.TrimSpace(token)
		if token == "*" {
			return true, nil
		}
		if strings.HasPrefix(token, "*/") {
			step, err := strconv.Atoi(strings.TrimPrefix(token, "*/"))
			if err != nil || step <= 0 {
				return false, fmt.Errorf("invalid cron step")
			}
			if (value-min)%step == 0 {
				return true, nil
			}
			continue
		}

		n, err := strconv.Atoi(token)
		if err != nil {
			return false, fmt.Errorf("invalid cron token")
		}
		if weekday && n == 7 {
			n = 0
		}
		if n < min || n > max {
			return false, fmt.Errorf("cron value out of range")
		}
		if n == value {
			return true, nil
		}
	}

	return false, nil
}
