package system

import (
	"os"
	"strings"
	"testing"
	"unicode/utf16"
)

func TestParseERPDirectoryDump_UTF16AndPrepare(t *testing.T) {
	sql := "\ufeffUSE [ERP_DATA]\n" +
		"INSERT [dbo].[ERP_EMPLOYEE_DETAILS] ([ORGANIZATION_ID], [PERSON_ID], [USER_NAME], [EMAIL_ADDRESS], [PERSON_TYPE_ID], [TITLE], [FIRST_NAME], [MIDDLE_NAMES], [LAST_NAME], [EMPLOYEE_NUMBER], [ASSIGNMENT_NUMBER], [ORIGINAL_DATE_OF_HIRE], [OFFICE_ID], [SUPERVISOR_ID], [JOB_NAME], [HEAD_OF_OFFICE_ID], [LOCATION_ID], [LOCATION_CODE], [MOBILE_NUMBER], [STATUS], [TERMINATION_DATE], [DEPARTMENT_ID], [DEPARTMENT_NAME], [HEAD_OF_DEPT_ID], [HEAD_OF_DEPT_NAME], [DIVISION_ID], [DIVISION_NAME], [HEAD_OF_DIV_ID], [HEAD_OF_DIV_NAME], [OFFICE_NAME], [GRADE_ID], [GRADE], [CREATION_DATE], [LAST_UPDATE_DATE], [BANK_ACCOUNT_NUMBER], [RELIGION], [STATE_OF_ORIGIN], [SENATORIAL_DISTRICT], [LGA], [BANK_CODE], [GEO_POLITICAL_ZONE], [FULL_NAME], [ASSIGNMENT_ID], [POSITION], [WALLET_ID], [WALLET_ALIAS]) VALUES (1, 10, N'USER00001', N'USER1@cbn.gov.ng', 1123, N'MR.', N'ALPHA', N'BETA', N'DIRECTOR', N'00001', N'00001', CAST(N'2020-01-01T00:00:00.0000000' AS DateTime2), 101, N'00002', N'DIRECTOR', NULL, 147, N'CBN ABUJA CBD HQ', NULL, N'Active Assignment', NULL, 1, N'Information Technology Department', N'00001', N'DIRECTOR, Mr. ALPHA BETA 00001', 2, N'Application Management Division', N'00001', N'DIRECTOR, Mr. ALPHA BETA 00001', N'Application Administration Office', 61, N'01', CAST(N'2020-01-01T00:00:00.0000000' AS DateTime2), NULL, N'123', N'Hidden', N'LA', NULL, N'ABC', N'001', NULL, N'DIRECTOR, Mr. ALPHA BETA 00001', 10, NULL, NULL, NULL)\n" +
		"INSERT [dbo].[ERP_EMPLOYEE_DETAILS] ([ORGANIZATION_ID], [PERSON_ID], [USER_NAME], [EMAIL_ADDRESS], [PERSON_TYPE_ID], [TITLE], [FIRST_NAME], [MIDDLE_NAMES], [LAST_NAME], [EMPLOYEE_NUMBER], [ASSIGNMENT_NUMBER], [ORIGINAL_DATE_OF_HIRE], [OFFICE_ID], [SUPERVISOR_ID], [JOB_NAME], [HEAD_OF_OFFICE_ID], [LOCATION_ID], [LOCATION_CODE], [MOBILE_NUMBER], [STATUS], [TERMINATION_DATE], [DEPARTMENT_ID], [DEPARTMENT_NAME], [HEAD_OF_DEPT_ID], [HEAD_OF_DEPT_NAME], [DIVISION_ID], [DIVISION_NAME], [HEAD_OF_DIV_ID], [HEAD_OF_DIV_NAME], [OFFICE_NAME], [GRADE_ID], [GRADE], [CREATION_DATE], [LAST_UPDATE_DATE], [BANK_ACCOUNT_NUMBER], [RELIGION], [STATE_OF_ORIGIN], [SENATORIAL_DISTRICT], [LGA], [BANK_CODE], [GEO_POLITICAL_ZONE], [FULL_NAME], [ASSIGNMENT_ID], [POSITION], [WALLET_ID], [WALLET_ALIAS]) VALUES (1, 11, N'USER00002', N'USER1@cbn.gov.ng', 1123, N'MRS.', N'GAMMA', NULL, N'STAFF', N'00002', N'00002', CAST(N'2021-01-01T00:00:00.0000000' AS DateTime2), 102, N'00001', N'ASSISTANT DIRECTOR', NULL, 147, N'CBN ABUJA CBD HQ', NULL, N'Active Assignment', NULL, 1, N'Information Technology Department', N'00001', N'DIRECTOR, Mr. ALPHA BETA 00001', 2, N'Application Management Division', N'00001', N'DIRECTOR, Mr. ALPHA BETA 00001', N'Application Support Office', 63, N'03', CAST(N'2021-01-01T00:00:00.0000000' AS DateTime2), NULL, N'456', N'Hidden', N'LA', NULL, N'ABC', N'001', NULL, N'STAFF, Mrs. GAMMA 00002', 11, NULL, NULL, NULL)\n" +
		"INSERT [dbo].[ERP_EMPLOYEE_DETAILS] ([ORGANIZATION_ID], [PERSON_ID], [USER_NAME], [EMAIL_ADDRESS], [PERSON_TYPE_ID], [TITLE], [FIRST_NAME], [MIDDLE_NAMES], [LAST_NAME], [EMPLOYEE_NUMBER], [ASSIGNMENT_NUMBER], [ORIGINAL_DATE_OF_HIRE], [OFFICE_ID], [SUPERVISOR_ID], [JOB_NAME], [HEAD_OF_OFFICE_ID], [LOCATION_ID], [LOCATION_CODE], [MOBILE_NUMBER], [STATUS], [TERMINATION_DATE], [DEPARTMENT_ID], [DEPARTMENT_NAME], [HEAD_OF_DEPT_ID], [HEAD_OF_DEPT_NAME], [DIVISION_ID], [DIVISION_NAME], [HEAD_OF_DIV_ID], [HEAD_OF_DIV_NAME], [OFFICE_NAME], [GRADE_ID], [GRADE], [CREATION_DATE], [LAST_UPDATE_DATE], [BANK_ACCOUNT_NUMBER], [RELIGION], [STATE_OF_ORIGIN], [SENATORIAL_DISTRICT], [LGA], [BANK_CODE], [GEO_POLITICAL_ZONE], [FULL_NAME], [ASSIGNMENT_ID], [POSITION], [WALLET_ID], [WALLET_ALIAS]) VALUES (1, 12, N'USER00003', NULL, 1123, N'MR.', N'DELTA', NULL, N'INACTIVE', N'00003', N'00003', CAST(N'2022-01-01T00:00:00.0000000' AS DateTime2), 103, NULL, N'MANAGER', NULL, 147, N'CBN ABUJA CBD HQ', NULL, N'Terminate Job data', NULL, 1, N'Information Technology Department', N'00001', N'DIRECTOR, Mr. ALPHA BETA 00001', 3, N'Infrastructure Management Division', N'00002', N'STAFF, Mrs. GAMMA 00002', N'Infrastructure Office', 65, N'05', CAST(N'2022-01-01T00:00:00.0000000' AS DateTime2), NULL, N'789', N'Hidden', N'LA', NULL, N'ABC', N'001', NULL, N'INACTIVE, Mr. DELTA 00003', 12, NULL, NULL, NULL)\n"

	utf16Data := encodeUTF16LE(sql)
	records, parseErrors, err := parseERPDirectoryDump(utf16Data)
	if err != nil {
		t.Fatalf("parse dump: %v", err)
	}
	if len(parseErrors) != 0 {
		t.Fatalf("expected no parse errors, got %v", parseErrors)
	}
	if len(records) != 3 {
		t.Fatalf("expected 3 records, got %d", len(records))
	}

	prepared := prepareERPDirectory(records, nil, "fixture.sql", "checksum")
	if prepared.Preview.EmployeesTotal != 3 {
		t.Fatalf("expected 3 employees, got %d", prepared.Preview.EmployeesTotal)
	}
	if prepared.Preview.ActiveEmployees != 2 || prepared.Preview.InactiveEmployees != 1 {
		t.Fatalf("unexpected active/inactive counts: %+v", prepared.Preview)
	}
	if prepared.Preview.DuplicateEmails != 1 || prepared.Preview.MissingEmails != 1 {
		t.Fatalf("expected duplicate and missing email placeholders: %+v", prepared.Preview)
	}
	if prepared.Preview.ElevatedAdmins != 2 {
		t.Fatalf("expected director and assistant director to be elevated, got %d", prepared.Preview.ElevatedAdmins)
	}
	if _, ok := prepared.Supervisors["00001"]; !ok {
		t.Fatalf("expected employee 00001 to be detected as supervisor")
	}
}

func TestEffectiveERPEmailQuality(t *testing.T) {
	seen := map[string]string{}
	first := erpEmployeeRecord{EmployeeNumber: "001", EmailAddress: "FIRST@cbn.gov.ng"}
	email, quality, errs := effectiveERPEmail(first, seen)
	if email != "first@cbn.gov.ng" || quality != emailQualityValid || len(errs) != 0 {
		t.Fatalf("unexpected valid email result: %s %s %v", email, quality, errs)
	}

	duplicate := erpEmployeeRecord{EmployeeNumber: "002", EmailAddress: "first@cbn.gov.ng"}
	email, quality, errs = effectiveERPEmail(duplicate, seen)
	if email != "002@erp.invalid.local" || quality != emailQualityDuplicate || len(errs) == 0 {
		t.Fatalf("unexpected duplicate email result: %s %s %v", email, quality, errs)
	}

	invalid := erpEmployeeRecord{EmployeeNumber: "003", EmailAddress: "bad email"}
	email, quality, errs = effectiveERPEmail(invalid, seen)
	if email != "003@erp.invalid.local" || quality != emailQualityInvalid || len(errs) == 0 {
		t.Fatalf("unexpected invalid email result: %s %s %v", email, quality, errs)
	}
}

func TestServiceDeskRoleForERPJob(t *testing.T) {
	cases := []struct {
		job  string
		want string
	}{
		{job: "Service Desk Analyst", want: "service_desk_analyst"},
		{job: "Senior Service Desk Analyst", want: "senior_service_desk_analyst"},
		{job: "Help Desk Officer", want: "service_desk_analyst"},
		{job: "Senior System Analyst", want: ""},
	}
	for _, tc := range cases {
		if got := serviceDeskRoleForERPJob(tc.job); got != tc.want {
			t.Fatalf("serviceDeskRoleForERPJob(%q) = %q, want %q", tc.job, got, tc.want)
		}
	}
}

func TestServiceDeskRoleForERPAssignmentUsesOrgUnit(t *testing.T) {
	junior := erpEmployeeRecord{
		JobName:      "Officer",
		DivisionName: "IT Service Support Management Division",
	}
	if got := serviceDeskRoleForERPAssignment(junior); got != "service_desk_analyst" {
		t.Fatalf("expected IT service support officer to map to service_desk_analyst, got %q", got)
	}

	senior := erpEmployeeRecord{
		JobName:    "Senior Supervisor",
		OfficeName: "User Support Help Desk",
	}
	if got := serviceDeskRoleForERPAssignment(senior); got != "senior_service_desk_analyst" {
		t.Fatalf("expected senior help desk supervisor to map to senior_service_desk_analyst, got %q", got)
	}

	unrelated := erpEmployeeRecord{
		JobName:      "Officer",
		DivisionName: "Procurement Support Services",
	}
	if got := serviceDeskRoleForERPAssignment(unrelated); got != "" {
		t.Fatalf("expected unrelated support services role to be ignored, got %q", got)
	}
}

func TestProblemManagementRoleForERPAssignment(t *testing.T) {
	cases := []struct {
		name string
		rec  erpEmployeeRecord
		want string
	}{
		{
			name: "explicit senior service center specialist",
			rec:  erpEmployeeRecord{JobName: "Senior IT Service Centre Specialist"},
			want: "senior_it_service_center_specialist",
		},
		{
			name: "service centre org",
			rec:  erpEmployeeRecord{JobName: "Officer", OfficeName: "IT - Service Centre Office"},
			want: "it_service_center_specialist",
		},
		{
			name: "service support org",
			rec:  erpEmployeeRecord{JobName: "Officer", DivisionName: "IT Service Support Management Division"},
			want: "it_service_support_specialist",
		},
		{
			name: "senior support org accountable",
			rec:  erpEmployeeRecord{JobName: "Senior Supervisor", OfficeName: "User Support Help Desk"},
			want: "senior_it_service_center_specialist",
		},
		{
			name: "non IT help desk ignored",
			rec:  erpEmployeeRecord{JobName: "Manager", OfficeName: "HR Help Desk"},
			want: "",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := problemManagementRoleForERPAssignment(tc.rec); got != tc.want {
				t.Fatalf("problemManagementRoleForERPAssignment() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestIncidentManagementRolesForERPAssignment(t *testing.T) {
	cases := []struct {
		name string
		rec  erpEmployeeRecord
		want []string
	}{
		{
			name: "service desk specialist job",
			rec:  erpEmployeeRecord{JobName: "Service Desk Specialist"},
			want: []string{"service_desk_specialist"},
		},
		{
			name: "user support help desk maps service desk and first line",
			rec:  erpEmployeeRecord{JobName: "Officer", OfficeName: "User Support Help Desk"},
			want: []string{"service_desk_specialist", "end_user_support_specialist"},
		},
		{
			name: "application management maps second level",
			rec:  erpEmployeeRecord{JobName: "Technical Officer", DivisionName: "Application Management Division"},
			want: []string{"second_level_support_specialist"},
		},
		{
			name: "procurement ignored",
			rec:  erpEmployeeRecord{JobName: "Procurement Officer", DivisionName: "Procurement Support Services"},
			want: nil,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := incidentManagementRolesForERPAssignment(tc.rec)
			if strings.Join(got, ",") != strings.Join(tc.want, ",") {
				t.Fatalf("incidentManagementRolesForERPAssignment() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestParseERPDirectoryDump_FromEnv(t *testing.T) {
	path := os.Getenv("ERP_DIRECTORY_DUMP_PATH")
	if path == "" {
		t.Skip("ERP_DIRECTORY_DUMP_PATH not set")
	}

	records, parseErrors, checksum, err := parseERPDirectoryFile(path)
	if err != nil {
		t.Fatalf("parse ERP dump from env: %v", err)
	}
	if checksum == "" {
		t.Fatalf("expected source checksum")
	}
	if len(records) < 13000 {
		t.Fatalf("expected at least 13000 ERP employee records, got %d", len(records))
	}
	if len(parseErrors) > 10 {
		t.Fatalf("expected no more than 10 parse errors, got %d: %v", len(parseErrors), parseErrors[:10])
	}

	prepared := prepareERPDirectory(records, parseErrors, path, checksum)
	t.Logf("records=%d parse_errors=%d active=%d inactive=%d departments=%d divisions=%d offices=%d placeholders=%d elevated_admins=%d",
		len(records), len(parseErrors), prepared.Preview.ActiveEmployees, prepared.Preview.InactiveEmployees,
		prepared.Preview.Departments, prepared.Preview.Divisions, prepared.Preview.Offices,
		prepared.Preview.PlaceholderEmails, prepared.Preview.ElevatedAdmins)
	if prepared.Preview.ActiveEmployees < 10000 {
		t.Fatalf("expected at least 10000 active employees, got %d", prepared.Preview.ActiveEmployees)
	}
	if prepared.Preview.Departments < 100 || prepared.Preview.Divisions < 200 {
		t.Fatalf("unexpected org coverage: %+v", prepared.Preview)
	}
	if prepared.Preview.ElevatedAdmins == 0 {
		t.Fatalf("expected elevated administrators from director titles")
	}
	if prepared.Preview.PlaceholderEmails == 0 {
		t.Fatalf("expected placeholder emails for missing/invalid/duplicate source emails")
	}
}

func encodeUTF16LE(s string) []byte {
	u16 := utf16.Encode([]rune(s))
	var b strings.Builder
	b.WriteByte(0xff)
	b.WriteByte(0xfe)
	for _, r := range u16 {
		b.WriteByte(byte(r))
		b.WriteByte(byte(r >> 8))
	}
	return []byte(b.String())
}
