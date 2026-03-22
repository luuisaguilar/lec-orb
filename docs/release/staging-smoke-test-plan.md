# Staging Smoke Test Plan

## Purpose

Validate runtime readiness of the staging stack before promoting to production:

- Vercel Preview deployment
- real Supabase staging project
- real auth, RLS, storage, and multi-tenant behavior

This plan is intentionally focused on high-signal smoke coverage, not exhaustive QA.

## Scope

The smoke suite covers:

- login
- registration
- organization bootstrap after registration
- dashboard load
- `/api/v1/users/me`
- invitation acceptance
- document upload
- document download
- document delete
- audit log listing
- non-admin access using `member_module_access`

## Environments Under Test

- Vercel Preview URL for the branch under validation
- Supabase staging project linked to that Preview deployment

## Entry Criteria

Do not run this plan until all of these are true:

- latest branch build is green in GitHub Actions
- Preview deployment is available in Vercel
- staging Supabase project has the intended pending migrations applied
- staging Vercel env vars point to the staging Supabase project
- `NEXT_PUBLIC_DEMO_MODE` is unset or `false`
- staging data prep is complete

## Required Staging Data Setup

Prepare the following before executing tests.

### Accounts

- `admin_existing`
  Existing staging user with `org_members.role = admin`

- `supervisor_or_operador_existing`
  Existing staging user with non-admin role and valid `member_module_access` rows

- `invitee_new`
  Email inbox available for invitation acceptance test

- `signup_new`
  Fresh email inbox available for registration test

### Organization and permissions

- at least one staging organization with valid `profiles`, `organizations`, and `org_members`
- `member_module_access` rows for the non-admin test user
- at least one module grant expected to be allowed
- at least one module intentionally not granted to validate denial

### Storage

- bucket `org-documents` exists
- `storage.objects` policies for `org-documents` are applied
- a small sample file is available locally, for example `smoke-test.txt`

### Invitations

- admin user can create invitations from the UI or `POST /api/v1/invitations`
- no existing pending invitation for `invitee_new` unless you intend to reuse it

### Optional SQL checks before test execution

Use Supabase SQL editor or psql against staging to confirm:

```sql
select id, name, slug from public.organizations limit 5;
select id, user_id, org_id, role from public.org_members limit 10;
select member_id, module, can_view, can_edit, can_delete from public.member_module_access limit 20;
select id, org_id, action, performed_by, created_at from public.audit_log order by created_at desc limit 10;
select id, public from storage.buckets where id = 'org-documents';
```

## Evidence Rules

For each test capture:

- Preview URL used
- tester identity
- timestamp
- screenshot or screen recording when UI behavior matters
- JSON response or browser network capture for API assertions
- Supabase row evidence when DB side-effects matter

If a test fails, capture the failing request payload, HTTP status, error body, and any related Supabase rows.

## Test Cases

### STG-01 Login

Preconditions:

- `admin_existing` account exists in staging
- account has confirmed email or valid login path

Steps:

1. Open the Vercel Preview URL.
2. Navigate to `/login`.
3. Sign in as `admin_existing`.
4. Wait for redirect to `/dashboard`.

Expected result:

- login succeeds against staging Supabase
- user is redirected to `/dashboard`
- no demo behavior is visible
- no configuration error is shown

Evidence to capture:

- screenshot of successful dashboard load
- browser network capture for login request if possible

### STG-02 Dashboard Load

Preconditions:

- authenticated `admin_existing` session from STG-01

Steps:

1. Stay on `/dashboard`.
2. Refresh the page.
3. Navigate to at least one secondary dashboard page, for example `/dashboard/users`.

Expected result:

- dashboard loads without redirect loops
- proxy/session refresh works
- authenticated pages render with real staging data

Evidence to capture:

- screenshot of `/dashboard`
- screenshot of one secondary dashboard page

### STG-03 `/api/v1/users/me`

Preconditions:

- authenticated `admin_existing` session

Steps:

1. In browser devtools or with authenticated request tooling, call `GET /api/v1/users/me`.
2. Inspect the JSON response.

Expected result:

- response status is `200`
- payload includes:
  - `user.id`
  - `user.email`
  - `organization.id`
  - `role`
  - `permissions`
- organization ID matches the tester's staging org

Evidence to capture:

- JSON response body
- screenshot of network request/response

### STG-04 Registration and Organization Bootstrap

Preconditions:

- staging Supabase has `20260322_organizations_slug_alignment.sql` applied
- `signup_new` has not been used before

Steps:

1. Open `/register` in an incognito session.
2. Register with `signup_new`.
3. Complete any required email verification flow.
4. Sign in with the new account.
5. Query the DB or admin tools to inspect rows created for the new user.

Expected result:

- signup succeeds
- login succeeds after verification
- DB bootstrap exists:
  - `profiles` row created
  - `organizations` row created
  - `organizations.slug` is non-null and unique
  - `org_members` row created with `role = admin`

Evidence to capture:

- screenshot of registration success state
- `profiles` row screenshot/query result
- `organizations` row screenshot/query result
- `org_members` row screenshot/query result

### STG-05 Organization Read Consistency

Preconditions:

- successful registration from STG-04 or existing admin account

Steps:

1. Call `GET /api/v1/users/me` for the account created in STG-04.
2. Compare `organization.id` with the `organizations` row created by signup.

Expected result:

- API returns the same org context that DB bootstrap created
- no null or mismatched organization state appears after first login

Evidence to capture:

- `/api/v1/users/me` JSON
- matching DB row screenshot

### STG-06 Invitation Acceptance

Preconditions:

- authenticated `admin_existing`
- `invitee_new` mailbox accessible

Steps:

1. From `/dashboard/users`, create an invitation for `invitee_new`.
2. Capture the generated invitation row or token.
3. Open `/join/<token>` in a clean browser session.
4. If prompted, register or log in as `invitee_new`.
5. Accept the invitation.

Expected result:

- invitation page resolves the token
- invitation can be accepted
- `org_members` row is created for `invitee_new`
- `org_invitations.status` becomes `accepted`
- user is redirected to `/dashboard`

Evidence to capture:

- screenshot of invitation pending state in admin UI
- screenshot of `/join/<token>` confirmation page
- `org_invitations` row before/after
- `org_members` row for `invitee_new`

### STG-07 Non-Admin Access With `member_module_access`

Preconditions:

- `supervisor_or_operador_existing` exists
- corresponding `member_module_access` rows are populated

Steps:

1. Sign in as `supervisor_or_operador_existing`.
2. Call `GET /api/v1/users/me`.
3. Navigate to one module the user should have access to.
4. Navigate to one module the user should not have access to, for example `/dashboard/users` if that user is not admin.

Expected result:

- allowed module loads successfully
- denied module is blocked by UI/API behavior
- `permissions` returned by `/api/v1/users/me` match the expected `member_module_access` rows

Evidence to capture:

- `/api/v1/users/me` JSON
- screenshot of allowed module
- screenshot or API response showing denied access
- DB snapshot of `member_module_access` rows for that member

### STG-08 Document Upload

Preconditions:

- authenticated `admin_existing` or authorized non-admin with documents edit permission
- `20260322_org_documents_storage.sql` applied
- local test file available

Steps:

1. Open `/dashboard/documentos` if available, or submit a multipart request to `POST /api/v1/documents`.
2. Use:
   - `file = smoke-test.txt`
   - `module_slug = documents`
   - optional `record_id`
3. Wait for upload to complete.
4. Query `documents` table for the new row.

Expected result:

- response status is `201`
- `documents` row is created with the authenticated user's `org_id`
- `file_path` starts with `<org_id>/`
- object exists in `org-documents`

Evidence to capture:

- response body or UI success screenshot
- `documents` row screenshot
- storage object screenshot showing path

### STG-09 Document Download

Preconditions:

- document from STG-08 exists

Steps:

1. Call `GET /api/v1/documents/download?path=<file_path>` while authenticated as the same org user.
2. Follow the redirect.

Expected result:

- request succeeds
- response redirects to a signed URL
- file downloads correctly

Evidence to capture:

- network trace showing redirect
- screenshot of downloaded file or browser download confirmation

### STG-10 Document Delete

Preconditions:

- document from STG-08 exists
- authenticated user has documents delete permission

Steps:

1. Call `DELETE /api/v1/documents?id=<document_id>` while authenticated as the same org user that uploaded the file.
2. Verify the API response.
3. Confirm the corresponding `documents` row is gone.
4. Confirm the storage object was removed from `org-documents`.

Expected result:

- request returns `200`
- response body includes `success: true`
- the `documents` row no longer exists for that `id`
- the storage object is removed

Evidence to capture:

- API response body
- DB query showing the row is gone
- storage evidence showing the object was removed

### STG-11 Cross-Tenant Document Denial

Preconditions:

- two org contexts available in staging, or one known foreign `file_path`

Steps:

1. Authenticate as org A.
2. Call `GET /api/v1/documents/download?path=<orgB_path>`.

Expected result:

- request returns `403`
- no signed URL is issued

Evidence to capture:

- network capture showing `403`
- path used in the denied request

### STG-12 Audit Log Listing

Preconditions:

- `20260322_audit_log_schema_alignment.sql` applied
- prior actions from this smoke suite exist, especially invitation and document actions

Steps:

1. Authenticate as `admin_existing`.
2. Call `GET /api/v1/audit-logs?limit=20`.
3. Open `/dashboard/actividad`.
4. Check recent records.

Expected result:

- API returns `200`
- rows belong only to the caller's `org_id`
- rows include canonical audit fields and dashboard compatibility aliases
- activity dashboard renders recent events without schema mismatch issues

Evidence to capture:

- API JSON response
- screenshot of `/dashboard/actividad`
- DB query showing recent `audit_log` rows for the org

## Suggested Execution Order

Run in this order to maximize signal and reuse created data:

1. STG-01 Login
2. STG-02 Dashboard Load
3. STG-03 `/api/v1/users/me`
4. STG-04 Registration and Organization Bootstrap
5. STG-05 Organization Read Consistency
6. STG-06 Invitation Acceptance
7. STG-07 Non-Admin Access With `member_module_access`
8. STG-08 Document Upload
9. STG-09 Document Download
10. STG-10 Document Delete
11. STG-11 Cross-Tenant Document Denial
12. STG-12 Audit Log Listing

## Exit Criteria

The staging smoke suite passes only if:

- all critical tests pass:
  - STG-01
  - STG-03
  - STG-04
  - STG-06
  - STG-08
  - STG-09
  - STG-10
  - STG-11
  - STG-12
- no cross-tenant leakage is observed
- no config fallback to demo mode is observed
- all required evidence is attached

## Final Release Gate Recommendation

Promote to production only if all of these are true:

- staging smoke suite passed with evidence recorded in [docs/release/staging-smoke-test-results-template.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/release/staging-smoke-test-results-template.md)
- staging Supabase migrations used for the test are exactly the set intended for production
- Preview deployment commit SHA matches the release candidate commit
- no unresolved critical or high-severity defect remains from the smoke run
