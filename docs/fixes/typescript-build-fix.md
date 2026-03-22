# TypeScript Build Fix

## Scope

This fix targets the current build/typecheck failure in the CENNI bulk flow and the closely related TypeScript issues that blocked `npx tsc --noEmit` and `npm run build`.

## Root Cause

The main blocker was in the CENNI bulk route. Zod schemas using `optional().nullable()` produced fields typed as `string | null | undefined`, but the downstream insert/demo storage layer expected normalized nullable fields such as `string | null` and boolean fields without `undefined`.

The failing pattern was:

- validate request input with optional nullable fields
- spread parsed objects directly into insert payloads
- pass `undefined` through to functions or tables that expect `null` or required booleans

There were also nearby strict-mode failures in other API routes caused by:

- implicit `any` callback parameters from untyped Supabase responses
- an auth context mismatch where `module_records` routes expected `enrichAudit`, which does not exist in `withAuth`
- a `users/me` response reading a non-existent `member.organizations` property
- a production build dependency on remote Google Fonts, which made the build fragile and failed in a network-restricted environment

## What Changed

### 1. Explicit CENNI normalization

Added [src/lib/cenni/normalize.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/cenni/normalize.ts) to centralize normalization of request payloads before persistence.

This helper:

- converts optional nullable text fields to `string | null`
- converts optional booleans to concrete booleans with `?? false`
- guarantees a complete internal shape for insert/demo flows
- avoids spreading partially validated request objects into stricter domain types

### 2. CENNI routes now use normalized payloads

Updated:

- [src/app/api/v1/cenni/bulk/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/bulk/route.ts)
- [src/app/api/v1/cenni/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/route.ts)

These routes now normalize payloads before writing to demo storage or Supabase inserts, removing the `undefined` vs `null` mismatch at the source.

### 3. Tight strict-mode fixes in related API routes

Updated the following files to remove implicit `any`, align response types, and replace invalid internal API assumptions:

- [src/app/api/v1/modules/[slug]/records/[recordId]/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/modules/[slug]/records/[recordId]/route.ts)
- [src/app/api/v1/events/staff-availability/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/events/staff-availability/route.ts)
- [src/app/api/v1/payments/export/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/export/route.ts)
- [src/app/api/v1/payments/import/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/import/route.ts)
- [src/app/api/v1/users/me/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/me/route.ts)
- [src/app/api/v1/users/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/route.ts)

Highlights:

- replaced the non-existent `enrichAudit` usage with `logAudit`
- swapped `z.any()` and `Record<string, any>` for `z.unknown()` and `Record<string, unknown>` in touched routes
- added small explicit row types for Supabase result sets
- normalized the `users/me` organization payload to the shape actually available in auth context

### 4. Build reliability fix for fonts

Updated:

- [src/app/layout.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/layout.tsx)
- [src/app/globals.css](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/globals.css)

Removed `next/font/google` usage for `Geist` and replaced it with local CSS font stacks via the same CSS variables. This keeps the visual intent close enough while removing a remote build dependency that broke in restricted environments.

### 5. Compile-time regression coverage

Added [tests/typescript-build-fix.test.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/tests/typescript-build-fix.test.ts) as a compile-time guard to assert that normalized CENNI payloads are assignable to the mock/demo insert shape.

This file exists to protect the exact `undefined` vs `null` regression that originally broke the build.

## Modified Files And Why

- [src/lib/cenni/normalize.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/cenni/normalize.ts): new normalization layer for CENNI payloads
- [src/app/api/v1/cenni/bulk/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/bulk/route.ts): use normalized bulk payloads for demo mode and Supabase inserts
- [src/app/api/v1/cenni/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/cenni/route.ts): normalize single-create payload before insert
- [src/app/api/v1/modules/[slug]/records/[recordId]/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/modules/[slug]/records/[recordId]/route.ts): replace invalid audit hook usage and remove `any`
- [src/app/api/v1/events/staff-availability/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/events/staff-availability/route.ts): type Supabase rows to satisfy strict mode
- [src/app/api/v1/payments/export/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/export/route.ts): type export rows to satisfy strict mode
- [src/app/api/v1/payments/import/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/payments/import/route.ts): remove touched `any` usage and type import/dedup flows
- [src/app/api/v1/users/me/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/me/route.ts): return organization data that actually exists on `member`
- [src/app/api/v1/users/route.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/api/v1/users/route.ts): type org member/profile/email rows
- [src/app/layout.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/layout.tsx): remove remote Google font dependency
- [src/app/globals.css](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/globals.css): define stable local font stacks for existing CSS variables
- [tests/typescript-build-fix.test.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/tests/typescript-build-fix.test.ts): compile-time regression guard for normalized CENNI payloads

## Verification

Commands run after the fixes:

```powershell
npx.cmd tsc --noEmit
```

Result: passed with exit code `0`.

```powershell
npm.cmd run build
```

Result: passed with exit code `0` when run outside the sandbox. Inside the sandbox, the command hit `spawn EPERM`, which is an environment restriction, not a project build error.

## Suggested Commit Message

```text
fix: normalize cenni payloads and clear strict-mode build blockers
```

## Residual Risks

- The font fallback now uses local system stacks instead of downloaded Geist fonts. The UI remains functional, but typography can vary slightly by environment.
- Several Supabase interactions still rely on hand-written local row types because the project does not appear to be using generated database types consistently. That is acceptable for this fix, but broader typing drift can still surface later in unrelated modules.
