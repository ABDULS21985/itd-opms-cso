package reporting

import (
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestBuildQuery_ProblemsUsesProblemsTable(t *testing.T) {
	t.Parallel()

	svc := &QueryBuilderService{}
	sortBy := "created_at"

	sql, args, err := svc.buildQuery(uuid.New(), ExecuteQueryRequest{
		EntityType: "problems",
		Columns:    []string{"problem_number", "title", "workaround"},
		SortBy:     &sortBy,
	}, 100)
	if err != nil {
		t.Fatalf("buildQuery returned error: %v", err)
	}

	if !strings.Contains(sql, " FROM problems ") {
		t.Fatalf("expected problems table in SQL, got %q", sql)
	}

	if strings.Contains(sql, "type = $2") {
		t.Fatalf("did not expect implicit ticket type filter for problems query, got %q", sql)
	}

	if !strings.Contains(sql, `problem_number AS "problem_number"`) {
		t.Fatalf("expected problem_number projection in SQL, got %q", sql)
	}

	if len(args) != 1 {
		t.Fatalf("expected only tenant_id arg, got %d args", len(args))
	}
}

func TestValidateQuerySpec_ProblemsRejectsTicketOnlyFields(t *testing.T) {
	t.Parallel()

	svc := &QueryBuilderService{}

	err := svc.validateQuerySpec("problems", []string{"ticket_number", "title"}, nil, nil, nil)
	if err == nil {
		t.Fatal("expected ticket-only field to be rejected for problems")
	}
}
