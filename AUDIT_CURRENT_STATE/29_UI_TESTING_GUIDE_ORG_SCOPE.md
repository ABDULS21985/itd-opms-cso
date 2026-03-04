# UI Testing Guide: Hierarchical Org-Scope Filtering

## Overview

This guide walks through testing the org-scope access control at the UI level. The system restricts data visibility based on each user's position in the CBN organogram hierarchy. Users only see records belonging to their division (and sub-units), plus any records with no org assignment (NULL).

---

## Test Users

| User | Email | Password | Role | Scope | Division |
|------|-------|----------|------|-------|----------|
| Olaniyan, Rasheed | raolaniyan@cbn.gov.ng | Test1234! | global_admin | Global (sees everything) | — |
| Sabdul | sabdul@cbn.gov.ng | Test1234! | staff | Division | Application Management Division (AMD) |
| Tsadegoke | tsadegoke@cbn.gov.ng | Test1234! | staff | Division | Architecture & Strategy Division |

---

## Step 1: Login

1. Open the portal at **http://localhost:3000** (or your deployed URL).
2. You will see the login page with **Email** and **Password** fields.
3. Enter the credentials for the first test user (Olaniyan — the global admin).
4. Click **Sign In**.
5. You should be redirected to the dashboard.

> Repeat login for each test user in separate browser sessions or incognito windows so you can compare side by side.

---

## Step 2: Navigate to Each Module

Use the left sidebar to navigate to the module pages listed below. For each module, compare what each user sees.

### Module Navigation Paths

| Module | Sidebar Path | URL |
|--------|-------------|-----|
| Knowledge Base | Knowledge | /dashboard/knowledge |
| Approvals | Governance > Approvals | /dashboard/governance/approvals |
| Calendar (Maintenance) | Planning > Calendar | /dashboard/planning/calendar |
| Document Vault | Vault | /dashboard/vault |
| Vendors | CMDB > Vendors | /dashboard/cmdb/vendors |
| Automation | System > Automation | /dashboard/system/automation |
| Custom Fields | System > Custom Fields | /dashboard/system/custom-fields |

---

## Step 3: Test Each Module

### 3.1 Document Vault (Best module to test — has existing data)

The Vault currently has **3 documents** in the database:
- 2 documents assigned to **AMD** division
- 1 document with **no org assignment** (NULL — visible to everyone)

**Expected Results:**

| User | Expected Document Count | Reason |
|------|------------------------|--------|
| Olaniyan (admin) | 3 | Global scope — sees all documents |
| Sabdul (AMD) | 3 | 2 AMD documents + 1 NULL document |
| Tsadegoke (Arch Strategy) | 1 | 0 Arch Strategy documents + 1 NULL document |

**Steps:**
1. Log in as **Olaniyan** (global admin).
2. Navigate to **Vault** in the sidebar.
3. Note the total number of documents shown in the list.
4. Log in as **Sabdul** in a separate browser/incognito window.
5. Navigate to **Vault**.
6. Confirm fewer or equal documents are shown compared to the admin.
7. Log in as **Tsadegoke** in another session.
8. Navigate to **Vault**.
9. Confirm only 1 document is visible (the one with no org assignment).

> This is the clearest proof of org-scope filtering because the data already exists with different org_unit_id values.

---

### 3.2 Knowledge Base (Articles & Announcements)

**Current state:** Tables are empty. To test filtering, create articles as different users.

**Steps:**
1. Log in as **Olaniyan** (admin).
2. Navigate to **Knowledge**.
3. Create a new KB article (e.g., "Test Article from Admin").
4. Log out and log in as **Sabdul**.
5. Navigate to **Knowledge**.
6. Create a new KB article (e.g., "Test Article from AMD").
7. Log out and log in as **Tsadegoke**.
8. Navigate to **Knowledge**.

**Expected:** Tsadegoke should see only articles created by users in the Arch Strategy division plus any articles with no org assignment. The admin's article will have the admin's org_unit_id (or NULL if admin has no org_unit), and Sabdul's article will be stamped with the AMD org_unit_id.

> **Note:** Staff users have `knowledge.view` permission, so they can browse articles. If create functionality requires additional permissions, only the admin may be able to create articles.

---

### 3.3 Approvals (Workflow Definitions & Approval Chains)

**Current state:** 1 workflow definition exists in the database.

**Steps:**
1. Log in as **Olaniyan** (admin).
2. Navigate to **Governance > Approvals**.
3. Note any workflow definitions or approval chains visible.
4. Log in as **Sabdul** and navigate to the same page.
5. Compare what is visible.

**Expected:** Staff users have `approval.view` permission. They should only see approval chains and workflow definitions that belong to their division or have no org assignment.

---

### 3.4 Calendar (Maintenance Windows & Change Freeze Periods)

**Current state:** Tables are empty.

**Steps:**
1. Log in as **Olaniyan** (admin).
2. Navigate to **Planning > Calendar**.
3. Create a maintenance window or change freeze period.
4. Log in as other users and check visibility.

**Expected:** The created record will be stamped with the creator's org_unit_id. Other users will only see it if they share the same org hierarchy or if the record has no org assignment.

---

### 3.5 Vendors & Contracts

**Current state:** Tables are empty.

> **Note:** Staff users (Sabdul, Tsadegoke) do NOT have vendor management permissions. Only the admin can access vendor pages. To test org-scope filtering on vendors, you would need to either:
> - Create additional test users with vendor permissions in different divisions, OR
> - Grant `cmdb.manage` or `vendors.view` permissions to the staff users.

**Steps (admin only):**
1. Log in as **Olaniyan** (admin).
2. Navigate to **CMDB > Vendors**.
3. Create a test vendor.
4. Verify it appears in the list.

---

### 3.6 Automation Rules

**Current state:** Table is empty.

> **Note:** Automation management is typically an admin-only feature. Staff users may not have access to this section.

**Steps:**
1. Log in as **Olaniyan** (admin).
2. Navigate to **System > Automation**.
3. Create an automation rule if the UI supports it.

---

### 3.7 Custom Field Definitions

**Current state:** Table is empty.

> **Note:** Custom field management is typically an admin-only feature.

**Steps:**
1. Log in as **Olaniyan** (admin).
2. Navigate to **System > Custom Fields**.
3. Create a custom field definition if the UI supports it.

---

## Step 4: Cross-Module Verification (Previously Implemented Modules)

These modules were implemented in the prior phase and can also be tested:

| Module | Sidebar Path | Staff Permission |
|--------|-------------|-----------------|
| ITSM Tickets | ITSM > Tickets | itsm.view, itsm.manage |
| Work Items | Planning > Work Items | planning.view |
| Budgets | Planning > Budgets | planning.view |
| Portfolios | Planning > Portfolios | planning.view |
| Meetings | Governance > Meetings | governance.view |
| Policies | Governance > Policies | governance.view |
| OKRs | Governance > OKRs | governance.view |
| Risk Register | GRC > Risks | grc.view |
| Audits | GRC > Audits | grc.view |
| Assets | CMDB > Assets | cmdb.view |
| Roster | People > Roster | people.view |
| Checklists | People > Checklists | people.view |

---

## Step 5: Verify Filtering Behavior Summary

For every module list page, the expected behavior is:

| User Type | What They See |
|-----------|--------------|
| **Global Admin** (Olaniyan) | All records across all divisions |
| **Division Staff** (Sabdul — AMD) | Records with org_unit_id matching AMD (or AMD sub-units) + records with NULL org_unit_id |
| **Division Staff** (Tsadegoke — Arch Strategy) | Records with org_unit_id matching Arch Strategy (or its sub-units) + records with NULL org_unit_id |

### Key Behaviors to Verify:
1. **List pages** show filtered results automatically — no UI toggle needed.
2. **Detail pages** return "Not Found" if the record belongs to another division.
3. **Create actions** automatically stamp the new record with the creator's org_unit_id.
4. **NULL records** (created before org-scope migration) are visible to all users within the tenant.
5. **Global admins** see everything regardless of org assignment.

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Login fails with "Invalid credentials" | Password may have been reset | Reset password in DB to the bcrypt hash for "Test1234!" |
| 403 Forbidden on a module page | User lacks the required role permission | This is role-based access control, not org-scope. Check the user's permissions in `role_bindings` and `role_permissions`. |
| All users see the same data | Records may all have NULL org_unit_id | Check the `org_unit_id` column on the records. Newly created records should be stamped automatically. |
| Staff user sees 0 records | User's org_unit_id may not match any records | Create a record as that user first, then verify it appears in their list. |
| Module page shows empty list for admin too | Table is genuinely empty | Create test data first. |

---

## Quick Smoke Test (Recommended)

The fastest way to confirm org-scope filtering is working:

1. Open **3 browser windows** (use incognito/private for isolation).
2. Log in as each of the 3 test users.
3. Navigate to **Vault** (Document Vault) in all 3 windows.
4. Compare document counts:
   - Olaniyan: **3 documents**
   - Sabdul: **3 documents** (2 AMD + 1 NULL)
   - Tsadegoke: **1 document** (0 Arch + 1 NULL)
5. If counts match expectations, org-scope filtering is confirmed working.
