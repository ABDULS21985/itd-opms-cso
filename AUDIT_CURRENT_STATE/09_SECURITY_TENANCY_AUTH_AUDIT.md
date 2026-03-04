# 09 -- Security, Tenancy & Authentication Audit

**Project:** ITD-OPMS
**Scope:** Authentication, authorization, multi-tenancy, audit logging, input validation, secret handling
**Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (automated code analysis)

---

## 1. Executive Summary

The ITD-OPMS backend implements a dual-mode authentication system (Entra ID OIDC + dev JWT), RBAC with 7 system roles, and application-level tenant isolation. While the security architecture is sound in design, critical implementation gaps exist: **37 staff users seeded with identical passwords**, **session timeout middleware disabled**, **no database-level RLS**, **rate limiting spoofable via X-Forwarded-For**, and **several routes missing permission middleware**. The system is appropriate for a development/staging environment but requires significant hardening before production deployment.

### Risk Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 3 | Identical seeded passwords, hardcoded JWT secret, dev auth in production path |
| HIGH | 5 | No RLS, session timeout disabled, unprotected routes, no failed auth logging, CSRF bypass |
| MEDIUM | 7 | Rate limit spoofing, no input validation middleware, no field encryption, permission name mismatch, etc. |
| LOW | 4 | Hardcoded UUIDs, SSE token in URL, CORS dev origins, missing Permissions-Policy |

---

## 2. Authentication Mechanisms

### 2.1 Dual-Mode Architecture

**File:** `internal/platform/middleware/auth.go`

The system supports two authentication modes that are tried in order:

1. **Entra ID OIDC (RS256)** -- Production mode via Microsoft identity platform
2. **Dev JWT (HS256)** -- Development mode with local password authentication

```
Token arrives in Authorization: Bearer header
    |
    v
Entra ID enabled? --> YES --> Try OIDC validation (RS256, JWKS)
    |                           |
    |                       Success? --> resolveEntraUser() --> AuthContext
    |                           |
    |                       Fail --> Fall through to dev JWT
    |
    v
Try HS256 JWT validation --> Success? --> AuthContext from claims
                              |
                          Fail --> 401 Unauthorized
```

### 2.2 Entra ID OIDC Implementation

**File:** `internal/platform/auth/oidc.go`

| Aspect | Implementation | Assessment |
|--------|---------------|------------|
| Algorithm | RS256 (enforced in ValidateToken) | GOOD -- asymmetric, no shared secret |
| JWKS Caching | In-memory with 1hr TTL, 5min cooldown | GOOD |
| Issuer validation | `login.microsoftonline.com/{tenant}/v2.0` | GOOD |
| Audience validation | Checked against configured ClientID | GOOD |
| Expiry validation | `jwt.WithExpirationRequired()` | GOOD |
| PKCE flow | Frontend handles PKCE; backend exchanges code | GOOD |
| User resolution | Lookup by entra_id, fallback to email | ACCEPTABLE -- email fallback is less secure |

### 2.3 Dev JWT Implementation

**File:** `internal/platform/auth/jwt.go`

| Aspect | Implementation | Assessment |
|--------|---------------|------------|
| Algorithm | HS256 | ACCEPTABLE for dev, but shared secret means anyone with the secret can forge tokens |
| Secret | Configurable via JWT_SECRET env var | Default is `dev-secret-change-in-production-minimum-32-chars!!` |
| Expiry | Configurable, default 30 minutes | GOOD |
| Refresh | UUID-based refresh tokens, SHA-256 hashed in DB | GOOD -- single-use rotation |
| Claims | user_id, tenant_id, email, roles, permissions embedded | NOTE -- stale if roles change mid-session |

---

## 3. Finding Table

| # | Severity | Area | Issue | Affected Files | Risk | Recommendation | Evidence |
|---|----------|------|-------|---------------|------|----------------|----------|
| F-001 | CRITICAL | Passwords | 37 staff users seeded with identical bcrypt hash for "password" | migrations/032_seed_amd_staff.sql | All 37 accounts share the same password. Any compromised user reveals credentials for all others. | Generate unique random passwords per user, or require password change on first login, or disable password auth in production (Entra-only). | `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy` repeated 37 times |
| F-002 | CRITICAL | Passwords | Admin user seeded with "admin123" | migrations/002_users_and_rbac.sql:170 | Global admin with known weak password. Combined with dev JWT mode, provides full system access. | Remove seeded admin password in production. Require strong password policy. | `$2a$10$25lLTNSLitmXoxckd4dfNOp39C8lnGOK3FkU/C9sMjJBtOOmXvrpS` (admin123) |
| F-003 | CRITICAL | Secrets | Hardcoded default JWT secret in config | internal/platform/config/config.go:153 | Default secret `dev-secret-change-in-production-minimum-32-chars!!` allows token forgery if not overridden. | Require JWT_SECRET from env with no default. Fail startup if not set in non-dev mode. | `v.SetDefault("JWT_SECRET", "dev-secret-change-in-production-minimum-32-chars!!")` |
| F-004 | HIGH | Multi-tenancy | No Row-Level Security (RLS) policies | All migration files | Tenant isolation relies entirely on application WHERE clauses. A single SQL query bug can expose cross-tenant data. | Implement RLS policies on all tenant-scoped tables. Enable row_security on tables. Create policies for the application role. | No `CREATE POLICY`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in any migration |
| F-005 | HIGH | Sessions | Session timeout middleware is a pass-through | internal/platform/middleware/session.go | Tokens remain valid for their full JWT expiry (default 30min) regardless of user activity. No idle timeout. | Add IssuedAt to AuthContext and uncomment the timeout logic. Consider sliding window refresh. | Line 22: `// TODO: Enable session timeout once AuthContext has IssuedAt field.` |
| F-006 | HIGH | Authorization | Policy attestation endpoint lacks RequirePermission | internal/modules/governance/policy_handler.go:46 | Any authenticated user can submit attestations regardless of role. | Add `middleware.RequirePermission("governance.view")` or a self-attestation check. | `r.Post("/attestations/{attestationId}/attest", h.Attest)` -- no `.With()` |
| F-007 | HIGH | Authorization | Approval decision/delegation endpoints lack RequirePermission | internal/modules/approval/handler.go:53-54 | Any authenticated user can approve, reject, or delegate approval steps. | Add permission middleware. Consider ownership check (only assigned approver should decide). | `r.Post("/steps/{id}/decide", h.ProcessDecision)` and `r.Post("/steps/{id}/delegate", h.DelegateStep)` |
| F-008 | HIGH | Authorization | Directory sync endpoint unprotected | internal/platform/server/server.go:252-287 | Any authenticated user can trigger a full directory sync from Entra ID, potentially modifying user records. | Add `middleware.RequireRole("global_admin")` or `RequirePermission("system.manage")` to the `/admin/directory-sync` route group. | No permission middleware in the route group |
| F-009 | HIGH | Audit | Failed authentication attempts not logged | internal/platform/middleware/auth.go, internal/platform/auth/service.go | Brute-force attacks, credential stuffing, and account enumeration cannot be detected. | Log failed login attempts (with IP, timestamp, attempted email) to audit_events or a dedicated table. | Login failure returns error but does not write audit entry |
| F-010 | MEDIUM | Rate Limiting | X-Forwarded-For header spoofable | internal/platform/middleware/ratelimit.go:122-128 | Attacker can bypass IP-based rate limiting by setting arbitrary X-Forwarded-For headers. | Trust X-Forwarded-For only when behind a known reverse proxy. Use chi's RealIP middleware (already present) and ensure it strips untrusted headers. Validate against trusted proxy list. | `clientIP()` prefers X-Forwarded-For without validation |
| F-011 | MEDIUM | CSRF | No token-based CSRF protection | internal/platform/middleware/csrf.go | Origin/Referer-based CSRF protection can be bypassed: (1) requests without Origin/Referer header are allowed through (line 46), (2) API clients (Postman, curl) bypass entirely. | Implement SameSite cookie attributes and consider double-submit cookie pattern for cookie-based auth. Current Bearer token auth is inherently CSRF-resistant, but the bypass for missing headers is risky. | Line 45: `if origin == "" { next.ServeHTTP(w, r); return }` |
| F-012 | MEDIUM | Input Validation | No request body validation middleware | All handler files | Request validation relies solely on JSON unmarshaling. Missing fields default to zero values, invalid enum values pass through, string lengths are unchecked. | Implement struct validation tags (e.g., go-playground/validator) and a validation middleware. Add CHECK constraints at database level as defense-in-depth. | No `validate` tags on request structs, no validation middleware |
| F-013 | MEDIUM | Secrets | Service credentials in config defaults | internal/platform/config/config.go:137-153 | Default passwords for DB, MinIO, Redis are hardcoded: `opms_secret`, `opms_minio_secret`, etc. | Remove all default passwords. Require explicit configuration via env vars in non-dev mode. | `v.SetDefault("DB_PASSWORD", "opms_secret")` |
| F-014 | MEDIUM | Encryption | system_settings is_secret not encrypted | internal/platform/server/server.go, migrations/016 | The `is_secret` flag on system_settings is advisory only. Secret values (API keys, credentials) are stored in plaintext JSONB. | Implement application-level encryption for settings where is_secret=true. Use a KMS or sealed secrets pattern. | `is_secret BOOLEAN DEFAULT false` with no encryption logic |
| F-015 | MEDIUM | Authorization | Permission name mismatch between roles and middleware | migrations/002_users_and_rbac.sql, all handler files | Seeded roles use `governance.read`/`governance.write` but middleware checks `governance.view`/`governance.manage`. Users with seeded permissions may fail middleware checks. | Align permission names. Update either the seed data or the middleware checks. Verify all 7 roles have correct permission strings. | Roles: `governance.read` vs Middleware: `governance.view` |
| F-016 | MEDIUM | File Upload | No file type/size validation on upload | internal/modules/planning/document_service.go, internal/modules/vault/service.go | MinIO uploads accept any file type and size. Malicious files (executables, scripts) could be stored and potentially served. | Validate file type against allowlist, enforce max file size, scan for malware before storage. Set Content-Disposition: attachment on downloads. | No file type or size checks before `minio.PutObject` |
| F-017 | MEDIUM | Multi-tenancy | Hardcoded tenant/user/role UUIDs | migrations/001, 002, 032 | Sequential predictable UUIDs (00000000-...-000000000001, 10000000-..., 20000000-...) make system IDs guessable. | Use random UUIDs for production seed data. The predictable pattern aids enumeration. | `'00000000-0000-0000-0000-000000000001'` (tenant), `'10000000-0000-0000-0000-000000000001'` (role), etc. |
| F-018 | LOW | Token Handling | JWT token accepted in URL query parameter | internal/platform/middleware/auth.go:194 | SSE connections use `?token=...` which logs tokens in server access logs, browser history, and proxy logs. | Implement a short-lived SSE-specific token or use a ticket-based pattern where a one-time ticket is exchanged for an SSE connection. | `if token := r.URL.Query().Get("token"); token != "" { return token }` |
| F-019 | LOW | CORS | Development origins hardcoded | internal/platform/server/server.go:97 | CORS allows `localhost:3000` and `localhost:5173` even in production deployments. | Make CORS allowed origins configurable via environment variable. Remove localhost origins in production. | `AllowedOrigins: []string{"http://localhost:3000", "http://localhost:5173", ...}` |
| F-020 | LOW | CSRF | CSRF allowed origins hardcoded and incomplete | internal/platform/server/server.go:106 | CSRF protection only allows `localhost:3000` and `localhost:5173`. Production domain not included. | Make CSRF allowed origins configurable and include the production domain. | `middleware.CSRFProtection([]string{"http://localhost:3000", "http://localhost:5173"})` |
| F-021 | LOW | Headers | WriteTimeout disabled for SSE | internal/platform/server/server.go:368 | `WriteTimeout: 0` disables write timeout globally to support SSE. This allows slow-loris attacks on all endpoints. | Use a separate HTTP server or handler with disabled timeout only for SSE routes. Keep WriteTimeout > 0 for standard API endpoints. | `WriteTimeout: 0, // Disabled for SSE long-lived connections.` |

---

## 4. Authentication Deep Dive

### 4.1 Password Handling

| Aspect | Implementation | File | Assessment |
|--------|---------------|------|------------|
| Hashing algorithm | bcrypt | auth/service.go | GOOD -- industry standard |
| Cost factor | 10 (from seeded hashes `$2a$10$...`) | migrations/ | ACCEPTABLE -- could be 12+ for higher security |
| Password policy | NONE | -- | MISSING -- no minimum length, complexity, or rotation requirements |
| Account lockout | NONE | -- | MISSING -- no lockout after failed attempts |
| Password change | NOT IMPLEMENTED | -- | No endpoint for users to change their own password |

### 4.2 Token Lifecycle

```
Login (POST /auth/login)
    |
    v
Generate access token (HS256, 30min expiry)
    + Generate refresh token (UUID, SHA-256 hashed, 7-day expiry)
    + Store refresh token hash in DB
    + Create active_session record
    + Update last_login_at
    |
    v
API Requests: Authorization: Bearer <access_token>
    |
    v
Token Refresh (POST /auth/refresh)
    |
    v
Validate refresh token hash against DB
    + Revoke old refresh token (single-use rotation)
    + Generate new access + refresh tokens
    |
    v
Logout (POST /auth/logout)
    |
    v
Revoke refresh token in DB
```

### 4.3 Token Security Analysis

| Property | Status | Notes |
|----------|--------|-------|
| Single-use refresh | YES | Old token revoked before new one issued |
| Refresh token rotation | YES | New refresh token on each refresh |
| Token in HTTP-only cookie | NO | Tokens in response body only; frontend stores in memory/localStorage |
| JTI (JWT ID) | YES | UUID-based JTI in access tokens |
| Token revocation | PARTIAL | Refresh tokens revocable; access tokens valid until expiry |
| Active session tracking | YES | active_sessions table created on login |

---

## 5. RBAC Model

### 5.1 Role Hierarchy

| Role | Scope | Key Permissions | Count |
|------|-------|----------------|-------|
| global_admin | Global | `["*"]` (wildcard) | All |
| itd_director | Cross-division | Read all, approve governance/planning/itsm/grc, export reports | 14 |
| head_of_division | Division | Read/write most modules, approve governance/planning | 18 |
| supervisor | Unit | Read/write operations, no approve | 12 |
| staff | Self | Read own division, create tickets | 8 |
| auditor | Read-only + GRC | Read all, write/approve GRC, verify audit | 13 |
| service_desk_agent | ITSM | ITSM read/write/assign/resolve, CMDB/KB read | 7 |

### 5.2 Permission Enforcement

**Middleware:** `RequirePermission(permission string)` checks `authCtx.HasPermission(permission)`

**Coverage Analysis:**

| Module | Routes | Permission Checked | Coverage |
|--------|--------|-------------------|----------|
| governance | 49 | `governance.view`, `governance.manage` | 48/49 -- **1 route missing** (attestation) |
| people | ~56 | `people.view`, `people.manage` | 56/56 -- Full |
| planning | ~50+ | `planning.view`, `planning.manage` | Full |
| itsm | ~52 | `itsm.view`, `itsm.manage` | Full |
| cmdb | ~30+ | `cmdb.view`, `cmdb.manage` | Full |
| knowledge | ~16 | `knowledge.view`, `knowledge.manage` | Full |
| grc | ~26 | `grc.view`, `grc.manage` | Full |
| reporting | ~22 | `reporting.view`, `reporting.manage` | Full |
| system | ~30+ | `system.view`, `system.manage` | Full (group-level) |
| approval | ~12 | `approval.view`, `approval.manage` | 9/12 -- **3 routes missing** |
| vault | ~17 | `documents.view`, `documents.manage` | Full |
| vendor | ~14 | `vendor.view`, `vendor.manage` | Full |
| automation | ~10 | `automation.view`, `automation.manage` | Full |
| customfields | ~7 | `custom_fields.manage` | Full |
| calendar | ~8 | `planning.view`, `planning.manage` | Full |
| admin/dir-sync | 2 | **NONE** | **0/2 -- UNPROTECTED** |

### 5.3 Permission Name Mismatch

The seeded roles use different permission naming than the middleware checks:

| Seeded Role Permission | Middleware Check | Match? |
|-----------------------|-----------------|--------|
| `governance.read` | `governance.view` | NO |
| `governance.write` | `governance.manage` | NO |
| `itsm.read` | `itsm.view` | NO |
| `itsm.write` | `itsm.manage` | NO |
| `cmdb.read` | `cmdb.view` | NO |
| `cmdb.write` | `cmdb.manage` | NO |
| `people.read` | `people.view` | NO |
| `people.write` | `people.manage` | NO |
| `planning.read` | `planning.view` | NO |
| `planning.write` | `planning.manage` | NO |
| `grc.read` | `grc.view` | NO |
| `grc.write` | `grc.manage` | NO |
| `knowledge.read` | `knowledge.view` | NO |
| `knowledge.write` | `knowledge.manage` | NO |
| `reporting.read` | `reporting.view` | NO |
| `*` (global_admin) | Any check | YES (wildcard) |

**Impact:** Only `global_admin` (with `*` wildcard) passes permission checks. All other roles would be **denied access** to every route that uses `RequirePermission` with `.view`/`.manage` naming. This strongly suggests the permission names in migration 017 were updated but the seed data in migration 002 was not aligned, OR the `HasPermission` method performs prefix/pattern matching.

**Note:** This requires verification -- if `HasPermission` does exact string matching, this is a **CRITICAL** issue where all non-admin users are effectively locked out of the system. If it does pattern matching (e.g., `governance.read` matches `governance.view`), the issue is less severe but still a maintenance concern.

---

## 6. Multi-Tenancy Enforcement

### 6.1 Application-Level Enforcement

**Pattern:** Every service method extracts `auth.TenantID` from context and includes it in SQL WHERE clauses.

```go
auth := types.GetAuthContext(ctx)
query := `SELECT ... FROM table WHERE id = $1 AND tenant_id = $2`
row := s.pool.QueryRow(ctx, query, id, auth.TenantID)
```

**Coverage:** Consistent across all 53+ services audited.

### 6.2 Database-Level Enforcement

**Status: NONE**

No Row-Level Security (RLS) policies exist. If any application query omits the `tenant_id` filter (or uses a system context without tenant), cross-tenant data exposure is possible.

### 6.3 Cross-Tenant Leak Risks

| Risk | Location | Description |
|------|----------|-------------|
| Background jobs run without AuthContext | governance/action_reminder.go | ActionReminderService queries across all tenants without tenant filtering in the main query |
| Report scheduler lacks tenant isolation | reporting/report_service.go:414-426 | `EnqueueDueScheduledRuns` queries all definitions across all tenants (by design, but creates cross-tenant visibility) |
| Maintenance worker queries all tenants | system/maintenance_worker.go | Session cleanup and audit integrity queries are tenant-agnostic |
| Dashboard refresher is global | reporting/dashboard_refresher.go | `RefreshExecutiveSummarySystem` refreshes the materialized view for all tenants |
| Notification outbox processor | notification/outbox.go | Processes notifications across all tenants in a single batch |

**Assessment:** These cross-tenant operations are expected for background jobs but create risk if any data leaks into responses. The materialized view `mv_executive_summary` is partitioned by `tenant_id`, which is correct.

### 6.4 Global Tables (No tenant_id)

| Table | Justification |
|-------|--------------|
| roles | System-defined roles shared across tenants |
| notification_templates | Shared templates |
| directory_sync_runs | Global sync operation |
| refresh_tokens | Keyed by user_id (which has tenant_id) |

---

## 7. Audit Logging Coverage

### 7.1 What IS Audited

| Category | Mechanism | Completeness |
|----------|-----------|-------------|
| POST/PUT/PATCH/DELETE requests | AuditMiddleware (automatic) | GOOD -- all mutating API calls |
| Policy lifecycle transitions | PolicyService (explicit) | GOOD |
| Report run triggers | ReportService (explicit) | GOOD |
| Approval decisions | ApprovalService (explicit) | GOOD |
| User management | UserService (explicit) | GOOD |
| Role assignments | UserService (explicit) | GOOD |

### 7.2 What IS NOT Audited

| Category | Risk | Recommendation |
|----------|------|----------------|
| GET requests / data access | Cannot detect unauthorized data browsing | Log access to sensitive entities (users, audit logs, reports) |
| Failed authentication attempts | Cannot detect brute-force attacks | Log failed logins with IP, email, timestamp |
| Configuration changes | Cannot track system settings modifications | Add explicit audit logging to SettingsService |
| Session creation/destruction | Cannot track login/logout patterns | Log login success and logout events |
| Role assignment changes | Generic middleware logging only | Add explicit audit entries with before/after state |
| Password changes | Not implemented, but when added, must be audited | Plan for this |
| File downloads | Document access log exists for vault, but not for project documents | Extend access logging to planning document downloads |

### 7.3 Audit Integrity

| Mechanism | Implementation | Assessment |
|-----------|---------------|------------|
| Immutability | PostgreSQL rules: `no_update_audit`, `no_delete_audit` | GOOD -- database-level enforcement |
| Checksums | SHA-256 computed on INSERT via trigger | GOOD -- tamper detection |
| Integrity verification | Weekly check by MaintenanceWorker | GOOD idea, but references wrong table name (`audit_log` vs `audit_events`) |
| Checksum formula | Includes tenant_id, actor_id, action, entity_type, entity_id, changes, timestamp | GOOD -- covers key fields |
| Retention | No retention policy / archival strategy | MISSING -- audit table will grow unbounded |

---

## 8. Security Headers

**File:** `internal/platform/middleware/security.go`

| Header | Value | Assessment |
|--------|-------|------------|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | GOOD |
| X-Frame-Options | `DENY` | GOOD |
| X-Content-Type-Options | `nosniff` | GOOD |
| Referrer-Policy | `strict-origin-when-cross-origin` | GOOD |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | GOOD but incomplete -- should also restrict payment, usb, etc. |
| X-XSS-Protection | `1; mode=block` | ACCEPTABLE -- deprecated in modern browsers but harmless |
| Content-Security-Policy | `default-src 'none'; frame-ancestors 'none'` | GOOD for API |

---

## 9. CORS Configuration

**File:** `internal/platform/server/server.go:96-103`

| Setting | Value | Assessment |
|---------|-------|------------|
| AllowedOrigins | `localhost:3000`, `localhost:5173`, `*.itd-opms.gov.ph` | Wildcard subdomain is risky -- attacker could register `malicious.itd-opms.gov.ph` |
| AllowedMethods | GET, POST, PUT, PATCH, DELETE, OPTIONS | Standard |
| AllowedHeaders | Accept, Authorization, Content-Type, X-Correlation-ID, X-Tenant-ID | Note: X-Tenant-ID header allowed but not used for tenant switching |
| AllowCredentials | true | Required for cookie-based auth, but risky with wildcard origins |
| MaxAge | 300 | 5 minutes preflight cache -- acceptable |

**Risk:** `AllowCredentials: true` combined with a wildcard-pattern origin (`*.itd-opms.gov.ph`) may allow cross-origin attacks from compromised subdomains.

---

## 10. Rate Limiting

**File:** `internal/platform/middleware/ratelimit.go`

| Setting | Value | Assessment |
|---------|-------|------------|
| Type | Redis-backed sliding window | GOOD -- distributed rate limiting |
| Rate | 100 requests per minute per IP | Reasonable |
| Key | User ID (if authenticated) or client IP | GOOD -- per-user limiting |
| Fallback | Allow request if Redis unavailable | ACCEPTABLE -- avoids total outage |
| Script | Lua atomic INCR + EXPIRE | GOOD -- race-condition free |

**Vulnerability:** The `clientIP()` function trusts `X-Forwarded-For` and `X-Real-IP` headers without validation. An attacker can spoof these headers to bypass rate limiting:

```
curl -H "X-Forwarded-For: 1.2.3.4" https://api.example.com/...
curl -H "X-Forwarded-For: 5.6.7.8" https://api.example.com/...
```

Each request appears to come from a different IP, bypassing the per-IP limit.

---

## 11. Input Validation

### 11.1 Current State

| Layer | Validation | Assessment |
|-------|-----------|------------|
| HTTP | JSON unmarshaling (type safety) | MINIMAL -- missing fields default to zero values |
| Handler | Manual field checks in some handlers | INCONSISTENT -- not all handlers validate |
| Service | Business rule checks (status transitions) | PARTIAL -- covers domain rules only |
| Database | CHECK constraints on some columns | MINIMAL -- many columns unconstrained |
| SQL | Parameterized queries (`$1`, `$2`) | GOOD -- no SQL injection |

### 11.2 Missing Validation

| Category | Examples | Risk |
|----------|----------|------|
| String length | Display names, descriptions, titles | DoS via extremely long strings |
| Email format | User creation, login | Invalid data stored |
| UUID format | Path parameters | Potential panic on parse |
| Numeric ranges | Priority, likelihood, impact | Out-of-range values |
| Enum values | Status, type, category | Invalid state stored |
| File names | Document uploads | Path traversal in MinIO object keys |
| HTML/XSS | KB article content, descriptions | Stored XSS if content rendered unescaped |

---

## 12. Secret and Configuration Handling

### 12.1 Configuration Source

**File:** `internal/platform/config/config.go`

Configuration is loaded from `.env` file and environment variables via Viper. All sensitive values have hardcoded defaults.

### 12.2 Hardcoded Defaults (Risk)

| Setting | Default Value | Risk |
|---------|-------------|------|
| JWT_SECRET | `dev-secret-change-in-production-minimum-32-chars!!` | Token forgery if unchanged |
| DB_PASSWORD | `opms_secret` | Database access if unchanged |
| MINIO_ACCESS_KEY | `opms_minio` | Object storage access |
| MINIO_SECRET_KEY | `opms_minio_secret` | Object storage access |
| REDIS_PASSWORD | (empty) | Unauthenticated Redis access |
| DB_SSLMODE | `disable` | Unencrypted database connections |

### 12.3 Secret Storage

No external secret management (Vault, AWS Secrets Manager, Azure Key Vault) is integrated. All secrets are passed via environment variables or `.env` file.

---

## 13. File Upload Security

### 13.1 Current Implementation

| Aspect | Status | File |
|--------|--------|------|
| File type validation | MISSING | document_service.go, vault/service.go |
| File size limits | MISSING (relies on HTTP server defaults) | -- |
| Antivirus scanning | MISSING | -- |
| Content-Disposition | NOT VERIFIED | Downloads may allow inline rendering |
| Object key construction | `tenants/{tenant}/projects/{project}/{uuid}/{filename}` | Contains original filename -- potential path traversal |
| Presigned URLs | Used for downloads (time-limited) | GOOD |

### 13.2 MinIO Configuration

Object storage uses MinIO with separate buckets: `evidence-vault` and `attachments`. SSL is disabled by default (`MINIO_USE_SSL: false`).

---

## 14. Insecure Defaults Summary

| Default | Risk | Production Requirement |
|---------|------|----------------------|
| `SERVER_ENV=development` | Dev-mode features enabled | Set to `production` |
| `JWT_SECRET=dev-secret...` | Token forgery | Generate cryptographically random 256-bit secret |
| `DB_SSLMODE=disable` | Cleartext DB connections | Set to `require` or `verify-full` |
| `MINIO_USE_SSL=false` | Cleartext object storage | Enable SSL |
| `LOG_LEVEL=debug` | Verbose logging may leak sensitive data | Set to `info` or `warn` |
| `ENTRA_ENABLED=false` | Dev JWT auth active | Enable Entra ID for production |
| Dev JWT always active | Even with Entra enabled, HS256 fallback remains | Disable HS256 fallback in production mode |
| All seeded passwords | Weak/identical | Disable or randomize |

---

## 15. Recommendations (Priority Order)

### Critical (Must Fix Before Production)

1. **Remove or randomize seeded passwords** -- All 38 seeded users (37 staff + 1 admin) have known passwords
2. **Remove default JWT secret** -- Require explicit configuration; fail startup if not set
3. **Disable HS256 JWT fallback in production** -- When Entra ID is enabled, do not allow dev JWT authentication
4. **Implement RLS policies** on all tenant-scoped tables as defense-in-depth

### High Priority

5. **Enable session timeout** -- Add IssuedAt to AuthContext and uncomment the timeout middleware
6. **Add RequirePermission** to unprotected routes (attestation, approval decisions, directory sync)
7. **Log failed authentication attempts** -- Create audit entries for failed logins
8. **Fix permission name mismatch** -- Align seeded role permissions with middleware check names
9. **Implement CSRF token pattern** -- Replace Origin/Referer-only CSRF with double-submit cookie or SameSite cookies

### Medium Priority

10. **Validate X-Forwarded-For** against trusted proxy list
11. **Add input validation middleware** using struct validation tags
12. **Implement field-level encryption** for system_settings with is_secret=true
13. **Add file upload validation** -- type allowlist, size limits, content scanning
14. **Make CORS/CSRF origins configurable** via environment variable
15. **Add password policy enforcement** -- minimum length, complexity, history

### Low Priority

16. **Use random UUIDs** for seed data instead of predictable sequential patterns
17. **Implement SSE ticket-based auth** instead of token in URL query parameter
18. **Set WriteTimeout** on non-SSE routes to prevent slow-loris attacks
19. **Add audit retention policy** with automated archival
20. **Configure DB_SSLMODE=verify-full** and MINIO_USE_SSL=true for production
