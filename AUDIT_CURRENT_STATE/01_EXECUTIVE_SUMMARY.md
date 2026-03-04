# ITD-OPMS Audit: Executive Summary

**Classification:** Internal -- Board & Senior Management
**Date:** 2026-03-02
**Branch:** `dev` (commit `ef263e3`)
**Prepared for:** CBN IT Audit & Management Division Leadership

---

## 1. System Purpose & Scope

The **ITD-OPMS** (IT Division Operations & Project Management System) is a multi-tenant, full-stack platform built for the **Central Bank of Nigeria (CBN) IT Audit & Management Division (AMD)**. It provides integrated management capabilities across eight operational domains:

- **Governance** -- Organizational structure, committees, mandates, OKRs, and decision tracking
- **People Management** -- Staff directory, skills inventory, training, capacity planning, and RACI matrices
- **Planning** -- Projects, programs, portfolios, milestones, budgets, dependencies, and RAG status tracking
- **ITSM** -- IT service management including incidents, changes, problems, SLAs, and service catalogs
- **CMDB** -- Configuration management database with asset tracking, relationships, and dependency mapping
- **Knowledge Management** -- Document repositories, folders, articles, search, and knowledge bases
- **GRC** -- Governance, Risk & Compliance including risk registers, controls, assessments, and policies
- **Reporting & Analytics** -- Dashboards, report definitions, scheduled reports, and analytics visualizations

The system uses a modern stack: **Go 1.25** backend with **Next.js 16** frontend, backed by **PostgreSQL 16**, **Redis 7**, **MinIO** object storage, and **NATS JetStream** messaging, with a full observability stack (Prometheus, Grafana, Loki, Tempo).

---

## 2. What Is Genuinely Implemented

The following capabilities are **fully functional with real data** (no mocking or placeholder content):

### Backend (Go API)
- 260 Go source files organized into 15 modules with clean hexagonal architecture
- 80+ REST API endpoints across all 8 modules with consistent JSON responses
- 37 database migrations producing 124 tables with proper foreign key constraints
- 13 sqlc query files totaling 3,758 lines of type-safe, parameterized SQL
- Dual authentication: Microsoft Entra ID OIDC for production, JWT for development
- Full audit trail infrastructure (audit events table, structured logging)
- Multi-tenant data model with `tenant_id` on all business tables
- Health checks, graceful shutdown, and structured logging (slog)
- MinIO integration for document/evidence storage
- Redis for session management and caching

### Frontend (Next.js Portal)
- 121 pages across all 8 modules with consistent layout and navigation
- React 19.2.4 with Server Components and App Router architecture
- TanStack Query for data fetching with proper cache invalidation
- Shadcn/UI component library with Tailwind CSS styling
- Responsive sidebar with module-based navigation
- RAG (Red/Amber/Green) status indicators throughout planning module
- Interactive charts and analytics dashboards (Recharts)
- Comprehensive form handling with Zod validation
- Dark mode support infrastructure

### Data & Infrastructure
- 37 seed users representing real AMD staff with role assignments
- Seeded reference data: email templates, policies, RACI matrices, skills inventory
- 10 Docker Compose services with full observability stack
- Prometheus metrics collection, Grafana dashboards, Loki log aggregation, Tempo distributed tracing
- Complete end-to-end traces from frontend through API to database

---

## 3. What Is Partially Complete

| Capability | Status | What Works | What Is Missing |
|---|---|---|---|
| **Reporting Module** | 60% | Report CRUD, dashboard analytics, report definitions | Actual PDF/document generation (stubbed), export functionality |
| **Notifications** | 40% | Outbox pattern tables exist, 20 email templates seeded | No SMTP integration, no email delivery, no real-time push |
| **Event-Driven Architecture** | 20% | NATS JetStream service available and connected | Almost no events published; modules use synchronous request/response |
| **Session Management** | 30% | Session middleware registered in pipeline | Timeout enforcement is pass-through (no actual expiry logic) |
| **Authorization** | 50% | RBAC tables exist, roles seeded, auth middleware present | Handlers in ITSM/CMDB/Knowledge/GRC/Reporting skip permission checks |
| **Committee Workflows** | 70% | Committee CRUD, membership management | Workflow state machine actions incomplete |
| **Skills Assessment** | 70% | Skills inventory, skill categories | Assessment workflow and scoring partial |

---

## 4. What Is Missing Entirely

| Capability | Impact | Difficulty to Add |
|---|---|---|
| **Email delivery** (SMTP/SendGrid integration) | Users receive no notifications | Medium (outbox pattern ready) |
| **Event-driven processing** (NATS consumers) | No async workflows, no decoupled processing | Medium-High |
| **CI/CD pipeline** (build, test, deploy) | No quality gates, no automated deployment | Medium |
| **End-to-end tests** (Playwright/Cypress) | No UI regression protection | Medium |
| **Database Row-Level Security** (RLS) | No defense-in-depth for multi-tenancy | Medium |
| **Report PDF generation** (actual document output) | Reports module is CRUD shell only | Medium |
| **Rate limiting** | API vulnerable to abuse | Low |
| **CSRF protection** | Missing for state-changing operations | Low |
| **Input sanitization layer** | XSS potential in user-generated content | Low-Medium |
| **API versioning** | No path to backward-compatible evolution | Low |
| **Database connection pooling tuning** | Default pgx pool settings in production | Low |
| **Backup & disaster recovery procedures** | No documented or automated backup strategy | Medium |

---

## 5. Critical Security Risks

### CRITICAL Severity (Require Immediate Remediation)

#### CRIT-01: Hardcoded Weak Passwords in Seed Migrations

**Finding:** 37 staff user accounts are seeded across 4 migration files (`021_seed_amd_division.sql`, `031_seed_email_templates.sql`, `032_seed_amd_staff.sql`, `038_seed_olaniyan_global_admin.sql`) with identical bcrypt hashes of the word "password".

**Risk:** If any seed migration executes against a production database (which is the default migration path), all 37 accounts are compromised with a trivially guessable password. This is a **guaranteed full system compromise** in production.

**Remediation:** Separate seed data from schema migrations. Use environment-gated seeding that generates random passwords and forces password reset on first login. Never commit plaintext-equivalent password hashes to version control.

#### CRIT-02: Missing Authorization Checks in Business Handlers

**Finding:** Handlers in the ITSM, CMDB, Knowledge, GRC, and Reporting modules authenticate the user (verify JWT/OIDC token) but do not check whether the authenticated user has permission to perform the requested operation on the requested resource. Any authenticated user can read, create, update, or delete records belonging to any tenant or any other user.

**Risk:** Horizontal privilege escalation (cross-tenant data access) and vertical privilege escalation (regular users performing admin operations).

**Remediation:** Implement middleware-level or handler-level authorization checks that validate `tenant_id` ownership and RBAC role permissions before executing any database operation.

#### CRIT-03: No Database-Level Row-Level Security (RLS)

**Finding:** While all business tables include a `tenant_id` column, there are no PostgreSQL RLS policies enforcing tenant isolation at the database layer. Tenant filtering relies entirely on application-layer WHERE clauses in sqlc queries.

**Risk:** A single application bug, SQL injection, or missing WHERE clause exposes data across all tenants. This is a defense-in-depth failure for a multi-tenant CBN system.

**Remediation:** Implement PostgreSQL RLS policies on all tenant-scoped tables. Set `current_setting('app.tenant_id')` via connection-level configuration and create policies that enforce `tenant_id = current_setting('app.tenant_id')::uuid`.

#### CRIT-04: Session Timeout Middleware Is Pass-Through

**Finding:** The session timeout middleware is registered in the HTTP pipeline but does not enforce any session expiry logic. It passes all requests through regardless of session age.

**Risk:** Sessions never expire. Stolen session tokens remain valid indefinitely. This violates CBN security requirements for automatic session termination.

**Remediation:** Implement Redis-backed session tracking with configurable idle and absolute timeout enforcement. Invalidate sessions server-side on timeout.

### HIGH Severity

#### HIGH-01: 319 TypeScript `any` Type Usages

**Finding:** The frontend codebase contains 319 instances of the `any` type, bypassing TypeScript's type safety guarantees. This includes API response types, event handlers, and component props.

**Risk:** Runtime type errors in production, difficulty catching bugs during development, reduced maintainability.

#### HIGH-02: No End-to-End Test Suite

**Finding:** While 86 backend test files and 637 frontend test files exist (primarily unit/component level), there are zero end-to-end tests validating complete user workflows through the browser.

**Risk:** UI regressions, broken user flows, and integration failures are undetectable before deployment.

#### HIGH-03: Email Delivery Not Implemented

**Finding:** The system has 20 email templates seeded and an outbox pattern table structure, but no SMTP or email service integration exists. No emails are sent for any system event.

**Risk:** Users receive no password resets, approval notifications, SLA breach alerts, or workflow notifications. This breaks core operational workflows.

#### HIGH-04: CI/CD Limited to CodeQL Scan Only

**Finding:** The only GitHub Actions workflow is a CodeQL security scan on pushes to `main`. There are no workflows for building, testing, linting, or deploying the application.

**Risk:** Code merges to `main` without automated quality validation. Regressions, build failures, and test failures can ship undetected.

---

## 6. Module-Level Implementation Completeness

| Module | Backend API | Frontend UI | Database/Data | Integration | Test Coverage | **Overall** |
|---|---|---|---|---|---|---|
| **Governance** | 95% | 85% | 90% | 85% | 70% | **90%** |
| **People Management** | 85% | 85% | 85% | 80% | 65% | **85%** |
| **Planning** | 95% | 95% | 95% | 90% | 75% | **95%** |
| **ITSM** | 95% | 95% | 95% | 85% | 70% | **95%** |
| **CMDB** | 95% | 95% | 95% | 85% | 70% | **95%** |
| **Knowledge Mgmt** | 90% | 90% | 90% | 80% | 65% | **90%** |
| **GRC** | 85% | 85% | 85% | 75% | 60% | **85%** |
| **Reporting** | 40% | 70% | 60% | 30% | 40% | **60%** |
| **System/Admin** | 80% | 80% | 85% | 75% | 60% | **80%** |
| **Auth/Session** | 70% | 75% | 80% | 60% | 50% | **70%** |

**Weighted Overall System Completeness: ~85%**

---

## 7. Readiness Assessment

| Category | Rating | Justification |
|---|---|---|
| **Demo-Ready** | **YES** | All 8 modules render with real seeded data. Navigation, CRUD operations, dashboards, and analytics all functional. Suitable for stakeholder demonstrations. |
| **UAT-Ready** | **PARTIAL** | Core business workflows work end-to-end. However, missing authorization checks mean testers could access unauthorized data. No email notifications means workflow approvals are manual-only. Report generation is stubbed. |
| **Production-Ready** | **NO** | Critical security vulnerabilities (hardcoded passwords, missing authz, no RLS, no session expiry) are absolute blockers. No CI/CD pipeline, no E2E tests, no email delivery, no rate limiting. Multiple CBN security policy violations. |
| **Audit-Ready** | **PARTIAL** | Comprehensive audit trail infrastructure exists (audit events table, structured logging, observability stack). However, authorization enforcement is incomplete, making audit trails unreliable for accountability since any user can perform any action. |

---

## 8. Decision-Ready Summary

### Can the system be demonstrated to stakeholders?
**Yes.** All eight modules present real data with functional CRUD operations, interactive dashboards, and consistent UI. The demo experience is polished.

### Can the system enter User Acceptance Testing?
**Partially.** Core workflows function, but UAT will be compromised by the ability of any authenticated user to access any data (missing authorization). Testers must be instructed not to test access control boundaries. Email-dependent workflows (approvals, notifications) cannot be tested.

### Can the system be deployed to production?
**No.** Four CRITICAL security findings must be remediated first. The system also lacks CI/CD, E2E tests, email delivery, rate limiting, and CSRF protection. Deploying in current state would violate CBN information security policies and expose the organization to data breach risk.

### What is the estimated effort to reach production readiness?
**8-12 weeks** of focused development effort assuming a team of 2-3 experienced engineers, prioritizing:
- Weeks 1-2: Security remediation (passwords, authorization, RLS, session management)
- Weeks 3-4: CI/CD pipeline, E2E test foundation, email integration
- Weeks 5-6: Report generation, event-driven architecture, notification delivery
- Weeks 7-8: Performance testing, security hardening, penetration testing
- Weeks 9-10: UAT execution and bug fixing
- Weeks 11-12: Production deployment preparation, backup/DR procedures, documentation

### Is the architecture sound?
**Yes.** The foundational architecture is well-designed: clean module separation, hexagonal architecture patterns, type-safe database queries via sqlc, modern React frontend with proper state management, and a full observability stack. The gaps are in security enforcement and operational readiness, not architectural design.

### What is the biggest single risk?
**Missing authorization checks combined with no RLS.** This is a multi-tenant system for a central bank. Any authenticated user can currently access any tenant's data through the API. This represents both a regulatory compliance failure and a potential data breach vector.

---

## 9. Top 20 Missing Implementations

| # | Item | Module | Impact | Effort |
|---|---|---|---|---|
| 1 | Handler-level authorization enforcement | All modules | CRITICAL | 2-3 weeks |
| 2 | PostgreSQL Row-Level Security policies | Database | CRITICAL | 1 week |
| 3 | Session expiry enforcement | Auth | CRITICAL | 3-5 days |
| 4 | Password reset and first-login force-change flow | Auth | CRITICAL | 1 week |
| 5 | SMTP/email delivery integration | Notifications | HIGH | 1 week |
| 6 | CI/CD pipeline (build + test + deploy) | DevOps | HIGH | 1 week |
| 7 | End-to-end test suite (Playwright) | Testing | HIGH | 2-3 weeks |
| 8 | PDF/document report generation | Reporting | HIGH | 1-2 weeks |
| 9 | NATS event publishing from all handlers | Architecture | MEDIUM | 2 weeks |
| 10 | NATS event consumers (async processing) | Architecture | MEDIUM | 2 weeks |
| 11 | Rate limiting middleware | Security | MEDIUM | 2-3 days |
| 12 | CSRF protection for state-changing endpoints | Security | MEDIUM | 2-3 days |
| 13 | Input sanitization / XSS prevention layer | Security | MEDIUM | 1 week |
| 14 | API versioning strategy | Architecture | MEDIUM | 3-5 days |
| 15 | Real-time notifications (WebSocket/SSE) | UX | MEDIUM | 1 week |
| 16 | Committee workflow state machine completion | Governance | MEDIUM | 1 week |
| 17 | Skills assessment scoring workflow | People | MEDIUM | 1 week |
| 18 | Data export (CSV/Excel) across all modules | Reporting | MEDIUM | 1 week |
| 19 | Backup and disaster recovery automation | Operations | MEDIUM | 1 week |
| 20 | Frontend TypeScript strict mode (eliminate 319 `any` usages) | Quality | LOW | 2-3 weeks |

---

## 10. Top 20 Security & Tenant Isolation Risks

| # | Risk | Severity | Exploitability | Current Mitigation |
|---|---|---|---|---|
| 1 | Identical weak password hash for all 37 seeded users | CRITICAL | Trivial | None |
| 2 | No handler-level permission checks (ITSM, CMDB, Knowledge, GRC, Reporting) | CRITICAL | Easy | None |
| 3 | No PostgreSQL RLS policies on tenant-scoped tables | CRITICAL | Moderate | Application-layer WHERE clauses only |
| 4 | Session timeout middleware passes all requests through | CRITICAL | Easy | None |
| 5 | No CSRF tokens on state-changing API endpoints | HIGH | Moderate | SameSite cookies (partial) |
| 6 | No rate limiting on authentication endpoints | HIGH | Easy | None |
| 7 | No input sanitization layer for user-generated content | HIGH | Moderate | React's built-in XSS protection (partial) |
| 8 | 319 TypeScript `any` usages bypassing type safety | HIGH | N/A (code quality) | None |
| 9 | Seed migrations mixed with schema migrations | MEDIUM | Deployment error | Manual discipline |
| 10 | Password hashes committed to version control in SQL files | MEDIUM | Repository access | Repository access controls |
| 11 | No API request body size limits | MEDIUM | Easy | Default Go limits |
| 12 | Dev JWT authentication available alongside Entra ID OIDC | MEDIUM | Configuration error | Environment variable toggle |
| 13 | No audit log integrity protection (logs are mutable) | MEDIUM | DB admin access | Database access controls |
| 14 | MinIO credentials in environment variables without rotation policy | MEDIUM | Server access | Container isolation |
| 15 | No Content-Security-Policy headers configured | MEDIUM | Moderate | None |
| 16 | No Strict-Transport-Security headers | MEDIUM | Network position | None |
| 17 | Database connection strings in environment without encryption | MEDIUM | Server access | Container isolation |
| 18 | No IP allowlisting for administrative endpoints | LOW | Network access | None |
| 19 | GraphQL/REST endpoint enumeration possible (no obfuscation) | LOW | Easy | API design choice |
| 20 | Docker Compose exposes service ports to host network | LOW | Host access | Container networking |

---

## 11. Top 10 Follow-Up AI Implementation Prompts

These prompts are designed to be given to an AI coding assistant to accelerate remediation of the findings above. Each prompt targets a specific high-priority gap.

### Prompt 1: Authorization Middleware
> "Implement a Go middleware function `RequirePermission(resource string, action string)` that extracts the authenticated user's tenant_id and roles from the request context, queries the RBAC tables to verify the user has the specified permission, and returns 403 Forbidden if not authorized. Apply this middleware to all ITSM, CMDB, Knowledge, GRC, and Reporting handler registrations. Use the existing sqlc queries for role lookups. Include unit tests."

### Prompt 2: PostgreSQL Row-Level Security
> "Write a PostgreSQL migration that enables RLS on all business tables that have a tenant_id column. Create a policy on each table that restricts SELECT, INSERT, UPDATE, and DELETE to rows where tenant_id matches current_setting('app.tenant_id')::uuid. Update the Go database connection setup to SET app.tenant_id on each connection checkout from the pgx pool. Include a migration test that verifies cross-tenant access is blocked."

### Prompt 3: Session Expiry Enforcement
> "Implement Redis-backed session timeout enforcement in the existing session middleware. Store session creation time and last activity time in Redis. Enforce a 30-minute idle timeout and a 12-hour absolute timeout. On timeout, delete the session from Redis and return 401 Unauthorized. Add configuration via environment variables for both timeout values. Include unit tests with a mock Redis client."

### Prompt 4: CI/CD Pipeline
> "Create a GitHub Actions workflow file .github/workflows/ci.yml that runs on push to dev and main and on pull requests. The pipeline should: (1) Run Go tests with race detection, (2) Run Go linting with golangci-lint, (3) Build the Go binary, (4) Run Next.js TypeScript type checking, (5) Run Next.js ESLint, (6) Run Next.js unit tests with Vitest, (7) Build the Next.js production bundle. Use caching for Go modules and Node modules. Fail the pipeline if any step fails."

### Prompt 5: Email Delivery Integration
> "Implement email delivery using the existing outbox pattern. Create a Go service that polls the email outbox table for unsent messages, renders the email body using the seeded templates and Go html/template, sends via SMTP (configurable for SendGrid or direct SMTP), marks the message as sent with timestamp, and handles retries with exponential backoff. Add environment variables for SMTP configuration. Include integration tests with a mock SMTP server."

### Prompt 6: End-to-End Test Foundation
> "Set up Playwright for the Next.js frontend. Create a playwright.config.ts with base URL pointing to the local dev server. Write E2E tests for: (1) Login flow (dev JWT mode), (2) Navigate to each of the 8 modules and verify the main page loads, (3) Create a new project in Planning and verify it appears in the list, (4) Create a new incident in ITSM and verify it appears in the list. Use page object models for reusable selectors."

### Prompt 7: Report PDF Generation
> "Implement actual PDF report generation in the Reporting module. Use the `go-pdf` or `gofpdf` library to generate styled PDF documents from the existing report definitions in the database. Support report sections for tables, charts (rendered as images), and text summaries. Generate reports from real database queries using the existing sqlc functions. Wire the generation to the existing report API endpoint that currently returns a stub. Include a test that generates a sample report and verifies the PDF is valid."

### Prompt 8: NATS Event Publishing
> "Add NATS JetStream event publishing to all Create, Update, and Delete handler functions across all modules. Define a standard event envelope struct with fields: event_id, event_type, tenant_id, actor_id, timestamp, and payload (JSON). Create a Go interface EventPublisher and a NATS implementation. Publish events after successful database commits. Use the module name as the NATS subject prefix (e.g., itsm.incident.created). Include a test helper that captures published events."

### Prompt 9: Password Security Remediation
> "Create a new migration that: (1) Adds a `must_change_password` boolean column (default true) to the users table, (2) Sets `must_change_password = true` for all existing users, (3) Generates a random bcrypt-hashed password for each seeded user and stores the plaintext temporarily in a separate admin-only table for initial distribution. Update the login handler to check `must_change_password` and redirect to a password change endpoint. Implement the password change endpoint with validation (minimum 12 chars, complexity requirements). Remove all hardcoded password hashes from seed migration files."

### Prompt 10: TypeScript Strict Mode Cleanup
> "Systematically eliminate all 319 TypeScript `any` type usages in the Next.js frontend. For each `any` usage: (1) Identify the actual type from the API response or component props, (2) Create or extend an interface in the appropriate types file, (3) Replace `any` with the specific type, (4) Fix any resulting type errors. Prioritize API response types first, then event handlers, then component props. Enable `noImplicitAny` in tsconfig.json after all replacements. Run the TypeScript compiler to verify zero errors."

---

## 12. Conclusion

The ITD-OPMS system represents a **substantial and architecturally sound implementation** of a comprehensive IT operations management platform. The foundational work -- database schema design, API structure, frontend component architecture, and observability infrastructure -- is of professional quality and demonstrates significant development investment.

However, the system is **not production-ready** due to four critical security vulnerabilities that would expose the CBN to unacceptable risk. The most urgent concerns are the hardcoded weak passwords in seed data and the missing authorization enforcement across five of eight modules.

The path to production readiness is **achievable within 8-12 weeks** with focused engineering effort. The architecture does not need to be redesigned; it needs security enforcement layers added to the existing clean structure. The observability stack, database design, and module architecture provide a strong foundation to build upon.

**Recommended immediate actions:**
1. Remediate all four CRITICAL security findings before any further feature development.
2. Establish a CI/CD pipeline with automated testing as a quality gate.
3. Implement email delivery to unblock workflow-dependent UAT scenarios.
4. Plan a formal UAT cycle once security remediation is verified.

---

*This executive summary is part of the ITD-OPMS Comprehensive Audit series. See `00_AUDIT_INDEX.md` for the complete deliverable index.*
