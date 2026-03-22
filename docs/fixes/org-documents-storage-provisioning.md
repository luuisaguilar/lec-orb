# Org Documents Storage Provisioning

## Summary

This fix makes the documents module deployable in a new Supabase environment without relying on tacit manual bucket setup.

The repository now provisions:

- the private storage bucket `org-documents`
- tenant-isolated `storage.objects` policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`

The storage layer enforces organization isolation by path. The Next.js API layer remains responsible for fine-grained business authorization, signed URLs, and document metadata.

## Storage Contract

### Bucket

- `org-documents`

### Path shape

Files are stored under:

```text
<org_id>/<module_slug>/<record_id|general>/<timestamp>.<ext>
```

Example:

```text
5d4f9d91-3e40-4f9c-bf06-1f0e6b6f3d59/payments/general/1711137000000.pdf
```

### Why this path is safe

- the first segment is the tenant boundary
- the application builds the full path on the server using `member.org_id`
- the client does not supply `org_id`
- upload requests only send `file`, `module_slug`, `record_id`, and optional metadata; the server injects the effective org from auth context
- download requests still receive a `path`, but the server validates the first path segment against `member.org_id` before issuing a signed URL
- the path still carries enough module/record context for debugging and traceability

Relevant code:

- [src/app/api/v1/documents/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/route.ts)
- [src/app/api/v1/documents/download/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/documents/download/route.ts)

## Security Model

### Storage / SQL responsibilities

Storage policies only enforce tenant isolation:

- users can only access objects in bucket `org-documents`
- users can only operate on objects whose first folder segment matches one of their `org_members.org_id` values

This is implemented in [`20260322_org_documents_storage.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_org_documents_storage.sql) using `storage.foldername(name)`.

### App responsibilities

The application still enforces:

- module/action permissions via `withAuth`
- server-side path construction for uploads
- server-side path validation for download requests
- which route can upload, list, delete, or generate signed URLs
- whether a `record_id` is valid for the current module flow
- audit and business rules

This split is intentional. It keeps Storage policies small and reliable while avoiding duplicate permission logic in SQL.

## What The Migration Provisions

[`20260322_org_documents_storage.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_org_documents_storage.sql) does the following:

1. creates or updates the private bucket `org-documents`
2. creates `storage.objects` policies for:
   - `SELECT`
   - `INSERT`
   - `UPDATE`
   - `DELETE`
3. scopes those policies to objects where:
   - `bucket_id = 'org-documents'`
   - `(storage.foldername(name))[1]` belongs to one of the caller's organizations

## Manual Steps Still Required

The bucket and policies are now versioned, so there is no longer a hidden manual provisioning step for storage itself.

What still remains manual in release:

- apply the migration to the target Supabase project
- run smoke tests in staging or preview with real auth/users

## Smoke Tests

Run these after applying migrations in staging.

### Upload

1. Sign in as a user who belongs to organization A
2. Upload a file through the documents UI or `POST /api/v1/documents`
3. Confirm:
   - the upload succeeds
   - a `documents` row is created with `org_id = A`
   - the stored path begins with `A/`
   - the client never had to provide `org_id`

### List

1. Request `GET /api/v1/documents`
2. Confirm only organization A documents are returned

### Download

1. Open the generated link from `/api/v1/documents/download?path=...`
2. Confirm:
   - the signed URL is created
   - the file downloads successfully for the same org member
   - the route rejects a path whose first segment does not match the caller's `member.org_id`

### Cross-org denial

1. Sign in as a user in organization B
2. Try to access a path that begins with organization A's ID
3. Confirm the request is denied before a signed URL is created

### Delete

1. Delete an uploaded file through `DELETE /api/v1/documents?id=...`
2. Confirm:
   - the object is removed from `org-documents`
   - the `documents` table row is deleted
   - the delete path came from the `documents` table row scoped by `org_id`, not from arbitrary client input

## Residual Risk

This fix depends on the migration being applied in the target Supabase environment. If the app is deployed before [`20260322_org_documents_storage.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_org_documents_storage.sql), document upload/download will still fail in that environment.
