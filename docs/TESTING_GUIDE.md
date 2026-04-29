# Testing Guide

Stack: **Vitest** (unit/integration) + **Playwright** (E2E).

## Current status

Verified on **2026-04-29**:

- `npm run build`: pass
- `npm test`: pass (`26` files, `164` tests)
- `npm run lint`: pass with `62` warnings
- `npm run test:e2e`: fail (`9/9`)

## Commands

```bash
npm run test          # Vitest - all tests
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright E2E
npm run lint          # ESLint
npm run build         # production build gate
```

---

## Vitest

Current coverage:

- `22/22` API modules covered
- `26` test files total
- `164` tests passing

Test layout:

```text
src/tests/
|- api/      # route handler tests
|- lib/      # utility tests
`- setup.ts
```

See `docs/TESTING_PATTERNS.md` for:

- Supabase mocking patterns
- `withAuth` handler invocation
- `NextRequest` construction patterns

---

## Playwright (E2E)

### What the runner does today

- `playwright.config.ts` starts `npm run dev` automatically through `webServer`
- that dev server is launched with `NEXT_PUBLIC_DEMO_MODE=true`
- browser tests also intercept `/api/v1/*` requests via `tests/e2e/support/demo-api.ts`

### Why E2E is currently red

As of **2026-04-29**, the app redirects `/dashboard/*` routes to `/login` because auth is real again and `src/lib/supabase/proxy.ts` no longer bypasses auth when `DEMO_MODE` is set.

The current Playwright harness still assumes the old behavior:

- open dashboard directly
- mock API in the browser
- skip real auth/session bootstrap

Result: `9/9` tests fail before reaching the expected dashboard UI.

### Recommended next fix

Choose one of these strategies:

1. seed a real authenticated session for an E2E test user
2. add an explicit test-only auth bootstrap

Do **not** restore the old implicit demo bypass in production middleware.

See `docs/DEMO_MODE.md` for the current status of demo fixtures.

---

## Done criteria

Minimum gate for any backend or schema change:

```bash
npm run build && npm run test
```

If the change touches auth, navigation, forms, or browser flows, also re-run:

```bash
npm run test:e2e
```
