package planning

import (
	"testing"
)

// ──────────────────────────────────────────────
// isValidCRTransition
// ──────────────────────────────────────────────

func TestIsValidCRTransition_ValidTransitions(t *testing.T) {
	tests := []struct {
		name string
		from string
		to   string
	}{
		{"submitted -> under_review", CRStatusSubmitted, CRStatusUnderReview},
		{"under_review -> approved", CRStatusUnderReview, CRStatusApproved},
		{"under_review -> rejected", CRStatusUnderReview, CRStatusRejected},
		{"approved -> implemented", CRStatusApproved, CRStatusImplemented},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !isValidCRTransition(tt.from, tt.to) {
				t.Errorf("expected transition from %q to %q to be valid", tt.from, tt.to)
			}
		})
	}
}

func TestIsValidCRTransition_InvalidTransitions(t *testing.T) {
	tests := []struct {
		name string
		from string
		to   string
	}{
		// Cannot skip under_review.
		{"submitted -> approved", CRStatusSubmitted, CRStatusApproved},
		{"submitted -> rejected", CRStatusSubmitted, CRStatusRejected},
		{"submitted -> implemented", CRStatusSubmitted, CRStatusImplemented},
		{"submitted -> submitted", CRStatusSubmitted, CRStatusSubmitted},

		// Under review cannot go backwards or skip.
		{"under_review -> submitted", CRStatusUnderReview, CRStatusSubmitted},
		{"under_review -> implemented", CRStatusUnderReview, CRStatusImplemented},
		{"under_review -> under_review", CRStatusUnderReview, CRStatusUnderReview},

		// Approved cannot go backwards.
		{"approved -> submitted", CRStatusApproved, CRStatusSubmitted},
		{"approved -> under_review", CRStatusApproved, CRStatusUnderReview},
		{"approved -> rejected", CRStatusApproved, CRStatusRejected},
		{"approved -> approved", CRStatusApproved, CRStatusApproved},

		// Rejected is terminal.
		{"rejected -> submitted", CRStatusRejected, CRStatusSubmitted},
		{"rejected -> under_review", CRStatusRejected, CRStatusUnderReview},
		{"rejected -> approved", CRStatusRejected, CRStatusApproved},
		{"rejected -> implemented", CRStatusRejected, CRStatusImplemented},

		// Implemented is terminal.
		{"implemented -> submitted", CRStatusImplemented, CRStatusSubmitted},
		{"implemented -> under_review", CRStatusImplemented, CRStatusUnderReview},
		{"implemented -> approved", CRStatusImplemented, CRStatusApproved},

		// Unknown states.
		{"unknown -> submitted", "unknown", CRStatusSubmitted},
		{"empty -> submitted", "", CRStatusSubmitted},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if isValidCRTransition(tt.from, tt.to) {
				t.Errorf("expected transition from %q to %q to be invalid", tt.from, tt.to)
			}
		})
	}
}
