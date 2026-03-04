package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"golang.org/x/crypto/bcrypt"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/helpers"
)

// TokenPair holds a freshly generated access + refresh token pair.
type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// UserProfile represents the authenticated user's profile data.
type UserProfile struct {
	ID          uuid.UUID  `json:"id"`
	Email       string     `json:"email"`
	DisplayName string     `json:"displayName"`
	TenantID    uuid.UUID  `json:"tenantId"`
	JobTitle    *string    `json:"jobTitle,omitempty"`
	Department  *string    `json:"department,omitempty"`
	Office      *string    `json:"office,omitempty"`
	Unit        *string    `json:"unit,omitempty"`
	Phone       *string    `json:"phone,omitempty"`
	PhotoURL    *string    `json:"photoUrl,omitempty"`
	Roles       []string   `json:"roles"`
	Permissions []string   `json:"permissions"`
	OrgUnitID   *uuid.UUID `json:"orgUnitId,omitempty"`
	OrgLevel    string     `json:"orgLevel,omitempty"`
}

// UpdateProfileRequest is the payload for self-service profile updates.
type UpdateProfileRequest struct {
	DisplayName *string `json:"displayName"`
	JobTitle    *string `json:"jobTitle"`
	Department  *string `json:"department"`
	Office      *string `json:"office"`
	Unit        *string `json:"unit"`
	Phone       *string `json:"phone"`
}

// LoginResponse is the full response returned on successful login.
type LoginResponse struct {
	AccessToken            string      `json:"accessToken"`
	RefreshToken           string      `json:"refreshToken"`
	User                   UserProfile `json:"user"`
	PasswordChangeRequired bool        `json:"passwordChangeRequired,omitempty"`
}

// AuthService handles authentication logic: login, token refresh, and logout.
type AuthService struct {
	pool     *pgxpool.Pool
	jwtCfg   config.JWTConfig
	minio    *minio.Client
	minioCfg config.MinIOConfig
}

// NewAuthService creates a new AuthService.
func NewAuthService(pool *pgxpool.Pool, jwtCfg config.JWTConfig, minioClient *minio.Client, minioCfg config.MinIOConfig) *AuthService {
	return &AuthService{
		pool:     pool,
		jwtCfg:   jwtCfg,
		minio:    minioClient,
		minioCfg: minioCfg,
	}
}

// Login authenticates a user by email and password, returning a token pair
// and user profile on success. Uses raw pgx queries.
func (s *AuthService) Login(ctx context.Context, email, password string) (*LoginResponse, error) {
	// Find the user by email.
	var (
		userID       uuid.UUID
		tenantID     uuid.UUID
		displayName  string
		passwordHash *string
		jobTitle     *string
		department   *string
		office       *string
		unit         *string
		phone        *string
		photoURL     *string
		orgUnitID    *uuid.UUID
		orgLevel     *string
	)

	err := s.pool.QueryRow(ctx,
		`SELECT u.id, u.tenant_id, u.display_name, u.password_hash, u.job_title, u.department, u.office, u.unit,
		        u.phone, u.photo_url, u.org_unit_id, o.level::text
		 FROM users u
		 LEFT JOIN org_units o ON o.id = u.org_unit_id
		 WHERE u.email = $1 AND u.is_active = true`,
		email,
	).Scan(&userID, &tenantID, &displayName, &passwordHash, &jobTitle, &department, &office, &unit, &phone, &photoURL, &orgUnitID, &orgLevel)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.Unauthorized("Invalid email or password")
		}
		return nil, apperrors.Internal("Failed to query user", err)
	}

	// Verify password.
	if passwordHash == nil || *passwordHash == "" {
		return nil, apperrors.Unauthorized("Invalid email or password")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*passwordHash), []byte(password)); err != nil {
		return nil, apperrors.Unauthorized("Invalid email or password")
	}

	// Check if user must change their password.
	var forceChange bool
	_ = s.pool.QueryRow(ctx,
		`SELECT force_password_change FROM users WHERE id = $1`,
		userID,
	).Scan(&forceChange)

	// Fetch roles and aggregate permissions.
	roles, permissions, err := s.getUserRolesAndPermissions(ctx, userID)
	if err != nil {
		return nil, apperrors.Internal("Failed to fetch user roles", err)
	}

	// Generate tokens.
	accessToken, err := GenerateAccessToken(s.jwtCfg, userID, tenantID, email, roles, permissions)
	if err != nil {
		return nil, apperrors.Internal("Failed to generate access token", err)
	}

	refreshToken := GenerateRefreshToken()

	// Save the refresh token hash in the database.
	tokenHash := helpers.SHA256Checksum([]byte(refreshToken))
	expiresAt := time.Now().Add(s.jwtCfg.RefreshExpiry)

	_, err = s.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	if err != nil {
		slog.Error("failed to save refresh token", "error", err.Error(), "user_id", userID)
		return nil, apperrors.Internal("Failed to create session", err)
	}

	// Update last login timestamp.
	_, _ = s.pool.Exec(ctx, `UPDATE users SET last_login_at = NOW() WHERE id = $1`, userID)

	profile := UserProfile{
		ID:          userID,
		Email:       email,
		DisplayName: displayName,
		TenantID:    tenantID,
		JobTitle:    jobTitle,
		Department:  department,
		Office:      office,
		Unit:        unit,
		Phone:       phone,
		PhotoURL:    photoURL,
		Roles:       roles,
		Permissions: permissions,
		OrgUnitID:   orgUnitID,
	}
	if orgLevel != nil {
		profile.OrgLevel = *orgLevel
	}

	return &LoginResponse{
		AccessToken:            accessToken,
		RefreshToken:           refreshToken,
		User:                   profile,
		PasswordChangeRequired: forceChange,
	}, nil
}

// CreateSession inserts a row into active_sessions so the session tracker works.
func (s *AuthService) CreateSession(ctx context.Context, userID, tenantID uuid.UUID, tokenHash, ipAddress, userAgent string, expiresAt time.Time) {
	deviceInfo := parseDeviceInfo(userAgent)
	_, err := s.pool.Exec(ctx, `
		INSERT INTO active_sessions (user_id, tenant_id, token_hash, ip_address, user_agent, device_info, location, expires_at)
		VALUES ($1, $2, $3, $4::inet, $5, $6, '', $7)`,
		userID, tenantID, tokenHash, ipAddress, userAgent, deviceInfo, expiresAt,
	)
	if err != nil {
		slog.Error("failed to create session record", "error", err.Error(), "user_id", userID)
	}
}

// parseDeviceInfo extracts basic device info from the User-Agent string.
func parseDeviceInfo(ua string) []byte {
	device := "desktop"
	browser := "unknown"
	os := "unknown"

	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "mobile") || strings.Contains(lower, "android"):
		device = "mobile"
	case strings.Contains(lower, "tablet") || strings.Contains(lower, "ipad"):
		device = "tablet"
	}

	switch {
	case strings.Contains(lower, "chrome") && !strings.Contains(lower, "edg"):
		browser = "Chrome"
	case strings.Contains(lower, "firefox"):
		browser = "Firefox"
	case strings.Contains(lower, "safari") && !strings.Contains(lower, "chrome"):
		browser = "Safari"
	case strings.Contains(lower, "edg"):
		browser = "Edge"
	}

	switch {
	case strings.Contains(lower, "windows"):
		os = "Windows"
	case strings.Contains(lower, "macintosh") || strings.Contains(lower, "mac os"):
		os = "macOS"
	case strings.Contains(lower, "linux"):
		os = "Linux"
	case strings.Contains(lower, "iphone") || strings.Contains(lower, "ipad"):
		os = "iOS"
	case strings.Contains(lower, "android"):
		os = "Android"
	}

	info, _ := json.Marshal(map[string]string{
		"device":  device,
		"browser": browser,
		"os":      os,
	})
	return info
}

// RefreshToken validates the given refresh token and issues a new token pair.
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*TokenPair, error) {
	tokenHash := helpers.SHA256Checksum([]byte(refreshToken))

	// Look up the refresh token.
	var (
		tokenID uuid.UUID
		userID  uuid.UUID
	)
	err := s.pool.QueryRow(ctx,
		`SELECT id, user_id FROM refresh_tokens
		 WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
		tokenHash,
	).Scan(&tokenID, &userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.Unauthorized("Invalid or expired refresh token")
		}
		return nil, apperrors.Internal("Failed to validate refresh token", err)
	}

	// Revoke the old refresh token (single-use rotation).
	_, err = s.pool.Exec(ctx,
		`UPDATE refresh_tokens SET revoked = true WHERE id = $1`,
		tokenID,
	)
	if err != nil {
		slog.Error("failed to revoke old refresh token", "error", err.Error(), "token_id", tokenID)
	}

	// Fetch user data for the new access token.
	var (
		tenantID    uuid.UUID
		email       string
		displayName string
	)
	err = s.pool.QueryRow(ctx,
		`SELECT tenant_id, email, display_name FROM users WHERE id = $1 AND is_active = true`,
		userID,
	).Scan(&tenantID, &email, &displayName)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.Unauthorized("User account is no longer active")
		}
		return nil, apperrors.Internal("Failed to fetch user", err)
	}

	roles, permissions, err := s.getUserRolesAndPermissions(ctx, userID)
	if err != nil {
		return nil, apperrors.Internal("Failed to fetch user roles", err)
	}

	// Generate new tokens.
	newAccessToken, err := GenerateAccessToken(s.jwtCfg, userID, tenantID, email, roles, permissions)
	if err != nil {
		return nil, apperrors.Internal("Failed to generate access token", err)
	}

	newRefreshToken := GenerateRefreshToken()
	newTokenHash := helpers.SHA256Checksum([]byte(newRefreshToken))
	expiresAt := time.Now().Add(s.jwtCfg.RefreshExpiry)

	_, err = s.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, newTokenHash, expiresAt,
	)
	if err != nil {
		return nil, apperrors.Internal("Failed to create session", err)
	}

	return &TokenPair{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}, nil
}

// Logout revokes the specified refresh token.
func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	tokenHash := helpers.SHA256Checksum([]byte(refreshToken))

	tag, err := s.pool.Exec(ctx,
		`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1 AND revoked = false`,
		tokenHash,
	)
	if err != nil {
		return apperrors.Internal("Failed to revoke refresh token", err)
	}

	if tag.RowsAffected() == 0 {
		slog.Warn("logout: refresh token not found or already revoked",
			"token_hash_prefix", tokenHash[:8],
		)
	}

	return nil
}

// ChangePassword updates the user's password and clears the force_password_change flag.
// It verifies the current password before allowing the change.
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	// Fetch current password hash.
	var passwordHash *string
	err := s.pool.QueryRow(ctx,
		`SELECT password_hash FROM users WHERE id = $1 AND is_active = true`,
		userID,
	).Scan(&passwordHash)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("user", userID.String())
		}
		return apperrors.Internal("Failed to fetch user", err)
	}

	// Verify current password.
	if passwordHash == nil || *passwordHash == "" {
		return apperrors.BadRequest("Account does not use password authentication")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*passwordHash), []byte(currentPassword)); err != nil {
		return apperrors.Unauthorized("Current password is incorrect")
	}

	// Validate new password strength.
	if len(newPassword) < 8 {
		return apperrors.BadRequest("New password must be at least 8 characters")
	}
	if newPassword == currentPassword {
		return apperrors.BadRequest("New password must be different from current password")
	}

	// Hash new password.
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperrors.Internal("Failed to hash password", err)
	}

	// Update password and clear force_password_change flag.
	_, err = s.pool.Exec(ctx,
		`UPDATE users SET password_hash = $1, force_password_change = false, updated_at = NOW() WHERE id = $2`,
		string(hash), userID,
	)
	if err != nil {
		return apperrors.Internal("Failed to update password", err)
	}

	slog.Info("password changed successfully", "user_id", userID)
	return nil
}

// GetMe returns the user profile for the given user ID, including roles,
// permissions, and org scope information.
func (s *AuthService) GetMe(ctx context.Context, userID uuid.UUID) (*UserProfile, error) {
	var (
		email       string
		displayName string
		tenantID    uuid.UUID
		jobTitle    *string
		department  *string
		office      *string
		unit        *string
		phone       *string
		photoURL    *string
		orgUnitID   *uuid.UUID
		orgLevel    *string
	)

	err := s.pool.QueryRow(ctx,
		`SELECT u.email, u.display_name, u.tenant_id, u.job_title, u.department, u.office, u.unit,
		        u.phone, u.photo_url, u.org_unit_id, o.level::text
		 FROM users u
		 LEFT JOIN org_units o ON o.id = u.org_unit_id
		 WHERE u.id = $1 AND u.is_active = true`,
		userID,
	).Scan(&email, &displayName, &tenantID, &jobTitle, &department, &office, &unit, &phone, &photoURL, &orgUnitID, &orgLevel)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("user", userID.String())
		}
		return nil, apperrors.Internal("Failed to fetch user profile", err)
	}

	roles, permissions, err := s.getUserRolesAndPermissions(ctx, userID)
	if err != nil {
		return nil, apperrors.Internal("Failed to fetch user roles", err)
	}

	profile := &UserProfile{
		ID:          userID,
		Email:       email,
		DisplayName: displayName,
		TenantID:    tenantID,
		JobTitle:    jobTitle,
		Department:  department,
		Office:      office,
		Unit:        unit,
		Phone:       phone,
		PhotoURL:    photoURL,
		Roles:       roles,
		Permissions: permissions,
		OrgUnitID:   orgUnitID,
	}
	if orgLevel != nil {
		profile.OrgLevel = *orgLevel
	}

	return profile, nil
}

// GetUserRolesAndPermissions is the exported version used by middleware and
// other packages that need to resolve roles for a user (e.g., OIDC flow).
func (s *AuthService) GetUserRolesAndPermissions(ctx context.Context, userID uuid.UUID) ([]string, []string, error) {
	return s.getUserRolesAndPermissions(ctx, userID)
}

// getUserRolesAndPermissions queries the role_bindings + roles tables and
// aggregates all roles and permissions for a user. It also includes
// permissions inherited through active delegations.
func (s *AuthService) getUserRolesAndPermissions(ctx context.Context, userID uuid.UUID) ([]string, []string, error) {
	roleSet := make(map[string]struct{})
	permSet := make(map[string]struct{})

	// Direct role bindings.
	rows, err := s.pool.Query(ctx,
		`SELECT r.name, r.permissions
		 FROM role_bindings rb
		 JOIN roles r ON r.id = rb.role_id
		 WHERE rb.user_id = $1 AND rb.is_active = true
		   AND (rb.expires_at IS NULL OR rb.expires_at > NOW())`,
		userID,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("query role bindings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var roleName string
		var permJSON json.RawMessage
		if err := rows.Scan(&roleName, &permJSON); err != nil {
			return nil, nil, fmt.Errorf("scan role binding: %w", err)
		}
		roleSet[roleName] = struct{}{}
		parsePermissions(permJSON, permSet)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate role bindings: %w", err)
	}

	// Delegated roles.
	dRows, err := s.pool.Query(ctx,
		`SELECT r.name, r.permissions
		 FROM delegations d
		 JOIN roles r ON r.id = d.role_id
		 WHERE d.delegate_id = $1 AND d.is_active = true
		   AND d.starts_at <= NOW() AND d.ends_at > NOW()`,
		userID,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("query delegations: %w", err)
	}
	defer dRows.Close()

	for dRows.Next() {
		var roleName string
		var permJSON json.RawMessage
		if err := dRows.Scan(&roleName, &permJSON); err != nil {
			return nil, nil, fmt.Errorf("scan delegation: %w", err)
		}
		roleSet[roleName] = struct{}{}
		parsePermissions(permJSON, permSet)
	}
	if err := dRows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate delegations: %w", err)
	}

	// Convert sets to slices.
	roles := make([]string, 0, len(roleSet))
	for r := range roleSet {
		roles = append(roles, r)
	}

	permissions := make([]string, 0, len(permSet))
	for p := range permSet {
		permissions = append(permissions, p)
	}

	return roles, permissions, nil
}

// ForgotPassword generates a password reset token for the given email.
// Returns the raw token (to be sent to the user) and an error.
// If the email doesn't exist, returns nil error with empty token (no information leak).
func (s *AuthService) ForgotPassword(ctx context.Context, email string) (string, error) {
	// Look up user by email.
	var userID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM users WHERE email = $1 AND is_active = true AND password_hash IS NOT NULL`,
		email,
	).Scan(&userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Don't reveal whether the email exists.
			return "", nil
		}
		return "", apperrors.Internal("Failed to look up user", err)
	}

	// Invalidate any existing unused tokens for this user.
	_, _ = s.pool.Exec(ctx,
		`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
		userID,
	)

	// Generate a secure random token.
	rawToken := GenerateRefreshToken() // Reuse the same secure random generator.
	tokenHash := helpers.SHA256Checksum([]byte(rawToken))
	expiresAt := time.Now().Add(30 * time.Minute)

	_, err = s.pool.Exec(ctx,
		`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	if err != nil {
		return "", apperrors.Internal("Failed to create reset token", err)
	}

	slog.Info("password reset token generated", "user_id", userID, "email", email, "expires_at", expiresAt)
	return rawToken, nil
}

// ResetPassword validates a reset token and sets a new password.
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if len(newPassword) < 8 {
		return apperrors.BadRequest("New password must be at least 8 characters")
	}

	tokenHash := helpers.SHA256Checksum([]byte(token))

	// Find and validate the token.
	var tokenID, userID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT id, user_id FROM password_reset_tokens
		 WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	).Scan(&tokenID, &userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.BadRequest("Invalid or expired reset link. Please request a new password reset.")
		}
		return apperrors.Internal("Failed to validate reset token", err)
	}

	// Hash new password.
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperrors.Internal("Failed to hash password", err)
	}

	// Update password and mark token as used in a single transaction.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal("Failed to start transaction", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`UPDATE users SET password_hash = $1, force_password_change = false, updated_at = NOW() WHERE id = $2`,
		string(hash), userID,
	)
	if err != nil {
		return apperrors.Internal("Failed to update password", err)
	}

	_, err = tx.Exec(ctx,
		`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
		tokenID,
	)
	if err != nil {
		return apperrors.Internal("Failed to mark token as used", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return apperrors.Internal("Failed to commit transaction", err)
	}

	// Revoke all existing refresh tokens for the user (force re-login).
	_, _ = s.pool.Exec(ctx,
		`UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false`,
		userID,
	)

	slog.Info("password reset completed", "user_id", userID)
	return nil
}

// UpdateProfile updates the user's own profile fields using COALESCE (partial update).
func (s *AuthService) UpdateProfile(ctx context.Context, userID uuid.UUID, req UpdateProfileRequest) (*UserProfile, error) {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET
			display_name = COALESCE($2, display_name),
			job_title    = COALESCE($3, job_title),
			department   = COALESCE($4, department),
			office       = COALESCE($5, office),
			unit         = COALESCE($6, unit),
			phone        = COALESCE($7, phone),
			updated_at   = NOW()
		 WHERE id = $1`,
		userID,
		req.DisplayName,
		req.JobTitle,
		req.Department,
		req.Office,
		req.Unit,
		req.Phone,
	)
	if err != nil {
		return nil, apperrors.Internal("Failed to update profile", err)
	}

	return s.GetMe(ctx, userID)
}

// UploadProfilePhoto uploads a profile photo to MinIO and updates the user's photo_url.
func (s *AuthService) UploadProfilePhoto(ctx context.Context, userID, tenantID uuid.UUID, fileBytes []byte, contentType, ext string) (string, error) {
	if s.minio == nil {
		return "", apperrors.Internal("File storage is not configured", nil)
	}

	objectKey := fmt.Sprintf("tenants/%s/profile-photos/%s%s", tenantID, userID, ext)

	_, err := s.minio.PutObject(ctx, s.minioCfg.BucketAttachment, objectKey,
		bytes.NewReader(fileBytes), int64(len(fileBytes)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return "", apperrors.Internal("Failed to upload photo", err)
	}

	// Update photo_url in database.
	_, err = s.pool.Exec(ctx,
		`UPDATE users SET photo_url = $2, updated_at = NOW() WHERE id = $1`,
		userID, objectKey,
	)
	if err != nil {
		// Try to clean up the uploaded object.
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return "", apperrors.Internal("Failed to save photo reference", err)
	}

	slog.Info("profile photo uploaded", "user_id", userID, "object_key", objectKey)
	return objectKey, nil
}

// DeleteProfilePhoto removes the user's profile photo from MinIO and clears the DB field.
func (s *AuthService) DeleteProfilePhoto(ctx context.Context, userID, tenantID uuid.UUID) error {
	if s.minio == nil {
		return apperrors.Internal("File storage is not configured", nil)
	}

	// Get current photo_url.
	var photoURL *string
	err := s.pool.QueryRow(ctx,
		`SELECT photo_url FROM users WHERE id = $1`,
		userID,
	).Scan(&photoURL)
	if err != nil {
		return apperrors.Internal("Failed to fetch user", err)
	}

	if photoURL == nil || *photoURL == "" {
		return apperrors.BadRequest("No profile photo to delete")
	}

	// Remove from MinIO.
	err = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, *photoURL, minio.RemoveObjectOptions{})
	if err != nil {
		slog.Warn("failed to remove photo from storage", "error", err, "object_key", *photoURL)
	}

	// Clear photo_url in database.
	_, err = s.pool.Exec(ctx,
		`UPDATE users SET photo_url = NULL, updated_at = NOW() WHERE id = $1`,
		userID,
	)
	if err != nil {
		return apperrors.Internal("Failed to clear photo reference", err)
	}

	slog.Info("profile photo deleted", "user_id", userID)
	return nil
}

// parsePermissions unmarshals a JSON array of permission strings and adds
// them to the provided set.
func parsePermissions(raw json.RawMessage, permSet map[string]struct{}) {
	if len(raw) == 0 {
		return
	}
	var perms []string
	if err := json.Unmarshal(raw, &perms); err != nil {
		slog.Warn("failed to parse permissions JSON", "error", err.Error(), "raw", string(raw))
		return
	}
	for _, p := range perms {
		permSet[p] = struct{}{}
	}
}
