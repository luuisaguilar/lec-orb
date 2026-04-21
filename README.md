# LEC Platform (LEC Orb)

**Canonical Project Status**: `lec-orb` is the primary active repository for the LEC Platform. The `lec-orb-develop` and `lec-orb-finance` folders are reference variants, not the canonical app.

Digital platform for multi-tenant operational and financial management across LEC business units.

## Project Overview

- Framework: Next.js 16.1.6 (App Router)
- Language: TypeScript
- Database and auth: Supabase PostgreSQL + Supabase Auth
- Styling: Tailwind CSS 4
- Components: Radix UI + Lucide
- Testing: Vitest + Playwright

## Core Modules

- Caja Chica: movement capture, balance calculation, receipt upload, audit logging, and Excel export.
- Presupuesto: monthly budget capture, bulk upsert, and budget-vs-actual comparative analysis.
- Users and invitations: org-scoped user management, invitations, resend flow, and manual join links.
- Organization management: RBAC and org isolation enforced by `org_id`.

## Local Commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e
```

## Testing Notes

- `npm test` runs focused unit/integration coverage with Vitest.
- `npm run test:e2e` starts a dedicated local dev server with `NEXT_PUBLIC_DEMO_MODE=true` and uses a controlled browser-side API harness so Playwright stays deterministic.
- The Playwright suite is intended as a local UI regression harness. It is not a substitute for a staging smoke test against real Supabase data and auth.

## Documentation Index

- [Handoff Guide](./HANDOFF.md)
- [Finance Modules Guide](./docs/FINANCE_MODULES.md)
- [Project Roadmap](./docs/caja_chica_webapp_roadmap.md)
- [Testing Guide](./docs/TESTING_GUIDE.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)

---

Copyright 2026 LEC Platform.
