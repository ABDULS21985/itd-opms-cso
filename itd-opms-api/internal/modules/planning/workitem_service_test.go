package planning

import (
	"testing"
)

// ──────────────────────────────────────────────
// isValidWorkItemTransition
// ──────────────────────────────────────────────

func TestIsValidWorkItemTransition_ValidTransitions(t *testing.T) {
	tests := []struct {
		name string
		from string
		to   string
	}{
		{"todo -> in_progress", WorkItemStatusTodo, WorkItemStatusInProgress},
		{"in_progress -> in_review", WorkItemStatusInProgress, WorkItemStatusInReview},
		{"in_progress -> done", WorkItemStatusInProgress, WorkItemStatusDone},
		{"in_progress -> blocked", WorkItemStatusInProgress, WorkItemStatusBlocked},
		{"in_review -> done", WorkItemStatusInReview, WorkItemStatusDone},
		{"in_review -> in_progress", WorkItemStatusInReview, WorkItemStatusInProgress},
		{"blocked -> in_progress", WorkItemStatusBlocked, WorkItemStatusInProgress},
		{"blocked -> todo", WorkItemStatusBlocked, WorkItemStatusTodo},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !isValidWorkItemTransition(tt.from, tt.to) {
				t.Errorf("expected transition from %q to %q to be valid", tt.from, tt.to)
			}
		})
	}
}

func TestIsValidWorkItemTransition_InvalidTransitions(t *testing.T) {
	tests := []struct {
		name string
		from string
		to   string
	}{
		{"todo -> done", WorkItemStatusTodo, WorkItemStatusDone},
		{"todo -> in_review", WorkItemStatusTodo, WorkItemStatusInReview},
		{"todo -> blocked", WorkItemStatusTodo, WorkItemStatusBlocked},
		{"todo -> todo", WorkItemStatusTodo, WorkItemStatusTodo},
		{"in_progress -> todo", WorkItemStatusInProgress, WorkItemStatusTodo},
		{"in_progress -> in_progress", WorkItemStatusInProgress, WorkItemStatusInProgress},
		{"in_review -> todo", WorkItemStatusInReview, WorkItemStatusTodo},
		{"in_review -> blocked", WorkItemStatusInReview, WorkItemStatusBlocked},
		{"in_review -> in_review", WorkItemStatusInReview, WorkItemStatusInReview},
		{"blocked -> done", WorkItemStatusBlocked, WorkItemStatusDone},
		{"blocked -> in_review", WorkItemStatusBlocked, WorkItemStatusInReview},
		{"blocked -> blocked", WorkItemStatusBlocked, WorkItemStatusBlocked},
		{"done -> anything", WorkItemStatusDone, WorkItemStatusTodo},
		{"done -> in_progress", WorkItemStatusDone, WorkItemStatusInProgress},
		{"unknown -> in_progress", "unknown", WorkItemStatusInProgress},
		{"empty -> in_progress", "", WorkItemStatusInProgress},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if isValidWorkItemTransition(tt.from, tt.to) {
				t.Errorf("expected transition from %q to %q to be invalid", tt.from, tt.to)
			}
		})
	}
}

// ──────────────────────────────────────────────
// workItemColumnForField
// ──────────────────────────────────────────────

func TestWorkItemColumnForField_ValidFields(t *testing.T) {
	tests := []struct {
		field    string
		expected string
	}{
		{"status", "status"},
		{"priority", "priority"},
		{"assigneeId", "assignee_id"},
		{"dueDate", "due_date"},
	}

	for _, tt := range tests {
		t.Run(tt.field, func(t *testing.T) {
			got := workItemColumnForField(tt.field)
			if got != tt.expected {
				t.Errorf("workItemColumnForField(%q) = %q, expected %q", tt.field, got, tt.expected)
			}
		})
	}
}

func TestWorkItemColumnForField_InvalidFields(t *testing.T) {
	tests := []string{
		"title",
		"description",
		"id",
		"tenantId",
		"projectId",
		"",
		"unknown",
		"created_at",
	}

	for _, field := range tests {
		t.Run(field, func(t *testing.T) {
			got := workItemColumnForField(field)
			if got != "" {
				t.Errorf("workItemColumnForField(%q) = %q, expected empty string", field, got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// joinWorkItemStrings
// ──────────────────────────────────────────────

func TestJoinWorkItemStrings(t *testing.T) {
	tests := []struct {
		name     string
		elems    []string
		sep      string
		expected string
	}{
		{"empty", []string{}, ", ", ""},
		{"single", []string{"a"}, ", ", "a"},
		{"two", []string{"a", "b"}, ", ", "a, b"},
		{"three", []string{"x", "y", "z"}, " AND ", "x AND y AND z"},
		{"different separator", []string{"col1 = $1", "col2 = $2"}, ", ", "col1 = $1, col2 = $2"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := joinWorkItemStrings(tt.elems, tt.sep)
			if got != tt.expected {
				t.Errorf("joinWorkItemStrings(%v, %q) = %q, expected %q", tt.elems, tt.sep, got, tt.expected)
			}
		})
	}
}
