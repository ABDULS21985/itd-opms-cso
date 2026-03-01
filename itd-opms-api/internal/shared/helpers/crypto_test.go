package helpers_test

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"

	"github.com/itd-cbn/itd-opms-api/internal/shared/helpers"
)

// ──────────────────────────────────────────────
// SHA256Checksum
// ──────────────────────────────────────────────

func TestSHA256Checksum_KnownValue(t *testing.T) {
	data := []byte("hello world")
	// Pre-computed expected hash
	h := sha256.Sum256(data)
	expected := hex.EncodeToString(h[:])

	got := helpers.SHA256Checksum(data)
	if got != expected {
		t.Errorf("expected %s, got %s", expected, got)
	}
}

func TestSHA256Checksum_EmptyInput(t *testing.T) {
	got := helpers.SHA256Checksum([]byte{})
	// SHA256 of empty byte slice
	h := sha256.Sum256([]byte{})
	expected := hex.EncodeToString(h[:])

	if got != expected {
		t.Errorf("expected %s for empty input, got %s", expected, got)
	}
}

func TestSHA256Checksum_DeterministicOutput(t *testing.T) {
	data := []byte("same input")
	first := helpers.SHA256Checksum(data)
	second := helpers.SHA256Checksum(data)

	if first != second {
		t.Error("expected same checksum for same input")
	}
}

func TestSHA256Checksum_DifferentInputs(t *testing.T) {
	a := helpers.SHA256Checksum([]byte("input A"))
	b := helpers.SHA256Checksum([]byte("input B"))

	if a == b {
		t.Error("expected different checksums for different inputs")
	}
}

func TestSHA256Checksum_LengthIs64Hex(t *testing.T) {
	got := helpers.SHA256Checksum([]byte("anything"))
	if len(got) != 64 {
		t.Errorf("expected SHA256 hex length 64, got %d", len(got))
	}
}

func TestSHA256Checksum_UnicodeInput(t *testing.T) {
	got := helpers.SHA256Checksum([]byte("unicode: \u00e9\u00e8\u00ea \u4e16\u754c"))
	if len(got) != 64 {
		t.Errorf("expected 64 char hex for unicode input, got %d", len(got))
	}
}

// ──────────────────────────────────────────────
// ComputeAuditChecksum
// ──────────────────────────────────────────────

func TestComputeAuditChecksum_Deterministic(t *testing.T) {
	changes := json.RawMessage(`{"name": "old", "name_new": "new"}`)
	first := helpers.ComputeAuditChecksum("t1", "u1", "update", "user", "e1", changes, "2024-01-01T00:00:00Z")
	second := helpers.ComputeAuditChecksum("t1", "u1", "update", "user", "e1", changes, "2024-01-01T00:00:00Z")

	if first != second {
		t.Error("expected same checksum for identical audit fields")
	}
}

func TestComputeAuditChecksum_DifferentAction(t *testing.T) {
	changes := json.RawMessage(`{}`)
	a := helpers.ComputeAuditChecksum("t1", "u1", "create", "user", "e1", changes, "2024-01-01T00:00:00Z")
	b := helpers.ComputeAuditChecksum("t1", "u1", "delete", "user", "e1", changes, "2024-01-01T00:00:00Z")

	if a == b {
		t.Error("expected different checksums for different actions")
	}
}

func TestComputeAuditChecksum_DifferentTenant(t *testing.T) {
	changes := json.RawMessage(`{}`)
	a := helpers.ComputeAuditChecksum("tenant-1", "u1", "create", "user", "e1", changes, "2024-01-01T00:00:00Z")
	b := helpers.ComputeAuditChecksum("tenant-2", "u1", "create", "user", "e1", changes, "2024-01-01T00:00:00Z")

	if a == b {
		t.Error("expected different checksums for different tenants")
	}
}

func TestComputeAuditChecksum_DifferentTimestamp(t *testing.T) {
	changes := json.RawMessage(`{}`)
	a := helpers.ComputeAuditChecksum("t1", "u1", "update", "user", "e1", changes, "2024-01-01T00:00:00Z")
	b := helpers.ComputeAuditChecksum("t1", "u1", "update", "user", "e1", changes, "2024-06-15T12:00:00Z")

	if a == b {
		t.Error("expected different checksums for different timestamps")
	}
}

func TestComputeAuditChecksum_EmptyChanges(t *testing.T) {
	got := helpers.ComputeAuditChecksum("t1", "u1", "create", "user", "e1", json.RawMessage(`null`), "2024-01-01T00:00:00Z")
	if len(got) != 64 {
		t.Errorf("expected 64 char hex, got %d", len(got))
	}
}

func TestComputeAuditChecksum_ValidSHA256(t *testing.T) {
	changes := json.RawMessage(`{"key":"value"}`)
	got := helpers.ComputeAuditChecksum("t1", "u1", "update", "project", "p1", changes, "2024-01-01T00:00:00Z")

	// Verify it's valid hex
	_, err := hex.DecodeString(got)
	if err != nil {
		t.Errorf("expected valid hex string, got error: %v", err)
	}
}
