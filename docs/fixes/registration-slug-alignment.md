# Registration Slug Alignment

## Summary

This fix removes the production blocker where signup could create an `organizations` row without a valid `slug`.

The new source of truth is database-first:

- `organizations.slug` is generated in Supabase on `INSERT`
- the slug stays stable on ordinary `UPDATE`
- `handle_new_user()` now depends on the database slug contract instead of an outdated manual insert shape
- the web registration page no longer duplicates profile/org/member bootstrap from the client

## Root Cause

The repository contained conflicting schema eras:

- [`001_core_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/001_core_schema.sql) requires `organizations.slug text NOT NULL UNIQUE`
- [`20240227_schema.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240227_schema.sql) creates `organizations` without `slug`
- [`20240302_trigger_schools_applicators.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20240302_trigger_schools_applicators.sql) overwrote `handle_new_user()` and kept inserting only `name`
- [src/app/(auth)/register/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(auth)/register/page.tsx) also manually inserted `profiles`, `organizations`, and `org_members`

That meant signup behavior depended on which migration history the environment actually had, and a clean production rollout could still fail on `slug`.

## Implemented Strategy

### 1. Database owns slug generation

Added [`20260322_organizations_slug_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_organizations_slug_alignment.sql) with:

- `public.slugify_organization(text)`
- `public.generate_organization_slug(name, requested_slug, current_org_id)`
- `public.set_organization_slug()` trigger function

The slug algorithm:

1. lowercases and trims input
2. removes accents through `unaccent`
3. converts non-alphanumeric runs into `-`
4. collapses repeated dashes
5. falls back to `organization` when the normalized result is empty
6. resolves collisions incrementally: `slug`, `slug-2`, `slug-3`, ...

### 2. Stable slug policy

The trigger policy is conservative on updates:

- `INSERT`: always generate or normalize the final slug
- `UPDATE` with unchanged slug: keep the slug stable even if `name` changes
- `UPDATE` with explicit new slug: normalize it and make it unique
- `UPDATE` with blank slug: regenerate from the current `name`

This avoids breaking URLs or internal references on routine name edits.

### 3. Signup bootstrap now lives in the database

`handle_new_user()` was redefined so it:

- creates the `profiles` row
- creates the `organizations` row with only `name`
- relies on the organization slug trigger to produce the final unique slug
- links the new user in `org_members` as `admin`

### 4. Frontend no longer duplicates bootstrap

[src/app/(auth)/register/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(auth)/register/page.tsx) now only calls `supabase.auth.signUp(...)` and surfaces a clearer message if Supabase reports a database initialization failure.

That keeps the registration flow aligned with the DB-first contract and avoids partial duplicated writes from the browser.

## Files Changed

- [supabase/migrations/20260322_organizations_slug_alignment.sql](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_organizations_slug_alignment.sql)
- [src/app/(auth)/register/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(auth)/register/page.tsx)
- [tests/registration-slug-alignment.test.mjs](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/tests/registration-slug-alignment.test.mjs)
- [docs/deployment/supabase-release-checklist.md](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/docs/deployment/supabase-release-checklist.md)

## Verification

Recommended verification sequence:

```bash
node tests/registration-slug-alignment.test.mjs
npm run typecheck
npm run build
```

Manual verification after applying the migration to staging:

1. Register a new user
2. Confirm `profiles` row exists
3. Confirm `organizations.slug` is non-null and unique
4. Confirm `org_members.role = 'admin'`
5. Rename organization `name` without changing `slug` and confirm the slug remains stable

## Residual Risk

This fix is only effective in an environment where [`20260322_organizations_slug_alignment.sql`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/supabase/migrations/20260322_organizations_slug_alignment.sql) has been applied. Existing remote environments must roll out the migration before relying on the corrected registration flow.
