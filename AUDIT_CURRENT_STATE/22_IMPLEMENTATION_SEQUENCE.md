# 22. Implementation Sequence & Remediation Roadmap

## Audit Metadata

| Field | Value |
|---|---|
| **Audit Date** | 2026-03-02 |
| **Branch** | `dev` |
| **Scope** | Phased remediation plan for all 25 identified gaps from the remediation backlog |
| **Estimated Total Duration** | 10-14 weeks (with 2-3 developers working in parallel) |
| **Guiding Principles** | Security-first, then data integrity, then broken core flows, then feature completion |

---

## Implementation Principles

1. **Security First** -- No feature work begins until critical security vulnerabilities are resolved.
2. **Data Integrity Second** -- Multi-tenant isolation and audit completeness precede feature development.
3. **Fix Before Build** -- Broken existing functionality is repaired before new features are added.
4. **Backend Before Frontend** -- API stability is established before frontend depends on it.
5. **Test Before Ship** -- Each phase includes test coverage requirements before progression.
6. **Document As You Go** -- Documentation is updated within each phase, not deferred to end.

---

## Phase Overview

| Phase | Name | Duration | Focus | Gate Criteria |
|---|---|---|---|---|
| **Phase 1** | Critical Security & Tenant Fixes | Weeks 1-2 | Hardcoded passwords, authorization enforcement, session timeout, failing test | All P0 items resolved; no known security vulnerabilities |
| **Phase 2** | Data Integrity & Persistence | Weeks 2-4 | RLS, audit logging completeness, token revocation, trusted proxies | Multi-tenant isolation verified; audit trail complete |
| **Phase 3** | Broken Core Flows | Weeks 3-5 | Email delivery, report generation, CSRF protection | Core workflows produce output; notifications delivered |
| **Phase 4** | CI/CD & Testing Infrastructure | Weeks 4-6 | CI pipeline, E2E tests, integration tests | Automated quality gates operational; critical paths E2E tested |
| **Phase 5** | Partial Feature Completion | Weeks 6-8 | CMDB reports, knowledge templates, risk treatment UI | All modules at 90%+ completeness |
| **Phase 6** | Performance & Observability | Weeks 7-9 | Redis caching, OpenTelemetry tracing, retention policies, NATS events | Observability stack fully functional; caching reduces DB load |
| **Phase 7** | Code Quality & Refactoring | Weeks 8-10 | Type splitting, large file decomposition, `any` reduction | Code quality metrics improved; maintainability enhanced |
| **Phase 8** | Production Hardening | Weeks 10-12 | Load testing, accessibility, documentation, DR validation | Production-ready checklist complete |

---

## Phase 1: Critical Security & Tenant Fixes (Weeks 1-2)

**Objective**: Eliminate all critical security vulnerabilities that would make UAT or production deployment irresponsible.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 1.1 | #1 | Remove hardcoded weak passwords from seed migrations | S | Backend | None | Migration that replaces/removes weak password hashes; force-reset mechanism |
| 1.2 | #4 | Fix failing OKR handler test (nil pool panic) | S | Backend | None | All `go test ./...` passes with zero failures |
| 1.3 | #2 | Add `RequirePermission` middleware to all unprotected handler groups | M | Backend | Permission definitions in DB seed | ITSM, CMDB, Knowledge, GRC, Reporting, Vault, Automation, CustomFields all require valid permissions |
| 1.4 | #6 | Implement session timeout enforcement | S | Backend | AuthContext `IssuedAt` field | Sessions expire after configured duration; middleware returns 401 for expired sessions |

**Phase 1 Gate Criteria**:
- [ ] Zero hardcoded passwords in any migration file
- [ ] `go test -race ./...` passes with zero failures
- [ ] Every module handler group has `RequirePermission` middleware applied
- [ ] Session timeout middleware actively enforces expiration
- [ ] Authorization tests verify 403 responses for unauthorized access attempts

**Parallel Work**: Items 1.1 and 1.2 can be done simultaneously. Item 1.3 can begin as soon as 1.1 is complete. Item 1.4 is independent and can run in parallel with 1.3.

---

## Phase 2: Data Integrity & Persistence (Weeks 2-4)

**Objective**: Establish database-level security boundaries and complete audit trail coverage.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 2.1 | #11 | Add trusted proxy list for IP extraction | S | Backend | None | `TRUSTED_PROXIES` env var; proxy-aware IP extraction; rate limiter and audit use correct IP |
| 2.2 | #12 | Extend audit logging (failed auth, config changes, role assignments) | M | Backend | None | Failed login attempts logged; system config changes captured; role assignment changes tracked |
| 2.3 | #5 | Implement PostgreSQL Row-Level Security (RLS) | XL | Backend/DBA | Phase 1 complete (authz middleware in place) | RLS policies on all tenant-scoped tables; `app.current_tenant` set per connection; cross-tenant access blocked at DB level |
| 2.4 | #19 | Implement token revocation mechanism | M | Backend | Redis (deployed) | `POST /api/v1/auth/revoke` endpoint; revocation check in auth middleware; admin force-revoke capability |

**Phase 2 Gate Criteria**:
- [ ] RLS policies active on all tenant-scoped tables
- [ ] Cross-tenant data access returns empty results (not errors) at DB level
- [ ] Failed authentication attempts appear in audit log
- [ ] Configuration changes appear in audit log
- [ ] Token revocation endpoint functional; revoked tokens rejected on next request
- [ ] IP extraction uses trusted proxy list

**Parallel Work**: Items 2.1 and 2.2 can run simultaneously. Item 2.3 (RLS) is the critical path and should start as early as possible. Item 2.4 can run in parallel with 2.3.

**Risk Note**: RLS (item 2.3) is the highest-risk change in the entire remediation. It touches every database query path. Implement in a feature branch with extensive testing before merging. Consider a phased rollout: enable RLS on one module first, validate, then expand.

---

## Phase 3: Broken Core Flows (Weeks 3-5)

**Objective**: Repair core business workflows that are currently non-functional.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 3.1 | #3 | Implement email notification delivery | L | Backend | SMTP provider credentials (obtain from IT) | Outbox processor daemon; SMTP delivery; retry with exponential backoff; 31 templates rendered |
| 3.2 | #16 | Implement CSRF token-based protection | M | Full-stack | None | CSRF token endpoint; validation middleware on POST/PUT/DELETE; frontend API client sends token |
| 3.3 | #17 | Add per-endpoint rate limiting | S | Backend | None | Login: 5/min, password reset: 3/min, reports: 10/min, reads: 300/min |
| 3.4 | #9 | Implement report generation engine (PDF/Excel) | L | Backend | MinIO `reports` bucket (exists) | PDF and Excel output for all report types; stored in MinIO; download endpoint functional |

**Phase 3 Gate Criteria**:
- [ ] Email notifications delivered for: ticket assignment, approval request, SLA breach, escalation
- [ ] CSRF protection active on all state-changing endpoints
- [ ] Login endpoint has stricter rate limiting than global default
- [ ] At least 2 report types generate downloadable PDF/Excel output
- [ ] Outbox processor handles failures gracefully with retry and dead-letter

**Parallel Work**: Items 3.1 and 3.2 are independent. Item 3.3 is small and can be done by either developer. Item 3.4 is large and should be a dedicated workstream.

---

## Phase 4: CI/CD & Testing Infrastructure (Weeks 4-6)

**Objective**: Establish automated quality gates and critical-path test coverage.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 4.1 | #7 | Implement CI/CD pipeline | L | DevOps | GitHub Actions runner access | `ci.yml`: go test, golangci-lint, npm test, npm build, docker build; branch protection rules |
| 4.2 | #8 | Add E2E tests (Playwright) | L | Frontend/QA | CI pipeline (4.1); stable test environment | Playwright installed; 5+ critical path tests: login, ticket CRUD, project CRUD, report download, admin user management |
| 4.3 | -- | Add integration tests (testcontainers) | M | Backend | CI pipeline (4.1) | testcontainers setup; 10+ integration tests for critical sqlc queries |
| 4.4 | -- | Enable `go test -race` in CI | XS | DevOps | CI pipeline (4.1) | Race detection flag added to CI test command |

**Phase 4 Gate Criteria**:
- [ ] Every PR triggers automated test suite (backend + frontend)
- [ ] Every PR triggers lint checks (golangci-lint + ESLint)
- [ ] Branch protection prevents merge with failing CI
- [ ] 5+ E2E tests pass in CI
- [ ] 10+ integration tests verify real DB behavior
- [ ] Race detector enabled in CI test execution

**Parallel Work**: Item 4.1 must complete first (or at least have a working workflow). Items 4.2 and 4.3 can then proceed in parallel. Item 4.4 is trivial and can be done as part of 4.1.

---

## Phase 5: Partial Feature Completion (Weeks 6-8)

**Objective**: Bring all modules to 90%+ completeness.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 5.1 | #20 | Implement CMDB reports and contracts handlers | M | Backend | Report generation (Phase 3, item 3.4) | Asset inventory report; lifecycle report; contract CRUD; renewal tracking |
| 5.2 | #21 | Add article version history UI | M | Full-stack | Backend versioning (may need new endpoints) | Version history sidebar; diff view; restore action |
| 5.3 | #22 | Implement knowledge template system | M | Full-stack | None | Template CRUD; template selector in article creation; preview |
| 5.4 | #23 | Add risk treatment workflow UI | M | Full-stack | GRC risk module (exists) | Treatment plan creation; action tracking; progress dashboard |

**Phase 5 Gate Criteria**:
- [ ] CMDB module generates asset reports and manages contracts
- [ ] Knowledge articles support version history and templates
- [ ] GRC risks can have formal treatment plans with tracked actions
- [ ] All modules at 90%+ feature completeness per audit assessment

**Parallel Work**: All items in this phase are independent and can be assigned to different developers.

---

## Phase 6: Performance & Observability (Weeks 7-9)

**Objective**: Complete the observability stack and add performance optimization.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 6.1 | #18 | Configure Loki and Prometheus retention policies | XS | DevOps | None | Loki: 30-day retention; Prometheus: 30-day retention; disk usage alerts |
| 6.2 | #14 | Add OpenTelemetry distributed tracing | M | Backend | Tempo (deployed) | OTEL SDK in go.mod; HTTP middleware instrumented; DB calls traced; trace ID in logs |
| 6.3 | #13 | Implement Redis caching for dashboard/KPI queries | M | Backend | Redis (deployed) | Cache service; dashboard queries cached (30s TTL); KPIs cached (5min TTL); invalidation on writes |
| 6.4 | #10 | Implement event-driven architecture using NATS JetStream | XL | Backend | NATS (deployed) | Event schema defined; publishers in handlers; consumers for audit, notifications, workflow; dead-letter queue |

**Phase 6 Gate Criteria**:
- [ ] Loki and Prometheus have 30-day retention policies
- [ ] Distributed traces visible in Grafana/Tempo for all API requests
- [ ] Dashboard page load time reduced by 50%+ via caching
- [ ] At least audit and notification events published to NATS
- [ ] Dead-letter queue handling verified

**Parallel Work**: Item 6.1 is trivial and should be done immediately. Items 6.2 and 6.3 can run in parallel. Item 6.4 is large and should be a dedicated workstream (can overlap with 6.2/6.3).

---

## Phase 7: Code Quality & Refactoring (Weeks 8-10)

**Objective**: Improve code maintainability and reduce technical debt.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 7.1 | #15 | Split `types/index.ts` into domain-specific files | M | Frontend | None | 8-10 domain type files; barrel export; all imports updated |
| 7.2 | -- | Decompose large page components (calendar, roster, automation, vault) | M | Frontend | None | Calendar, roster, automation, vault pages refactored into sub-components; no file > 800 lines |
| 7.3 | -- | Reduce TypeScript `any` usage in production code | S | Frontend | None | `any` count in production source files reduced to < 10 |
| 7.4 | -- | Resolve remaining TODO items (session.go already done in Phase 1) | S | Backend | Phase 1 (session TODO resolved) | Server test TODOs either implemented or converted to tracked issues; vault share modal implemented |

**Phase 7 Gate Criteria**:
- [ ] `types/index.ts` split into domain files; no single type file > 500 lines
- [ ] No page component exceeds 800 lines
- [ ] TypeScript `any` in production source < 10 occurrences
- [ ] All TODO items either resolved or tracked as backlog items

**Parallel Work**: All items can run in parallel, assigned to different developers.

---

## Phase 8: Production Hardening (Weeks 10-12)

**Objective**: Validate production readiness through load testing, accessibility, documentation, and DR drills.

| Order | Backlog # | Task | Effort | Assignee Skill | Dependencies | Deliverables |
|---|---|---|---|---|---|---|
| 8.1 | #25 | Add accessibility testing (axe-core) | S | Frontend | Playwright (Phase 4) | axe-core in component tests; Playwright accessibility scans; critical violations fixed |
| 8.2 | #24 | Implement NATS-based audit event streaming | M | Backend | NATS events (Phase 6, item 6.4) | Audit events published to NATS; consumer persists to audit_log; real-time audit dashboard |
| 8.3 | -- | Documentation update: Known Limitations, API reference for new modules, ADRs | M | All | All phases complete | README updated; API docs complete; 5+ ADRs written; ER diagrams generated |
| 8.4 | -- | DR drill: backup restore test, failover validation | M | DevOps/DBA | Backup script (exists) | Backup restore verified; DR runbook validated; RTO/RPO defined and tested |
| 8.5 | -- | Load testing with k6 | M | Backend/DevOps | All features complete | k6 scripts for 10 critical endpoints; baseline performance documented; no endpoint > 500ms p95 |
| 8.6 | -- | Security penetration test | L | Security | All security fixes complete | Third-party or internal pentest; findings documented; critical findings remediated |

**Phase 8 Gate Criteria**:
- [ ] Zero critical accessibility violations
- [ ] Audit event streaming operational
- [ ] All documentation up-to-date with actual implementation
- [ ] DR drill completed successfully; RTO/RPO documented
- [ ] Load test baselines established; no critical performance issues
- [ ] Penetration test completed; no critical/high findings open

---

## Timeline Visualization

```
Week  1  2  3  4  5  6  7  8  9  10  11  12
      |--|--|--|--|--|--|--|--|--|---|---|---|
P1:   [====]                                   Critical Security
P2:      [======]                              Data Integrity
P3:         [======]                           Broken Core Flows
P4:            [======]                        CI/CD & Testing
P5:                  [====]                    Feature Completion
P6:                     [======]               Performance & Observability
P7:                        [====]              Code Quality
P8:                              [======]      Production Hardening
```

**Note**: Phases overlap intentionally. Phase 2 can begin before Phase 1 fully completes (items 2.1 and 2.2 have no Phase 1 dependency). Similarly, Phase 3 overlaps with Phase 2 once RLS design is underway.

---

## Resource Requirements

| Role | FTE Needed | Phase Involvement |
|---|---|---|
| **Senior Backend Developer** | 1.0 | Phases 1-6 (security, RLS, email, NATS) |
| **Backend Developer** | 1.0 | Phases 2-6 (audit, reports, caching, tracing) |
| **Frontend Developer** | 1.0 | Phases 3-7 (CSRF, E2E tests, features, refactoring) |
| **DevOps Engineer** | 0.5 | Phases 4, 6, 8 (CI/CD, retention, load testing, DR) |
| **DBA** | 0.25 | Phase 2 (RLS design and implementation) |

**Minimum Viable Team**: 2 full-stack developers + 1 part-time DevOps engineer can execute this plan in 12-14 weeks. A 3-developer team with dedicated DevOps can compress to 10-12 weeks.

---

## Risk Register for Implementation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| RLS implementation breaks existing queries | HIGH | HIGH | Feature branch; module-by-module rollout; extensive integration testing |
| SMTP provider approval delayed by IT security | MEDIUM | HIGH | Begin approval process immediately; have fallback provider ready |
| E2E test environment flaky in CI | MEDIUM | MEDIUM | Use Docker Compose for deterministic environment; add retry logic |
| NATS event architecture requires handler refactoring | MEDIUM | MEDIUM | Start with audit events only; expand incrementally |
| Report generation library has rendering issues | LOW | MEDIUM | Prototype with 1 report type before committing to library choice |
| Team capacity reduced by production incidents | MEDIUM | HIGH | Phase 1 security fixes reduce incident likelihood; maintain buffer in timeline |

---

## Success Metrics

| Metric | Current State | Phase 4 Target | Phase 8 Target |
|---|---|---|---|
| **Security vulnerabilities (P0)** | 4 | 0 | 0 |
| **Authorization coverage** | ~50% of modules | 100% | 100% |
| **Test suite pass rate** | 99% (1 failure) | 100% | 100% |
| **E2E test count** | 0 | 5+ | 15+ |
| **CI pipeline** | CodeQL only | Full test/lint/build | Full + deploy |
| **Email delivery** | Non-functional | Functional | Monitored |
| **Report generation** | Stubbed | 2+ report types | All report types |
| **Observability (tracing)** | 0 traces | Traces in staging | Traces in production |
| **Dashboard p95 latency** | Unknown (no baseline) | Baselined | < 500ms |
| **Documentation accuracy** | ~70% | 85% | 95%+ |
| **Production readiness** | NO | UAT-ready | Production-ready |

---

*Generated 2026-03-02 as part of the ITD-OPMS comprehensive codebase audit. All findings reflect the `dev` branch state. This implementation sequence should be reviewed and adjusted based on team capacity, stakeholder priorities, and any new findings discovered during remediation.*
