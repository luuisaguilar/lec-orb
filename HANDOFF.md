# Handoff Guide - LEC Platform (LEC Orb)

**Canonical Repository**: `lec-orb`  
**Date**: April 2026

## Architecture Summary

The app is a multi-tenant SaaS built with Next.js 16 and React 19. Supabase is the primary backend for auth, database, storage, and RLS-backed tenancy boundaries.

### Core Stack

- Framework: Next.js 16.1.6
- UI: React 19 + Tailwind CSS 4 + Radix UI
- Backend: Supabase PostgreSQL + Auth + Storage
- API shape: Next.js route handlers under `src/app/api/v1`

## Auth, Session, and RBAC

- Browser auth uses Supabase `signInWithPassword`.
- Protected app routes are guarded by `src/lib/supabase/proxy.ts`.
- Server-side authorization uses `withAuth` in `src/lib/auth/with-handler.ts`.
- Active roles are `admin`, `supervisor`, `operador`, and `applicator`.
- Data isolation is enforced with `org_id` plus Supabase RLS.

## Finance Modules Status

### Caja Chica

- CRUD API is implemented in `src/app/api/v1/finance/petty-cash`.
- Balance uses the `fn_petty_cash_balance` RPC for server-side calculation.
- Receipt upload is wired from the UI to the `petty-cash-receipts` bucket.
- Excel export is implemented in `src/lib/finance/export-xlsx.ts`.
- Mutations are audited through `logAudit`.

### Presupuesto

- Monthly budget upsert is implemented in `src/app/api/v1/finance/budget`.
- Comparative budget-vs-actual analysis is implemented in `src/app/api/v1/finance/budget/comparative`.
- The dashboard UI exposes both configuration and comparative tabs.

## Invitations and Email

- Invitations are created in `src/app/api/v1/invitations/route.ts`.
- The backend always returns a `joinUrl`, even when email delivery fails.
- Resend integration lives in `src/lib/email/resend.ts`.
- `NEXT_PUBLIC_APP_URL` and `RESEND_FROM_EMAIL` should be set in production to avoid localhost links and sender drift.

## Testing Status

- Vitest covers focused API and utility logic.
- Playwright now runs against a dedicated local demo-mode server plus a browser-side API harness for deterministic UI flows.
- Current Playwright coverage is strongest around finance and invitation flows.
- A future staging smoke layer with real auth/storage state would still be valuable for higher-fidelity release validation.

## Operational Notes

- Do not disable RLS on tenant tables such as `petty_cash_movements`, `org_members`, or invitation-related tables.
- Monitor Supabase Storage usage for receipts and uploaded documents.
- Be careful with module slug vs permission-module naming when extending RBAC-sensitive routes.

## Recommended Next Steps

1. Expand Vitest coverage beyond finance utilities and the two existing finance API areas.
2. Add a higher-fidelity staging smoke workflow that uses real Supabase auth and a dedicated test org.
3. Finish remaining finance polish items such as richer KPI cards, charts, and receipt preview.
4. Keep docs aligned whenever a route, auth rule, or module slug changes.
