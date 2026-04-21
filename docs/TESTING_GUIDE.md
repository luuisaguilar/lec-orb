# Testing Guide

This repository currently uses a practical mix of focused Vitest coverage and deterministic Playwright UI flows.

## Test Commands

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

## What Exists Today

### Vitest

- Focused coverage for finance API handlers and XLSX utilities.
- Runs in `jsdom` via `vitest.config.ts`.
- Test files live under `src/tests`.

### Playwright

- Specs live under `tests/e2e`.
- The suite starts its own local Next.js dev server.
- That server runs with `NEXT_PUBLIC_DEMO_MODE=true`.
- The browser layer installs a deterministic API harness from `tests/e2e/support/demo-api.ts`.

This means Playwright validates real page rendering, routing, dialogs, and client behavior without depending on live Supabase data or manual test credentials.

## Current Intent of Each Layer

- Vitest: business logic, route behavior, and utility coverage.
- Playwright: local UI regression coverage for the most important flows.
- Build: integration and type safety gate.

## Patterns In Use

### Mocking Supabase in Vitest

Integration-style tests mock the Supabase client chain directly so route handlers can be exercised without hitting the real database.

### Bypassing `withAuth` in Vitest

For route tests, `withAuth` is mocked so the inner handler can receive a synthetic auth context.

### Controlled Browser API Harness in Playwright

Playwright does not rely on a real seeded org today. Instead, it intercepts selected `/api/v1/**` requests and returns predictable responses for:

- user/session context
- module registry
- notifications
- invitations
- petty cash
- budget comparative flows

## Writing New Tests

1. Add focused logic/API tests under `src/tests`.
2. Add UI flows under `tests/e2e`.
3. Prefer deterministic test data over shared mutable backend state.
4. Keep Playwright scenarios scoped to user-visible behavior, not internal implementation details.

## Recommended Next Steps

- Expand Vitest coverage to more route handlers beyond the current finance focus.
- Add a higher-fidelity staging smoke layer with real auth and a dedicated test org.
- Keep the local Playwright harness fast and deterministic for everyday development.
