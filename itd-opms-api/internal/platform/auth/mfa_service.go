package auth

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"image/png"
	"io"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
)

// MFAMethod represents a user's configured MFA method.
type MFAMethod struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"userId"`
	MethodType string     `json:"methodType"`
	IsPrimary  bool       `json:"isPrimary"`
	IsVerified bool       `json:"isVerified"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
}

// TOTPSetupResponse is returned when setting up TOTP.
type TOTPSetupResponse struct {
	Secret string `json:"secret"`
	URI    string `json:"uri"`
	QRCode string `json:"qrCode"` // base64 PNG data URL
}

// MFAService handles MFA operations.
type MFAService struct {
	pool          *pgxpool.Pool
	encryptionKey []byte // 32 bytes for AES-256
}

// NewMFAService creates a new MFAService.
func NewMFAService(pool *pgxpool.Pool, encryptionKeyHex string) *MFAService {
	var key []byte
	if encryptionKeyHex != "" {
		// Support both raw string keys (>= 32 chars) and hex-encoded keys
		if len(encryptionKeyHex) == 64 {
			decoded, err := hex.DecodeString(encryptionKeyHex)
			if err == nil {
				key = decoded
			}
		}
		if key == nil && len(encryptionKeyHex) >= 32 {
			key = []byte(encryptionKeyHex)[:32]
		}
	}
	return &MFAService{pool: pool, encryptionKey: key}
}

// SetupTOTP begins TOTP enrollment for a user. Returns the secret and QR code.
func (s *MFAService) SetupTOTP(ctx context.Context, userID uuid.UUID, email string) (*TOTPSetupResponse, error) {
	if len(s.encryptionKey) == 0 {
		return nil, apperrors.Internal("MFA encryption key not configured", nil)
	}

	// Delete any existing unverified TOTP method for this user
	_, _ = s.pool.Exec(ctx,
		`DELETE FROM user_mfa_methods WHERE user_id = $1 AND method_type = 'totp' AND is_verified = false`,
		userID,
	)

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "CBN-ITD-OPMS",
		AccountName: email,
	})
	if err != nil {
		return nil, apperrors.Internal("Failed to generate TOTP key", err)
	}

	// Encrypt the secret before storage
	encrypted, err := s.encrypt(key.Secret())
	if err != nil {
		return nil, apperrors.Internal("Failed to encrypt TOTP secret", err)
	}

	// Store the method (unverified)
	_, err = s.pool.Exec(ctx,
		`INSERT INTO user_mfa_methods (user_id, method_type, secret_encrypted, is_primary, is_verified)
		 VALUES ($1, 'totp', $2, true, false)`,
		userID, encrypted,
	)
	if err != nil {
		return nil, apperrors.Internal("Failed to save TOTP method", err)
	}

	// Generate QR code as base64 PNG
	img, err := key.Image(200, 200)
	if err != nil {
		return nil, apperrors.Internal("Failed to generate QR code", err)
	}

	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, img); err != nil {
		return nil, apperrors.Internal("Failed to encode QR code", err)
	}
	qrBase64 := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBuf.Bytes())

	return &TOTPSetupResponse{
		Secret: key.Secret(),
		URI:    key.URL(),
		QRCode: qrBase64,
	}, nil
}

// VerifyTOTPSetup validates the first TOTP code and marks the method as verified.
func (s *MFAService) VerifyTOTPSetup(ctx context.Context, userID uuid.UUID, code string) error {
	// Fetch the unverified TOTP method
	var methodID uuid.UUID
	var secretEncrypted string
	err := s.pool.QueryRow(ctx,
		`SELECT id, secret_encrypted FROM user_mfa_methods
		 WHERE user_id = $1 AND method_type = 'totp' AND is_verified = false
		 ORDER BY created_at DESC LIMIT 1`,
		userID,
	).Scan(&methodID, &secretEncrypted)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.BadRequest("No pending TOTP setup found. Please start setup again.")
		}
		return apperrors.Internal("Failed to fetch TOTP method", err)
	}

	secret, err := s.decrypt(secretEncrypted)
	if err != nil {
		return apperrors.Internal("Failed to decrypt TOTP secret", err)
	}

	if !totp.Validate(code, secret) {
		return apperrors.BadRequest("Invalid verification code. Please try again.")
	}

	// Mark as verified and enable MFA on the user
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal("Failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`UPDATE user_mfa_methods SET is_verified = true WHERE id = $1`, methodID)
	if err != nil {
		return apperrors.Internal("Failed to verify TOTP method", err)
	}

	_, err = tx.Exec(ctx,
		`UPDATE users SET mfa_enabled = true, mfa_enforced_at = NOW() WHERE id = $1`, userID)
	if err != nil {
		return apperrors.Internal("Failed to enable MFA on user", err)
	}

	return tx.Commit(ctx)
}

// ValidateTOTP validates a TOTP code during login.
func (s *MFAService) ValidateTOTP(ctx context.Context, userID uuid.UUID, code string) error {
	var methodID uuid.UUID
	var secretEncrypted string
	err := s.pool.QueryRow(ctx,
		`SELECT id, secret_encrypted FROM user_mfa_methods
		 WHERE user_id = $1 AND method_type = 'totp' AND is_verified = true
		 LIMIT 1`,
		userID,
	).Scan(&methodID, &secretEncrypted)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.BadRequest("No TOTP method configured")
		}
		return apperrors.Internal("Failed to fetch TOTP method", err)
	}

	secret, err := s.decrypt(secretEncrypted)
	if err != nil {
		return apperrors.Internal("Failed to decrypt TOTP secret", err)
	}

	if !totp.Validate(code, secret) {
		return apperrors.Unauthorized("Invalid verification code")
	}

	// Update last used timestamp
	_, _ = s.pool.Exec(ctx,
		`UPDATE user_mfa_methods SET last_used_at = NOW() WHERE id = $1`, methodID)

	return nil
}

// GenerateBackupCodes creates 10 random backup codes, stores bcrypt hashes, returns plaintext.
func (s *MFAService) GenerateBackupCodes(ctx context.Context, userID uuid.UUID) ([]string, error) {
	codes := make([]string, 10)
	hashes := make([]string, 10)

	for i := range codes {
		code, err := generateRandomCode(8)
		if err != nil {
			return nil, apperrors.Internal("Failed to generate backup code", err)
		}
		codes[i] = code

		hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if err != nil {
			return nil, apperrors.Internal("Failed to hash backup code", err)
		}
		hashes[i] = string(hash)
	}

	// Delete existing backup_codes method for this user, then insert new
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal("Failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	_, _ = tx.Exec(ctx,
		`DELETE FROM user_mfa_methods WHERE user_id = $1 AND method_type = 'backup_codes'`,
		userID,
	)

	_, err = tx.Exec(ctx,
		`INSERT INTO user_mfa_methods (user_id, method_type, backup_codes, is_verified)
		 VALUES ($1, 'backup_codes', $2, true)`,
		userID, hashes,
	)
	if err != nil {
		return nil, apperrors.Internal("Failed to save backup codes", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal("Failed to commit backup codes", err)
	}

	return codes, nil
}

// ValidateBackupCode validates and consumes a backup code during login.
func (s *MFAService) ValidateBackupCode(ctx context.Context, userID uuid.UUID, code string) error {
	var methodID uuid.UUID
	var hashes []string
	err := s.pool.QueryRow(ctx,
		`SELECT id, backup_codes FROM user_mfa_methods
		 WHERE user_id = $1 AND method_type = 'backup_codes' AND is_verified = true
		 LIMIT 1`,
		userID,
	).Scan(&methodID, &hashes)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.BadRequest("No backup codes configured")
		}
		return apperrors.Internal("Failed to fetch backup codes", err)
	}

	// Find the matching hash and remove it
	matchIdx := -1
	for i, h := range hashes {
		if bcrypt.CompareHashAndPassword([]byte(h), []byte(code)) == nil {
			matchIdx = i
			break
		}
	}
	if matchIdx < 0 {
		return apperrors.Unauthorized("Invalid backup code")
	}

	// Remove the used code
	remaining := append(hashes[:matchIdx], hashes[matchIdx+1:]...)
	_, err = s.pool.Exec(ctx,
		`UPDATE user_mfa_methods SET backup_codes = $1, last_used_at = NOW() WHERE id = $2`,
		remaining, methodID,
	)
	if err != nil {
		slog.Error("failed to consume backup code", "error", err)
	}

	return nil
}

// CreateChallenge creates a short-lived MFA challenge for login verification.
func (s *MFAService) CreateChallenge(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var challengeID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`INSERT INTO mfa_challenges (user_id, challenge_type, challenge_data, expires_at)
		 VALUES ($1, 'login', $2, $3)
		 RETURNING id`,
		userID, userID.String(), time.Now().Add(5*time.Minute),
	).Scan(&challengeID)
	if err != nil {
		return uuid.Nil, apperrors.Internal("Failed to create MFA challenge", err)
	}
	return challengeID, nil
}

// VerifyChallenge validates an MFA challenge during login.
// Returns the user ID on success.
func (s *MFAService) VerifyChallenge(ctx context.Context, challengeID uuid.UUID, method, code string) (uuid.UUID, error) {
	var userID uuid.UUID
	var verified bool
	var expiresAt time.Time
	var attempts int
	var lockedUntil *time.Time

	err := s.pool.QueryRow(ctx,
		`SELECT user_id, verified, expires_at, attempts, locked_until
		 FROM mfa_challenges WHERE id = $1`,
		challengeID,
	).Scan(&userID, &verified, &expiresAt, &attempts, &lockedUntil)
	if err != nil {
		if err == pgx.ErrNoRows {
			return uuid.Nil, apperrors.Unauthorized("Invalid or expired MFA challenge")
		}
		return uuid.Nil, apperrors.Internal("Failed to fetch MFA challenge", err)
	}

	if verified {
		return uuid.Nil, apperrors.BadRequest("MFA challenge already verified")
	}
	if time.Now().After(expiresAt) {
		return uuid.Nil, apperrors.Unauthorized("MFA challenge expired. Please log in again.")
	}
	if lockedUntil != nil && time.Now().Before(*lockedUntil) {
		return uuid.Nil, apperrors.Forbidden("Too many failed attempts. Please try again later.")
	}

	// Validate the code based on method
	var validateErr error
	switch method {
	case "totp":
		validateErr = s.ValidateTOTP(ctx, userID, code)
	case "backup_codes":
		validateErr = s.ValidateBackupCode(ctx, userID, code)
	default:
		return uuid.Nil, apperrors.BadRequest("Unsupported MFA method: " + method)
	}

	if validateErr != nil {
		// Increment attempts, lock after 5 failures
		newAttempts := attempts + 1
		var lockUntil *time.Time
		if newAttempts >= 5 {
			t := time.Now().Add(15 * time.Minute)
			lockUntil = &t
		}
		_, _ = s.pool.Exec(ctx,
			`UPDATE mfa_challenges SET attempts = $1, locked_until = $2 WHERE id = $3`,
			newAttempts, lockUntil, challengeID,
		)
		if newAttempts >= 5 {
			return uuid.Nil, apperrors.Forbidden("Too many failed attempts. Account locked for 15 minutes.")
		}
		return uuid.Nil, validateErr
	}

	// Mark challenge as verified
	_, _ = s.pool.Exec(ctx,
		`UPDATE mfa_challenges SET verified = true WHERE id = $1`, challengeID)

	return userID, nil
}

// ListMethods returns the user's configured MFA methods (without secrets).
func (s *MFAService) ListMethods(ctx context.Context, userID uuid.UUID) ([]MFAMethod, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, user_id, method_type, is_primary, is_verified, last_used_at, created_at
		 FROM user_mfa_methods WHERE user_id = $1 AND is_verified = true
		 ORDER BY created_at`,
		userID,
	)
	if err != nil {
		return nil, apperrors.Internal("Failed to list MFA methods", err)
	}
	defer rows.Close()

	var methods []MFAMethod
	for rows.Next() {
		var m MFAMethod
		if err := rows.Scan(&m.ID, &m.UserID, &m.MethodType, &m.IsPrimary, &m.IsVerified, &m.LastUsedAt, &m.CreatedAt); err != nil {
			return nil, apperrors.Internal("Failed to scan MFA method", err)
		}
		methods = append(methods, m)
	}
	if methods == nil {
		methods = []MFAMethod{}
	}
	return methods, nil
}

// RemoveMethod removes an MFA method. If no verified methods remain, disables MFA.
func (s *MFAService) RemoveMethod(ctx context.Context, userID, methodID uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal("Failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`DELETE FROM user_mfa_methods WHERE id = $1 AND user_id = $2`, methodID, userID)
	if err != nil {
		return apperrors.Internal("Failed to remove MFA method", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("MFA method", methodID.String())
	}

	// Check if any verified methods remain
	var remaining int
	_ = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM user_mfa_methods WHERE user_id = $1 AND is_verified = true AND method_type != 'backup_codes'`,
		userID,
	).Scan(&remaining)

	if remaining == 0 {
		// No primary methods left — disable MFA and remove backup codes too
		_, _ = tx.Exec(ctx,
			`DELETE FROM user_mfa_methods WHERE user_id = $1 AND method_type = 'backup_codes'`, userID)
		_, _ = tx.Exec(ctx,
			`UPDATE users SET mfa_enabled = false, mfa_enforced_at = NULL WHERE id = $1`, userID)
	}

	return tx.Commit(ctx)
}

// GetUserMFAStatus returns whether MFA is enabled and which methods are configured.
func (s *MFAService) GetUserMFAStatus(ctx context.Context, userID uuid.UUID) (bool, []string, error) {
	var mfaEnabled bool
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE((to_jsonb(users)->>'mfa_enabled')::boolean, false) FROM users WHERE id = $1`, userID,
	).Scan(&mfaEnabled)
	if err != nil {
		return false, nil, err
	}

	rows, err := s.pool.Query(ctx,
		`SELECT DISTINCT method_type FROM user_mfa_methods
		 WHERE user_id = $1 AND is_verified = true`,
		userID,
	)
	if err != nil {
		return mfaEnabled, nil, err
	}
	defer rows.Close()

	var methods []string
	for rows.Next() {
		var m string
		if err := rows.Scan(&m); err != nil {
			continue
		}
		methods = append(methods, m)
	}
	return mfaEnabled, methods, nil
}

// AdminResetMFA removes all MFA methods and disables MFA for a user.
func (s *MFAService) AdminResetMFA(ctx context.Context, userID uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal("Failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	_, _ = tx.Exec(ctx, `DELETE FROM user_mfa_methods WHERE user_id = $1`, userID)
	_, err = tx.Exec(ctx,
		`UPDATE users SET mfa_enabled = false, mfa_enforced_at = NULL WHERE id = $1`, userID)
	if err != nil {
		return apperrors.Internal("Failed to reset MFA", err)
	}

	return tx.Commit(ctx)
}

// ── AES-256-GCM encryption helpers ──

func (s *MFAService) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", fmt.Errorf("aes cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (s *MFAService) decrypt(encoded string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("base64 decode: %w", err)
	}

	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", fmt.Errorf("aes cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("gcm: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}

	return string(plaintext), nil
}

// generateRandomCode generates a random alphanumeric code of the given length.
func generateRandomCode(length int) (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no I/O/0/1 to avoid confusion
	b := make([]byte, length)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b), nil
}
