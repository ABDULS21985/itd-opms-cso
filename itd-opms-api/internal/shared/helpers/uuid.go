package helpers

import "github.com/google/uuid"

// NewUUID generates a new UUID v4.
func NewUUID() uuid.UUID {
	return uuid.New()
}

// ParseUUID parses a UUID string, returning uuid.Nil on error.
func ParseUUID(s string) uuid.UUID {
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil
	}
	return id
}

// IsValidUUID checks if a string is a valid UUID.
func IsValidUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}
