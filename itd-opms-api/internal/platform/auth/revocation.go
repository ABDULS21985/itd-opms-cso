package auth

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

const revokedKeyPrefix = "revoked:"

// RevocationService provides Redis-backed JWT token revocation.
// Revoked token JTIs are stored with a TTL matching the token's remaining
// lifetime so storage is automatically reclaimed.
type RevocationService struct {
	redis *redis.Client
}

// NewRevocationService creates a new RevocationService backed by the given
// Redis client. Returns nil if redis is nil (revocation disabled).
func NewRevocationService(redisClient *redis.Client) *RevocationService {
	if redisClient == nil {
		return nil
	}
	return &RevocationService{redis: redisClient}
}

// RevokeToken marks a token's JTI as revoked for the given duration.
// The TTL should be set to the token's remaining lifetime so the key
// automatically expires when the token would have expired anyway.
func (s *RevocationService) RevokeToken(ctx context.Context, jti string, ttl time.Duration) error {
	if jti == "" {
		return nil
	}
	return s.redis.Set(ctx, revokedKeyPrefix+jti, "1", ttl).Err()
}

// IsRevoked checks whether a token JTI has been revoked.
func (s *RevocationService) IsRevoked(ctx context.Context, jti string) bool {
	if jti == "" {
		return false
	}
	exists, err := s.redis.Exists(ctx, revokedKeyPrefix+jti).Result()
	if err != nil {
		// On Redis errors, fail open to avoid blocking all requests.
		return false
	}
	return exists > 0
}
