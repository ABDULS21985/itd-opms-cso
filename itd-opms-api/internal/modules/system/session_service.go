package system

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// SessionService
// ──────────────────────────────────────────────

// SessionService handles business logic for session management.
type SessionService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewSessionService creates a new SessionService.
func NewSessionService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *SessionService {
	return &SessionService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanActiveSession(row pgx.Row) (ActiveSession, error) {
	var s ActiveSession
	err := row.Scan(
		&s.ID, &s.UserID, &s.UserName, &s.UserEmail,
		&s.TenantID, &s.IPAddress, &s.UserAgent, &s.DeviceInfo,
		&s.Location, &s.CreatedAt, &s.LastActive, &s.ExpiresAt, &s.IsRevoked,
	)
	return s, err
}

func scanActiveSessions(rows pgx.Rows) ([]ActiveSession, error) {
	var sessions []ActiveSession
	for rows.Next() {
		s, err := scanActiveSession(rows)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if sessions == nil {
		sessions = []ActiveSession{}
	}
	return sessions, nil
}

// ──────────────────────────────────────────────
// Session Operations
// ──────────────────────────────────────────────

// ListSessions returns paginated active sessions for a tenant.
func (s *SessionService) ListSessions(ctx context.Context, tenantID uuid.UUID, page, pageSize int) ([]ActiveSession, int64, error) {
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT s.id, s.user_id,
		       COALESCE(u.display_name, '') AS user_name,
		       COALESCE(u.email, '') AS user_email,
		       s.tenant_id,
		       COALESCE(s.ip_address::text, '') AS ip_address,
		       COALESCE(s.user_agent, '') AS user_agent,
		       COALESCE(s.device_info, '{}') AS device_info,
		       COALESCE(s.location, '') AS location,
		       s.created_at, s.last_active, s.expires_at, s.is_revoked
		FROM active_sessions s
		LEFT JOIN users u ON u.id = s.user_id
		WHERE s.tenant_id = $1
		  AND NOT s.is_revoked
		  AND s.expires_at > NOW()
		ORDER BY s.last_active DESC
		LIMIT $2 OFFSET $3`

	rows, err := s.pool.Query(ctx, query, tenantID, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	sessions, err := scanActiveSessions(rows)
	if err != nil {
		return nil, 0, err
	}

	var total int64
	err = s.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM active_sessions WHERE tenant_id = $1 AND NOT is_revoked AND expires_at > NOW()",
		tenantID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count sessions: %w", err)
	}

	return sessions, total, nil
}

// GetSessionStats returns session statistics for a tenant.
func (s *SessionService) GetSessionStats(ctx context.Context, tenantID uuid.UUID) (*SessionStats, error) {
	stats := &SessionStats{
		ByDevice: make(map[string]int),
	}

	// Get active session count and unique user count.
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(DISTINCT user_id)
		FROM active_sessions
		WHERE tenant_id = $1 AND NOT is_revoked AND expires_at > NOW()`,
		tenantID,
	).Scan(&stats.ActiveSessions, &stats.UniqueUsers)
	if err != nil {
		return nil, fmt.Errorf("get session stats: %w", err)
	}

	// Get device breakdown.
	rows, err := s.pool.Query(ctx, `
		SELECT COALESCE(device_info->>'device', 'unknown') AS device, COUNT(*)
		FROM active_sessions
		WHERE tenant_id = $1 AND NOT is_revoked AND expires_at > NOW()
		GROUP BY device`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("get session device stats: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var device string
		var count int
		if err := rows.Scan(&device, &count); err != nil {
			return nil, fmt.Errorf("scan device stat: %w", err)
		}
		stats.ByDevice[device] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate device stats: %w", err)
	}

	return stats, nil
}

// RevokeSession revokes a single session by ID.
func (s *SessionService) RevokeSession(ctx context.Context, sessionID uuid.UUID, revokedBy uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Check session exists.
	var exists bool
	err := s.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM active_sessions WHERE id = $1 AND NOT is_revoked)",
		sessionID,
	).Scan(&exists)
	if err != nil {
		return fmt.Errorf("check session: %w", err)
	}
	if !exists {
		return apperrors.NotFound("session", sessionID.String())
	}

	// Revoke the session.
	_, err = s.pool.Exec(ctx, `
		UPDATE active_sessions
		SET is_revoked = true, revoked_at = NOW(), revoked_by = $2
		WHERE id = $1 AND NOT is_revoked`,
		sessionID, revokedBy,
	)
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}

	changes, _ := json.Marshal(map[string]string{"sessionId": sessionID.String()})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "session.revoked",
		EntityType:    "session",
		EntityID:      sessionID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// RevokeUserSessions revokes all active sessions for a specific user.
func (s *SessionService) RevokeUserSessions(ctx context.Context, tenantID, userID, revokedBy uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	_, err := s.pool.Exec(ctx, `
		UPDATE active_sessions
		SET is_revoked = true, revoked_at = NOW(), revoked_by = $3
		WHERE user_id = $1 AND tenant_id = $2 AND NOT is_revoked`,
		userID, tenantID, revokedBy,
	)
	if err != nil {
		return fmt.Errorf("revoke user sessions: %w", err)
	}

	changes, _ := json.Marshal(map[string]string{"userId": userID.String()})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "session.user_sessions_revoked",
		EntityType:    "session",
		EntityID:      userID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// CleanExpiredSessions deletes sessions that expired more than 30 days ago.
func (s *SessionService) CleanExpiredSessions(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM active_sessions WHERE expires_at < NOW() - INTERVAL '30 days'")
	if err != nil {
		return fmt.Errorf("clean expired sessions: %w", err)
	}
	return nil
}
