package helpers_test

import (
	"regexp"
	"testing"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/shared/helpers"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

// ──────────────────────────────────────────────
// NewUUID
// ──────────────────────────────────────────────

func TestNewUUID_ReturnsValidUUIDv4(t *testing.T) {
	id := helpers.NewUUID()
	if id == uuid.Nil {
		t.Error("expected non-nil UUID")
	}
	if !uuidPattern.MatchString(id.String()) {
		t.Errorf("expected v4 UUID pattern, got %s", id.String())
	}
}

func TestNewUUID_Uniqueness(t *testing.T) {
	seen := make(map[uuid.UUID]struct{}, 1000)
	for i := 0; i < 1000; i++ {
		id := helpers.NewUUID()
		if _, exists := seen[id]; exists {
			t.Fatalf("duplicate UUID generated at iteration %d: %s", i, id)
		}
		seen[id] = struct{}{}
	}
}

func TestNewUUID_FormatMatches(t *testing.T) {
	id := helpers.NewUUID()
	s := id.String()
	if len(s) != 36 {
		t.Errorf("expected UUID string length 36, got %d", len(s))
	}
	// Check dashes at positions 8, 13, 18, 23
	if s[8] != '-' || s[13] != '-' || s[18] != '-' || s[23] != '-' {
		t.Errorf("unexpected UUID format: %s", s)
	}
}

// ──────────────────────────────────────────────
// ParseUUID
// ──────────────────────────────────────────────

func TestParseUUID_ValidInput(t *testing.T) {
	input := "550e8400-e29b-41d4-a716-446655440000"
	got := helpers.ParseUUID(input)
	if got.String() != input {
		t.Errorf("expected %s, got %s", input, got.String())
	}
}

func TestParseUUID_InvalidInput(t *testing.T) {
	got := helpers.ParseUUID("not-a-uuid")
	if got != uuid.Nil {
		t.Errorf("expected uuid.Nil for invalid input, got %s", got)
	}
}

func TestParseUUID_EmptyString(t *testing.T) {
	got := helpers.ParseUUID("")
	if got != uuid.Nil {
		t.Errorf("expected uuid.Nil for empty string, got %s", got)
	}
}

func TestParseUUID_RoundTrip(t *testing.T) {
	original := helpers.NewUUID()
	parsed := helpers.ParseUUID(original.String())
	if parsed != original {
		t.Errorf("round trip failed: original=%s, parsed=%s", original, parsed)
	}
}

// ──────────────────────────────────────────────
// IsValidUUID
// ──────────────────────────────────────────────

func TestIsValidUUID_Valid(t *testing.T) {
	if !helpers.IsValidUUID("550e8400-e29b-41d4-a716-446655440000") {
		t.Error("expected valid UUID to return true")
	}
}

func TestIsValidUUID_GeneratedUUID(t *testing.T) {
	id := helpers.NewUUID()
	if !helpers.IsValidUUID(id.String()) {
		t.Errorf("expected generated UUID %s to be valid", id)
	}
}

func TestIsValidUUID_Invalid(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{"empty", ""},
		{"random string", "not-a-uuid"},
		{"too short", "550e8400-e29b-41d4"},
		{"extra chars", "550e8400-e29b-41d4-a716-446655440000x"},
		{"all zeros invalid format", "0000"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if helpers.IsValidUUID(tt.input) {
				t.Errorf("expected %q to be invalid", tt.input)
			}
		})
	}
}
