# Testing Guide

Stack: **Vitest** (unit/integration) + **Playwright** (E2E).

## Current status

Verified on **2026-05-02**:

- `npm run build`: pass
- `npm test`: pass (`26` files, `164` tests)
- `npm run lint`: pass
- `npm run test:e2e`: pass (`10/10`)

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
- auth bootstrap is handled in `tests/e2e/auth.setup.ts`
- browser tests mock selected `/api/v1/*` endpoints via `tests/e2e/support/demo-api.ts` when needed

### Current E2E status

- invitations flow: pass
- finance flow (petty cash + budget): pass
- full suite status: `10/10` pass

Current risk:
- tests still depend on controlled fixtures/mocks for deterministic data, so any major schema contract change should update `tests/e2e/support/demo-api.ts`.

---

## Done criteria

Minimum gate for any backend or schema change:

```bash
npm run build && npm run test
```

If the change touches auth, navigation, forms, browser flows, or API payload contracts, also re-run:

```bash
npm run test:e2e
```
