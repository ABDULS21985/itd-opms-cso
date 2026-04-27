package itsm

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// IntelligenceService provides deterministic operator assistance for ITSM.
type IntelligenceService struct {
	pool *pgxpool.Pool
}

func NewIntelligenceService(pool *pgxpool.Pool) *IntelligenceService {
	return &IntelligenceService{pool: pool}
}

func (s *IntelligenceService) SuggestTriage(ctx context.Context, auth *types.AuthContext, req TriageRequest) (TriageSuggestion, error) {
	text := normalizeText(req.Title + " " + req.Description + " " + req.AffectedService + " " + strings.Join(req.Tags, " "))
	category, subcategory := classifyTicket(text, req.Type)
	priority := calculatePriority(req.Urgency, req.Impact)
	explanation := []string{
		fmt.Sprintf("Priority suggested as %s because impact=%s and urgency=%s.", priority, valueOr(req.Impact, "medium"), valueOr(req.Urgency, "medium")),
		fmt.Sprintf("Category suggested as %s based on title, description, affected service, and tags.", category),
	}

	suggestion := TriageSuggestion{
		Category:       category,
		Subcategory:    subcategory,
		Priority:       priority,
		RelatedCIs:     []IntelligenceReference{},
		KnownErrors:    []IntelligenceReference{},
		KBArticles:     []IntelligenceReference{},
		RequiredFields: requiredFieldsForPriority(priority),
		Explanation:    explanation,
		Confidence:     0.74,
	}

	if s.pool == nil || auth == nil {
		return suggestion, nil
	}

	terms := searchTerms(text)
	if queue := s.suggestQueue(ctx, auth.TenantID, priority, category); queue != nil {
		suggestion.Queue = queue
		suggestion.Explanation = append(suggestion.Explanation, "Resolver queue selected from active support queue rules and priority filters.")
	}
	if assignee := s.suggestAssignee(ctx, auth.TenantID, category, terms); assignee != nil {
		suggestion.Assignee = assignee
		suggestion.Explanation = append(suggestion.Explanation, "Assignee suggested from active users with matching department or workload context.")
	}
	suggestion.RelatedCIs = s.searchCIs(ctx, auth.TenantID, terms)
	suggestion.KnownErrors = s.searchKnownErrors(ctx, auth.TenantID, terms)
	suggestion.KBArticles = s.searchKB(ctx, auth.TenantID, terms)
	if len(suggestion.RelatedCIs) > 0 || len(suggestion.KnownErrors) > 0 || len(suggestion.KBArticles) > 0 {
		suggestion.Confidence = 0.84
	}
	return suggestion, nil
}

func (s *IntelligenceService) GenerateCopilot(ctx context.Context, req CopilotRequest) (CopilotResponse, error) {
	ticket := req.Ticket
	if ticket == nil {
		ticket = &CopilotTicketContext{Title: "Current record", Status: "unknown", Priority: "P3_medium"}
	}

	publicComments := 0
	internalComments := 0
	for _, comment := range req.Comments {
		if comment.IsInternal {
			internalComments++
		} else {
			publicComments++
		}
	}

	lastStatus := ticket.Status
	if len(req.History) > 0 {
		lastStatus = req.History[len(req.History)-1].ToStatus
	}

	nextAction := nextCopilotAction(ticket.Status, ticket.Priority, publicComments, internalComments)
	summary := fmt.Sprintf("%s is a %s %s currently in %s. %d public comments, %d internal notes, and %d lifecycle events are recorded.",
		valueOr(ticket.TicketNumber, "This ticket"),
		priorityLabel(ticket.Priority),
		valueOr(ticket.Category, "ITSM"),
		humanizeStatus(lastStatus),
		publicComments,
		internalComments,
		len(req.History),
	)

	customerReply := fmt.Sprintf("Hello, we are actively working on %s. Current status is %s. Next step: %s. We will share another update after the next workflow checkpoint.",
		valueOr(ticket.TicketNumber, "your request"),
		humanizeStatus(ticket.Status),
		nextAction,
	)
	internalNote := fmt.Sprintf("Copilot review: verify linked CI/service impact, keep SLA posture visible, and complete the next workflow action: %s.", nextAction)

	kbTitle := "Resolution pattern: " + valueOr(ticket.Title, "ITSM service issue")
	kbBody := strings.Join([]string{
		"## Symptom",
		valueOr(ticket.Description, "Describe the customer-visible symptom."),
		"",
		"## Diagnosis",
		"Summarize affected services, CIs, timeline signals, and root cause evidence.",
		"",
		"## Resolution",
		valueOr(ticket.ResolutionNotes, "Document the confirmed fix and validation steps."),
		"",
		"## Prevention",
		"List monitoring, automation, or process changes that reduce recurrence.",
	}, "\n")

	return CopilotResponse{
		Summary:       summary,
		NextAction:    nextAction,
		CustomerReply: customerReply,
		InternalNote:  internalNote,
		KBDraftTitle:  kbTitle,
		KBDraftBody:   kbBody,
		DecisionQuality: []string{
			"Confirm category, priority, linked CI, and resolver ownership are populated before major workflow moves.",
			"Use customer-facing notes for external visibility and internal notes for technical hypotheses.",
			"Convert validated resolution details into a KB article when the same symptom can recur.",
		},
	}, nil
}

func (s *IntelligenceService) SimulateWorkflow(ctx context.Context, req WorkflowSimulationRequest) (WorkflowSimulationResult, error) {
	def, ok := itsmWorkflowDefinitions[req.Entity]
	if !ok {
		return WorkflowSimulationResult{Allowed: false, Message: "Unknown workflow entity.", Blockers: []string{"Select a supported ITSM workflow entity."}}, nil
	}

	target := req.TargetStatus
	if target == "" {
		allowed := def.machine.AllowedFrom(req.CurrentStatus)
		if len(allowed) > 0 {
			target = allowed[0]
		}
	}

	transitionAllowed := def.machine.IsValid(req.CurrentStatus, target)
	transition := workflowTransitionMetadata(req.Entity, target)
	blockers := []string{}
	if !transitionAllowed {
		blockers = append(blockers, fmt.Sprintf("%s cannot move directly to %s.", humanizeStatus(req.CurrentStatus), humanizeStatus(target)))
	}

	missingFields := missingProvidedFields(transition.RequiredFields, req.ProvidedFields)
	blockers = append(blockers, missingFields...)

	checked := make(map[string]struct{}, len(req.CheckedChecklist))
	for _, key := range req.CheckedChecklist {
		checked[key] = struct{}{}
	}
	for _, item := range transition.Checklist {
		if !item.Required {
			continue
		}
		if _, ok := checked[item.Key]; !ok {
			blockers = append(blockers, "Checklist required: "+item.Label)
		}
	}

	if req.Entity == "major_incident" && target == "closed" && !req.PIRCompleted {
		blockers = append(blockers, "PIR must be completed before major incident closure.")
	}
	if req.Entity == "change" && target == "closed" && req.PIRRequired && !req.PIRCompleted {
		blockers = append(blockers, "PIR is required before this change can close.")
	}
	if req.Entity == "change" && target == "approved" && req.CABRequired && req.CABDecision == "" {
		blockers = append(blockers, "CAB decision is required before approval.")
	}

	sideEffects := []string{
		"Transition event will be written to status history.",
		"Audit event will capture actor, before/after status, and reason.",
	}
	if strings.Contains(target, "pending") {
		sideEffects = append(sideEffects, "SLA clock may pause while waiting on customer, vendor, CAB, or PIR evidence.")
	}
	if target == "resolved" || target == "fulfilled" || target == "implemented" {
		sideEffects = append(sideEffects, "Resolution evidence and customer-facing note become closure prerequisites.")
	}

	notifications := []string{"In-app notification to owner and watchers."}
	if req.Priority == TicketPriorityP1Critical || req.IsMajorIncident {
		notifications = append(notifications, "Teams and email update to stakeholders.")
	}

	allowed := len(blockers) == 0
	message := fmt.Sprintf("Simulation passed: %s can move to %s.", humanizeStatus(req.CurrentStatus), humanizeStatus(target))
	if !allowed {
		message = fmt.Sprintf("Simulation blocked: %s cannot move to %s until prerequisites are satisfied.", humanizeStatus(req.CurrentStatus), humanizeStatus(target))
	}

	return WorkflowSimulationResult{
		Allowed:        allowed,
		Message:        message,
		Blockers:       blockers,
		RequiredFields: transition.RequiredFields,
		Checklist:      transition.Checklist,
		SideEffects:    sideEffects,
		Notifications:  notifications,
		AuditTrail: []string{
			"Actor identity",
			"Source status",
			"Target status",
			"Decision comment",
			"Checklist completion",
			"Supporting evidence",
		},
	}, nil
}

func (s *IntelligenceService) BuildImpactMap(ctx context.Context, auth *types.AuthContext, entityType string, entityID uuid.UUID) (ImpactMapResponse, error) {
	resp := ImpactMapResponse{
		EntityType: entityType,
		EntityID:   entityID.String(),
		Nodes:      []ImpactMapNode{},
		Edges:      []ImpactMapEdge{},
		Signals:    []string{},
	}
	if s.pool == nil || auth == nil {
		return resp, nil
	}

	if entityType != "ticket" && entityType != "change" && entityType != "major_incident" {
		resp.Signals = append(resp.Signals, "Impact map currently supports tickets, changes, and major incidents.")
		return resp, nil
	}

	var ticketID uuid.UUID
	if entityType == "major_incident" {
		err := s.pool.QueryRow(ctx, `SELECT ticket_id FROM major_incident_records WHERE id = $1 AND tenant_id = $2`, entityID, auth.TenantID).Scan(&ticketID)
		if err != nil {
			resp.Signals = append(resp.Signals, "Major incident record was not found or is outside the tenant scope.")
			return resp, nil
		}
	} else {
		ticketID = entityID
	}

	var ticketNumber, title, status, priority string
	var linkedCIIDs, relatedTicketIDs []uuid.UUID
	var linkedProblemID *uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT ticket_number, title, status, priority, linked_ci_ids, related_ticket_ids, linked_problem_id
		FROM tickets
		WHERE id = $1 AND tenant_id = $2`, ticketID, auth.TenantID).
		Scan(&ticketNumber, &title, &status, &priority, &linkedCIIDs, &relatedTicketIDs, &linkedProblemID)
	if err != nil {
		resp.Signals = append(resp.Signals, "Ticket record was not found or is outside the tenant scope.")
		return resp, nil
	}

	rootID := "ticket:" + ticketID.String()
	resp.Nodes = append(resp.Nodes, ImpactMapNode{
		ID:       rootID,
		Label:    ticketNumber + " - " + title,
		Type:     "ticket",
		Status:   status,
		Severity: priority,
	})

	for _, node := range s.ciNodes(ctx, auth.TenantID, linkedCIIDs) {
		resp.Nodes = append(resp.Nodes, node)
		resp.Edges = append(resp.Edges, ImpactMapEdge{Source: rootID, Target: node.ID, Label: "impacts"})
	}
	for _, node := range s.relatedTicketNodes(ctx, auth.TenantID, relatedTicketIDs) {
		resp.Nodes = append(resp.Nodes, node)
		resp.Edges = append(resp.Edges, ImpactMapEdge{Source: rootID, Target: node.ID, Label: "related"})
	}
	if linkedProblemID != nil {
		if node := s.problemNode(ctx, auth.TenantID, *linkedProblemID); node != nil {
			resp.Nodes = append(resp.Nodes, *node)
			resp.Edges = append(resp.Edges, ImpactMapEdge{Source: rootID, Target: node.ID, Label: "caused by"})
		}
	}

	if len(linkedCIIDs) == 0 {
		resp.Signals = append(resp.Signals, "No linked CIs yet. Add CI links to strengthen service-impact analysis.")
	}
	if priority == TicketPriorityP1Critical || priority == TicketPriorityP2High {
		resp.Signals = append(resp.Signals, "High-priority record: verify affected business services and stakeholder audiences.")
	}
	return resp, nil
}

func (s *IntelligenceService) GetProcessMining(ctx context.Context, auth *types.AuthContext) (ProcessMiningResponse, error) {
	resp := ProcessMiningResponse{
		GeneratedAt:       time.Now().UTC(),
		QueueBottlenecks:  []ProcessBottleneck{},
		ApprovalDelays:    []ProcessBottleneck{},
		SLAHotspots:       []ProcessBottleneck{},
		ReassignmentLoops: []ProcessBottleneck{},
		Recommendations: []string{
			"Review queues with high age and SLA pressure every morning.",
			"Separate waiting-on-customer records from resolver-owned bottlenecks.",
			"Use automation playbooks for repeat transitions such as major incident declaration and change approval.",
		},
		Metrics: map[string]float64{},
	}
	if s.pool == nil || auth == nil {
		return resp, nil
	}

	resp.QueueBottlenecks = s.queueBottlenecks(ctx, auth.TenantID)
	resp.ApprovalDelays = s.approvalBottlenecks(ctx, auth.TenantID)
	resp.SLAHotspots = s.slaHotspots(ctx, auth.TenantID)
	resp.ReassignmentLoops = s.reassignmentLoops(ctx, auth.TenantID)
	resp.Metrics = s.processMetrics(ctx, auth.TenantID)
	return resp, nil
}

func (s *IntelligenceService) GenerateEvidencePack(ctx context.Context, auth *types.AuthContext, req ITSMEvidencePackRequest) (ITSMEvidencePack, error) {
	now := time.Now().UTC()
	pack := ITSMEvidencePack{
		ID:          uuid.NewString(),
		EntityType:  req.EntityType,
		EntityID:    req.EntityID,
		Purpose:     valueOr(req.Purpose, "operations_review"),
		Format:      valueOr(req.Format, "json"),
		GeneratedAt: now,
		Sections:    []EvidencePackSection{},
		Snapshot:    map[string]interface{}{},
	}
	if auth == nil || s.pool == nil {
		pack.Checksum = checksumJSON(pack.Snapshot)
		return pack, nil
	}

	entityID, err := uuid.Parse(req.EntityID)
	if err != nil {
		return pack, err
	}

	if req.EntityType == "ticket" || req.EntityType == "change" {
		ticket, comments, history := s.ticketEvidence(ctx, auth.TenantID, entityID)
		pack.Snapshot["ticket"] = ticket
		pack.Snapshot["comments"] = comments
		pack.Snapshot["history"] = history
		pack.Sections = append(pack.Sections,
			EvidencePackSection{Title: "Record Summary", Items: []interface{}{ticket}},
			EvidencePackSection{Title: "Decision Timeline", Items: sliceToInterface(history)},
			EvidencePackSection{Title: "Comments And Notes", Items: sliceToInterface(comments)},
		)
	}
	if req.EntityType == "major_incident" {
		mi := s.majorIncidentEvidence(ctx, auth.TenantID, entityID)
		pack.Snapshot["majorIncident"] = mi
		pack.Sections = append(pack.Sections, EvidencePackSection{Title: "Major Incident Command Record", Items: []interface{}{mi}})
	}
	pack.Snapshot["generatedBy"] = auth.UserID.String()
	pack.Snapshot["purpose"] = pack.Purpose
	pack.Checksum = checksumJSON(pack.Snapshot)
	return pack, nil
}

func (s *IntelligenceService) ForecastSLA(ctx context.Context, req SLAForecastRequest) (SLAForecastResponse, error) {
	now := time.Now().UTC()
	target := req.SLAResolutionTarget
	if target == nil {
		target = req.SLAResponseTarget
	}
	minutesRemaining := 0
	if target != nil {
		minutesRemaining = int(target.Sub(now).Minutes())
	}

	probability := baseSLARisk(req.Priority, req.Status)
	drivers := []string{}
	if minutesRemaining > 0 && minutesRemaining <= 60 {
		probability += 0.25
		drivers = append(drivers, fmt.Sprintf("SLA target is due in %d minutes.", minutesRemaining))
	} else if minutesRemaining < 0 {
		probability += 0.45
		drivers = append(drivers, "SLA target is already overdue.")
	}
	if req.QueueOpenCount >= 15 {
		probability += 0.15
		drivers = append(drivers, "Queue workload is elevated.")
	}
	if req.AssigneeOpenCount >= 8 {
		probability += 0.12
		drivers = append(drivers, "Assignee workload is elevated.")
	}
	if req.SimilarHistoricalHours >= 24 {
		probability += 0.10
		drivers = append(drivers, "Similar historical work took more than one business day.")
	}
	if req.Status == TicketStatusPendingCustomer || req.Status == TicketStatusPendingVendor {
		probability -= 0.12
		drivers = append(drivers, "Ticket may be eligible for SLA pause while waiting.")
	}
	probability = math.Max(0, math.Min(0.98, probability))

	label := "low"
	if probability >= 0.75 {
		label = "critical"
	} else if probability >= 0.55 {
		label = "high"
	} else if probability >= 0.35 {
		label = "moderate"
	}
	return SLAForecastResponse{
		BreachProbability: math.Round(probability*100) / 100,
		RiskLabel:         label,
		MinutesRemaining:  minutesRemaining,
		Drivers:           drivers,
		Recommendations: []string{
			"Assign a named owner if unassigned.",
			"Move waiting records to the correct pending state so SLA pause rules are explicit.",
			"Escalate P1/P2 tickets before the final 25% of remaining SLA time.",
		},
	}, nil
}

func (s *IntelligenceService) PreviewPlaybook(ctx context.Context, req PlaybookPreviewRequest) (PlaybookPreviewResponse, error) {
	actions := []PlaybookActionPreview{
		{Type: "audit", Label: "Record decision trail", Description: "Capture actor, transition, reason, checklist, and evidence snapshot.", Required: true},
		{Type: "notify", Label: "Notify owner and watchers", Description: "Send in-app update and respect channel preferences.", Required: true},
	}
	if req.Priority == TicketPriorityP1Critical || req.Transition == "major_incident_declared" || req.EntityType == "major_incident" {
		actions = append(actions,
			PlaybookActionPreview{Type: "teams_bridge", Label: "Create Teams bridge", Description: "Create or attach a bridge link for responders.", Required: true},
			PlaybookActionPreview{Type: "stakeholder_comms", Label: "Send stakeholder update", Description: "Dispatch approved message to configured internal audiences.", Required: true},
			PlaybookActionPreview{Type: "pir_task", Label: "Create PIR tracker", Description: "Prepare PIR readiness checklist and due date.", Required: false},
		)
	}
	if req.EntityType == "change" || strings.Contains(req.Transition, "cab") {
		actions = append(actions, PlaybookActionPreview{Type: "cab", Label: "Open CAB agenda item", Description: "Add risk, implementation, rollback, and test evidence to CAB review.", Required: true})
	}
	if req.Transition == "resolved" || req.Transition == "closed" {
		actions = append(actions, PlaybookActionPreview{Type: "kb_draft", Label: "Generate KB draft", Description: "Convert validated resolution notes into a reusable article draft.", Required: false})
	}
	return PlaybookPreviewResponse{Actions: actions, Warnings: []string{"Dry run only. No notification, Teams bridge, or workflow mutation was executed."}}, nil
}

func (s *IntelligenceService) GetOperationsSnapshot(ctx context.Context, auth *types.AuthContext) (OperationsSnapshotResponse, error) {
	resp := OperationsSnapshotResponse{
		WaitingOnMe:     []OperationsTask{},
		MobileApprovals: []OperationsTask{},
		SavedWorkspaces: defaultSavedWorkspaces(),
		CIHealth:        []CIHealthSignal{},
		DRReadiness: []ReadinessSignal{
			{Key: "rpo", Label: "RPO target", Status: "configured", Evidence: "System setting nfr.dr_targets defines RPO/RTO objectives."},
			{Key: "retention", Label: "Seven-year retention", Status: "configured", Evidence: "Audit retention setting exists; operational retention evidence should be attached from deployment."},
			{Key: "encryption", Label: "Encryption at rest", Status: "needs_evidence", Evidence: "Requires PostgreSQL host or storage encryption proof."},
		},
		PersonalPreference: PersonalPreferenceHint{
			DefaultQueue: "My Queue",
			Density:      "comfortable",
			SavedFilters: []string{"SLA risk", "Waiting on customer", "Major incidents", "CAB ready"},
		},
	}
	if s.pool == nil || auth == nil {
		return resp, nil
	}
	resp.WaitingOnMe = s.waitingOnMe(ctx, auth)
	resp.MobileApprovals = s.mobileApprovals(ctx, auth)
	resp.CIHealth = s.ciHealth(ctx, auth.TenantID)
	return resp, nil
}

func (s *IntelligenceService) suggestQueue(ctx context.Context, tenantID uuid.UUID, priority, category string) *IntelligenceReference {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, auto_assign_rule, priority_filter
		FROM support_queues
		WHERE tenant_id = $1 AND is_active = true
		ORDER BY
			CASE WHEN $2 = ANY(priority_filter) THEN 0 ELSE 1 END,
			created_at ASC
		LIMIT 6`, tenantID, priority)
	if err != nil {
		return nil
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		var name, rule string
		var priorities []string
		if err := rows.Scan(&id, &name, &rule, &priorities); err != nil {
			continue
		}
		conf := 0.62
		if stringSliceContains(priorities, priority) || len(priorities) == 0 {
			conf = 0.78
		}
		if strings.Contains(normalizeText(name), normalizeText(category)) {
			conf += 0.08
		}
		return &IntelligenceReference{ID: id.String(), Label: name, Type: "queue", Confidence: conf, Reason: "Active queue matches priority and service category.", Metadata: []string{"auto assignment: " + rule}}
	}
	return nil
}

func (s *IntelligenceService) suggestAssignee(ctx context.Context, tenantID uuid.UUID, category string, terms []string) *IntelligenceReference {
	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.display_name, COALESCE(u.department, ''), COALESCE(u.job_title, ''), COUNT(t.id)::int AS open_count
		FROM users u
		LEFT JOIN tickets t ON t.assignee_id = u.id AND t.status NOT IN ('resolved', 'closed', 'cancelled')
		WHERE u.tenant_id = $1 AND u.is_active = true
		GROUP BY u.id, u.display_name, u.department, u.job_title
		ORDER BY open_count ASC, u.display_name ASC
		LIMIT 8`, tenantID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	bestScore := -1.0
	var best *IntelligenceReference
	categoryText := normalizeText(category + " " + strings.Join(terms, " "))
	for rows.Next() {
		var id uuid.UUID
		var name, department, jobTitle string
		var openCount int
		if err := rows.Scan(&id, &name, &department, &jobTitle, &openCount); err != nil {
			continue
		}
		score := 0.58 - float64(openCount)*0.02
		if containsAny(normalizeText(department+" "+jobTitle), strings.Fields(categoryText)) {
			score += 0.16
		}
		if score > bestScore {
			bestScore = score
			best = &IntelligenceReference{ID: id.String(), Label: name, Type: "user", Confidence: math.Max(0.35, score), Reason: "Active user with low current workload and matching operational context.", Metadata: []string{department, jobTitle, fmt.Sprintf("%d open tickets", openCount)}}
		}
	}
	return best
}

func (s *IntelligenceService) searchCIs(ctx context.Context, tenantID uuid.UUID, terms []string) []IntelligenceReference {
	like := likeTerm(terms)
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, ci_type, status
		FROM cmdb_items
		WHERE tenant_id = $1 AND ($2 = '%%' OR name ILIKE $2 OR ci_type ILIKE $2)
		ORDER BY updated_at DESC
		LIMIT 5`, tenantID, like)
	if err != nil {
		return []IntelligenceReference{}
	}
	defer rows.Close()
	refs := []IntelligenceReference{}
	for rows.Next() {
		var id uuid.UUID
		var name, ciType, status string
		if err := rows.Scan(&id, &name, &ciType, &status); err != nil {
			continue
		}
		refs = append(refs, IntelligenceReference{ID: id.String(), Label: name, Type: "ci", Confidence: 0.7, Reason: "CI matched the issue text or affected service.", Metadata: []string{ciType, status}})
	}
	return refs
}

func (s *IntelligenceService) searchKnownErrors(ctx context.Context, tenantID uuid.UUID, terms []string) []IntelligenceReference {
	like := likeTerm(terms)
	rows, err := s.pool.Query(ctx, `
		SELECT ke.id, ke.title, COALESCE(ke.workaround, ''), ke.status
		FROM known_errors ke
		JOIN problems p ON p.id = ke.problem_id
		WHERE p.tenant_id = $1 AND ke.status = 'active'
		  AND ($2 = '%%' OR ke.title ILIKE $2 OR COALESCE(ke.description, '') ILIKE $2 OR COALESCE(ke.workaround, '') ILIKE $2)
		ORDER BY ke.updated_at DESC
		LIMIT 5`, tenantID, like)
	if err != nil {
		return []IntelligenceReference{}
	}
	defer rows.Close()
	refs := []IntelligenceReference{}
	for rows.Next() {
		var id uuid.UUID
		var title, workaround, status string
		if err := rows.Scan(&id, &title, &workaround, &status); err != nil {
			continue
		}
		meta := []string{status}
		if workaround != "" {
			meta = append(meta, truncate(workaround, 96))
		}
		refs = append(refs, IntelligenceReference{ID: id.String(), Label: title, Type: "known_error", Confidence: 0.76, Reason: "Active known error matched the symptom pattern.", Metadata: meta})
	}
	return refs
}

func (s *IntelligenceService) searchKB(ctx context.Context, tenantID uuid.UUID, terms []string) []IntelligenceReference {
	like := likeTerm(terms)
	rows, err := s.pool.Query(ctx, `
		SELECT id, title, type, helpful_count, not_helpful_count
		FROM kb_articles
		WHERE tenant_id = $1 AND status = 'published'
		  AND ($2 = '%%' OR title ILIKE $2 OR content ILIKE $2 OR $3 && tags)
		ORDER BY helpful_count DESC, updated_at DESC
		LIMIT 5`, tenantID, like, terms)
	if err != nil {
		return []IntelligenceReference{}
	}
	defer rows.Close()
	refs := []IntelligenceReference{}
	for rows.Next() {
		var id uuid.UUID
		var title, articleType string
		var helpful, notHelpful int
		if err := rows.Scan(&id, &title, &articleType, &helpful, &notHelpful); err != nil {
			continue
		}
		score := 0.68 + math.Min(0.18, float64(helpful-notHelpful)/100)
		refs = append(refs, IntelligenceReference{ID: id.String(), Label: title, Type: "kb_article", Confidence: score, Reason: "Published knowledge matched the ticket language.", Metadata: []string{articleType, fmt.Sprintf("%d helpful votes", helpful)}})
	}
	return refs
}

func (s *IntelligenceService) ciNodes(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) []ImpactMapNode {
	if len(ids) == 0 {
		return []ImpactMapNode{}
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, ci_type, status
		FROM cmdb_items
		WHERE tenant_id = $1 AND id = ANY($2)`, tenantID, ids)
	if err != nil {
		return []ImpactMapNode{}
	}
	defer rows.Close()
	nodes := []ImpactMapNode{}
	for rows.Next() {
		var id uuid.UUID
		var name, ciType, status string
		if err := rows.Scan(&id, &name, &ciType, &status); err != nil {
			continue
		}
		nodes = append(nodes, ImpactMapNode{ID: "ci:" + id.String(), Label: name, Type: "ci", Status: status, Metadata: map[string]string{"ciType": ciType}})
	}
	return nodes
}

func (s *IntelligenceService) relatedTicketNodes(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) []ImpactMapNode {
	if len(ids) == 0 {
		return []ImpactMapNode{}
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, ticket_number, title, status, priority
		FROM tickets
		WHERE tenant_id = $1 AND id = ANY($2)`, tenantID, ids)
	if err != nil {
		return []ImpactMapNode{}
	}
	defer rows.Close()
	nodes := []ImpactMapNode{}
	for rows.Next() {
		var id uuid.UUID
		var number, title, status, priority string
		if err := rows.Scan(&id, &number, &title, &status, &priority); err != nil {
			continue
		}
		nodes = append(nodes, ImpactMapNode{ID: "ticket:" + id.String(), Label: number + " - " + title, Type: "ticket", Status: status, Severity: priority})
	}
	return nodes
}

func (s *IntelligenceService) problemNode(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) *ImpactMapNode {
	var number, title, status string
	err := s.pool.QueryRow(ctx, `
		SELECT problem_number, title, status
		FROM problems
		WHERE tenant_id = $1 AND id = $2`, tenantID, id).Scan(&number, &title, &status)
	if err != nil {
		return nil
	}
	return &ImpactMapNode{ID: "problem:" + id.String(), Label: number + " - " + title, Type: "problem", Status: status}
}

func (s *IntelligenceService) queueBottlenecks(ctx context.Context, tenantID uuid.UUID) []ProcessBottleneck {
	rows, err := s.pool.Query(ctx, `
		SELECT COALESCE(sq.id::text, 'unassigned'), COALESCE(sq.name, 'Unassigned'), COUNT(t.id)::int,
		       COALESCE(AVG(EXTRACT(EPOCH FROM (now() - t.created_at)) / 3600), 0)
		FROM tickets t
		LEFT JOIN support_queues sq ON sq.id = t.team_queue_id
		WHERE t.tenant_id = $1 AND t.status NOT IN ('resolved', 'closed', 'cancelled')
		GROUP BY sq.id, sq.name
		ORDER BY COUNT(t.id) DESC, AVG(now() - t.created_at) DESC
		LIMIT 5`, tenantID)
	return scanBottlenecks(rows, err, "Queue has aging open work and should be reviewed.")
}

func (s *IntelligenceService) approvalBottlenecks(ctx context.Context, tenantID uuid.UUID) []ProcessBottleneck {
	rows, err := s.pool.Query(ctx, `
		SELECT approver_id::text, 'Pending approval for ' || approver_id::text, COUNT(*)::int,
		       COALESCE(AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 3600), 0)
		FROM approval_tasks
		WHERE tenant_id = $1 AND status = 'pending'
		GROUP BY approver_id
		ORDER BY AVG(now() - created_at) DESC
		LIMIT 5`, tenantID)
	return scanBottlenecks(rows, err, "Approval stage is aging and may be delaying fulfillment.")
}

func (s *IntelligenceService) slaHotspots(ctx context.Context, tenantID uuid.UUID) []ProcessBottleneck {
	rows, err := s.pool.Query(ctx, `
		SELECT priority, priority, COUNT(*)::int,
		       COALESCE(MIN(EXTRACT(EPOCH FROM (sla_resolution_target - now())) / 3600), 0)
		FROM tickets
		WHERE tenant_id = $1
		  AND status NOT IN ('resolved', 'closed', 'cancelled')
		  AND sla_resolution_target IS NOT NULL
		  AND sla_resolution_target <= now() + interval '8 hours'
		GROUP BY priority
		ORDER BY COUNT(*) DESC
		LIMIT 5`, tenantID)
	return scanBottlenecks(rows, err, "Tickets are approaching or past resolution SLA.")
}

func (s *IntelligenceService) reassignmentLoops(ctx context.Context, tenantID uuid.UUID) []ProcessBottleneck {
	rows, err := s.pool.Query(ctx, `
		SELECT t.id::text, t.ticket_number || ' - ' || t.title, COUNT(h.id)::int,
		       COALESCE(EXTRACT(EPOCH FROM (now() - MIN(h.created_at))) / 3600, 0)
		FROM tickets t
		JOIN ticket_status_history h ON h.ticket_id = t.id
		WHERE t.tenant_id = $1 AND h.to_status IN ('assigned', 'in_progress')
		GROUP BY t.id, t.ticket_number, t.title
		HAVING COUNT(h.id) >= 3
		ORDER BY COUNT(h.id) DESC
		LIMIT 5`, tenantID)
	return scanBottlenecks(rows, err, "Repeated assignment/work loops may indicate unclear ownership.")
}

func (s *IntelligenceService) processMetrics(ctx context.Context, tenantID uuid.UUID) map[string]float64 {
	metrics := map[string]float64{}
	queries := map[string]string{
		"openTickets":      `SELECT COUNT(*)::float FROM tickets WHERE tenant_id = $1 AND status NOT IN ('resolved', 'closed', 'cancelled')`,
		"slaRiskTickets":   `SELECT COUNT(*)::float FROM tickets WHERE tenant_id = $1 AND status NOT IN ('resolved', 'closed', 'cancelled') AND sla_resolution_target IS NOT NULL AND sla_resolution_target <= now() + interval '8 hours'`,
		"pendingApprovals": `SELECT COUNT(*)::float FROM approval_tasks WHERE tenant_id = $1 AND status = 'pending'`,
	}
	for key, query := range queries {
		var value float64
		if err := s.pool.QueryRow(ctx, query, tenantID).Scan(&value); err == nil {
			metrics[key] = value
		}
	}
	return metrics
}

func (s *IntelligenceService) ticketEvidence(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (map[string]interface{}, []map[string]interface{}, []map[string]interface{}) {
	ticket := map[string]interface{}{}
	var ticketNumber, title, ticketType, status, priority, urgency, impact string
	var category *string
	var createdAt, updatedAt time.Time
	var resolutionNotes *string
	if err := s.pool.QueryRow(ctx, `
		SELECT ticket_number, title, type, status, priority, urgency, impact, category, created_at, updated_at, resolution_notes
		FROM tickets
		WHERE tenant_id = $1 AND id = $2`, tenantID, id).Scan(
		&ticketNumber, &title, &ticketType, &status, &priority, &urgency, &impact, &category, &createdAt, &updatedAt, &resolutionNotes,
	); err == nil {
		ticket = map[string]interface{}{
			"ticketNumber":    ticketNumber,
			"title":           title,
			"type":            ticketType,
			"status":          status,
			"priority":        priority,
			"urgency":         urgency,
			"impact":          impact,
			"category":        category,
			"createdAt":       createdAt,
			"updatedAt":       updatedAt,
			"resolutionNotes": resolutionNotes,
		}
	}
	comments := queryMaps(ctx, s.pool, `
		SELECT id::text, author_id::text, content, is_internal, created_at
		FROM ticket_comments
		WHERE ticket_id = $1
		ORDER BY created_at ASC`, id)
	history := queryMaps(ctx, s.pool, `
		SELECT id::text, from_status, to_status, changed_by::text, reason, created_at
		FROM ticket_status_history
		WHERE ticket_id = $1
		ORDER BY created_at ASC`, id)
	return ticket, comments, history
}

func (s *IntelligenceService) majorIncidentEvidence(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) map[string]interface{} {
	mi := map[string]interface{}{}
	var severity, status string
	var businessImpact, bridgeURL, bridgePhone *string
	var affectedServices []string
	var declaredAt time.Time
	var resolvedAt, closedAt *time.Time
	if err := s.pool.QueryRow(ctx, `
		SELECT severity, status, business_impact, bridge_url, bridge_phone, affected_services, declared_at, resolved_at, closed_at
		FROM major_incident_records
		WHERE tenant_id = $1 AND id = $2`, tenantID, id).Scan(
		&severity, &status, &businessImpact, &bridgeURL, &bridgePhone, &affectedServices, &declaredAt, &resolvedAt, &closedAt,
	); err == nil {
		mi = map[string]interface{}{
			"id":               id.String(),
			"severity":         severity,
			"status":           status,
			"businessImpact":   businessImpact,
			"bridgeUrl":        bridgeURL,
			"bridgePhone":      bridgePhone,
			"affectedServices": affectedServices,
			"declaredAt":       declaredAt,
			"resolvedAt":       resolvedAt,
			"closedAt":         closedAt,
		}
	}
	return mi
}

func (s *IntelligenceService) waitingOnMe(ctx context.Context, auth *types.AuthContext) []OperationsTask {
	rows, err := s.pool.Query(ctx, `
		SELECT id, ticket_number, title, status, sla_resolution_target
		FROM tickets
		WHERE tenant_id = $1 AND assignee_id = $2 AND status NOT IN ('resolved', 'closed', 'cancelled')
		ORDER BY COALESCE(sla_resolution_target, now() + interval '30 days') ASC
		LIMIT 8`, auth.TenantID, auth.UserID)
	if err != nil {
		return []OperationsTask{}
	}
	defer rows.Close()
	tasks := []OperationsTask{}
	for rows.Next() {
		var id uuid.UUID
		var number, title, status string
		var dueAt *time.Time
		if err := rows.Scan(&id, &number, &title, &status, &dueAt); err != nil {
			continue
		}
		tasks = append(tasks, OperationsTask{ID: id.String(), Label: number + " - " + title, Type: "ticket", Status: status, DueAt: dueAt, ActionURL: "/dashboard/itsm/tickets/" + id.String(), Reason: "Assigned to you and still active."})
	}
	return tasks
}

func (s *IntelligenceService) mobileApprovals(ctx context.Context, auth *types.AuthContext) []OperationsTask {
	rows, err := s.pool.Query(ctx, `
		SELECT at.id, sr.request_number, sr.status, at.created_at, sr.id
		FROM approval_tasks at
		JOIN service_requests sr ON sr.id = at.request_id
		WHERE at.tenant_id = $1 AND at.approver_id = $2 AND at.status = 'pending'
		ORDER BY at.created_at ASC
		LIMIT 8`, auth.TenantID, auth.UserID)
	if err != nil {
		return []OperationsTask{}
	}
	defer rows.Close()
	tasks := []OperationsTask{}
	for rows.Next() {
		var id, requestID uuid.UUID
		var requestNumber, status string
		var createdAt time.Time
		if err := rows.Scan(&id, &requestNumber, &status, &createdAt, &requestID); err != nil {
			continue
		}
		due := createdAt.Add(24 * time.Hour)
		tasks = append(tasks, OperationsTask{ID: id.String(), Label: "Approve " + requestNumber, Type: "approval", Status: status, DueAt: &due, ActionURL: "/dashboard/itsm/service-catalog/my-requests/" + requestID.String(), Reason: "Pending approval assigned to you."})
	}
	return tasks
}

func (s *IntelligenceService) ciHealth(ctx context.Context, tenantID uuid.UUID) []CIHealthSignal {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, ci_type, updated_at
		FROM cmdb_items
		WHERE tenant_id = $1
		ORDER BY updated_at ASC
		LIMIT 8`, tenantID)
	if err != nil {
		return []CIHealthSignal{}
	}
	defer rows.Close()
	signals := []CIHealthSignal{}
	for rows.Next() {
		var id uuid.UUID
		var name, ciType string
		var updatedAt time.Time
		if err := rows.Scan(&id, &name, &ciType, &updatedAt); err != nil {
			continue
		}
		ageDays := time.Since(updatedAt).Hours() / 24
		confidence := math.Max(0.35, 0.95-ageDays/365)
		reason := "CI recently reconciled."
		var staleSince *time.Time
		if ageDays > 90 {
			staleSince = &updatedAt
			reason = "CI has not been updated in more than 90 days."
		}
		signals = append(signals, CIHealthSignal{ID: id.String(), Label: name, CIType: ciType, Confidence: math.Round(confidence*100) / 100, StaleSince: staleSince, Reason: reason})
	}
	return signals
}

func classifyTicket(text, ticketType string) (string, string) {
	switch {
	case containsAny(text, []string{"network", "latency", "vpn", "switch", "router", "dns", "firewall"}):
		return "Infrastructure", "Network"
	case containsAny(text, []string{"server", "memory", "cpu", "storage", "disk", "database"}):
		return "Infrastructure", "Server"
	case containsAny(text, []string{"login", "password", "mfa", "access", "permission", "account"}):
		return "Access Management", "Identity"
	case containsAny(text, []string{"payment", "application", "app", "api", "service", "portal"}):
		return "Application", "Business Service"
	case ticketType == TicketTypeServiceRequest:
		return "Service Request", "General Fulfillment"
	default:
		return "Incident", "General"
	}
}

func calculatePriority(urgency, impact string) string {
	matrix := map[string]map[string]string{
		TicketUrgencyCritical: {TicketImpactCritical: TicketPriorityP1Critical, TicketImpactHigh: TicketPriorityP1Critical, TicketImpactMedium: TicketPriorityP2High, TicketImpactLow: TicketPriorityP3Medium},
		TicketUrgencyHigh:     {TicketImpactCritical: TicketPriorityP1Critical, TicketImpactHigh: TicketPriorityP2High, TicketImpactMedium: TicketPriorityP3Medium, TicketImpactLow: TicketPriorityP3Medium},
		TicketUrgencyMedium:   {TicketImpactCritical: TicketPriorityP2High, TicketImpactHigh: TicketPriorityP3Medium, TicketImpactMedium: TicketPriorityP3Medium, TicketImpactLow: TicketPriorityP3Medium},
		TicketUrgencyLow:      {TicketImpactCritical: TicketPriorityP3Medium, TicketImpactHigh: TicketPriorityP3Medium, TicketImpactMedium: TicketPriorityP3Medium, TicketImpactLow: TicketPriorityP4Low},
	}
	if byImpact, ok := matrix[valueOr(urgency, TicketUrgencyMedium)]; ok {
		if p, ok := byImpact[valueOr(impact, TicketImpactMedium)]; ok {
			return p
		}
	}
	return TicketPriorityP3Medium
}

func requiredFieldsForPriority(priority string) []string {
	fields := []string{"category", "impact", "urgency", "description"}
	if priority == TicketPriorityP1Critical || priority == TicketPriorityP2High {
		fields = append(fields, "affectedService", "customerImpact", "initialWorkaround")
	}
	return fields
}

func nextCopilotAction(status, priority string, publicComments, internalComments int) string {
	switch status {
	case TicketStatusLogged:
		return "classify and assign the ticket"
	case TicketStatusClassified:
		return "assign a resolver and confirm ownership"
	case TicketStatusAssigned:
		return "start work or add the first response"
	case TicketStatusInProgress:
		if priority == TicketPriorityP1Critical || priority == TicketPriorityP2High {
			return "confirm service impact, link CIs, and prepare stakeholder update"
		}
		return "capture diagnosis and next customer update"
	case TicketStatusPendingCustomer:
		return "send customer follow-up and keep pending reason current"
	case TicketStatusPendingVendor:
		return "track vendor owner and next update time"
	case TicketStatusResolved:
		return "validate closure criteria and close after customer confirmation"
	default:
		if publicComments == 0 {
			return "send the first customer-facing update"
		}
		return "review lifecycle prerequisites"
	}
}

func labelForStatus(def workflowMetadata, status string) string {
	if label, ok := def.labels[status]; ok {
		return label
	}
	return humanizeStatus(status)
}

func missingProvidedFields(required []string, provided map[string]string) []string {
	missing := []string{}
	for _, field := range required {
		if strings.TrimSpace(provided[field]) == "" {
			missing = append(missing, "Required field missing: "+field)
		}
	}
	return missing
}

func normalizeText(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func containsAny(text string, terms []string) bool {
	for _, term := range terms {
		term = strings.TrimSpace(strings.ToLower(term))
		if term != "" && strings.Contains(text, term) {
			return true
		}
	}
	return false
}

func stringSliceContains(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}

func searchTerms(text string) []string {
	stop := map[string]struct{}{
		"the": {}, "and": {}, "for": {}, "with": {}, "from": {}, "this": {}, "that": {}, "are": {}, "has": {}, "have": {}, "into": {}, "ticket": {}, "request": {},
	}
	parts := strings.FieldsFunc(text, func(r rune) bool {
		return r < 'a' || r > 'z'
	})
	seen := map[string]struct{}{}
	terms := []string{}
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if len(part) < 3 {
			continue
		}
		if _, ok := stop[part]; ok {
			continue
		}
		if _, ok := seen[part]; ok {
			continue
		}
		seen[part] = struct{}{}
		terms = append(terms, part)
		if len(terms) >= 8 {
			break
		}
	}
	sort.Strings(terms)
	return terms
}

func likeTerm(terms []string) string {
	if len(terms) == 0 {
		return "%%"
	}
	return "%" + terms[0] + "%"
}

func valueOr(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func priorityLabel(priority string) string {
	return strings.ToLower(strings.ReplaceAll(priority, "_", " "))
}

func humanizeStatus(status string) string {
	return strings.ReplaceAll(status, "_", " ")
}

func truncate(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[:limit-3] + "..."
}

func baseSLARisk(priority, status string) float64 {
	risk := map[string]float64{
		TicketPriorityP1Critical: 0.48,
		TicketPriorityP2High:     0.36,
		TicketPriorityP3Medium:   0.22,
		TicketPriorityP4Low:      0.12,
	}[priority]
	if risk == 0 {
		risk = 0.22
	}
	if status == TicketStatusLogged || status == TicketStatusAssigned {
		risk += 0.1
	}
	return risk
}

func checksumJSON(value interface{}) string {
	payload, _ := json.Marshal(value)
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:])
}

func sliceToInterface[T any](items []T) []interface{} {
	out := make([]interface{}, 0, len(items))
	for _, item := range items {
		out = append(out, item)
	}
	return out
}

func scanBottlenecks(rows pgx.Rows, err error, reason string) []ProcessBottleneck {
	if err != nil {
		return []ProcessBottleneck{}
	}
	defer rows.Close()
	out := []ProcessBottleneck{}
	for rows.Next() {
		var id, label string
		var count int
		var ageHours float64
		if err := rows.Scan(&id, &label, &count, &ageHours); err != nil {
			continue
		}
		severity := "moderate"
		if count >= 10 || ageHours >= 48 {
			severity = "high"
		}
		if count >= 20 || ageHours >= 96 {
			severity = "critical"
		}
		out = append(out, ProcessBottleneck{ID: id, Label: label, Count: count, AgeHours: math.Round(ageHours*10) / 10, Severity: severity, Reasons: []string{reason}})
	}
	return out
}

func queryMaps(ctx context.Context, pool *pgxpool.Pool, query string, args ...interface{}) []map[string]interface{} {
	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()
	fieldDescriptions := rows.FieldDescriptions()
	out := []map[string]interface{}{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}
		row := map[string]interface{}{}
		for i, field := range fieldDescriptions {
			row[string(field.Name)] = values[i]
		}
		out = append(out, row)
	}
	return out
}

func defaultSavedWorkspaces() []SavedWorkspace {
	return []SavedWorkspace{
		{Key: "noc", Label: "NOC", Description: "Major incidents, P1/P2 tickets, and CI/service impact.", Filters: []string{"priority:P1/P2", "majorIncident:true", "status:active"}},
		{Key: "service_desk", Label: "Service Desk", Description: "New, assigned, waiting, and customer-visible work.", Filters: []string{"type:incident", "status:logged/assigned/pending_customer"}},
		{Key: "cab", Label: "CAB", Description: "Changes awaiting assessment, CAB decision, schedule, or PIR.", Filters: []string{"type:change", "cabRequired:true"}},
		{Key: "auditor", Label: "Auditor", Description: "Decision trails, evidence packs, approvals, and SLA history.", Filters: []string{"evidence:required", "auditTrail:true"}},
		{Key: "manager", Label: "Manager", Description: "Bottlenecks, SLA forecast, approvals, and queue load.", Filters: []string{"analytics:process", "slaRisk:true"}},
	}
}
