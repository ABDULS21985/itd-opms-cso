# AI Agent Unit Testing Prompts — ITD-OPMS

> **Purpose**: Each prompt below is a self-contained instruction for an AI coding agent to write detailed unit tests for a specific module, then fix any compilation, logic, or runtime issues discovered during testing.
>
> **Convention**: Every prompt follows the pattern: (1) read the source, (2) write tests, (3) run tests, (4) fix failures, (5) repeat until green.

---

## Table of Contents

- [PHASE 0 — Test Infrastructure Setup](#phase-0--test-infrastructure-setup)
- [PHASE 1 — Backend Shared Layer](#phase-1--backend-shared-layer)
- [PHASE 2 — Backend Platform Layer](#phase-2--backend-platform-layer)
- [PHASE 3 — Backend Domain Modules](#phase-3--backend-domain-modules)
- [PHASE 4 — Frontend Test Infrastructure](#phase-4--frontend-test-infrastructure)
- [PHASE 5 — Frontend Utilities & Providers](#phase-5--frontend-utilities--providers)
- [PHASE 6 — Frontend Hooks](#phase-6--frontend-hooks)
- [PHASE 7 — Frontend Shared Components](#phase-7--frontend-shared-components)
- [PHASE 8 — Frontend Page Components](#phase-8--frontend-page-components)

---

## PHASE 0 — Test Infrastructure Setup

### Prompt 0.1: Backend Test Helpers & Fixtures

```
You are working on the Go backend of the ITD-OPMS project at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Create a reusable test helpers package that all backend unit tests will depend on.

STEPS:
1. Read the existing test files to understand current patterns:
   - internal/platform/middleware/middleware_test.go
   - internal/platform/server/server_test.go
   - internal/shared/types/response_test.go
   - internal/shared/errors/errors_test.go

2. Read internal/shared/types/context.go to understand the tenant/user context structure.

3. Create a test helpers package at internal/testutil/ with the following files:

   a) internal/testutil/testutil.go:
      - NewTestContext(tenantID, userID string) context.Context — returns a context pre-loaded with tenant and user info matching the middleware's context keys
      - NewTestRequest(method, path string, body interface{}) *http.Request — creates an HTTP request with JSON body and test context
      - NewTestResponseRecorder() *httptest.ResponseRecorder
      - AssertJSON(t *testing.T, rec *httptest.ResponseRecorder, expectedStatus int, target interface{}) — asserts status code, unmarshals body
      - AssertErrorResponse(t *testing.T, rec *httptest.ResponseRecorder, expectedStatus int, expectedMessage string)
      - RandomUUID() string — generates a random UUID for test isolation
      - RandomEmail() string — generates a random email
      - RandomString(n int) string

   b) internal/testutil/mock_db.go:
      - Define interfaces that mirror the database query methods used by services
      - Create mock implementations using simple maps/slices for in-memory storage
      - These mocks should satisfy the interfaces each service depends on

4. Run `go build ./internal/testutil/...` to verify compilation.
5. Fix any compilation errors until the package builds cleanly.

IMPORTANT:
- Use only the standard library and testify (github.com/stretchr/testify) if already in go.mod, otherwise use only the standard library.
- Do NOT import any external mock frameworks unless already in go.mod.
- Match the exact context key types used in the production middleware (read the middleware source to find them).
- Keep the package minimal — only add helpers that will be reused across 3+ test files.
```

### Prompt 0.2: Frontend Test Infrastructure Setup

```
You are working on the Next.js frontend of the ITD-OPMS project at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Set up a complete frontend testing infrastructure using Vitest + React Testing Library.

STEPS:
1. Read package.json to understand current dependencies and scripts.
2. Read tsconfig.json and next.config.ts to understand the TypeScript and build configuration.
3. Read lib/api-client.ts and providers/query-provider.tsx to understand how API calls and React Query are configured.

4. Install testing dependencies:
   npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw

5. Create vitest.config.ts at the project root:
   - Configure jsdom environment
   - Set up path aliases matching tsconfig.json paths (e.g., @/components, @/hooks, @/lib, @/types)
   - Include setup file
   - Configure coverage reporter (v8)
   - Set test file pattern: **/*.test.{ts,tsx}

6. Create test/setup.ts:
   - Import @testing-library/jest-dom for extended matchers
   - Mock next/navigation (useRouter, usePathname, useSearchParams, useParams)
   - Mock next/image
   - Set up MSW server for API mocking (create test/mocks/server.ts and test/mocks/handlers.ts)
   - Configure window.matchMedia mock
   - Configure IntersectionObserver mock
   - Configure ResizeObserver mock

7. Create test/test-utils.tsx:
   - Export a custom render function that wraps components with all required providers:
     - QueryClientProvider (with a fresh QueryClient per test, retry: false)
     - ThemeProvider
     - AuthProvider (with mock auth state)
   - Re-export everything from @testing-library/react
   - Export helper: createMockApiResponse<T>(data: T, meta?: object)
   - Export helper: mockAuthUser(overrides?: Partial<User>)

8. Create test/mocks/handlers.ts:
   - Set up MSW request handlers for common API endpoints used across tests
   - Include handlers for: GET /auth/me, GET /tenants/current, etc.

9. Add scripts to package.json:
   "test": "vitest run",
   "test:watch": "vitest",
   "test:coverage": "vitest run --coverage",
   "test:ui": "vitest --ui"

10. Create a smoke test at test/smoke.test.ts that verifies the setup works:
    - Test that render utility works
    - Test that MSW intercepts requests
    - Test that React Query provider is functional

11. Run `npm run test` to verify everything works. Fix any issues until all smoke tests pass.

IMPORTANT:
- Do NOT install Jest — use Vitest exclusively.
- Ensure all path aliases resolve correctly.
- The MSW handlers should return realistic response shapes matching the types in types/index.ts.
- Do not modify any production code during this setup phase.
```

---

## PHASE 1 — Backend Shared Layer

### Prompt 1.1: Shared Errors Package Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write comprehensive unit tests for the shared errors package.

STEPS:
1. Read internal/shared/errors/errors.go to understand all error types, constructors, and methods.
2. Read the existing internal/shared/errors/errors_test.go to see what is already covered.

3. Expand the test file to achieve 100% coverage. Test:
   a) Every error constructor (NewNotFoundError, NewValidationError, NewUnauthorizedError, NewForbiddenError, NewConflictError, NewInternalError, etc.)
   b) Error() method returns expected message for each type
   c) Is/As error wrapping — verify errors.Is() and errors.As() work correctly with wrapped errors
   d) HTTP status code mapping — verify each error type maps to the correct HTTP status
   e) Edge cases: empty messages, nil inner errors, very long messages
   f) Error formatting with context/details fields if present
   g) Serialization to JSON if there is a ToJSON or MarshalJSON method

4. Run: cd /Users/mac/codes/itd-opms/itd-opms-api && go test -v -race -count=1 ./internal/shared/errors/...
5. Fix any failures. If you find bugs in the production code (e.g., incorrect status mapping), fix them and document what you changed.
6. Run: go test -v -race -coverprofile=coverage.out ./internal/shared/errors/... && go tool cover -func=coverage.out
7. Report the final coverage percentage.

IMPORTANT:
- Use table-driven tests where appropriate.
- Each test function should have a clear, descriptive name following Go conventions (TestErrorType_Method_Scenario).
- Do not modify production code unless you find an actual bug.
```

### Prompt 1.2: Shared Types & Response Package Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write comprehensive unit tests for the shared types package (context, pagination, response).

STEPS:
1. Read all files in internal/shared/types/:
   - context.go — tenant/user context helpers
   - pagination.go — pagination parameter parsing and response
   - response.go — JSON response envelope helpers
   - response_test.go — existing tests

2. Write or expand tests in internal/shared/types/:

   a) context_test.go:
      - Test extracting tenant ID from context (present, missing, wrong type)
      - Test extracting user ID from context (present, missing, wrong type)
      - Test extracting user roles/permissions from context
      - Test context value propagation through nested contexts

   b) pagination_test.go:
      - Test parsing page/limit from query params (valid values, zero, negative, very large)
      - Test default values when params are missing
      - Test max limit capping
      - Test offset calculation from page + limit
      - Test pagination response metadata (total, total_pages, has_next, has_prev)
      - Edge cases: page=0, page=1, last page, beyond last page

   c) response_test.go (expand existing):
      - Test JSON response with data payload
      - Test JSON response with pagination metadata
      - Test error response formatting
      - Test response with nil data
      - Test response Content-Type header is application/json
      - Test response with nested objects and arrays

3. Run: go test -v -race -count=1 ./internal/shared/types/...
4. Fix any failures or bugs discovered.
5. Report final coverage.

IMPORTANT:
- For context tests, read the middleware files to find the exact context key types/values used.
- Use httptest.NewRecorder() for response tests.
```

### Prompt 1.3: Shared Helpers (Crypto & UUID) Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the shared helpers package.

STEPS:
1. Read internal/shared/helpers/crypto.go and uuid.go.

2. Create internal/shared/helpers/crypto_test.go:
   - Test password hashing produces a valid bcrypt/argon2 hash
   - Test password verification succeeds with correct password
   - Test password verification fails with incorrect password
   - Test hash uniqueness (same password produces different hashes due to salt)
   - Test with empty password, very long password, unicode password
   - Test any encryption/decryption functions (roundtrip: encrypt then decrypt equals original)
   - Test HMAC or SHA-256 checksum functions if present
   - Test with edge case inputs (empty string, nil bytes)

3. Create internal/shared/helpers/uuid_test.go:
   - Test UUID generation produces valid v4 UUIDs
   - Test UUID format matches standard pattern (8-4-4-4-12)
   - Test uniqueness (generate 1000 UUIDs, all unique)
   - Test any UUID parsing/validation functions

4. Create internal/shared/export/csv_writer_test.go (if csv_writer.go exists):
   - Test CSV generation with headers and rows
   - Test with special characters (commas, quotes, newlines in values)
   - Test with empty data
   - Test with unicode content

5. Run all shared package tests: go test -v -race -count=1 ./internal/shared/...
6. Fix any failures.
```

---

## PHASE 2 — Backend Platform Layer

### Prompt 2.1: JWT Authentication Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write comprehensive unit tests for the JWT authentication module.

STEPS:
1. Read these files:
   - internal/platform/auth/jwt.go
   - internal/platform/auth/service.go
   - internal/platform/auth/handler.go
   - internal/platform/auth/oidc.go (for understanding the full auth flow)
   - internal/platform/config/config.go (for JWT config structure)

2. Create internal/platform/auth/jwt_test.go:
   - Test token generation with valid claims (user ID, tenant ID, roles, expiry)
   - Test token parsing and validation with a valid token
   - Test token rejection: expired token
   - Test token rejection: invalid signature (tampered token)
   - Test token rejection: wrong signing algorithm
   - Test token rejection: malformed token string
   - Test token rejection: empty/nil token
   - Test claims extraction from valid token
   - Test refresh token generation and validation if applicable
   - Test token with custom claims/metadata

3. Create internal/platform/auth/service_test.go:
   - Test user authentication flow (valid credentials → token pair)
   - Test authentication failure (wrong password)
   - Test authentication failure (user not found)
   - Test authentication failure (disabled/locked account)
   - Test token refresh flow
   - Test logout/token revocation if applicable

4. Create internal/platform/auth/handler_test.go:
   - Test POST /auth/login endpoint with valid credentials (mock the service)
   - Test POST /auth/login with invalid JSON body
   - Test POST /auth/login with missing required fields
   - Test POST /auth/login with wrong credentials (401)
   - Test POST /auth/refresh endpoint
   - Test POST /auth/logout endpoint
   - Test GET /auth/me endpoint (returns current user from context)
   - Verify response shapes match API documentation

5. Run: go test -v -race -count=1 ./internal/platform/auth/...
6. Fix any failures. If the auth service depends on a database, create a mock interface and inject it.
7. Report coverage.

IMPORTANT:
- Use a test-specific JWT secret, never the production secret.
- For handler tests, use httptest and mock the service layer via interfaces.
- If the service has a constructor like NewAuthService(db, config), create a test config with short token expiry for testing.
```

### Prompt 2.2: Middleware Tests (Expand Existing)

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Expand unit tests for all middleware functions.

STEPS:
1. Read all middleware files:
   - internal/platform/middleware/auth.go
   - internal/platform/middleware/correlation.go
   - internal/platform/middleware/csrf.go
   - internal/platform/middleware/logging.go
   - internal/platform/middleware/ratelimit.go
   - internal/platform/middleware/rbac.go
   - internal/platform/middleware/recovery.go
   - internal/platform/middleware/security.go
   - internal/platform/middleware/session.go
   - internal/platform/middleware/tenant.go
   - internal/platform/middleware/middleware_test.go (existing)

2. Read the existing test file and identify gaps.

3. Add tests for each middleware in internal/platform/middleware/middleware_test.go (or split into separate test files per middleware):

   a) Recovery middleware:
      - Test that panics are caught and return 500
      - Test that panic message is logged (capture log output)
      - Test that non-panicking handlers pass through normally

   b) Correlation ID middleware:
      - Test that a new correlation ID is generated when none exists in request
      - Test that existing X-Correlation-ID header is preserved
      - Test that correlation ID is set in response header
      - Test that correlation ID is added to request context

   c) Logging middleware:
      - Test that request method, path, status, duration are logged
      - Test that correlation ID appears in log output

   d) CSRF middleware:
      - Test that GET/HEAD/OPTIONS requests pass through without CSRF token
      - Test that POST/PUT/DELETE require CSRF token
      - Test that valid CSRF token passes validation
      - Test that invalid/missing CSRF token returns 403
      - Test CSRF token generation endpoint if present

   e) Auth middleware:
      - Test that requests with valid JWT pass through and context is populated
      - Test that requests without Authorization header return 401
      - Test that requests with invalid JWT return 401
      - Test that expired JWT returns 401
      - Test Bearer token extraction from header

   f) Tenant middleware:
      - Test that tenant ID is extracted from JWT claims and set in context
      - Test that requests without tenant ID are rejected
      - Test tenant isolation (tenant context is correct)

   g) RBAC middleware:
      - Test that users with required permission pass through
      - Test that users without required permission get 403
      - Test with multiple required permissions (AND/OR logic)
      - Test with admin/superuser bypass if applicable
      - Test with empty permissions list

   h) Rate limit middleware:
      - Test that requests within limit pass through
      - Test that requests exceeding limit return 429
      - Test rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
      - Test rate limit reset behavior

   i) Security headers middleware:
      - Test X-Content-Type-Options: nosniff is set
      - Test X-Frame-Options is set
      - Test X-XSS-Protection is set
      - Test Strict-Transport-Security is set
      - Test Content-Security-Policy if set

   j) Session middleware:
      - Test session creation and validation
      - Test session expiry handling

4. Run: go test -v -race -count=1 ./internal/platform/middleware/...
5. Fix any failures.
6. Report coverage.

IMPORTANT:
- Each middleware test should use httptest.NewServer or httptest.NewRecorder with a simple inner handler (e.g., returns 200 OK).
- For auth middleware tests, generate real JWTs using the jwt package with a test secret.
- For rate limit tests, you may need to account for timing — use short windows.
- If middleware depends on Redis or database, mock those dependencies.
```

### Prompt 2.3: Audit Service Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the audit service and handler.

STEPS:
1. Read:
   - internal/platform/audit/service.go
   - internal/platform/audit/handler.go
   - internal/platform/audit/middleware.go
   - migrations/003_audit_events.sql (understand the schema)

2. Create internal/platform/audit/service_test.go:
   - Test creating an audit event with all required fields
   - Test that SHA-256 checksum is computed correctly
   - Test that audit event includes correct tenant_id, user_id, action, resource_type, resource_id
   - Test that old_data and new_data are correctly captured for update events
   - Test that IP address and user agent are captured from request context
   - Test audit event for create, update, delete, and read actions
   - Test that timestamp is set automatically
   - Test with missing optional fields (old_data for create events)

3. Create internal/platform/audit/handler_test.go:
   - Test GET /audit/events endpoint (list with pagination)
   - Test GET /audit/events with filters (resource_type, action, user_id, date range)
   - Test GET /audit/events/:id endpoint (single event)
   - Test that audit events cannot be modified (no PUT/DELETE endpoints or they return 405)
   - Test authorization: only users with audit_read permission can access

4. Create internal/platform/audit/middleware_test.go:
   - Test that the audit middleware captures request details
   - Test that audit events are created for state-changing operations
   - Test that GET requests are not audited (or audited differently)

5. Run: go test -v -race -count=1 ./internal/platform/audit/...
6. Fix any issues. Mock the database layer.
```

### Prompt 2.4: Notification Service Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the notification module.

STEPS:
1. Read:
   - internal/platform/notification/service.go
   - internal/platform/notification/handler.go
   - internal/platform/notification/orchestrator.go
   - internal/platform/notification/outbox.go
   - internal/platform/notification/sse.go

2. Create internal/platform/notification/service_test.go:
   - Test creating a notification with required fields (recipient, title, body, type)
   - Test notification types: email, in-app, teams
   - Test marking notification as read
   - Test marking all notifications as read for a user
   - Test deleting a notification
   - Test listing notifications with pagination
   - Test listing unread notifications
   - Test unread count for a user

3. Create internal/platform/notification/handler_test.go:
   - Test GET /notifications (list user's notifications)
   - Test GET /notifications/unread-count
   - Test PATCH /notifications/:id/read
   - Test PATCH /notifications/read-all
   - Test DELETE /notifications/:id
   - Test authorization: users can only see their own notifications

4. Create internal/platform/notification/orchestrator_test.go:
   - Test that the orchestrator routes notifications to the correct channel(s)
   - Test notification preference filtering (user opts out of email → only in-app)
   - Test multi-channel delivery (same event triggers email + in-app)

5. Create internal/platform/notification/outbox_test.go:
   - Test outbox message creation
   - Test outbox message processing (pending → sent)
   - Test retry logic for failed deliveries
   - Test dead letter handling after max retries

6. Run: go test -v -race -count=1 ./internal/platform/notification/...
7. Fix any issues. Mock NATS, email sender, and database.
```

---

## PHASE 3 — Backend Domain Modules

### Prompt 3.1: System Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write comprehensive unit tests for the System module (users, roles, tenants, org units, sessions, settings, templates, audit explorer, health).

STEPS:
1. Read ALL files in internal/modules/system/:
   - handler.go (route registration)
   - user_handler.go, user_service.go
   - role_handler.go, role_service.go
   - tenant_handler.go, tenant_service.go
   - org_handler.go, org_service.go
   - session_handler.go, session_service.go
   - settings_handler.go, settings_service.go
   - template_handler.go, template_service.go
   - audit_explorer_handler.go, audit_explorer_service.go
   - health_handler.go, health_service.go
   - maintenance_worker.go
   - types.go

2. Also read the SQL queries in sql/queries/system.sql and sql/queries/users.sql to understand database operations.

3. Create test files for each sub-module:

   a) user_service_test.go:
      - Test ListUsers with pagination, filters (status, role, search term)
      - Test GetUserByID (found, not found)
      - Test CreateUser (valid, duplicate email, missing required fields)
      - Test UpdateUser (valid, not found, email conflict)
      - Test DeactivateUser / ActivateUser
      - Test user role assignment and removal
      - Test tenant-scoped queries (user A in tenant 1 cannot see user B in tenant 2)

   b) user_handler_test.go:
      - Test all HTTP endpoints: GET /users, GET /users/:id, POST /users, PUT /users/:id, DELETE /users/:id
      - Test query parameter handling (page, limit, search, status, role)
      - Test request body validation for create/update
      - Test proper error responses (400, 404, 409, 500)
      - Test RBAC: only admins can create/modify users

   c) role_service_test.go:
      - Test CRUD for roles
      - Test permission assignment to roles
      - Test listing permissions for a role
      - Test preventing deletion of system/built-in roles
      - Test role name uniqueness within tenant

   d) role_handler_test.go:
      - Test all role endpoints with proper auth context

   e) tenant_service_test.go:
      - Test tenant CRUD
      - Test tenant settings management
      - Test tenant isolation

   f) org_service_test.go:
      - Test org unit CRUD
      - Test hierarchical org structure (parent-child relationships)
      - Test moving org units within the hierarchy
      - Test listing org tree

   g) settings_service_test.go:
      - Test getting/setting system settings
      - Test setting validation
      - Test default values for unset settings

   h) health_service_test.go:
      - Test health check returns status of all dependencies (DB, Redis, NATS, MinIO)
      - Test degraded status when one dependency is down
      - Test healthy status when all are up

4. Run: go test -v -race -count=1 ./internal/modules/system/...
5. Fix any failures. Create mock interfaces for database dependencies.
6. Report coverage.

IMPORTANT:
- The System module is the largest with 23 files. Prioritize service tests over handler tests if time is limited.
- Mock the database query layer (sqlc-generated code) with interfaces.
- Ensure tenant isolation is tested in every service that handles multi-tenant data.
```

### Prompt 3.2: Planning & PMO Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write comprehensive unit tests for the Planning & PMO module.

STEPS:
1. Read ALL files in internal/modules/planning/:
   - handler.go, types.go
   - portfolio_handler.go, portfolio_service.go
   - workitem_handler.go, workitem_service.go
   - timeline_handler.go, timeline_service.go
   - risk_handler.go, risk_service.go
   - document_handler.go, document_service.go
   - pir_handler.go, pir_service.go
   - budget_handler.go, budget_service.go, budget_types.go

2. Read sql/queries/planning.sql for database operations.

3. Create test files:

   a) portfolio_service_test.go:
      - Test CRUD for portfolios
      - Test listing portfolios with filters (status, owner, date range)
      - Test portfolio health score calculation
      - Test adding/removing projects from a portfolio
      - Test portfolio-level metrics aggregation

   b) workitem_service_test.go (this is the core — projects and tasks):
      - Test project creation with all required fields
      - Test project update (status transitions: draft → active → on_hold → completed → closed)
      - Test invalid status transitions are rejected
      - Test work item (task) CRUD within a project
      - Test work item hierarchy (parent-child tasks, WBS)
      - Test work item assignment to users
      - Test work item status updates and progress tracking
      - Test filtering/searching work items
      - Test project deletion rules (can't delete with active tasks?)

   c) timeline_service_test.go:
      - Test milestone CRUD
      - Test timeline/Gantt data generation
      - Test dependency management between milestones
      - Test critical path calculation if implemented
      - Test date conflict detection

   d) risk_service_test.go:
      - Test risk CRUD
      - Test risk score calculation (likelihood × impact)
      - Test risk status transitions (identified → mitigating → mitigated → closed)
      - Test risk mitigation plan assignment
      - Test risk filtering by severity, status, project

   e) document_service_test.go:
      - Test document upload metadata creation
      - Test document listing for a project
      - Test document version management
      - Test document deletion
      - Test document access control

   f) pir_service_test.go:
      - Test Post-Implementation Review CRUD
      - Test PIR completion workflow
      - Test lessons learned capture

   g) budget_service_test.go:
      - Test budget creation and allocation
      - Test budget line items CRUD
      - Test budget vs actual tracking
      - Test budget variance calculations
      - Test budget approval workflow if applicable

   h) Handler tests for each sub-module:
      - Test all HTTP endpoints with valid/invalid requests
      - Test pagination, sorting, filtering query params
      - Test request body validation
      - Test proper error responses

4. Run: go test -v -race -count=1 ./internal/modules/planning/...
5. Fix any failures.
6. Report coverage.

IMPORTANT:
- This is the second-largest module (19 files). Focus on business logic in services.
- Test the computed/generated fields (risk scores, budget variances).
- Mock MinIO for document tests.
```

### Prompt 3.3: ITSM Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write comprehensive unit tests for the ITSM (IT Service Management) module.

STEPS:
1. Read ALL files in internal/modules/itsm/:
   - handler.go, types.go
   - ticket_handler.go, ticket_service.go
   - problem_handler.go, problem_service.go
   - catalog_handler.go, catalog_service.go
   - sla_handler.go, sla_service.go
   - queue_handler.go, queue_service.go

2. Read sql/queries/itsm.sql and migrations/009_itsm.sql for schema understanding.

3. Create test files:

   a) ticket_service_test.go:
      - Test ticket creation with auto-numbering (INC-001, INC-002, etc.)
      - Test ticket creation with different types: incident (INC-), service request (SR-), change (CHG-)
      - Test ticket status transitions: new → assigned → in_progress → resolved → closed
      - Test invalid status transitions are rejected (e.g., new → closed directly)
      - Test ticket assignment to agent/queue
      - Test ticket reassignment
      - Test ticket priority setting and escalation rules
      - Test ticket category and subcategory
      - Test ticket search by number, title, assignee, status
      - Test adding comments/work notes to tickets
      - Test ticket resolution with resolution notes
      - Test ticket reopening from resolved state
      - Test SLA timer start/pause/breach on ticket

   b) problem_service_test.go:
      - Test problem creation with auto-numbering (PRB-)
      - Test linking incidents to a problem (many-to-one)
      - Test root cause analysis fields
      - Test problem status workflow
      - Test known error creation from a problem
      - Test workaround documentation

   c) catalog_service_test.go:
      - Test service catalog item CRUD
      - Test catalog item categories
      - Test catalog item approval workflow
      - Test catalog item fulfillment assignment

   d) sla_service_test.go:
      - Test SLA definition CRUD (response time, resolution time per priority)
      - Test SLA timer calculation (business hours vs calendar hours)
      - Test SLA breach detection
      - Test SLA pause during pending states
      - Test SLA metrics reporting

   e) queue_service_test.go:
      - Test queue CRUD
      - Test auto-assignment rules
      - Test queue membership management
      - Test ticket routing to queues based on category

   f) Handler tests for each sub-module.

4. Run: go test -v -race -count=1 ./internal/modules/itsm/...
5. Fix any failures.
6. Report coverage.

IMPORTANT:
- Pay special attention to the auto-numbering logic — it must be thread-safe.
- SLA timer logic is complex (business hours, pausing) — test edge cases.
- Test the state machine transitions thoroughly — invalid transitions should return clear errors.
```

### Prompt 3.4: CMDB Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the CMDB (Configuration Management Database) module.

STEPS:
1. Read ALL files in internal/modules/cmdb/:
   - handler.go, cmdb_handler.go, cmdb_service.go
   - asset_handler.go, asset_service.go
   - license_handler.go, license_service.go
   - warranty_handler.go, warranty_service.go
   - types.go

2. Read sql/queries/cmdb.sql and migrations/010_cmdb.sql.

3. Create test files:

   a) cmdb_service_test.go:
      - Test CI (Configuration Item) CRUD
      - Test CI types (server, application, network_device, database, etc.)
      - Test CI relationship/topology management (depends_on, runs_on, connected_to)
      - Test CI status lifecycle (planned → active → retired → decommissioned)
      - Test CI search and filtering
      - Test CI impact analysis (what CIs are affected if this one goes down)

   b) asset_service_test.go:
      - Test asset registration CRUD
      - Test asset lifecycle (procurement → deployed → maintenance → retired)
      - Test asset assignment to user/department
      - Test asset inventory tracking
      - Test asset search by serial number, asset tag, type

   c) license_service_test.go:
      - Test license CRUD
      - Test license allocation tracking (total vs used)
      - Test license expiry date handling
      - Test license compliance check (over-allocated = non-compliant)
      - Test license renewal workflows

   d) warranty_service_test.go:
      - Test warranty CRUD
      - Test warranty expiry notifications
      - Test warranty coverage validation
      - Test linking warranties to assets

   e) Handler tests for all endpoints.

4. Run: go test -v -race -count=1 ./internal/modules/cmdb/...
5. Fix any failures.
```

### Prompt 3.5: Governance Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the Governance module.

STEPS:
1. Read ALL files in internal/modules/governance/:
   - handler.go, types.go
   - policy_handler.go, policy_service.go
   - raci_handler.go, raci_service.go
   - meeting_handler.go, meeting_service.go
   - okr_handler.go, okr_service.go
   - action_reminder.go

2. Read sql/queries/governance.sql and migrations/007_governance.sql.

3. Create test files:

   a) policy_service_test.go:
      - Test policy CRUD
      - Test policy versioning (creating new version of existing policy)
      - Test policy lifecycle: draft → review → approved → published → retired
      - Test policy attestation (users acknowledging they read the policy)
      - Test policy search by title, category, status
      - Test policy document attachment
      - Test preventing edits to published policies (must create new version)
      - Test policy diff between versions

   b) raci_service_test.go:
      - Test RACI matrix CRUD
      - Test RACI assignment (Responsible, Accountable, Consulted, Informed)
      - Test validation: exactly one Accountable per activity
      - Test RACI filtering by project/process

   c) meeting_service_test.go:
      - Test meeting CRUD
      - Test meeting attendee management
      - Test meeting minutes recording
      - Test action item creation from meetings
      - Test meeting recurrence if supported
      - Test decision recording (DEC-YYYY-NNN auto-numbering)

   d) okr_service_test.go:
      - Test OKR (Objective and Key Result) CRUD
      - Test OKR hierarchy (Objective → Key Results)
      - Test OKR progress tracking (0-100%)
      - Test OKR scoring/grading
      - Test OKR cycle management (quarterly periods)
      - Test OKR alignment (cascading from org to team to individual)

   e) action_reminder_test.go:
      - Test reminder scheduling
      - Test reminder notification triggering
      - Test overdue action detection

   f) Handler tests for all endpoints.

4. Run: go test -v -race -count=1 ./internal/modules/governance/...
5. Fix any failures.
```

### Prompt 3.6: GRC Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the GRC (Governance, Risk & Compliance) module.

STEPS:
1. Read ALL files in internal/modules/grc/:
   - handler.go, types.go
   - risk_handler.go, risk_service.go
   - compliance_handler.go, compliance_service.go
   - grc_audit_handler.go, grc_audit_service.go
   - access_review_handler.go, access_review_service.go

2. Read sql/queries/grc.sql and migrations/013_grc.sql.

3. Create test files:

   a) risk_service_test.go:
      - Test risk register CRUD
      - Test risk assessment scoring (likelihood × impact = risk score)
      - Test risk score validation (values within allowed ranges)
      - Test risk treatment plans (accept, mitigate, transfer, avoid)
      - Test risk status lifecycle
      - Test risk category filtering
      - Test risk heatmap data generation
      - Test residual risk calculation after controls

   b) compliance_service_test.go:
      - Test compliance framework CRUD
      - Test control mapping to frameworks (ISO 27001, NIST, etc.)
      - Test compliance assessment workflow
      - Test control effectiveness ratings
      - Test evidence linking to controls
      - Test compliance gap analysis

   c) grc_audit_service_test.go:
      - Test GRC audit CRUD (different from system audit trail)
      - Test audit planning and scheduling
      - Test audit finding CRUD
      - Test finding severity classification
      - Test corrective action tracking
      - Test audit evidence management
      - Test audit report generation data

   d) access_review_service_test.go:
      - Test access review campaign creation
      - Test review assignment to managers
      - Test approval/revocation of access
      - Test review completion tracking
      - Test overdue review detection

   e) Handler tests for all endpoints.

4. Run: go test -v -race -count=1 ./internal/modules/grc/...
5. Fix any failures.
```

### Prompt 3.7: People & Workforce Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the People & Workforce module.

STEPS:
1. Read ALL files in internal/modules/people/:
   - handler.go, types.go
   - roster_handler.go, roster_service.go
   - skill_handler.go, skill_service.go
   - training_handler.go, training_service.go
   - checklist_handler.go, checklist_service.go
   - heatmap_handler.go, heatmap_service.go, heatmap_types.go

2. Read sql/queries/people.sql and migrations/011_people.sql.

3. Create test files:

   a) roster_service_test.go:
      - Test staff roster CRUD
      - Test roster filtering by department, role, status
      - Test roster entry with date ranges (start/end)
      - Test roster conflict detection (overlapping assignments)

   b) skill_service_test.go:
      - Test skill definition CRUD
      - Test skill assignment to users with proficiency levels
      - Test skill search and matching
      - Test skill gap analysis (required vs actual for a role/project)
      - Test skill matrix generation

   c) training_service_test.go:
      - Test training program CRUD
      - Test training enrollment management
      - Test training completion tracking
      - Test certification tracking with expiry dates
      - Test training history for a user

   d) checklist_service_test.go:
      - Test onboarding/offboarding checklist CRUD
      - Test checklist template management
      - Test checklist item completion tracking
      - Test checklist assignment to new hires/departing staff
      - Test checklist progress percentage calculation

   e) heatmap_service_test.go:
      - Test capacity heatmap data generation
      - Test resource allocation calculation
      - Test overallocation detection (>100% allocation)
      - Test heatmap filtering by team, time period
      - Test utilization percentage calculations

   f) Handler tests for all endpoints.

4. Run: go test -v -race -count=1 ./internal/modules/people/...
5. Fix any failures.
```

### Prompt 3.8: Knowledge Base Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the Knowledge Base module.

STEPS:
1. Read ALL files in internal/modules/knowledge/:
   - handler.go, types.go
   - article_handler.go, article_service.go
   - feedback_handler.go, feedback_service.go
   - announcement_handler.go, announcement_service.go

2. Read sql/queries/knowledge.sql and migrations/012_knowledge.sql.

3. Create test files:

   a) article_service_test.go:
      - Test article CRUD
      - Test article versioning (edit creates new version, old versions preserved)
      - Test article status lifecycle: draft → review → published → archived
      - Test article slug generation from title
      - Test slug uniqueness handling (duplicate titles → incremented slugs)
      - Test article categorization and tagging
      - Test full-text search (title + body matching)
      - Test article view count tracking
      - Test related articles suggestion
      - Test article author and last editor tracking

   b) feedback_service_test.go:
      - Test article feedback submission (helpful/not helpful + comment)
      - Test feedback aggregation (helpful percentage)
      - Test listing feedback for an article
      - Test preventing duplicate feedback from same user

   c) announcement_service_test.go:
      - Test announcement CRUD
      - Test announcement scheduling (publish_at, expire_at)
      - Test announcement targeting (all users, specific roles, specific departments)
      - Test listing active announcements
      - Test announcement dismissal by user
      - Test announcement priority levels

   d) Handler tests for all endpoints.

4. Run: go test -v -race -count=1 ./internal/modules/knowledge/...
5. Fix any failures.
```

### Prompt 3.9: Reporting & Analytics Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the Reporting & Analytics module.

STEPS:
1. Read ALL files in internal/modules/reporting/:
   - handler.go, types.go
   - report_handler.go, report_service.go
   - dashboard_handler.go, dashboard_service.go, dashboard_refresher.go
   - search_handler.go, search_service.go
   - report_scheduler.go

2. Read sql/queries/reporting.sql and migrations/014_reporting.sql, 015_reporting_kpis_and_scheduler.sql.

3. Create test files:

   a) dashboard_service_test.go:
      - Test executive dashboard KPI retrieval
      - Test dashboard widget data generation
      - Test dashboard data caching behavior
      - Test dashboard filtering by date range
      - Test cross-module metrics aggregation (projects, risks, tickets)
      - Test dashboard refresh logic
      - Test materialized view refresh scheduling

   b) report_service_test.go:
      - Test report template CRUD
      - Test report generation with parameters
      - Test report output formats (JSON, CSV)
      - Test report scheduling (cron-based)
      - Test report access control

   c) search_service_test.go:
      - Test global search across modules
      - Test search result ranking
      - Test search filtering by module/type
      - Test search pagination
      - Test search with special characters
      - Test empty search handling

   d) report_scheduler_test.go:
      - Test scheduled report execution
      - Test scheduler error handling (report generation failure)
      - Test scheduler notification on completion

   e) dashboard_refresher_test.go:
      - Test materialized view refresh
      - Test refresh scheduling
      - Test concurrent refresh handling

   f) Handler tests for all endpoints.

4. Run: go test -v -race -count=1 ./internal/modules/reporting/...
5. Fix any failures.
```

### Prompt 3.10: Vendor, Contract & Remaining Module Tests

```
You are working on the Go backend at /Users/mac/codes/itd-opms/itd-opms-api.

TASK: Write unit tests for the Vendor, Vault, Approval, Automation, Calendar, and Custom Fields modules.

STEPS:
1. Read ALL files in these modules:
   - internal/modules/vendor/ (handler.go, service.go, types.go)
   - internal/modules/vault/ (handler.go, service.go, types.go)
   - internal/modules/approval/ (handler.go, service.go, types.go)
   - internal/modules/automation/ (handler.go, service.go, types.go)
   - internal/modules/calendar/ (handler.go, service.go, types.go)
   - internal/modules/customfields/ (handler.go, service.go, types.go)

2. Read relevant migrations:
   - 027_vendor_management.sql
   - 028_document_vault.sql
   - 004_approvals_and_signoffs.sql, 024_approval_engine_enhancements.sql
   - 029_automation_rules.sql
   - 025_change_calendar.sql
   - 030_custom_fields.sql

3. Create test files:

   a) vendor/service_test.go:
      - Test vendor CRUD
      - Test vendor status management (active, inactive, blacklisted)
      - Test vendor contact management
      - Test vendor contract association
      - Test vendor performance scoring
      - Test vendor search and filtering
      - Test vendor document management

   b) vault/service_test.go:
      - Test document upload metadata CRUD
      - Test document categorization
      - Test document access control (who can view/download)
      - Test document version management
      - Test document expiry handling
      - Test secure document retrieval (signed URL generation)

   c) approval/service_test.go:
      - Test approval workflow creation
      - Test multi-step approval chains (sequential approvers)
      - Test parallel approval (all must approve)
      - Test approval actions: approve, reject, return for revision
      - Test delegation (approver delegates to substitute)
      - Test escalation on timeout
      - Test approval history/audit trail
      - Test SLA tracking on pending approvals

   d) automation/service_test.go:
      - Test automation rule CRUD
      - Test rule condition evaluation (if-then logic)
      - Test rule trigger events (on_create, on_update, on_status_change)
      - Test rule actions (send_notification, assign_to, update_field)
      - Test rule enable/disable
      - Test rule execution logging
      - Test rule priority/ordering

   e) calendar/service_test.go:
      - Test change calendar event CRUD
      - Test event scheduling with conflict detection
      - Test blackout/freeze period management
      - Test calendar view data generation (month, week, day)
      - Test event approval workflow
      - Test recurring event support if applicable

   f) customfields/service_test.go:
      - Test custom field definition CRUD
      - Test field types (text, number, date, dropdown, checkbox, etc.)
      - Test field validation rules (required, min/max, regex pattern)
      - Test field value storage and retrieval
      - Test field association with entities (projects, tickets, etc.)
      - Test dropdown option management
      - Test field ordering/display priority

   g) Handler tests for all six modules.

4. Run tests for each module:
   go test -v -race -count=1 ./internal/modules/vendor/...
   go test -v -race -count=1 ./internal/modules/vault/...
   go test -v -race -count=1 ./internal/modules/approval/...
   go test -v -race -count=1 ./internal/modules/automation/...
   go test -v -race -count=1 ./internal/modules/calendar/...
   go test -v -race -count=1 ./internal/modules/customfields/...

5. Fix any failures across all modules.
6. Report coverage for each.
```

---

## PHASE 4 — Frontend Test Infrastructure

(Covered in Prompt 0.2 above)

---

## PHASE 5 — Frontend Utilities & Providers

### Prompt 5.1: Frontend Utility Function Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for all utility functions and libraries.

STEPS:
1. Read all files in lib/:
   - api-client.ts
   - auth.ts
   - export-utils.ts
   - fuzzy-match.ts
   - navigation.ts
   - utils.ts

2. Create test files:

   a) lib/__tests__/api-client.test.ts:
      - Test base URL configuration
      - Test request interceptor adds Authorization header
      - Test request interceptor adds tenant header
      - Test response interceptor handles 401 (redirect to login)
      - Test response interceptor handles network errors
      - Test API methods: get, post, put, patch, delete
      - Test request with query parameters
      - Test file upload handling
      - Mock axios or fetch appropriately

   b) lib/__tests__/auth.test.ts:
      - Test token storage (localStorage/cookie management)
      - Test token retrieval
      - Test token removal on logout
      - Test isAuthenticated check
      - Test token expiry detection
      - Test auth redirect URL construction

   c) lib/__tests__/export-utils.test.ts:
      - Test CSV export with headers and data rows
      - Test CSV handling of special characters (commas, quotes, newlines)
      - Test CSV with empty data
      - Test JSON export if supported
      - Test file download trigger (mock URL.createObjectURL and link.click)

   d) lib/__tests__/fuzzy-match.test.ts:
      - Test exact match returns high score
      - Test partial match (substring)
      - Test fuzzy match (typos, missing characters)
      - Test case insensitivity
      - Test empty query returns all items
      - Test no match returns empty/low score
      - Test ranking (exact > prefix > substring > fuzzy)
      - Test with special characters

   e) lib/__tests__/navigation.test.ts:
      - Test navigation path construction
      - Test breadcrumb generation from path
      - Test route matching
      - Test dynamic segment handling ([id] params)

   f) lib/__tests__/utils.test.ts:
      - Test each utility function individually
      - Common utilities: formatDate, formatCurrency, truncateString, debounce, throttle, classNames/cn, etc.
      - Test edge cases: null, undefined, empty strings, boundary values

3. Run: npm run test -- lib/
4. Fix any failures.
```

### Prompt 5.2: Frontend Provider Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for all context providers.

STEPS:
1. Read all files in providers/:
   - auth-provider.tsx
   - breadcrumb-provider.tsx
   - notification-provider.tsx
   - query-provider.tsx
   - theme-provider.tsx

2. Create test files:

   a) providers/__tests__/auth-provider.test.tsx:
      - Test that AuthProvider renders children
      - Test that useAuth hook provides user data when authenticated
      - Test that useAuth hook provides null/undefined when not authenticated
      - Test login function updates auth state
      - Test logout function clears auth state
      - Test that auth state persists across re-renders
      - Test loading state during initial auth check

   b) providers/__tests__/breadcrumb-provider.test.tsx:
      - Test that breadcrumb context provides current breadcrumbs
      - Test that setBreadcrumbs updates the breadcrumb trail
      - Test breadcrumb rendering for nested routes

   c) providers/__tests__/notification-provider.test.tsx:
      - Test that notification provider renders children
      - Test toast notification display
      - Test notification auto-dismiss timing
      - Test different notification types (success, error, warning, info)

   d) providers/__tests__/theme-provider.test.tsx:
      - Test default theme (light or system preference)
      - Test theme toggle (light → dark)
      - Test theme persistence (localStorage)
      - Test that theme class is applied to document

   e) providers/__tests__/query-provider.test.tsx:
      - Test that QueryClientProvider wraps children correctly
      - Test default query client configuration (staleTime, retry, etc.)

3. Run: npm run test -- providers/
4. Fix any failures.

IMPORTANT:
- Use the custom render function from test/test-utils.tsx.
- For auth provider tests, mock the API client to return user data.
- For theme tests, mock localStorage and matchMedia.
```

---

## PHASE 6 — Frontend Hooks

### Prompt 6.1: Core Frontend Hook Tests (Auth, Notifications, System)

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for the core React hooks.

STEPS:
1. Read the hook files:
   - hooks/use-auth.ts
   - hooks/use-notifications.ts
   - hooks/use-system.ts
   - hooks/use-hotkeys.ts
   - hooks/use-reduced-motion.ts
   - hooks/use-sidebar-favorites.ts
   - hooks/use-sidebar-recently-visited.ts
   - hooks/use-sidebar-scroll.ts
   - hooks/use-sidebar-sections.ts

2. Read types/index.ts for the type definitions these hooks use.

3. Create test files using @testing-library/react's renderHook:

   a) hooks/__tests__/use-auth.test.ts:
      - Test initial loading state
      - Test authenticated state (user data available)
      - Test unauthenticated state
      - Test login mutation
      - Test logout mutation
      - Test token refresh behavior
      - Mock API responses using MSW

   b) hooks/__tests__/use-notifications.test.ts:
      - Test fetching notifications list
      - Test unread count query
      - Test markAsRead mutation
      - Test markAllAsRead mutation
      - Test delete notification mutation
      - Test SSE connection setup if applicable
      - Test query invalidation after mutations

   c) hooks/__tests__/use-system.test.ts:
      - Test useUsers hook: list, get by ID
      - Test useRoles hook: list, get by ID
      - Test useCreateUser mutation
      - Test useUpdateUser mutation
      - Test useSettings hook
      - Test useUpdateSettings mutation
      - Verify query key structure for cache invalidation

   d) hooks/__tests__/use-hotkeys.test.ts:
      - Test keyboard shortcut registration
      - Test shortcut callback execution
      - Test shortcut with modifier keys (Ctrl, Shift, Alt)
      - Test shortcut cleanup on unmount
      - Test preventing shortcuts when typing in input fields

   e) hooks/__tests__/use-reduced-motion.test.ts:
      - Test returns true when prefers-reduced-motion is set
      - Test returns false when motion is allowed
      - Test responds to media query changes

   f) hooks/__tests__/use-sidebar-*.test.ts:
      - Test sidebar favorites persistence (localStorage)
      - Test adding/removing favorites
      - Test recently visited tracking
      - Test sidebar section expand/collapse state

4. Run: npm run test -- hooks/
5. Fix any failures.

IMPORTANT:
- Use renderHook from @testing-library/react.
- Wrap hooks in QueryClientProvider via the custom render/wrapper from test-utils.
- Use MSW to mock API responses.
- Test loading, success, and error states for all data-fetching hooks.
```

### Prompt 6.2: Domain Hook Tests (Planning, ITSM, CMDB, Governance)

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for the domain-specific React hooks.

STEPS:
1. Read the hook files:
   - hooks/use-planning.ts
   - hooks/use-itsm.ts
   - hooks/use-cmdb.ts
   - hooks/use-governance.ts
   - hooks/use-grc.ts
   - hooks/use-people.ts
   - hooks/use-knowledge.ts
   - hooks/use-reporting.ts

2. Read types/index.ts for the entity types these hooks manage.

3. Create test files for each hook. For each hook, test:

   a) hooks/__tests__/use-planning.test.ts:
      - usePortfolios: list query with pagination, filter params
      - usePortfolio(id): single entity query
      - useCreatePortfolio: mutation, optimistic update, cache invalidation
      - useProjects: list query with filters (status, owner, portfolio)
      - useProject(id): single entity query
      - useCreateProject, useUpdateProject, useDeleteProject mutations
      - useWorkItems: list with project filter
      - useRisks: list with project filter
      - useBudget: budget data for a project
      - Error handling for all queries (API returns 500)

   b) hooks/__tests__/use-itsm.test.ts:
      - useTickets: list with filters (status, priority, assignee, queue)
      - useTicket(id): single ticket
      - useCreateTicket, useUpdateTicket mutations
      - useProblems: list and CRUD
      - useCatalogItems: list and CRUD
      - useSLAs: list and CRUD

   c) hooks/__tests__/use-cmdb.test.ts:
      - useAssets: list with filters
      - useAsset(id): single asset
      - useCIs: configuration items
      - useLicenses: license tracking
      - useWarranties: warranty tracking
      - CRUD mutations for each

   d) hooks/__tests__/use-governance.test.ts:
      - usePolicies, usePolicy(id)
      - useRACIMatrices
      - useMeetings, useMeeting(id)
      - useOKRs, useOKR(id)
      - CRUD mutations for each

   e) hooks/__tests__/use-grc.test.ts:
      - useGRCRisks, useComplianceFrameworks
      - useGRCAudits, useAccessReviews
      - CRUD mutations for each

   f) hooks/__tests__/use-people.test.ts:
      - useRoster, useSkills, useTraining
      - useChecklists, useHeatmap
      - CRUD mutations for each

   g) hooks/__tests__/use-knowledge.test.ts:
      - useArticles, useArticle(slug)
      - useAnnouncements
      - useFeedback
      - CRUD mutations

   h) hooks/__tests__/use-reporting.test.ts:
      - useDashboard, useDashboardKPIs
      - useReports
      - useGlobalSearch

4. For each hook test file, follow this pattern:
   - Set up MSW handlers for the API endpoints the hook calls
   - Test the query hook returns data in success state
   - Test the query hook handles loading state
   - Test the query hook handles error state
   - Test mutation hooks call the correct API endpoint with correct payload
   - Test that mutations invalidate the correct query keys
   - Test pagination parameters are passed correctly

5. Run: npm run test -- hooks/
6. Fix any failures.

IMPORTANT:
- Group related hooks in the same test file (e.g., all planning hooks together).
- Verify the exact API endpoint paths by reading the hook implementations.
- Test that query keys include tenant context if applicable.
```

### Prompt 6.3: Remaining Hook Tests (Vendors, Budget, Calendar, Vault, Approvals, Custom Fields, Heatmap)

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for the remaining domain hooks.

STEPS:
1. Read the hook files:
   - hooks/use-vendors.ts
   - hooks/use-budget.ts
   - hooks/use-calendar.ts
   - hooks/use-vault.ts
   - hooks/use-approvals.ts
   - hooks/use-custom-fields.ts
   - hooks/use-automation.ts
   - hooks/use-heatmap.ts

2. Create test files for each:

   a) hooks/__tests__/use-vendors.test.ts:
      - useVendors: list with filters (status, category, search)
      - useVendor(id): single vendor
      - useCreateVendor, useUpdateVendor, useDeleteVendor mutations
      - useVendorContracts: contracts for a vendor
      - Test proper API endpoints and payload shapes

   b) hooks/__tests__/use-budget.test.ts:
      - useBudgets: list budgets
      - useBudget(id): single budget
      - useBudgetLineItems: line items for a budget
      - useCreateBudgetItem, useUpdateBudgetItem mutations
      - Test budget calculation helpers if embedded in hook

   c) hooks/__tests__/use-calendar.test.ts:
      - useCalendarEvents: events for date range
      - useCreateEvent, useUpdateEvent, useDeleteEvent
      - Test date range parameter passing
      - Test event type filtering

   d) hooks/__tests__/use-vault.test.ts:
      - useVaultDocuments: list documents
      - useUploadDocument mutation
      - useDeleteDocument mutation
      - useDownloadDocument: URL generation

   e) hooks/__tests__/use-approvals.test.ts:
      - usePendingApprovals: list pending approvals for current user
      - useApprovalHistory: completed approvals
      - useApprove, useReject, useReturn mutations
      - Test optimistic updates

   f) hooks/__tests__/use-custom-fields.test.ts:
      - useCustomFieldDefinitions: list field definitions
      - useCustomFieldValues: values for an entity
      - useCreateFieldDefinition, useUpdateFieldValues mutations

   g) hooks/__tests__/use-automation.test.ts:
      - useAutomationRules: list rules
      - useCreateRule, useUpdateRule, useToggleRule mutations

   h) hooks/__tests__/use-heatmap.test.ts:
      - useCapacityHeatmap: heatmap data for date range
      - Test date range and team filter parameters

3. Run: npm run test -- hooks/
4. Fix any failures.
```

---

## PHASE 7 — Frontend Shared Components

### Prompt 7.1: Data Table Component Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write thorough unit tests for the DataTable shared component — it's the most critical UI component used across all modules.

STEPS:
1. Read components/shared/data-table.tsx completely.
2. Understand its props: columns, data, pagination, sorting, selection, actions, loading state, empty state, etc.

3. Create components/shared/__tests__/data-table.test.tsx:

   a) Rendering:
      - Test renders table with correct headers from column definitions
      - Test renders rows with correct data
      - Test renders empty state when data is empty
      - Test renders loading skeleton when loading=true
      - Test renders correct number of rows

   b) Sorting:
      - Test clicking a column header triggers sort callback
      - Test sort indicator (arrow) shows on sorted column
      - Test toggling sort direction (asc → desc → none)
      - Test that non-sortable columns don't show sort controls

   c) Pagination:
      - Test pagination controls render when data exceeds page size
      - Test page navigation (next, previous, first, last)
      - Test page size selector
      - Test displaying "Showing X-Y of Z" text
      - Test disabled state for prev on first page and next on last page

   d) Selection:
      - Test row checkbox selection (single row)
      - Test "select all" checkbox
      - Test "select all" is indeterminate when some rows selected
      - Test selection callback provides selected row IDs/data
      - Test bulk action bar appears when rows are selected

   e) Bulk Actions:
      - Test bulk action buttons render when rows selected
      - Test bulk action callbacks receive selected items
      - Test bulk action bar disappears when selection cleared

   f) Keyboard Navigation:
      - Test arrow key navigation between rows
      - Test Enter key to select/activate a row
      - Test Escape to clear selection
      - Test Tab key for accessibility

   g) Inline Editing:
      - Test double-click to edit a cell (if supported)
      - Test edit mode renders input/select
      - Test saving inline edit
      - Test canceling inline edit (Escape)

   h) Export:
      - Test export dropdown renders
      - Test CSV export triggers download

   i) Responsive:
      - Test mobile layout adjustments (if responsive)

4. Run: npm run test -- components/shared/__tests__/data-table.test.tsx
5. Fix any failures.

IMPORTANT:
- Use @testing-library/user-event for user interactions (clicks, keyboard).
- Provide realistic mock data matching the table's expected column structure.
- Test accessibility: proper ARIA roles (table, row, columnheader, cell), labels, keyboard navigation.
```

### Prompt 7.2: Other Shared Component Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for all remaining shared components.

STEPS:
1. Read all files in components/shared/:
   - approval-status.tsx
   - command-palette.tsx
   - confirm-dialog.tsx
   - custom-field-columns.tsx
   - custom-fields-form.tsx
   - document-upload.tsx
   - empty-state.tsx
   - export-dropdown.tsx
   - form-field.tsx
   - inline-edit.tsx
   - json-diff.tsx
   - keyboard-shortcut-help.tsx
   - loading-skeleton.tsx
   - permission-gate.tsx
   - status-badge.tsx

2. Create test files for each:

   a) approval-status.test.tsx:
      - Test renders correct badge variant for each status (pending, approved, rejected, returned)
      - Test displays correct text for each status
      - Test with custom className

   b) command-palette.test.tsx:
      - Test opens on Ctrl+K / Cmd+K
      - Test search input filters results
      - Test keyboard navigation (up/down arrows)
      - Test Enter executes selected action
      - Test Escape closes palette
      - Test displays recent items
      - Test navigation actions route correctly

   c) confirm-dialog.test.tsx:
      - Test renders title and message
      - Test confirm button calls onConfirm
      - Test cancel button calls onCancel
      - Test destructive variant styling
      - Test loading state disables buttons

   d) custom-fields-form.test.tsx:
      - Test renders correct input type for each field type (text, number, date, dropdown, checkbox)
      - Test validation rules are enforced
      - Test form submission with values
      - Test required field validation

   e) document-upload.test.tsx:
      - Test drag and drop zone renders
      - Test file selection via click
      - Test file type validation
      - Test file size limit enforcement
      - Test upload progress display
      - Test multiple file upload
      - Test removing a file from upload queue

   f) empty-state.test.tsx:
      - Test renders icon, title, and description
      - Test renders action button when provided
      - Test action button click callback

   g) export-dropdown.test.tsx:
      - Test dropdown renders export options
      - Test CSV export option click
      - Test JSON export option click if available

   h) form-field.test.tsx:
      - Test renders label
      - Test renders error message
      - Test renders helper text
      - Test required indicator
      - Test wraps children correctly

   i) inline-edit.test.tsx:
      - Test displays value in view mode
      - Test clicking enters edit mode
      - Test saving edit (Enter or blur)
      - Test canceling edit (Escape)
      - Test validation on save

   j) json-diff.test.tsx:
      - Test renders diff between two JSON objects
      - Test highlights additions in green
      - Test highlights deletions in red
      - Test handles nested objects
      - Test handles arrays

   k) keyboard-shortcut-help.test.tsx:
      - Test renders list of shortcuts
      - Test displays correct key combinations
      - Test modal open/close with ? key

   l) loading-skeleton.test.tsx:
      - Test renders correct number of skeleton lines
      - Test variant shapes (text, circular, rectangular)
      - Test animation class is applied

   m) permission-gate.test.tsx:
      - Test renders children when user has required permission
      - Test renders nothing (or fallback) when user lacks permission
      - Test with multiple required permissions
      - Test with admin bypass

   n) status-badge.test.tsx:
      - Test renders correct color/variant for each status value
      - Test displays status text
      - Test with custom className

3. Run: npm run test -- components/shared/
4. Fix any failures.
```

### Prompt 7.3: Chart Component Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for all chart and dashboard components.

STEPS:
1. Read all files in components/dashboard/charts/:
   - chart-card.tsx
   - donut-chart.tsx
   - funnel-chart.tsx
   - gauge-chart.tsx
   - heat-map-grid.tsx
   - kpi-stat-card.tsx
   - mini-bar-chart.tsx
   - progress-ring.tsx
   - radar-chart.tsx
   - spark-line.tsx
   - stacked-bar-chart.tsx
   - treemap-chart.tsx
   - trend-line-chart.tsx
   - waterfall-chart.tsx
   - filter-bar.tsx

2. Create test files:

   a) chart-card.test.tsx:
      - Test renders title
      - Test renders children (chart content)
      - Test loading state shows skeleton
      - Test error state displays error message
      - Test optional subtitle and action buttons

   b) kpi-stat-card.test.tsx:
      - Test renders KPI value
      - Test renders label
      - Test renders trend indicator (up/down arrow with percentage)
      - Test positive trend shows green, negative shows red
      - Test click navigation if link provided
      - Test loading state

   c) For each chart component (donut, funnel, gauge, etc.):
      - Test renders without crashing with valid data
      - Test renders empty state with no data
      - Test renders with single data point
      - Test renders with many data points
      - Test tooltip content if applicable
      - Test legend rendering if applicable
      - Test responsive behavior

   d) filter-bar.test.tsx:
      - Test renders filter controls
      - Test date range picker functionality
      - Test dropdown filter selection
      - Test filter reset/clear
      - Test filter change callback

   e) progress-ring.test.tsx:
      - Test renders with 0% progress
      - Test renders with 50% progress
      - Test renders with 100% progress
      - Test renders label text
      - Test color changes based on thresholds

3. Run: npm run test -- components/dashboard/
4. Fix any failures.

IMPORTANT:
- Recharts components render SVG. Mock Recharts' ResponsiveContainer to avoid jsdom SVG measurement issues:
  jest.mock('recharts', () => { ... mock ResponsiveContainer to render children directly ... })
- Focus on data rendering correctness, not pixel-perfect layout.
```

### Prompt 7.4: Layout & Navigation Component Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for layout and navigation components.

STEPS:
1. Read:
   - components/layout/header.tsx
   - components/layout/sidebar.tsx
   - components/layout/sidebar/sidebar-setup-wizard.tsx
   - components/layout/mobile-nav.tsx
   - components/notifications/notification-bell.tsx
   - components/notifications/notification-item.tsx
   - components/notifications/notification-panel.tsx
   - components/planning/gantt-chart.tsx
   - components/planning/project-documents.tsx

2. Create test files:

   a) layout/__tests__/header.test.tsx:
      - Test renders app logo/title
      - Test renders user avatar/menu
      - Test renders notification bell
      - Test renders search/command palette trigger
      - Test user menu dropdown (profile, settings, logout)

   b) layout/__tests__/sidebar.test.tsx:
      - Test renders all navigation sections
      - Test section expand/collapse
      - Test active route highlighting
      - Test navigation link clicks
      - Test sidebar collapse/expand toggle
      - Test favorites section
      - Test recently visited section
      - Test permission-based menu item visibility

   c) layout/__tests__/mobile-nav.test.tsx:
      - Test hamburger menu toggle
      - Test navigation drawer opens/closes
      - Test navigation links work

   d) notifications/__tests__/notification-bell.test.tsx:
      - Test renders bell icon
      - Test shows unread badge count
      - Test hides badge when count is 0
      - Test clicking opens notification panel

   e) notifications/__tests__/notification-panel.test.tsx:
      - Test renders list of notifications
      - Test notification item displays title, body, time
      - Test clicking notification marks as read
      - Test "mark all as read" button
      - Test empty state when no notifications
      - Test scrollable list

   f) planning/__tests__/gantt-chart.test.tsx:
      - Test renders timeline with tasks
      - Test task bar positioning based on dates
      - Test milestone markers
      - Test dependency lines between tasks
      - Test zoom in/out controls
      - Test today marker line

   g) planning/__tests__/project-documents.test.tsx:
      - Test renders document list
      - Test upload button
      - Test document download click
      - Test document delete
      - Test document version display

3. Run: npm run test -- components/
4. Fix any failures.
```

---

## PHASE 8 — Frontend Page Components

### Prompt 8.1: Authentication & Dashboard Page Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for authentication pages and the main dashboard.

STEPS:
1. Read:
   - app/auth/login/page.tsx
   - app/auth/callback/page.tsx
   - app/dashboard/page.tsx (main dashboard)
   - app/dashboard/layout.tsx
   - app/dashboard/analytics/ (all analytics pages)

2. Create test files:

   a) app/auth/__tests__/login.test.tsx:
      - Test renders login form (email, password fields)
      - Test renders SSO/Entra ID login button if configured
      - Test form validation (required fields, email format)
      - Test successful login redirects to dashboard
      - Test failed login shows error message
      - Test loading state during authentication

   b) app/auth/__tests__/callback.test.tsx:
      - Test processes OIDC callback parameters
      - Test redirects to dashboard on success
      - Test shows error on invalid callback

   c) app/dashboard/__tests__/page.test.tsx:
      - Test renders dashboard overview
      - Test renders KPI cards with data
      - Test renders recent activity section
      - Test renders quick action buttons
      - Test loading state while data fetches
      - Test error state handling

   d) app/dashboard/analytics/__tests__/page.test.tsx:
      - Test renders analytics dashboard tabs/navigation
      - Test each analytics view loads correct charts
      - Test date range filter works
      - Test responsive layout

3. Run: npm run test -- app/
4. Fix any failures.

IMPORTANT:
- Mock all hooks (use-planning, use-system, etc.) to return controlled data.
- Mock next/navigation for routing assertions.
- Use MSW for any direct API calls.
```

### Prompt 8.2: Planning Module Page Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for all Planning module pages.

STEPS:
1. Read all pages in app/dashboard/planning/:
   - page.tsx (overview)
   - portfolios/page.tsx, portfolios/new/page.tsx, portfolios/[id]/page.tsx, portfolios/[id]/timeline/page.tsx
   - projects/page.tsx, projects/new/page.tsx, projects/[id]/page.tsx, projects/[id]/edit/page.tsx
   - projects/[id]/budget/page.tsx, projects/[id]/timeline/page.tsx
   - work-items/page.tsx, work-items/new/page.tsx, work-items/[id]/page.tsx
   - risks/page.tsx, risks/new/page.tsx, risks/[id]/page.tsx
   - milestones/page.tsx
   - pir/page.tsx, pir/[id]/page.tsx
   - change-requests/page.tsx, change-requests/new/page.tsx, change-requests/[id]/page.tsx
   - budget/page.tsx
   - calendar/page.tsx

2. Create test files for key pages:

   a) planning/__tests__/projects-list.test.tsx:
      - Test renders project list in data table
      - Test status filter tabs work
      - Test search filters projects
      - Test "New Project" button navigates to creation form
      - Test clicking a project row navigates to detail page
      - Test pagination works
      - Test empty state renders when no projects

   b) planning/__tests__/project-new.test.tsx:
      - Test renders multi-step form (stepper UI)
      - Test step 1: basic info validation (name required, dates required)
      - Test step navigation (next, previous)
      - Test final submission creates project
      - Test form reset
      - Test cancel navigates back

   c) planning/__tests__/project-detail.test.tsx:
      - Test renders project header with name, status badge
      - Test renders project details (description, dates, owner, priority)
      - Test renders tabs (overview, tasks, timeline, budget, documents, risks)
      - Test tab switching
      - Test edit button navigates to edit page
      - Test status change action

   d) planning/__tests__/work-items-list.test.tsx:
      - Test renders work item list
      - Test filters by project, status, assignee
      - Test creation form

   e) planning/__tests__/risks-list.test.tsx:
      - Test renders risk register
      - Test risk severity color coding
      - Test risk creation form

   f) Similar test patterns for portfolios, milestones, PIR, change requests, budget, calendar pages.

3. Run: npm run test -- app/dashboard/planning/
4. Fix any failures.

IMPORTANT:
- Mock the React hooks (use-planning, use-budget) to control data.
- For multi-step forms, test each step's validation independently.
- For detail pages, verify all tabs render correct content.
```

### Prompt 8.3: ITSM, CMDB, Knowledge Module Page Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for ITSM, CMDB, and Knowledge module pages.

STEPS:
1. Read all pages in:
   - app/dashboard/itsm/ (all pages)
   - app/dashboard/cmdb/ (all pages)
   - app/dashboard/knowledge/ (all pages)

2. Create test files:

   ITSM:
   a) itsm/__tests__/tickets-list.test.tsx:
      - Test renders ticket list with INC/SR/CHG prefixed numbers
      - Test priority color coding (critical=red, high=orange, etc.)
      - Test status filter tabs
      - Test quick actions (assign, change status)
      - Test create ticket form
      - Test ticket detail view (timeline, comments, SLA timer)

   b) itsm/__tests__/problems-list.test.tsx:
      - Test renders problem list with PRB- numbers
      - Test linked incident count display
      - Test problem detail view with root cause analysis

   CMDB:
   c) cmdb/__tests__/assets-list.test.tsx:
      - Test renders asset inventory table
      - Test filters by type, status, location
      - Test asset detail view
      - Test CI topology visualization
      - Test license compliance indicators
      - Test warranty expiry warnings

   Knowledge:
   d) knowledge/__tests__/articles-list.test.tsx:
      - Test renders article cards/list
      - Test search functionality
      - Test category filtering
      - Test article detail view with content rendering
      - Test article creation form with rich text editor
      - Test article feedback (helpful/not helpful)

3. Run: npm run test -- app/dashboard/itsm/ app/dashboard/cmdb/ app/dashboard/knowledge/
4. Fix any failures.
```

### Prompt 8.4: Governance, GRC, People Module Page Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for Governance, GRC, and People module pages.

STEPS:
1. Read all pages in:
   - app/dashboard/governance/ (all pages)
   - app/dashboard/grc/ (all pages)
   - app/dashboard/people/ (all pages)

2. Create test files:

   Governance:
   a) governance/__tests__/policies-list.test.tsx:
      - Test renders policy list
      - Test policy version indicator
      - Test policy status badges
      - Test policy detail view with version diff
      - Test attestation tracking display
      - Test new policy form (multi-step if applicable)

   b) governance/__tests__/okrs.test.tsx:
      - Test renders OKR tree (objectives with key results)
      - Test progress bars for key results
      - Test OKR scoring display
      - Test new OKR creation

   c) governance/__tests__/meetings.test.tsx:
      - Test renders meeting list
      - Test meeting detail with minutes and action items
      - Test new meeting form

   GRC:
   d) grc/__tests__/risks.test.tsx:
      - Test renders risk register
      - Test risk heatmap visualization
      - Test risk detail view
      - Test risk assessment form

   e) grc/__tests__/audits.test.tsx:
      - Test renders audit list
      - Test audit detail with findings
      - Test evidence upload on audit page

   f) grc/__tests__/compliance.test.tsx:
      - Test renders compliance framework mapping
      - Test control status indicators

   People:
   g) people/__tests__/roster.test.tsx:
      - Test renders staff roster
      - Test department filter
      - Test roster entry detail

   h) people/__tests__/skills.test.tsx:
      - Test renders skill matrix
      - Test skill gap indicators

   i) people/__tests__/capacity.test.tsx:
      - Test renders capacity heatmap
      - Test overallocation warnings (red cells)
      - Test date range navigation

3. Run: npm run test -- app/dashboard/governance/ app/dashboard/grc/ app/dashboard/people/
4. Fix any failures.
```

### Prompt 8.5: System Module Page Tests

```
You are working on the Next.js frontend at /Users/mac/codes/itd-opms/itd-opms-portal.

TASK: Write unit tests for all System administration pages.

STEPS:
1. Read all pages in app/dashboard/system/:
   - page.tsx (overview)
   - users/page.tsx, users/[id]/page.tsx
   - roles/page.tsx, roles/[id]/page.tsx
   - tenants/page.tsx
   - org-units/page.tsx
   - sessions/page.tsx
   - email-templates/page.tsx, email-templates/[id]/page.tsx
   - workflows/page.tsx
   - automation/page.tsx
   - custom-fields/page.tsx
   - audit-logs/page.tsx
   - health/page.tsx
   - settings/page.tsx

2. Create test files:

   a) system/__tests__/users.test.tsx:
      - Test renders user list with name, email, role, status
      - Test user search
      - Test user detail view (profile, roles, sessions, activity)
      - Test create user form
      - Test edit user form
      - Test activate/deactivate user action
      - Test role assignment

   b) system/__tests__/roles.test.tsx:
      - Test renders role list
      - Test role detail with permission matrix
      - Test permission toggle
      - Test create new role
      - Test preventing deletion of system roles

   c) system/__tests__/audit-logs.test.tsx:
      - Test renders audit event list
      - Test filters (date range, action type, user, resource)
      - Test event detail view (before/after JSON diff)
      - Test export functionality

   d) system/__tests__/settings.test.tsx:
      - Test renders settings form sections
      - Test saving settings
      - Test settings validation
      - Test reset to defaults

   e) system/__tests__/health.test.tsx:
      - Test renders health status for each service (DB, Redis, NATS, MinIO)
      - Test green/red status indicators
      - Test response time display
      - Test auto-refresh

   f) system/__tests__/org-units.test.tsx:
      - Test renders org tree hierarchy
      - Test expand/collapse tree nodes
      - Test create new org unit
      - Test move org unit

   g) Tests for email-templates, workflows, automation, custom-fields, sessions, tenants pages.

3. Run: npm run test -- app/dashboard/system/
4. Fix any failures.
```

---

## RUNNING & FIXING — Master Prompt

### Prompt FINAL: Full Test Suite Execution & Bug Fixing

```
You are working on the ITD-OPMS project at /Users/mac/codes/itd-opms.

TASK: Run the complete test suite for both backend and frontend, then fix all failures.

STEPS:

BACKEND:
1. cd /Users/mac/codes/itd-opms/itd-opms-api
2. Run: go test -v -race -count=1 ./... 2>&1 | tee test-results-backend.txt
3. Review all failures. For each failure:
   a) Read the failing test and the production code it tests
   b) Determine if the issue is in the test (wrong expectation) or production code (bug)
   c) If test issue: fix the test to match correct behavior
   d) If production bug: fix the production code AND verify the test now passes
   e) Document each fix with a comment explaining what was wrong
4. Re-run until all tests pass: go test -race -count=1 ./...
5. Generate coverage report: go test -race -coverprofile=coverage.out ./... && go tool cover -func=coverage.out
6. Report overall coverage and per-package coverage.

FRONTEND:
7. cd /Users/mac/codes/itd-opms/itd-opms-portal
8. Run: npm run test 2>&1 | tee test-results-frontend.txt
9. Review all failures. For each failure:
   a) Read the failing test and the component/hook it tests
   b) Determine if the issue is in the test or production code
   c) Fix the issue (prefer fixing tests for rendering mismatches, fix production code for logic bugs)
   d) Pay special attention to:
      - Missing provider wrappers (QueryClient, Auth, Theme)
      - Incorrect mock data shapes
      - Async state updates (use waitFor, findBy)
      - Next.js module mocks (navigation, image, link)
10. Re-run until all tests pass: npm run test
11. Run: npm run test:coverage
12. Report overall coverage.

BOTH:
13. Create a summary of all bugs found and fixed in production code.
14. Create a summary of test coverage by module.
15. Identify any modules with <60% coverage and list what additional tests are needed.

IMPORTANT:
- Do NOT skip or delete failing tests. Fix them.
- If a production bug is found, fix it with minimal changes.
- If a test is flaky (passes sometimes, fails sometimes), fix the race condition.
- Ensure all tests are deterministic (no reliance on current time, random values, or external services).
- Do not increase test timeouts as a fix — find the root cause of slowness.
```

---

## Usage Guide

### Recommended Execution Order

1. **Phase 0** — Set up test infrastructure (both backend and frontend)
2. **Phase 1** — Backend shared layer (quick wins, foundation)
3. **Phase 2** — Backend platform layer (auth, middleware — critical paths)
4. **Phase 3** — Backend domain modules (start with System → Planning → ITSM, as they're most complex)
5. **Phase 4** — (Frontend infra already done in Phase 0)
6. **Phase 5** — Frontend utilities and providers
7. **Phase 6** — Frontend hooks (test data layer before UI)
8. **Phase 7** — Frontend shared components (DataTable first — most reused)
9. **Phase 8** — Frontend page components
10. **Prompt FINAL** — Full suite execution and bug fixing

### Tips for the AI Agent

- **Run tests frequently** — after every 2-3 test files, run the suite to catch issues early.
- **Read before writing** — always read the production code before writing tests.
- **Mock at boundaries** — mock database, external APIs, and file system — never actual business logic.
- **Use table-driven tests** (Go) — for testing multiple inputs/outputs of the same function.
- **Use data-testid** (React) — prefer `getByRole` > `getByLabelText` > `getByText` > `getByTestId`.
- **Test behavior, not implementation** — test what the user sees and what API calls are made, not internal state.
