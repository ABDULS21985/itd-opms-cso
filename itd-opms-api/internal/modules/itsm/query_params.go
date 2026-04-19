package itsm

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func queryValueAny(r *http.Request, keys ...string) string {
	query := r.URL.Query()
	for _, key := range keys {
		if value := query.Get(key); value != "" {
			return value
		}
	}
	return ""
}

func optionalString(r *http.Request, keys ...string) *string {
	if value := queryValueAny(r, keys...); value != "" {
		return &value
	}
	return nil
}

func optionalUUIDAny(r *http.Request, keys ...string) *uuid.UUID {
	if value := queryValueAny(r, keys...); value != "" {
		if parsed, err := uuid.Parse(value); err == nil {
			return &parsed
		}
	}
	return nil
}

func optionalTime(r *http.Request, keys ...string) (*time.Time, error) {
	for _, key := range keys {
		if value := r.URL.Query().Get(key); value != "" {
			if parsed, err := time.Parse(time.RFC3339, value); err == nil {
				return &parsed, nil
			}
			if parsed, err := time.Parse("2006-01-02", value); err == nil {
				return &parsed, nil
			}
			return nil, fmt.Errorf("invalid %s value", key)
		}
	}
	return nil, nil
}
