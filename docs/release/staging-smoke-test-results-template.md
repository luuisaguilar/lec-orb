# Staging Smoke Test Results Template

## Run Metadata

| field | value |
| --- | --- |
| release candidate branch |  |
| commit SHA |  |
| Vercel Preview URL |  |
| Supabase project ref |  |
| tester |  |
| test date |  |
| start time |  |
| end time |  |
| result summary |  |

## Environment Verification

| check | expected | actual | status | evidence |
| --- | --- | --- | --- | --- |
| Preview deployment available | yes |  |  |  |
| staging Supabase migrations applied | yes |  |  |  |
| `NEXT_PUBLIC_SUPABASE_URL` points to staging | yes |  |  |  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` present | yes |  |  |  |
| `NEXT_PUBLIC_DEMO_MODE` unset/false | yes |  |  |  |
| bucket `org-documents` exists | yes |  |  |  |

## Prepared Test Data

| item | value | notes |
| --- | --- | --- |
| admin_existing email |  |  |
| non-admin email |  | role:  |
| invitee_new email |  |  |
| signup_new email |  |  |
| sample file used |  |  |
| staging org id |  |  |

## Test Results

| test ID | test name | status | notes | evidence |
| --- | --- | --- | --- | --- |
| STG-01 | Login |  |  |  |
| STG-02 | Dashboard Load |  |  |  |
| STG-03 | `/api/v1/users/me` |  |  |  |
| STG-04 | Registration and Organization Bootstrap |  |  |  |
| STG-05 | Organization Read Consistency |  |  |  |
| STG-06 | Invitation Acceptance |  |  |  |
| STG-07 | Non-Admin Access With `member_module_access` |  |  |  |
| STG-08 | Document Upload |  |  |  |
| STG-09 | Document Download |  |  |  |
| STG-10 | Document Delete |  |  |  |
| STG-11 | Cross-Tenant Document Denial |  |  |  |
| STG-12 | Audit Log Listing |  |  |  |

## Per-Test Detail

### STG-01 Login

- status:
- preconditions met:
- observed behavior:
- evidence links:
- defects opened:

### STG-02 Dashboard Load

- status:
- preconditions met:
- observed behavior:
- evidence links:
- defects opened:

### STG-03 `/api/v1/users/me`

- status:
- preconditions met:
- observed behavior:
- evidence links:
- defects opened:

### STG-04 Registration and Organization Bootstrap

- status:
- preconditions met:
- observed behavior:
- DB evidence:
- evidence links:
- defects opened:

### STG-05 Organization Read Consistency

- status:
- preconditions met:
- observed behavior:
- evidence links:
- defects opened:

### STG-06 Invitation Acceptance

- status:
- preconditions met:
- observed behavior:
- DB evidence:
- evidence links:
- defects opened:

### STG-07 Non-Admin Access With `member_module_access`

- status:
- preconditions met:
- observed behavior:
- DB evidence:
- evidence links:
- defects opened:

### STG-08 Document Upload

- status:
- preconditions met:
- observed behavior:
- DB/storage evidence:
- evidence links:
- defects opened:

### STG-09 Document Download

- status:
- preconditions met:
- observed behavior:
- evidence links:
- defects opened:

### STG-10 Document Delete

- status:
- preconditions met:
- observed behavior:
- DB/storage evidence:
- evidence links:
- defects opened:

### STG-11 Cross-Tenant Document Denial

- status:
- preconditions met:
- observed behavior:
- evidence links:
- defects opened:

### STG-12 Audit Log Listing

- status:
- preconditions met:
- observed behavior:
- DB evidence:
- evidence links:
- defects opened:

## Defects and Follow-Up

| severity | area | summary | owner | status | link |
| --- | --- | --- | --- | --- | --- |

## Final Go/No-Go

### Recommendation

- go / no-go:
- rationale:

### Required before production

- [ ] all critical smoke tests passed
- [ ] all evidence attached
- [ ] no unresolved high-severity issue
- [ ] production migration set confirmed identical to staging-tested set
- [ ] release owner approved promotion
