# DEMO_MODE - current status

Verified on **2026-05-02**.

`DEMO_MODE` still exists in the repo, but its role changed.

---

## TL;DR

- `src/lib/demo/config.ts` still exposes `DEMO_MODE`
- `src/lib/demo/data.ts` still contains in-memory fixtures
- `NEXT_PUBLIC_DEMO_MODE=true` no longer unlocks dashboard routes by itself
- production API routes no longer branch on `DEMO_MODE`
- Playwright uses explicit auth bootstrap; no implicit dashboard bypass via `DEMO_MODE`

---

## What still uses demo data

### 1. Placeholder portal pages

These pages still read directly from `src/lib/demo/data.ts`:

- `src/app/(portal)/portal/page.tsx`
- `src/app/(portal)/portal/horarios/page.tsx`
- `src/app/(portal)/portal/metricas/page.tsx`
- `src/app/(portal)/portal/nomina/page.tsx`

They are not wired to real authenticated data yet.

### 2. Vitest mocks

Some tests still mock `@/lib/demo/config` because modules import demo exports indirectly.

### 3. Playwright support fixtures

`tests/e2e/support/demo-api.ts` still provides deterministic browser-side API mocks.

---

## What no longer uses DEMO_MODE

### Auth / middleware bypass

`src/lib/supabase/proxy.ts` no longer short-circuits auth when `DEMO_MODE` is true.

### Production API handlers

As verified on `2026-05-02`, there are no active `/api/v1/*` route branches keyed off `DEMO_MODE`.

---

## Activation

The config flag still evaluates the same way:

```ts
export const DEMO_MODE =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";
```

But setting `NEXT_PUBLIC_DEMO_MODE=true` now only matters if a page, helper, or test explicitly consumes the flag or imports the in-memory demo fixtures.

---

## Vitest usage

For tests that need to neutralize demo imports:

```ts
vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: false,
    DEMO_USER:   { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG:    { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));
```

Important: include all exports because `src/lib/demo/data.ts` imports them at module load time.

---

## Playwright status

Current behavior:

- `playwright.config.ts` starts the dev server for E2E
- `tests/e2e/auth.setup.ts` seeds authenticated browser state
- browser tests mock selected `/api/v1/*` calls for deterministic fixtures

Current result:

- suite passes `10/10`
- auth and dashboard navigation are aligned with runtime behavior

Recommended next step:

- keep fixture contracts synchronized with backend payload changes
- extend E2E coverage to new modules (for example, Viaticos)

Do not reintroduce the old implicit demo bypass into production middleware.
