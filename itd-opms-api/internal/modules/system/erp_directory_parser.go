package system

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/mail"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf16"
	"unicode/utf8"

	"github.com/google/uuid"
)

const (
	emailQualityValid     = "valid"
	emailQualityMissing   = "missing"
	emailQualityInvalid   = "invalid"
	emailQualityDuplicate = "duplicate"
)

var (
	erpInsertPrefix = "INSERT [dbo].[ERP_EMPLOYEE_DETAILS]"
	castDateRe      = regexp.MustCompile(`(?i)^CAST\(N?'([^']*)'\s+AS\s+DateTime2\)$`)
)

func parseERPDirectoryFile(path string) ([]erpEmployeeRecord, []string, string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, "", fmt.Errorf("read ERP directory file: %w", err)
	}
	checksum := sha256.Sum256(data)
	records, parseErrors, err := parseERPDirectoryDump(data)
	return records, parseErrors, hex.EncodeToString(checksum[:]), err
}

func parseERPDirectoryDump(data []byte) ([]erpEmployeeRecord, []string, error) {
	text, err := decodeERPDirectoryText(data)
	if err != nil {
		return nil, nil, err
	}

	var (
		columns     []string
		records     []erpEmployeeRecord
		parseErrors []string
	)
	for idx, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, erpInsertPrefix) {
			continue
		}

		colStart := strings.Index(line, "(")
		valuesMarker := ") VALUES ("
		valuesStart := strings.Index(line, valuesMarker)
		if colStart < 0 || valuesStart < 0 {
			parseErrors = append(parseErrors, fmt.Sprintf("line %d: malformed INSERT", idx+1))
			continue
		}
		if columns == nil {
			columns = parseERPColumns(line[colStart+1 : valuesStart])
		}

		valuesRaw := line[valuesStart+len(valuesMarker):]
		if strings.HasSuffix(valuesRaw, ")") {
			valuesRaw = valuesRaw[:len(valuesRaw)-1]
		}
		values, err := splitERPValues(valuesRaw)
		if err != nil {
			parseErrors = append(parseErrors, fmt.Sprintf("line %d: %v", idx+1, err))
			continue
		}
		if len(values) != len(columns) {
			parseErrors = append(parseErrors, fmt.Sprintf("line %d: expected %d values, got %d", idx+1, len(columns), len(values)))
			continue
		}

		row := make(map[string]string, len(columns))
		for i, col := range columns {
			row[col] = cleanERPValue(values[i])
		}
		record, err := erpRecordFromRow(idx+1, row)
		if err != nil {
			parseErrors = append(parseErrors, fmt.Sprintf("line %d: %v", idx+1, err))
			continue
		}
		records = append(records, record)
	}
	if len(records) == 0 {
		return nil, parseErrors, fmt.Errorf("no ERP employee rows found")
	}
	return records, parseErrors, nil
}

func decodeERPDirectoryText(data []byte) (string, error) {
	if len(data) >= 2 {
		if data[0] == 0xff && data[1] == 0xfe {
			return decodeUTF16LE(data[2:]), nil
		}
		if data[0] == 0xfe && data[1] == 0xff {
			return decodeUTF16BE(data[2:]), nil
		}
	}
	if utf8.Valid(data) {
		return strings.TrimPrefix(string(data), "\ufeff"), nil
	}
	if bytes.Count(data, []byte{0}) > len(data)/8 {
		return decodeUTF16LE(data), nil
	}
	return "", fmt.Errorf("unsupported ERP directory file encoding")
}

func decodeUTF16LE(data []byte) string {
	u16 := make([]uint16, 0, len(data)/2)
	for i := 0; i+1 < len(data); i += 2 {
		u16 = append(u16, uint16(data[i])|uint16(data[i+1])<<8)
	}
	return string(utf16.Decode(u16))
}

func decodeUTF16BE(data []byte) string {
	u16 := make([]uint16, 0, len(data)/2)
	for i := 0; i+1 < len(data); i += 2 {
		u16 = append(u16, uint16(data[i])<<8|uint16(data[i+1]))
	}
	return string(utf16.Decode(u16))
}

func parseERPColumns(raw string) []string {
	parts := strings.Split(raw, ",")
	cols := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		part = strings.TrimPrefix(part, "[")
		part = strings.TrimSuffix(part, "]")
		cols = append(cols, part)
	}
	return cols
}

func splitERPValues(raw string) ([]string, error) {
	var (
		values []string
		buf    strings.Builder
		quote  bool
		depth  int
	)
	for i := 0; i < len(raw); i++ {
		ch := raw[i]
		if ch == '\'' {
			buf.WriteByte(ch)
			if quote && i+1 < len(raw) && raw[i+1] == '\'' {
				buf.WriteByte(raw[i+1])
				i++
				continue
			}
			quote = !quote
			continue
		}
		if !quote {
			switch ch {
			case '(':
				depth++
			case ')':
				if depth > 0 {
					depth--
				}
			case ',':
				if depth == 0 {
					values = append(values, strings.TrimSpace(buf.String()))
					buf.Reset()
					continue
				}
			}
		}
		buf.WriteByte(ch)
	}
	if quote {
		return nil, fmt.Errorf("unterminated quoted value")
	}
	values = append(values, strings.TrimSpace(buf.String()))
	return values, nil
}

func cleanERPValue(raw string) string {
	raw = strings.TrimSpace(raw)
	if strings.EqualFold(raw, "NULL") {
		return ""
	}
	if m := castDateRe.FindStringSubmatch(raw); len(m) == 2 {
		return m[1]
	}
	if strings.HasPrefix(raw, "N'") && strings.HasSuffix(raw, "'") {
		return strings.ReplaceAll(raw[2:len(raw)-1], "''", "'")
	}
	if strings.HasPrefix(raw, "'") && strings.HasSuffix(raw, "'") {
		return strings.ReplaceAll(raw[1:len(raw)-1], "''", "'")
	}
	return raw
}

func erpRecordFromRow(rowNumber int, row map[string]string) (erpEmployeeRecord, error) {
	employeeNumber := strings.TrimSpace(row["EMPLOYEE_NUMBER"])
	if employeeNumber == "" {
		return erpEmployeeRecord{}, fmt.Errorf("missing employee number")
	}
	rec := erpEmployeeRecord{
		RowNumber:          rowNumber,
		OrganizationID:     parseERPIntPtr(row["ORGANIZATION_ID"]),
		PersonID:           parseERPIntPtr(row["PERSON_ID"]),
		UserName:           strings.TrimSpace(row["USER_NAME"]),
		EmailAddress:       strings.TrimSpace(row["EMAIL_ADDRESS"]),
		Title:              strings.TrimSpace(row["TITLE"]),
		FirstName:          strings.TrimSpace(row["FIRST_NAME"]),
		MiddleNames:        strings.TrimSpace(row["MIDDLE_NAMES"]),
		LastName:           strings.TrimSpace(row["LAST_NAME"]),
		EmployeeNumber:     employeeNumber,
		AssignmentNumber:   strings.TrimSpace(row["ASSIGNMENT_NUMBER"]),
		OriginalDateOfHire: parseERPTimePtr(row["ORIGINAL_DATE_OF_HIRE"]),
		OfficeID:           parseERPIntPtr(row["OFFICE_ID"]),
		SupervisorID:       strings.TrimSpace(row["SUPERVISOR_ID"]),
		JobName:            strings.TrimSpace(row["JOB_NAME"]),
		HeadOfOfficeID:     strings.TrimSpace(row["HEAD_OF_OFFICE_ID"]),
		LocationID:         parseERPIntPtr(row["LOCATION_ID"]),
		LocationCode:       strings.TrimSpace(row["LOCATION_CODE"]),
		MobileNumber:       strings.TrimSpace(row["MOBILE_NUMBER"]),
		Status:             strings.TrimSpace(row["STATUS"]),
		TerminationDate:    parseERPTimePtr(row["TERMINATION_DATE"]),
		DepartmentID:       parseERPIntPtr(row["DEPARTMENT_ID"]),
		DepartmentName:     strings.TrimSpace(row["DEPARTMENT_NAME"]),
		HeadOfDeptID:       strings.TrimSpace(row["HEAD_OF_DEPT_ID"]),
		HeadOfDeptName:     strings.TrimSpace(row["HEAD_OF_DEPT_NAME"]),
		DivisionID:         parseERPIntPtr(row["DIVISION_ID"]),
		DivisionName:       strings.TrimSpace(row["DIVISION_NAME"]),
		HeadOfDivID:        strings.TrimSpace(row["HEAD_OF_DIV_ID"]),
		HeadOfDivName:      strings.TrimSpace(row["HEAD_OF_DIV_NAME"]),
		OfficeName:         strings.TrimSpace(row["OFFICE_NAME"]),
		GradeID:            parseERPIntPtr(row["GRADE_ID"]),
		Grade:              strings.TrimSpace(row["GRADE"]),
		FullName:           strings.TrimSpace(row["FULL_NAME"]),
	}
	return rec, nil
}

func parseERPIntPtr(value string) *int {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	n, err := strconv.Atoi(value)
	if err != nil {
		return nil
	}
	return &n
}

func parseERPTimePtr(value string) *time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	layouts := []string{
		"2006-01-02T15:04:05.0000000",
		"2006-01-02T15:04:05.9999999",
		"2006-01-02T15:04:05.000000",
		"2006-01-02T15:04:05.999999",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return &t
		}
	}
	return nil
}

func prepareERPDirectory(records []erpEmployeeRecord, parseErrors []string, sourcePath, checksum string) preparedERPDirectory {
	employeeIDs := make(map[string]uuid.UUID, len(records))
	seenEmails := make(map[string]string, len(records))
	supervisors := map[string]struct{}{}
	divHeads := map[string]struct{}{}
	officeHeads := map[string]struct{}{}
	elevated := map[string]struct{}{}
	roleEligible := map[string]struct{}{}
	serviceDeskAnalysts := map[string]struct{}{}
	seniorServiceDeskAnalysts := map[string]struct{}{}
	itServiceCenterSpecialists := map[string]struct{}{}
	seniorITServiceCenterSpecialists := map[string]struct{}{}
	itServiceSupportSpecialists := map[string]struct{}{}

	for _, rec := range records {
		employeeIDs[rec.EmployeeNumber] = deterministicERPUUID("user", rec.EmployeeNumber)
		if rec.SupervisorID != "" {
			supervisors[rec.SupervisorID] = struct{}{}
		}
		if rec.HeadOfDivID != "" {
			divHeads[rec.HeadOfDivID] = struct{}{}
		}
		if rec.HeadOfOfficeID != "" {
			officeHeads[rec.HeadOfOfficeID] = struct{}{}
		}
		if rec.HeadOfDeptID != "" {
			divHeads[rec.HeadOfDeptID] = struct{}{}
		}
		if rec.isActiveAssignment() {
			roleEligible[rec.EmployeeNumber] = struct{}{}
			if isElevatedERPAdmin(rec.JobName) {
				elevated[rec.EmployeeNumber] = struct{}{}
			}
			switch serviceDeskRoleForERPAssignment(rec) {
			case "senior_service_desk_analyst":
				seniorServiceDeskAnalysts[rec.EmployeeNumber] = struct{}{}
			case "service_desk_analyst":
				serviceDeskAnalysts[rec.EmployeeNumber] = struct{}{}
			}
			switch problemManagementRoleForERPAssignment(rec) {
			case "senior_it_service_center_specialist":
				seniorITServiceCenterSpecialists[rec.EmployeeNumber] = struct{}{}
			case "it_service_center_specialist":
				itServiceCenterSpecialists[rec.EmployeeNumber] = struct{}{}
			case "it_service_support_specialist":
				itServiceSupportSpecialists[rec.EmployeeNumber] = struct{}{}
			}
		}
	}

	orgMap := map[string]*preparedERPOrgUnit{}
	root := &preparedERPOrgUnit{
		ID:          deterministicERPUUID("org", "CBN"),
		Code:        "CBN",
		Name:        "Central Bank of Nigeria",
		Level:       "department",
		SourceLevel: "root",
	}
	orgMap[root.Code] = root

	preparedRecords := make([]erpEmployeeRecord, 0, len(records))
	stats := ERPDirectoryImportPreview{
		SourcePath:     sourcePath,
		SourceChecksum: checksum,
		ParseErrors:    len(parseErrors),
		TotalRows:      len(records) + len(parseErrors),
		EmployeesTotal: len(records),
		Warnings:       limitStrings(parseErrors, 25),
	}

	for _, rec := range records {
		rec.EffectiveEmail, rec.EmailQuality, rec.EmailValidationErrors = effectiveERPEmail(rec, seenEmails)
		if rec.EmailQuality == emailQualityValid {
			stats.LoginEligibleEmployees++
		}
		switch rec.EmailQuality {
		case emailQualityMissing:
			stats.MissingEmails++
			stats.PlaceholderEmails++
		case emailQualityInvalid:
			stats.InvalidEmails++
			stats.PlaceholderEmails++
		case emailQualityDuplicate:
			stats.DuplicateEmails++
			stats.PlaceholderEmails++
		}

		if rec.isActiveAssignment() {
			stats.ActiveEmployees++
		} else {
			stats.InactiveEmployees++
		}

		dept := ensureERPDepartment(orgMap, rec)
		divParentCode := "CBN"
		if dept != nil {
			divParentCode = dept.Code
		}
		div := ensureERPDivision(orgMap, rec, divParentCode)
		officeParentCode := divParentCode
		if div != nil {
			officeParentCode = div.Code
		}
		office := ensureERPOffice(orgMap, rec, officeParentCode)
		assigned := office
		if assigned == nil {
			assigned = div
		}
		if assigned == nil {
			assigned = dept
		}
		if assigned == nil {
			assigned = root
		}
		rec.AssignedOrgUnitCode = assigned.Code
		rec.AssignedOrgUnitID = assigned.ID
		if dept != nil {
			rec.DepartmentOrgUnitCode = dept.Code
		}
		if div != nil {
			rec.DivisionOrgUnitCode = div.Code
		}
		if office != nil {
			rec.OfficeOrgUnitCode = office.Code
		}
		if rec.isActiveAssignment() {
			assigned.ActiveEmployeeCount++
		}
		preparedRecords = append(preparedRecords, rec)
	}

	orgUnits := make([]preparedERPOrgUnit, 0, len(orgMap))
	for _, unit := range orgMap {
		if unit.ManagerEmployeeNo != "" {
			if id, ok := employeeIDs[unit.ManagerEmployeeNo]; ok {
				unit.ManagerUserID = &id
			}
		}
		orgUnits = append(orgUnits, *unit)
	}
	sort.Slice(orgUnits, func(i, j int) bool {
		if orgLevelRank(orgUnits[i].Level) == orgLevelRank(orgUnits[j].Level) {
			return orgUnits[i].Code < orgUnits[j].Code
		}
		return orgLevelRank(orgUnits[i].Level) < orgLevelRank(orgUnits[j].Level)
	})

	depts := map[string]struct{}{}
	divs := map[string]struct{}{}
	offices := map[string]struct{}{}
	for _, unit := range orgUnits {
		switch unit.SourceLevel {
		case "department":
			depts[unit.Code] = struct{}{}
		case "division":
			divs[unit.Code] = struct{}{}
		case "office":
			offices[unit.Code] = struct{}{}
		}
	}
	stats.Departments = len(depts)
	stats.Divisions = len(divs)
	stats.Offices = len(offices)
	stats.Supervisors = countKnownEmployees(supervisors, employeeIDs)
	stats.HeadsOfDivision = countKnownEmployees(divHeads, employeeIDs)
	stats.ElevatedAdmins = countKnownEmployees(elevated, employeeIDs)
	stats.ServiceDeskAnalysts = countKnownEmployees(serviceDeskAnalysts, employeeIDs)
	stats.SeniorServiceDeskAnalysts = countKnownEmployees(seniorServiceDeskAnalysts, employeeIDs)
	stats.ITServiceCenterSpecialists = countKnownEmployees(itServiceCenterSpecialists, employeeIDs)
	stats.SeniorITServiceCenterSpecialists = countKnownEmployees(seniorITServiceCenterSpecialists, employeeIDs)
	stats.ITServiceSupportSpecialists = countKnownEmployees(itServiceSupportSpecialists, employeeIDs)
	stats.Samples = buildERPPreviewSamples(preparedRecords, elevated)

	if stats.MissingEmails > 0 || stats.InvalidEmails > 0 || stats.DuplicateEmails > 0 {
		stats.Warnings = append(stats.Warnings, fmt.Sprintf("%d employees will use placeholder emails because source email is missing, invalid, or duplicated", stats.PlaceholderEmails))
	}
	if len(parseErrors) > 0 {
		stats.Warnings = append(stats.Warnings, fmt.Sprintf("%d source rows could not be parsed and will be skipped", len(parseErrors)))
	}

	return preparedERPDirectory{
		Preview:                          stats,
		Employees:                        preparedRecords,
		OrgUnits:                         orgUnits,
		EmployeeIDs:                      employeeIDs,
		Supervisors:                      supervisors,
		DivHeads:                         divHeads,
		OfficeHeads:                      officeHeads,
		Elevated:                         elevated,
		RoleEligible:                     roleEligible,
		ServiceDeskAnalysts:              serviceDeskAnalysts,
		SeniorServiceDeskAnalysts:        seniorServiceDeskAnalysts,
		ITServiceCenterSpecialists:       itServiceCenterSpecialists,
		SeniorITServiceCenterSpecialists: seniorITServiceCenterSpecialists,
		ITServiceSupportSpecialists:      itServiceSupportSpecialists,
	}
}

func ensureERPDepartment(orgMap map[string]*preparedERPOrgUnit, rec erpEmployeeRecord) *preparedERPOrgUnit {
	if rec.DepartmentName == "" {
		return nil
	}
	code := erpOrgCode("DEPT", rec.DepartmentID, rec.DepartmentName)
	if unit, ok := orgMap[code]; ok {
		return unit
	}
	unit := &preparedERPOrgUnit{
		ID:                deterministicERPUUID("org", code),
		Code:              code,
		Name:              rec.DepartmentName,
		Level:             "department",
		ParentCode:        "CBN",
		ERPDepartmentID:   rec.DepartmentID,
		SourceLevel:       "department",
		ManagerEmployeeNo: rec.HeadOfDeptID,
	}
	orgMap[code] = unit
	return unit
}

func ensureERPDivision(orgMap map[string]*preparedERPOrgUnit, rec erpEmployeeRecord, deptCode string) *preparedERPOrgUnit {
	if rec.DivisionName == "" {
		return nil
	}
	code := erpOrgCode("DIV", rec.DivisionID, rec.DivisionName+"|"+deptCode)
	if unit, ok := orgMap[code]; ok {
		if unit.ManagerEmployeeNo == "" {
			unit.ManagerEmployeeNo = rec.HeadOfDivID
		}
		return unit
	}
	unit := &preparedERPOrgUnit{
		ID:                deterministicERPUUID("org", code),
		Code:              code,
		Name:              rec.DivisionName,
		Level:             "division",
		ParentCode:        firstNonEmptyString(deptCode, "CBN"),
		ERPDepartmentID:   rec.DepartmentID,
		ERPDivisionID:     rec.DivisionID,
		SourceLevel:       "division",
		ManagerEmployeeNo: rec.HeadOfDivID,
	}
	orgMap[code] = unit
	return unit
}

func ensureERPOffice(orgMap map[string]*preparedERPOrgUnit, rec erpEmployeeRecord, parentCode string) *preparedERPOrgUnit {
	if rec.OfficeName == "" {
		return nil
	}
	officeKey := rec.OfficeName + "|" + parentCode
	if rec.OfficeID != nil {
		officeKey = fmt.Sprintf("%d|%s", *rec.OfficeID, parentCode)
	}
	code := "ERP-OFFICE-" + compactCodeToken(officeKey)
	if unit, ok := orgMap[code]; ok {
		if unit.ManagerEmployeeNo == "" {
			unit.ManagerEmployeeNo = rec.HeadOfOfficeID
		}
		return unit
	}
	unit := &preparedERPOrgUnit{
		ID:                deterministicERPUUID("org", code),
		Code:              code,
		Name:              rec.OfficeName,
		Level:             "office",
		ParentCode:        firstNonEmptyString(parentCode, "CBN"),
		ERPDepartmentID:   rec.DepartmentID,
		ERPDivisionID:     rec.DivisionID,
		ERPOfficeID:       rec.OfficeID,
		SourceLevel:       "office",
		ManagerEmployeeNo: rec.HeadOfOfficeID,
	}
	orgMap[code] = unit
	return unit
}

func erpOrgCode(kind string, id *int, fallback string) string {
	if id != nil {
		return fmt.Sprintf("ERP-%s-%d", kind, *id)
	}
	return fmt.Sprintf("ERP-%s-%s", kind, compactCodeToken(fallback))
}

func compactCodeToken(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	var out strings.Builder
	lastDash := false
	for _, r := range value {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			out.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			out.WriteByte('-')
			lastDash = true
		}
	}
	token := strings.Trim(out.String(), "-")
	if token == "" {
		token = "UNKNOWN"
	}
	if len(token) > 96 {
		sum := sha256.Sum256([]byte(value))
		token = token[:72] + "-" + hex.EncodeToString(sum[:])[:12]
	}
	return token
}

func effectiveERPEmail(rec erpEmployeeRecord, seen map[string]string) (string, string, []string) {
	email := strings.ToLower(strings.TrimSpace(rec.EmailAddress))
	if email == "" {
		return placeholderERPEmail(rec.EmployeeNumber), emailQualityMissing, []string{"source email is missing"}
	}
	if _, err := mail.ParseAddress(email); err != nil || strings.ContainsAny(email, " \t\r\n") {
		return placeholderERPEmail(rec.EmployeeNumber), emailQualityInvalid, []string{"source email is invalid"}
	}
	if firstEmployee, ok := seen[email]; ok && firstEmployee != rec.EmployeeNumber {
		return placeholderERPEmail(rec.EmployeeNumber), emailQualityDuplicate, []string{"source email duplicates employee " + firstEmployee}
	}
	seen[email] = rec.EmployeeNumber
	return email, emailQualityValid, nil
}

func placeholderERPEmail(employeeNumber string) string {
	return strings.ToLower(strings.TrimSpace(employeeNumber)) + "@erp.invalid.local"
}

func formatERPDisplayName(fullName, employeeNumber, title, first, middle, last string) string {
	fullName = strings.TrimSpace(fullName)
	employeeNumber = strings.TrimSpace(employeeNumber)
	if fullName != "" {
		fullName = strings.TrimSpace(strings.TrimSuffix(fullName, employeeNumber))
		fullName = strings.TrimSpace(strings.Trim(fullName, "-,"))
		if fullName != "" {
			return normalizeSpaces(fullName)
		}
	}
	var given []string
	for _, part := range []string{strings.TrimSpace(title), strings.TrimSpace(first), strings.TrimSpace(middle)} {
		if part != "" {
			given = append(given, part)
		}
	}
	if strings.TrimSpace(last) != "" && len(given) > 0 {
		return normalizeSpaces(strings.TrimSpace(last) + ", " + strings.Join(given, " "))
	}
	if strings.TrimSpace(last) != "" {
		return normalizeSpaces(last)
	}
	return employeeNumber
}

func normalizeSpaces(value string) string {
	return strings.Join(strings.Fields(value), " ")
}

func isElevatedERPAdmin(jobName string) bool {
	job := strings.ToUpper(strings.Join(strings.Fields(jobName), " "))
	return strings.Contains(job, "DEPUTY GOVERNOR") || strings.Contains(job, "DIRECTOR")
}

func serviceDeskRoleForERPJob(jobName string) string {
	job := normalizeERPMatchText(jobName)
	if job == "" {
		return ""
	}
	if !(strings.Contains(job, "SERVICE DESK") || strings.Contains(job, "HELP DESK")) {
		return ""
	}
	if !(strings.Contains(job, "ANALYST") || strings.Contains(job, "AGENT") || strings.Contains(job, "OFFICER")) {
		return ""
	}
	if strings.Contains(job, "SENIOR") || strings.Contains(job, "LEAD") || strings.Contains(job, "SUPERVISOR") {
		return "senior_service_desk_analyst"
	}
	return "service_desk_analyst"
}

func serviceDeskRoleForERPAssignment(rec erpEmployeeRecord) string {
	if role := serviceDeskRoleForERPJob(rec.JobName); role != "" {
		return role
	}
	if !isServiceDeskERPOrg(rec.DepartmentName, rec.DivisionName, rec.OfficeName) {
		return ""
	}
	if isSeniorServiceDeskERPJob(rec.JobName) {
		return "senior_service_desk_analyst"
	}
	return "service_desk_analyst"
}

func problemManagementRoleForERPAssignment(rec erpEmployeeRecord) string {
	job := normalizeERPMatchText(rec.JobName)
	org := normalizeERPMatchText(strings.Join([]string{rec.DepartmentName, rec.DivisionName, rec.OfficeName}, " "))

	if job == "" && org == "" {
		return ""
	}
	if isSeniorServiceDeskERPJob(rec.JobName) && isProblemManagementERPOrg(org) {
		return "senior_it_service_center_specialist"
	}
	if strings.Contains(job, "SENIOR IT SERVICE CENTER SPECIALIST") ||
		strings.Contains(job, "SENIOR IT SERVICE CENTRE SPECIALIST") {
		return "senior_it_service_center_specialist"
	}
	if strings.Contains(job, "IT SERVICE CENTER SPECIALIST") ||
		strings.Contains(job, "IT SERVICE CENTRE SPECIALIST") ||
		strings.Contains(org, "IT SERVICE CENTRE") ||
		strings.Contains(org, "IT SERVICE CENTER") ||
		strings.Contains(org, "IT - SERVICE CENTRE") {
		return "it_service_center_specialist"
	}
	if strings.Contains(job, "IT SERVICE SUPPORT SPECIALIST") ||
		strings.Contains(org, "IT SERVICE SUPPORT") ||
		strings.Contains(org, "USER SUPPORT HELP DESK") ||
		strings.Contains(org, "BRANCH IT SUPPORT") {
		return "it_service_support_specialist"
	}
	return ""
}

func isProblemManagementERPOrg(org string) bool {
	return strings.Contains(org, "IT SERVICE SUPPORT") ||
		strings.Contains(org, "IT SERVICE CENTRE") ||
		strings.Contains(org, "IT SERVICE CENTER") ||
		strings.Contains(org, "IT - SERVICE CENTRE") ||
		strings.Contains(org, "USER SUPPORT HELP DESK") ||
		strings.Contains(org, "BRANCH IT SUPPORT")
}

func isServiceDeskERPOrg(names ...string) bool {
	org := normalizeERPMatchText(strings.Join(names, " "))
	if org == "" {
		return false
	}
	return strings.Contains(org, "USER SUPPORT HELP DESK") ||
		strings.Contains(org, "IT SERVICE SUPPORT") ||
		strings.Contains(org, "SERVICE DESK") ||
		(strings.Contains(org, "HELP DESK") &&
			(strings.Contains(org, "IT") || strings.Contains(org, "USER SUPPORT")))
}

func isSeniorServiceDeskERPJob(jobName string) bool {
	job := normalizeERPMatchText(jobName)
	if job == "" {
		return false
	}
	return strings.Contains(job, "SENIOR") ||
		strings.Contains(job, "LEAD") ||
		strings.Contains(job, "SUPERVISOR") ||
		strings.Contains(job, "MANAGER") ||
		strings.Contains(job, "HEAD") ||
		strings.Contains(job, "DIRECTOR")
}

func normalizeERPMatchText(value string) string {
	return strings.ToUpper(strings.Join(strings.Fields(value), " "))
}

func deterministicERPUUID(kind, key string) uuid.UUID {
	namespace := uuid.MustParse("8d6f704e-6d83-4f47-90f5-1b30ab79d92a")
	return uuid.NewSHA1(namespace, []byte(kind+":"+key))
}

func orgLevelRank(level string) int {
	switch level {
	case "directorate":
		return 1
	case "department":
		return 2
	case "division":
		return 3
	case "office":
		return 4
	case "unit":
		return 5
	case "team":
		return 6
	case "section":
		return 7
	default:
		return 99
	}
}

func countKnownEmployees(values map[string]struct{}, employeeIDs map[string]uuid.UUID) int {
	count := 0
	for employeeNumber := range values {
		if _, ok := employeeIDs[employeeNumber]; ok {
			count++
		}
	}
	return count
}

func buildERPPreviewSamples(records []erpEmployeeRecord, elevated map[string]struct{}) []ERPDirectoryPreviewUser {
	limit := 10
	if len(records) < limit {
		limit = len(records)
	}
	samples := make([]ERPDirectoryPreviewUser, 0, limit)
	for _, rec := range records[:limit] {
		_, isElevated := elevated[rec.EmployeeNumber]
		samples = append(samples, ERPDirectoryPreviewUser{
			EmployeeNumber: rec.EmployeeNumber,
			DisplayName:    rec.displayName(),
			Email:          rec.EffectiveEmail,
			EmailQuality:   rec.EmailQuality,
			JobTitle:       rec.JobName,
			Status:         rec.Status,
			Department:     rec.DepartmentName,
			Division:       rec.DivisionName,
			Office:         rec.OfficeName,
			IsActive:       rec.isActiveAssignment(),
			IsElevated:     isElevated,
		})
	}
	return samples
}

func limitStrings(values []string, limit int) []string {
	if len(values) <= limit {
		return append([]string{}, values...)
	}
	out := append([]string{}, values[:limit]...)
	out = append(out, fmt.Sprintf("%d additional parse errors omitted", len(values)-limit))
	return out
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
