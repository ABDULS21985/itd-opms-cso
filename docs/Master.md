mFull Codebase Implementation Audit to Markdown Knowledge Pack

You are a principal software architect, code auditor, systems analyst, and technical documentation specialist.

Your task is to go through the entire codebase and produce a deep, evidence-based implementation audit in multiple markdown files that clearly document:

What has been implemented

What is partially implemented

What is missing

What is broken / stubbed / fake / placeholder

What needs to be done next

What the true current architecture is

How each feature flows end-to-end across frontend, API, service, repository, database, security, and infrastructure

You are not to make code changes in this task unless explicitly asked later.
This task is documentation-first, audit-first, evidence-first.

Core Objective

Produce a comprehensive current-state documentation pack for the entire repository so that another AI agent or engineering lead can use the output to create surgical implementation prompts and execute the missing work with precision.

Your output must be honest, code-backed, and traceable.

Do not assume that something is implemented because:

a page exists

a menu item exists

an API route exists

a handler exists

a DB table exists

a mock returns success

a TODO exists

a service method exists without full persistence/validation/security

Only mark something as implemented if the feature is functionally present end-to-end with real code paths.

Audit Rules
1. Evidence-first classification

Every finding must be backed by evidence from actual files.

For every feature/capability reviewed, classify it using one of these statuses:

IMPLEMENTED

PARTIALLY_IMPLEMENTED

STUBBED

MISSING

BROKEN

UI_ONLY

API_ONLY

DB_ONLY

UNVERIFIED

DEPRECATED

Also attach a confidence score:

HIGH

MEDIUM

LOW

2. End-to-end trace requirement

For every major feature, trace it through as many of these layers as applicable:

Frontend page / route

Frontend component(s)

Frontend hook(s)

Frontend service/API client

API endpoint

Router registration

Handler/controller

Service/business logic

Repository/data access

SQL/sqlc query / ORM query

DB table / view / migration

Auth / RBAC / tenant enforcement

Validation

Notifications / events

Background jobs

Tests

Observability / logs / metrics

Documentation mismatch

3. Never trust names alone

Do not infer completion from filenames, function names, route names, UI labels, or documentation.
Inspect the actual implementation.

Examples of false positives you must detect:

Page exists but loads fake/hardcoded data

API exists but handler returns static response

Service exists but repository not called

Repository exists but no insert/update persistence

DB table exists but no route uses it

UI form exists but submit handler is noop

Feature works only visually but has no backend

Security middleware exists but tenant filtering is missing

Role checks exist in UI only, not backend

“Success” toast shown though request not persisted

4. Be brutally accurate

If a feature is 70% done, mark it PARTIALLY_IMPLEMENTED, not implemented.
If a flow is present but unsafe for production, call it out.
If something exists but is dead code or unreachable, document it as such.

Scope of Audit

Audit the entire repository, including but not limited to:

Application Layers

Frontend pages

Frontend components

Hooks

Services / API clients

Shared UI / utility libraries

Backend routes

Handlers/controllers

Services/use-cases

Repositories/data access

Migrations

Query files

Database schema

Seeds

Background workers/jobs

Notifications

Search

Reporting

Audit trail

RBAC / ABAC / auth / session handling

Multi-tenancy / tenant isolation / RLS

Caching

Messaging/event bus

File upload / object storage

Integrations

Observability

Infrastructure config

DevOps / Docker / compose / CI/CD

Tests

Existing docs / README / architecture docs

Special Focus Areas

You must specifically check for:

Hardcoded values

Fake data

Mock providers in production paths

Stubbed handlers/services

Unused code

Dead routes

Broken links between frontend and backend

Missing validation

Missing transaction safety

Missing authorization

Missing tenant filtering

Missing row-level isolation

Missing audit logging

Missing error handling

Missing pagination/filtering/sorting

Missing retries/circuit breakers for integrations

Missing file storage handling

Missing indexes / DB constraints

Missing tests

Documentation drift vs actual implementation

Required Deliverables

Create a new folder in the repo root named:

/AUDIT_CURRENT_STATE/

Inside it, generate the following markdown files.

00_AUDIT_INDEX.md

Purpose:

Master table of contents

Summary of all audit files

High-level repo map

Quick links to all generated markdown documents

Must include:

audit date/time

branch/commit if available

repo root path audited

stack summary

total modules audited

total endpoints audited

total pages audited

total tables audited

total major findings

01_EXECUTIVE_SUMMARY.md

Purpose:
Board-level and engineering-lead summary.

Must include:

what the system appears intended to do

what is genuinely implemented today

what is partially complete

what is missing

top critical risks

top security concerns

top architecture concerns

estimated implementation completeness by module

top priorities for remediation

overall readiness rating:

demo-ready?

UAT-ready?

production-ready?

audit-ready?

Include a summary table like:

Area	Status	Notes
02_REPOSITORY_MAP.md

Purpose:
Document actual repository structure.

Must include:

top-level directories

purpose of each directory

detected tech stack

package boundaries / modules

backend startup path

frontend startup path

route registration locations

config loading locations

migrations path

query generation path

test layout

deployment files

scripts and tooling

03_ARCHITECTURE_CURRENT_STATE.md

Purpose:
Describe the real architecture as implemented, not aspirational.

Must include:

backend architecture pattern

frontend architecture pattern

database/data flow pattern

auth pattern

tenant model

notification/eventing model

reporting/search model

infrastructure dependencies

deployment model

risks and architecture drift from intended design

Add sections:

“Architecture claimed by docs”

“Architecture observed in code”

“Mismatches”

04_FEATURE_INVENTORY_MASTER.md

Purpose:
Master inventory of all features/capabilities found across the product.

Must include a master table:

Module	Capability	Frontend	API	Service	Repository	DB	Security	Status	Confidence	Notes

Rules:

One row per meaningful capability

If a capability has multiple routes/flows, split them into sub-rows

Explicitly indicate if the capability is UI-only, API-only, or DB-only

05_FRONTEND_AUDIT.md

Purpose:
Detailed frontend audit.

Must include:

page inventory

route inventory

feature coverage by page

shared components

custom hooks

API integration mapping

state/query/mutation flows

validation coverage

loading/error/empty states

role-based UI gating

hardcoded/fake data usage

dead pages/components

incomplete submit flows

broken imports / dead references if present

Use tables like:

Page	Route	Purpose	Data Source	Actions	Backend Connected?	Status	Evidence

Also include:

pages present but not wired into nav

nav items with missing destinations

filters/search/export/import features

reusable component maturity

06_API_ENDPOINT_AUDIT.md

Purpose:
Complete API inventory and status audit.

Must include:

all registered routes

route groups

middleware applied

auth requirements

tenant requirements

request/response validation

pagination/filtering/sorting support

known missing handlers

inconsistent response envelopes

status codes quality

Use a table like:

Method	Path	Module	Handler	Service Method	Auth	Tenant Enforcement	Validation	Status	Evidence	Notes
07_BACKEND_SERVICE_REPOSITORY_AUDIT.md

Purpose:
Audit handlers, services, repositories, and business rules.

Must include:

handler inventory

service inventory

repository inventory

missing implementation chains

noop or fake logic

transaction safety

error handling quality

domain rules present/missing

background jobs/orchestration

Use trace tables like:

Feature	Handler	Service	Repository	Persistence	Business Rules	Status	Evidence
08_DATABASE_SCHEMA_AUDIT.md

Purpose:
Audit actual data model and DB readiness.

Must include:

schema inventory

tables by module

key relationships

indexes

unique constraints

foreign keys

generated columns

views/materialized views

triggers

soft delete patterns

audit tables

missing constraints

likely integrity issues

tables not used by application

features with no schema backing

schema/docs mismatches

Use tables like:

Table	Module	Purpose	Used By	Tenant Column	Constraints	Indexes	Status	Notes
09_SECURITY_TENANCY_AUTH_AUDIT.md

Purpose:
Security and isolation review.

Must include:

authentication mechanism(s)

token/cookie handling

session management

password handling if applicable

RBAC model

permission checks

backend authorization enforcement

frontend-only enforcement problems

multi-tenancy enforcement model

RLS/tenant filters

cross-tenant leak risks

audit logging coverage

CSRF/CORS/security headers

secret/config handling

file upload security

input validation/sanitization

insecure defaults

Use a finding table:

Severity	Area	Issue	Affected Files	Risk	Recommendation	Evidence

Severity:

CRITICAL

HIGH

MEDIUM

LOW

10_MODULE_AUDIT_GOVERNANCE.md
11_MODULE_AUDIT_PEOPLE.md
12_MODULE_AUDIT_PLANNING.md
13_MODULE_AUDIT_ITSM.md
14_MODULE_AUDIT_CMDB.md
15_MODULE_AUDIT_KNOWLEDGE.md
16_MODULE_AUDIT_GRC.md
17_MODULE_AUDIT_REPORTING_SYSTEM.md

For each module file, include:

Module purpose

Implemented capabilities

Partial capabilities

Missing capabilities

UI/API/DB mapping

Feature-by-feature evidence

Security and tenancy review

Data model coverage

Workflow/state machine coverage

Notification/reporting/search integration

Known defects / risks

What must be built next

Use a table like:

Capability	Frontend Evidence	API Evidence	DB Evidence	Status	Gaps	Recommended Next Action
18_INTEGRATIONS_OBSERVABILITY_INFRA_AUDIT.md

Purpose:
Audit external dependencies and ops readiness.

Must include:

Entra ID / OIDC / Graph integration

email integration

Teams integration

SSE/websocket/notifications

Redis use

NATS/eventing use

MinIO/object storage use

Prometheus/Grafana/Loki/Tempo integration

health checks

config management

Docker/Compose

CI/CD files if present

backup/restore/DR references

actual infra readiness vs documented claims

Use tables like:

Component	Claimed Use	Actual Use Found	Status	Gaps	Evidence
19_TESTING_AND_QUALITY_AUDIT.md

Purpose:
Assess software quality and verification maturity.

Must include:

unit tests

integration tests

e2e tests

coverage by module

missing critical tests

fragile areas without tests

lint/typecheck/test scripts

code smells

duplication hotspots

large files / God services / overly coupled modules

dead code

unreachable code

TODO/FIXME/HACK markers inventory

Use tables like:

Area	Tests Present?	Coverage Confidence	Quality Risk	Notes
20_DOCUMENTATION_DRIFT_AUDIT.md

Purpose:
Compare docs/README/claims against actual code.

Must include:

features claimed in docs but not implemented

implemented features missing from docs

incorrect setup instructions

incorrect architecture claims

incorrect module counts

outdated env vars

stale diagrams / runbooks / API references

Use a table like:

Documentation Claim	Source File	Actual Code Reality	Severity	Evidence
21_REMEDIATION_BACKLOG.md

Purpose:
Turn the audit into an execution-ready backlog.

Must include:

all major gaps grouped by severity and module

exact work needed

dependencies

implementation order

risk if left unresolved

estimated effort bucket:

XS

S

M

L

XL

Use a table like:

Priority	Module	Gap	Exact Work Required	Dependencies	Effort	Risk	Files Likely Affected

Priority:

P0

P1

P2

P3

22_IMPLEMENTATION_SEQUENCE.md

Purpose:
Recommend the best order of execution for closing gaps.

Must include:

recommended phase plan

what to fix first

security-first ordering

data integrity ordering

frontend/backend dependency ordering

UAT stabilization ordering

production hardening ordering

Suggested phases:

Critical security/tenant fixes

Data integrity and persistence completion

Broken core flows

Partial feature completion

Reporting/search/notifications

Testing hardening

Documentation/runbooks

Production readiness

Required Analysis Method

Perform the audit in this order:

Phase A — Repository discovery

Map the repo structure

Detect backend/frontend/services/scripts

Detect docs and architecture claims

Detect tech stack from config files (go.mod, package.json, Dockerfile, compose, env examples, etc.)

Phase B — Runtime entry points

Find backend startup path

Find router registration

Find middleware chain

Find auth bootstrap

Find frontend app entry/root layouts/providers

Find API client base setup

Phase C — Route and feature enumeration

Enumerate all frontend pages/routes

Enumerate all backend routes/endpoints

Map navigation to actual pages

Map API endpoints to handlers/services/repos

Phase D — Module-by-module trace

For each module:

identify intended capabilities

locate actual implementation

trace each feature end-to-end

record status and evidence

Phase E — Database verification

inspect migrations

inspect queries/sqlc files

map tables to repositories/services/features

detect orphaned tables and unbacked features

Phase F — Security and tenancy review

inspect auth

inspect permission checks

inspect tenant propagation

inspect repository filters / RLS / context usage

inspect audit logging

inspect secrets/config handling

Phase G — Infra/ops/test review

inspect compose/docker/CI/runbooks

inspect metrics/logging/tracing

inspect integration points

inspect tests and quality signals

Phase H — Documentation drift

compare all docs/README claims with code reality

Phase I — Backlog synthesis

convert findings into execution-ready backlog

Important Audit Heuristics

When determining whether a feature is truly implemented, verify all of the following where applicable:

UI exists

UI loads real data

mutations call real API

API route exists

handler is registered

service contains actual logic

repository persists or retrieves correctly

database schema supports feature

validation exists

auth exists

authorization exists

tenant enforcement exists

error handling exists

audit logging exists if needed

response reaches UI correctly

state refresh/cache invalidation works

not using fake placeholders

not dead/unreachable code

If any core link in the chain is missing, the feature is not fully implemented.

Output Standards
Markdown quality

All generated markdown files must be:

clean

structured

professional

readable by executives and engineers

full of evidence

explicit and non-handwavy

Evidence format

For each finding, include:

file path(s)

function/method/component names

endpoint paths where relevant

table/query/migration names where relevant

short explanation of why the conclusion was reached

If line numbers are available, include them.

Example evidence style:

internal/modules/itsm/handler/ticket_handler.go -> CreateTicket

internal/modules/itsm/service/ticket_service.go -> Create

internal/modules/itsm/repository/ticket_repository.go -> Insert

migrations/017_itsm_tickets.sql -> tickets table

frontend/src/pages/itsm/tickets/create.tsx -> submit flow

Mandatory Flags to Detect

You must explicitly search for and document:

TODO

FIXME

HACK

panic(

placeholder comments

mock adapters

fake data

hardcoded UUIDs

hardcoded tenant IDs

hardcoded emails/passwords/secrets

console.log / debug leftovers

dead imports

empty handlers

noop functions

return nil without logic

handlers that always return success

repository methods not used

frontend pages not wired

missing invalidations

any abuse in TypeScript

giant files and god-objects/god-services

copy-paste duplication

unprotected admin endpoints

frontend permission gates without backend enforcement

What Not To Do

Do not rewrite code in this task

Do not produce a shallow summary only

Do not mark something implemented without evidence

Do not rely only on README/docs

Do not ignore broken or partial flows

Do not hide uncertainty

Do not skip modules because they are large

Do not collapse all findings into one file only

Do not give generic recommendations without tying them to actual files/features

Final Summary Requirements

At the end of the audit, generate a final section in 01_EXECUTIVE_SUMMARY.md called:

Decision-Ready Summary

This must answer:

What is production-ready right now?

What is demo-ready but not production-ready?

What is mostly UI shell only?

What is mostly backend only?

What are the top 20 missing implementations?

What are the top 20 security/tenant risks?

What should be implemented first before UAT?

What should be implemented first before production?

What documentation claims are currently inaccurate?

What 10 follow-up AI implementation prompts should be created next?

Final Instruction

Be exhaustive.
Be precise.
Be evidence-based.
Be skeptical of appearances.
Create a documentation pack that a CTO, architect, engineering manager, product owner, auditor, and follow-up AI coding agent can all rely on.

Your success criterion is:

“Another AI agent should be able to read the generated markdown files and implement the missing work with minimal ambiguity and no guesswork.”