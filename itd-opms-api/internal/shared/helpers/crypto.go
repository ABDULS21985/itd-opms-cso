package helpers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
)

// SHA256Checksum computes a SHA-256 hex digest of the given data.
func SHA256Checksum(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

// ComputeAuditChecksum creates a SHA-256 checksum for an audit event.
// The checksum covers: tenant_id, actor_id, action, entity_type, entity_id, changes, timestamp.
func ComputeAuditChecksum(tenantID, actorID, action, entityType, entityID string, changes json.RawMessage, timestamp string) string {
	payload := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s",
		tenantID, actorID, action, entityType, entityID, string(changes), timestamp,
	)
	return SHA256Checksum([]byte(payload))
}
