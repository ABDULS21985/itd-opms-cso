package dirsync

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/msgraph"
)

// Service performs delta syncs from Microsoft Graph to the local directory.
type Service struct {
	pool    *pgxpool.Pool
	graph   *msgraph.Client
	auditor *audit.AuditService
}

// NewService creates a new directory sync service.
func NewService(pool *pgxpool.Pool, graph *msgraph.Client, auditor *audit.AuditService) *Service {
	return &Service{
		pool:    pool,
		graph:   graph,
		auditor: auditor,
	}
}

// SyncResult contains the outcome of a directory sync run.
type SyncResult struct {
	RunID            uuid.UUID `json:"runId"`
	UsersCreated     int       `json:"usersCreated"`
	UsersUpdated     int       `json:"usersUpdated"`
	UsersDeactivated int       `json:"usersDeactivated"`
	Errors           []string  `json:"errors,omitempty"`
	Duration         string    `json:"duration"`
}

// RunSync performs a delta sync of the organizational directory from Graph API.
// It retrieves the last delta token, fetches changes, and processes them.
func (s *Service) RunSync(ctx context.Context) (*SyncResult, error) {
	startedAt := time.Now()

	// Create a sync run record.
	runID := uuid.New()
	_, err := s.pool.Exec(ctx,
		`INSERT INTO directory_sync_runs (id, started_at, status) VALUES ($1, $2, 'running')`,
		runID, startedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create sync run: %w", err)
	}

	// Get the last successful delta token.
	var deltaToken string
	_ = s.pool.QueryRow(ctx,
		`SELECT delta_token FROM directory_sync_runs
		 WHERE status = 'completed' AND delta_token IS NOT NULL
		 ORDER BY completed_at DESC LIMIT 1`,
	).Scan(&deltaToken)

	slog.Info("starting directory sync",
		"run_id", runID,
		"has_delta_token", deltaToken != "",
	)

	// Fetch delta from Graph API.
	delta, err := s.graph.GetUsersDelta(ctx, deltaToken)
	if err != nil {
		s.failRun(ctx, runID, err)
		return nil, fmt.Errorf("get users delta: %w", err)
	}

	result := &SyncResult{RunID: runID}
	var syncErrors []string

	defaultTenantID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	systemActorID := uuid.MustParse("20000000-0000-0000-0000-000000000001")

	for _, graphUser := range delta.Value {
		if graphUser.Mail == "" && graphUser.UserPrincipal == "" {
			continue
		}

		email := graphUser.Mail
		if email == "" {
			email = graphUser.UserPrincipal
		}

		// Check if user exists locally.
		var existingID uuid.UUID
		var isActive bool
		err := s.pool.QueryRow(ctx,
			`SELECT id, is_active FROM users WHERE entra_id = $1`,
			graphUser.ID,
		).Scan(&existingID, &isActive)

		if err != nil {
			// New user — create.
			if !graphUser.AccountEnabled {
				continue
			}

			newID := uuid.New()
			_, err = s.pool.Exec(ctx,
				`INSERT INTO users (id, entra_id, email, display_name, job_title, department, office, tenant_id, is_active)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
				 ON CONFLICT (email) DO UPDATE SET
					entra_id = EXCLUDED.entra_id,
					display_name = EXCLUDED.display_name,
					job_title = EXCLUDED.job_title,
					department = EXCLUDED.department,
					office = EXCLUDED.office`,
				newID, graphUser.ID, email, graphUser.DisplayName,
				graphUser.JobTitle, graphUser.Department, graphUser.OfficeLocation,
				defaultTenantID,
			)
			if err != nil {
				syncErrors = append(syncErrors, fmt.Sprintf("create user %s: %v", email, err))
				continue
			}
			result.UsersCreated++

			// Emit audit event.
			s.emitAuditEvent(ctx, systemActorID, defaultTenantID, "directory_sync.user_created", "user", newID, map[string]string{
				"email":       email,
				"displayName": graphUser.DisplayName,
			})

		} else {
			// Existing user — update or deactivate.
			if !graphUser.AccountEnabled && isActive {
				// Deactivate.
				_, err = s.pool.Exec(ctx,
					`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
					existingID,
				)
				if err != nil {
					syncErrors = append(syncErrors, fmt.Sprintf("deactivate user %s: %v", email, err))
					continue
				}
				result.UsersDeactivated++

				s.emitAuditEvent(ctx, systemActorID, defaultTenantID, "directory_sync.user_deactivated", "user", existingID, map[string]string{
					"email": email,
				})
			} else if graphUser.AccountEnabled {
				// Update attributes.
				_, err = s.pool.Exec(ctx,
					`UPDATE users SET
						display_name = $2, job_title = $3, department = $4, office = $5,
						is_active = true, updated_at = NOW()
					 WHERE id = $1`,
					existingID, graphUser.DisplayName,
					graphUser.JobTitle, graphUser.Department, graphUser.OfficeLocation,
				)
				if err != nil {
					syncErrors = append(syncErrors, fmt.Sprintf("update user %s: %v", email, err))
					continue
				}
				result.UsersUpdated++
			}
		}
	}

	// Complete the sync run.
	errJSON, _ := json.Marshal(syncErrors)
	result.Duration = time.Since(startedAt).String()
	result.Errors = syncErrors

	_, err = s.pool.Exec(ctx,
		`UPDATE directory_sync_runs SET
			completed_at = NOW(), delta_token = $2,
			users_created = $3, users_updated = $4, users_deactivated = $5,
			errors = $6, status = 'completed'
		 WHERE id = $1`,
		runID, delta.DeltaLink,
		result.UsersCreated, result.UsersUpdated, result.UsersDeactivated,
		errJSON,
	)
	if err != nil {
		slog.Error("failed to complete sync run", "error", err, "run_id", runID)
	}

	slog.Info("directory sync completed",
		"run_id", runID,
		"created", result.UsersCreated,
		"updated", result.UsersUpdated,
		"deactivated", result.UsersDeactivated,
		"errors", len(syncErrors),
		"duration", result.Duration,
	)

	return result, nil
}

// GetLastSyncRun returns the most recent sync run record.
func (s *Service) GetLastSyncRun(ctx context.Context) (map[string]any, error) {
	var (
		id              uuid.UUID
		startedAt       time.Time
		completedAt     *time.Time
		usersCreated    int
		usersUpdated    int
		usersDeactivated int
		errorsJSON      json.RawMessage
		status          string
	)

	err := s.pool.QueryRow(ctx,
		`SELECT id, started_at, completed_at, users_created, users_updated, users_deactivated, errors, status
		 FROM directory_sync_runs ORDER BY started_at DESC LIMIT 1`,
	).Scan(&id, &startedAt, &completedAt, &usersCreated, &usersUpdated, &usersDeactivated, &errorsJSON, &status)
	if err != nil {
		return nil, fmt.Errorf("get last sync run: %w", err)
	}

	return map[string]any{
		"id":                id,
		"startedAt":         startedAt,
		"completedAt":       completedAt,
		"usersCreated":      usersCreated,
		"usersUpdated":      usersUpdated,
		"usersDeactivated":  usersDeactivated,
		"errors":            errorsJSON,
		"status":            status,
	}, nil
}

func (s *Service) failRun(ctx context.Context, runID uuid.UUID, syncErr error) {
	errJSON, _ := json.Marshal([]string{syncErr.Error()})
	_, _ = s.pool.Exec(ctx,
		`UPDATE directory_sync_runs SET completed_at = NOW(), errors = $2, status = 'failed' WHERE id = $1`,
		runID, errJSON,
	)
}

func (s *Service) emitAuditEvent(ctx context.Context, actorID, tenantID uuid.UUID, action, entityType string, entityID uuid.UUID, data map[string]string) {
	changes, _ := json.Marshal(data)
	_ = s.auditor.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    actorID,
		ActorRole:  "system",
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Changes:    changes,
	})
}
