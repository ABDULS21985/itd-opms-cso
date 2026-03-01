package people

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// generatePeriods — monthly
// ──────────────────────────────────────────────

func TestGeneratePeriods_MonthGranularity(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	periods := generatePeriods(start, end, "month")

	expected := []string{"2026-01", "2026-02", "2026-03"}
	if len(periods) != len(expected) {
		t.Fatalf("expected %d periods, got %d: %v", len(expected), len(periods), periods)
	}
	for i, p := range periods {
		if p != expected[i] {
			t.Errorf("period[%d] = %q, want %q", i, p, expected[i])
		}
	}
}

func TestGeneratePeriods_SingleMonth(t *testing.T) {
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)

	periods := generatePeriods(start, end, "month")

	if len(periods) != 1 {
		t.Fatalf("expected 1 period, got %d: %v", len(periods), periods)
	}
	if periods[0] != "2026-06" {
		t.Errorf("expected 2026-06, got %q", periods[0])
	}
}

func TestGeneratePeriods_MidMonthStart(t *testing.T) {
	// Even starting mid-month, the first month should still appear
	start := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC)

	periods := generatePeriods(start, end, "month")

	expected := []string{"2026-03", "2026-04", "2026-05"}
	if len(periods) != len(expected) {
		t.Fatalf("expected %d periods, got %d: %v", len(expected), len(periods), periods)
	}
	for i, p := range periods {
		if p != expected[i] {
			t.Errorf("period[%d] = %q, want %q", i, p, expected[i])
		}
	}
}

func TestGeneratePeriods_CrossYearBoundary(t *testing.T) {
	start := time.Date(2025, 11, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC)

	periods := generatePeriods(start, end, "month")

	expected := []string{"2025-11", "2025-12", "2026-01", "2026-02"}
	if len(periods) != len(expected) {
		t.Fatalf("expected %d periods, got %d: %v", len(expected), len(periods), periods)
	}
	for i, p := range periods {
		if p != expected[i] {
			t.Errorf("period[%d] = %q, want %q", i, p, expected[i])
		}
	}
}

func TestGeneratePeriods_EndBeforeStart_ReturnsEmpty(t *testing.T) {
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)

	periods := generatePeriods(start, end, "month")

	if len(periods) != 0 {
		t.Errorf("expected empty periods, got %v", periods)
	}
}

// ──────────────────────────────────────────────
// generatePeriods — weekly
// ──────────────────────────────────────────────

func TestGeneratePeriods_WeekGranularity(t *testing.T) {
	// 2026-03-02 is a Monday (ISO week 10)
	start := time.Date(2026, 3, 2, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 22, 0, 0, 0, 0, time.UTC)

	periods := generatePeriods(start, end, "week")

	if len(periods) < 3 {
		t.Fatalf("expected at least 3 weekly periods, got %d: %v", len(periods), periods)
	}

	// All periods should match the YYYY-Www format
	for _, p := range periods {
		if len(p) < 7 || p[4] != '-' || p[5] != 'W' {
			t.Errorf("period %q does not match YYYY-Www format", p)
		}
	}
}

func TestGeneratePeriods_WeekAlignToMonday(t *testing.T) {
	// 2026-03-04 is a Wednesday — should align back to Monday (2026-03-02)
	start := time.Date(2026, 3, 4, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 10, 0, 0, 0, 0, time.UTC)

	periods := generatePeriods(start, end, "week")

	if len(periods) == 0 {
		t.Fatal("expected at least 1 weekly period")
	}
	// First period should be the week containing March 4th
	// which is ISO week 10 of 2026
	if periods[0] != "2026-W10" {
		t.Errorf("expected first period to be 2026-W10, got %q", periods[0])
	}
}

func TestGeneratePeriods_InvalidGranularity_DefaultsToMonth(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	// "day" is not recognized, so should default to month (the else branch)
	periods := generatePeriods(start, end, "day")

	expected := []string{"2026-01", "2026-02", "2026-03"}
	if len(periods) != len(expected) {
		t.Fatalf("expected %d periods, got %d: %v", len(expected), len(periods), periods)
	}
}

// ──────────────────────────────────────────────
// periodBounds
// ──────────────────────────────────────────────

func TestPeriodBounds_Month(t *testing.T) {
	start, end := periodBounds("2026-03", "month")

	expectedStart := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	expectedEnd := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	if !start.Equal(expectedStart) {
		t.Errorf("start = %v, want %v", start, expectedStart)
	}
	if !end.Equal(expectedEnd) {
		t.Errorf("end = %v, want %v", end, expectedEnd)
	}
}

func TestPeriodBounds_MonthFebruary(t *testing.T) {
	start, end := periodBounds("2026-02", "month")

	expectedStart := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	expectedEnd := time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC)

	if !start.Equal(expectedStart) {
		t.Errorf("start = %v, want %v", start, expectedStart)
	}
	if !end.Equal(expectedEnd) {
		t.Errorf("end = %v, want %v", end, expectedEnd)
	}
}

func TestPeriodBounds_MonthFebruaryLeapYear(t *testing.T) {
	start, end := periodBounds("2028-02", "month")

	expectedStart := time.Date(2028, 2, 1, 0, 0, 0, 0, time.UTC)
	expectedEnd := time.Date(2028, 2, 29, 0, 0, 0, 0, time.UTC)

	if !start.Equal(expectedStart) {
		t.Errorf("start = %v, want %v", start, expectedStart)
	}
	if !end.Equal(expectedEnd) {
		t.Errorf("end = %v, want %v", end, expectedEnd)
	}
}

func TestPeriodBounds_Week(t *testing.T) {
	start, end := periodBounds("2026-W10", "week")

	// ISO week 10 of 2026: Monday = 2026-03-02, Sunday = 2026-03-08
	if start.Weekday() != time.Monday {
		t.Errorf("expected start to be Monday, got %s (%v)", start.Weekday(), start)
	}
	if end.Weekday() != time.Sunday {
		t.Errorf("expected end to be Sunday, got %s (%v)", end.Weekday(), end)
	}
	// End should be exactly 6 days after start
	diff := end.Sub(start)
	if diff != 6*24*time.Hour {
		t.Errorf("expected 6-day span, got %v", diff)
	}
}

// ──────────────────────────────────────────────
// periodOverlaps
// ──────────────────────────────────────────────

func TestPeriodOverlaps_FullOverlap(t *testing.T) {
	allocStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	allocEnd := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)

	if !periodOverlaps(allocStart, allocEnd, "2026-06", "month") {
		t.Error("expected overlap when allocation spans entire year")
	}
}

func TestPeriodOverlaps_NoOverlap(t *testing.T) {
	allocStart := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	allocEnd := time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)

	if periodOverlaps(allocStart, allocEnd, "2026-03", "month") {
		t.Error("expected no overlap: allocation in Q3, period in March")
	}
}

func TestPeriodOverlaps_PartialOverlap(t *testing.T) {
	allocStart := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	allocEnd := time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC)

	if !periodOverlaps(allocStart, allocEnd, "2026-03", "month") {
		t.Error("expected overlap: allocation starts March 15, period is March")
	}
}

func TestPeriodOverlaps_ExactMatch(t *testing.T) {
	allocStart := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	allocEnd := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	if !periodOverlaps(allocStart, allocEnd, "2026-03", "month") {
		t.Error("expected overlap: allocation exactly matches March")
	}
}

func TestPeriodOverlaps_AllocEndsOnPeriodStart(t *testing.T) {
	allocStart := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	allocEnd := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)

	// Allocation ends on March 1, period starts March 1 — should overlap
	if !periodOverlaps(allocStart, allocEnd, "2026-03", "month") {
		t.Error("expected overlap when allocation end touches period start")
	}
}

func TestPeriodOverlaps_AllocStartsOnPeriodEnd(t *testing.T) {
	allocStart := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	allocEnd := time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC)

	// Allocation starts on March 31, which is end of March period
	if !periodOverlaps(allocStart, allocEnd, "2026-03", "month") {
		t.Error("expected overlap when allocation start touches period end")
	}
}

// ──────────────────────────────────────────────
// computeSummary
// ──────────────────────────────────────────────

func TestComputeSummary_EmptyRows(t *testing.T) {
	summary := computeSummary([]HeatmapRow{})

	if summary.TotalUsers != 0 {
		t.Errorf("TotalUsers = %d, want 0", summary.TotalUsers)
	}
	if summary.OverAllocatedUsers != 0 {
		t.Errorf("OverAllocatedUsers = %d, want 0", summary.OverAllocatedUsers)
	}
	if summary.UnderUtilizedUsers != 0 {
		t.Errorf("UnderUtilizedUsers = %d, want 0", summary.UnderUtilizedUsers)
	}
	if summary.AverageUtilization != 0 {
		t.Errorf("AverageUtilization = %f, want 0", summary.AverageUtilization)
	}
}

func TestComputeSummary_AllOverAllocated(t *testing.T) {
	rows := []HeatmapRow{
		{ID: uuid.New(), Label: "User A", AverageLoad: 120},
		{ID: uuid.New(), Label: "User B", AverageLoad: 150},
	}

	summary := computeSummary(rows)

	if summary.TotalUsers != 2 {
		t.Errorf("TotalUsers = %d, want 2", summary.TotalUsers)
	}
	if summary.OverAllocatedUsers != 2 {
		t.Errorf("OverAllocatedUsers = %d, want 2", summary.OverAllocatedUsers)
	}
	if summary.UnderUtilizedUsers != 0 {
		t.Errorf("UnderUtilizedUsers = %d, want 0", summary.UnderUtilizedUsers)
	}
	expectedAvg := 135.0
	if summary.AverageUtilization != expectedAvg {
		t.Errorf("AverageUtilization = %f, want %f", summary.AverageUtilization, expectedAvg)
	}
}

func TestComputeSummary_AllUnderUtilized(t *testing.T) {
	rows := []HeatmapRow{
		{ID: uuid.New(), Label: "User A", AverageLoad: 20},
		{ID: uuid.New(), Label: "User B", AverageLoad: 30},
	}

	summary := computeSummary(rows)

	if summary.TotalUsers != 2 {
		t.Errorf("TotalUsers = %d, want 2", summary.TotalUsers)
	}
	if summary.OverAllocatedUsers != 0 {
		t.Errorf("OverAllocatedUsers = %d, want 0", summary.OverAllocatedUsers)
	}
	if summary.UnderUtilizedUsers != 2 {
		t.Errorf("UnderUtilizedUsers = %d, want 2", summary.UnderUtilizedUsers)
	}
}

func TestComputeSummary_MixedLoad(t *testing.T) {
	rows := []HeatmapRow{
		{ID: uuid.New(), Label: "Over", AverageLoad: 110},
		{ID: uuid.New(), Label: "Normal", AverageLoad: 80},
		{ID: uuid.New(), Label: "Under", AverageLoad: 30},
	}

	summary := computeSummary(rows)

	if summary.TotalUsers != 3 {
		t.Errorf("TotalUsers = %d, want 3", summary.TotalUsers)
	}
	if summary.OverAllocatedUsers != 1 {
		t.Errorf("OverAllocatedUsers = %d, want 1", summary.OverAllocatedUsers)
	}
	if summary.UnderUtilizedUsers != 1 {
		t.Errorf("UnderUtilizedUsers = %d, want 1", summary.UnderUtilizedUsers)
	}
}

func TestComputeSummary_BoundaryAt100(t *testing.T) {
	// AverageLoad exactly 100 is NOT over-allocated (> 100)
	rows := []HeatmapRow{
		{ID: uuid.New(), Label: "User A", AverageLoad: 100},
	}

	summary := computeSummary(rows)

	if summary.OverAllocatedUsers != 0 {
		t.Errorf("OverAllocatedUsers = %d, want 0 (100 is not > 100)", summary.OverAllocatedUsers)
	}
}

func TestComputeSummary_BoundaryAt50(t *testing.T) {
	// AverageLoad exactly 50 is NOT under-utilized (< 50)
	rows := []HeatmapRow{
		{ID: uuid.New(), Label: "User A", AverageLoad: 50},
	}

	summary := computeSummary(rows)

	if summary.UnderUtilizedUsers != 0 {
		t.Errorf("UnderUtilizedUsers = %d, want 0 (50 is not < 50)", summary.UnderUtilizedUsers)
	}
}

// ──────────────────────────────────────────────
// buildUserRows
// ──────────────────────────────────────────────

func TestBuildUserRows_EmptyAllocations(t *testing.T) {
	periods := []string{"2026-03", "2026-04"}
	rows := buildUserRows(nil, periods, "month")

	if len(rows) != 0 {
		t.Errorf("expected 0 rows for nil allocations, got %d", len(rows))
	}
}

func TestBuildUserRows_SingleUserSinglePeriod(t *testing.T) {
	userID := uuid.New()
	projectID := uuid.New()

	allocations := []rawAllocation{
		{
			ID:            uuid.New(),
			UserID:        userID,
			UserName:      "Alice",
			ProjectID:     projectID,
			ProjectTitle:  "Project Alpha",
			AllocationPct: 60,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	periods := []string{"2026-03"}
	rows := buildUserRows(allocations, periods, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	if rows[0].Label != "Alice" {
		t.Errorf("Label = %q, want Alice", rows[0].Label)
	}
	if rows[0].ID != userID {
		t.Errorf("ID = %v, want %v", rows[0].ID, userID)
	}
	if len(rows[0].Cells) != 1 {
		t.Fatalf("expected 1 cell, got %d", len(rows[0].Cells))
	}
	if rows[0].Cells[0].AllocationPct != 60 {
		t.Errorf("AllocationPct = %f, want 60", rows[0].Cells[0].AllocationPct)
	}
	if rows[0].Cells[0].ProjectCount != 1 {
		t.Errorf("ProjectCount = %d, want 1", rows[0].Cells[0].ProjectCount)
	}
	if rows[0].AverageLoad != 60 {
		t.Errorf("AverageLoad = %f, want 60", rows[0].AverageLoad)
	}
}

func TestBuildUserRows_MultipleProjectsSamePeriod(t *testing.T) {
	userID := uuid.New()
	projA := uuid.New()
	projB := uuid.New()

	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: userID, UserName: "Bob",
			ProjectID: projA, ProjectTitle: "Alpha",
			AllocationPct: 40,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
		{
			ID: uuid.New(), UserID: userID, UserName: "Bob",
			ProjectID: projB, ProjectTitle: "Beta",
			AllocationPct: 50,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	periods := []string{"2026-03"}
	rows := buildUserRows(allocations, periods, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	cell := rows[0].Cells[0]
	if cell.AllocationPct != 90 {
		t.Errorf("AllocationPct = %f, want 90", cell.AllocationPct)
	}
	if cell.ProjectCount != 2 {
		t.Errorf("ProjectCount = %d, want 2", cell.ProjectCount)
	}
}

func TestBuildUserRows_AllocationDoesNotOverlapPeriod(t *testing.T) {
	userID := uuid.New()

	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: userID, UserName: "Carol",
			ProjectID: uuid.New(), ProjectTitle: "X",
			AllocationPct: 100,
			PeriodStart:   time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		},
	}

	periods := []string{"2026-03"}
	rows := buildUserRows(allocations, periods, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	if rows[0].Cells[0].AllocationPct != 0 {
		t.Errorf("AllocationPct = %f, want 0 (no overlap)", rows[0].Cells[0].AllocationPct)
	}
}

func TestBuildUserRows_AverageLoadAcrossMultiplePeriods(t *testing.T) {
	userID := uuid.New()

	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: userID, UserName: "Dave",
			ProjectID: uuid.New(), ProjectTitle: "Y",
			AllocationPct: 80,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 4, 30, 0, 0, 0, 0, time.UTC),
		},
	}

	periods := []string{"2026-03", "2026-04", "2026-05"}
	rows := buildUserRows(allocations, periods, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}

	// Allocation is 80% for March and April, 0% for May
	// Average = (80 + 80 + 0) / 3 = 53.33
	expectedAvg := 53.33
	if rows[0].AverageLoad < expectedAvg-0.01 || rows[0].AverageLoad > expectedAvg+0.01 {
		t.Errorf("AverageLoad = %f, want ~%f", rows[0].AverageLoad, expectedAvg)
	}
}

// ──────────────────────────────────────────────
// buildProjectRows
// ──────────────────────────────────────────────

func TestBuildProjectRows_EmptyAllocations(t *testing.T) {
	periods := []string{"2026-03"}
	rows := buildProjectRows(nil, periods, "month")

	if len(rows) != 0 {
		t.Errorf("expected 0 rows for nil allocations, got %d", len(rows))
	}
}

func TestBuildProjectRows_SingleProjectMultipleUsers(t *testing.T) {
	projectID := uuid.New()
	userA := uuid.New()
	userB := uuid.New()

	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: userA, UserName: "Alice",
			ProjectID: projectID, ProjectTitle: "Project Alpha",
			AllocationPct: 40,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
		{
			ID: uuid.New(), UserID: userB, UserName: "Bob",
			ProjectID: projectID, ProjectTitle: "Project Alpha",
			AllocationPct: 60,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	periods := []string{"2026-03"}
	rows := buildProjectRows(allocations, periods, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	if rows[0].Label != "Project Alpha" {
		t.Errorf("Label = %q, want %q", rows[0].Label, "Project Alpha")
	}
	cell := rows[0].Cells[0]
	if cell.AllocationPct != 100 {
		t.Errorf("AllocationPct = %f, want 100", cell.AllocationPct)
	}
	if cell.ProjectCount != 2 {
		t.Errorf("ProjectCount (user count for project groupBy) = %d, want 2", cell.ProjectCount)
	}
}

func TestBuildProjectRows_MultipleProjectsSeparated(t *testing.T) {
	projA := uuid.New()
	projB := uuid.New()
	userID := uuid.New()

	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: userID, UserName: "Alice",
			ProjectID: projA, ProjectTitle: "Alpha",
			AllocationPct: 50,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
		{
			ID: uuid.New(), UserID: userID, UserName: "Alice",
			ProjectID: projB, ProjectTitle: "Beta",
			AllocationPct: 50,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	periods := []string{"2026-03"}
	rows := buildProjectRows(allocations, periods, "month")

	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
}

// ──────────────────────────────────────────────
// proficiencyOrder
// ──────────────────────────────────────────────

func TestProficiencyOrder_Values(t *testing.T) {
	tests := []struct {
		level string
		order int
	}{
		{"beginner", 1},
		{"intermediate", 2},
		{"advanced", 3},
		{"expert", 4},
	}

	for _, tt := range tests {
		t.Run(tt.level, func(t *testing.T) {
			got, ok := proficiencyOrder[tt.level]
			if !ok {
				t.Fatalf("proficiencyOrder does not contain %q", tt.level)
			}
			if got != tt.order {
				t.Errorf("proficiencyOrder[%q] = %d, want %d", tt.level, got, tt.order)
			}
		})
	}
}

func TestProficiencyOrder_Cardinality(t *testing.T) {
	if len(proficiencyOrder) != 4 {
		t.Errorf("expected 4 proficiency levels, got %d", len(proficiencyOrder))
	}
}

func TestProficiencyOrder_Monotonic(t *testing.T) {
	levels := []string{"beginner", "intermediate", "advanced", "expert"}
	for i := 1; i < len(levels); i++ {
		prev := proficiencyOrder[levels[i-1]]
		curr := proficiencyOrder[levels[i]]
		if curr <= prev {
			t.Errorf("proficiencyOrder[%q]=%d should be > proficiencyOrder[%q]=%d",
				levels[i], curr, levels[i-1], prev)
		}
	}
}

func TestProficiencyOrder_UnknownLevel(t *testing.T) {
	_, ok := proficiencyOrder["master"]
	if ok {
		t.Error("expected 'master' not to be in proficiencyOrder")
	}
}

// ──────────────────────────────────────────────
// buildUserRows — rounding
// ──────────────────────────────────────────────

func TestBuildUserRows_AllocationPctRounding(t *testing.T) {
	userID := uuid.New()

	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: userID, UserName: "Eve",
			ProjectID: uuid.New(), ProjectTitle: "P1",
			AllocationPct: 33.33,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
		{
			ID: uuid.New(), UserID: userID, UserName: "Eve",
			ProjectID: uuid.New(), ProjectTitle: "P2",
			AllocationPct: 33.33,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
		{
			ID: uuid.New(), UserID: userID, UserName: "Eve",
			ProjectID: uuid.New(), ProjectTitle: "P3",
			AllocationPct: 33.34,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	periods := []string{"2026-03"}
	rows := buildUserRows(allocations, periods, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	cell := rows[0].Cells[0]
	// 33.33 + 33.33 + 33.34 = 100.0, should round to 100
	if cell.AllocationPct != 100 {
		t.Errorf("AllocationPct = %f, want 100 (rounded)", cell.AllocationPct)
	}
}

// ──────────────────────────────────────────────
// buildUserRows/buildProjectRows — empty periods
// ──────────────────────────────────────────────

func TestBuildUserRows_EmptyPeriods(t *testing.T) {
	userID := uuid.New()
	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: userID, UserName: "Frank",
			ProjectID: uuid.New(), ProjectTitle: "X",
			AllocationPct: 100,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	rows := buildUserRows(allocations, []string{}, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	if len(rows[0].Cells) != 0 {
		t.Errorf("expected 0 cells for empty periods, got %d", len(rows[0].Cells))
	}
	if rows[0].AverageLoad != 0 {
		t.Errorf("AverageLoad = %f, want 0 for empty periods", rows[0].AverageLoad)
	}
}

func TestBuildProjectRows_EmptyPeriods(t *testing.T) {
	projID := uuid.New()
	allocations := []rawAllocation{
		{
			ID: uuid.New(), UserID: uuid.New(), UserName: "Grace",
			ProjectID: projID, ProjectTitle: "Proj",
			AllocationPct: 100,
			PeriodStart:   time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:     time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	rows := buildProjectRows(allocations, []string{}, "month")

	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	if len(rows[0].Cells) != 0 {
		t.Errorf("expected 0 cells for empty periods, got %d", len(rows[0].Cells))
	}
}

// ──────────────────────────────────────────────
// computeSummary — AverageUtilization rounding
// ──────────────────────────────────────────────

func TestComputeSummary_AverageUtilizationRounding(t *testing.T) {
	rows := []HeatmapRow{
		{ID: uuid.New(), Label: "A", AverageLoad: 33.33},
		{ID: uuid.New(), Label: "B", AverageLoad: 33.33},
		{ID: uuid.New(), Label: "C", AverageLoad: 33.34},
	}

	summary := computeSummary(rows)

	// (33.33 + 33.33 + 33.34) / 3 = 33.3333... → rounded to 33.33
	if summary.AverageUtilization != 33.33 {
		t.Errorf("AverageUtilization = %f, want 33.33", summary.AverageUtilization)
	}
}
