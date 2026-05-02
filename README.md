# LEC Platform (LEC Orb)

**Canonical project status:** this repository (`lec-orb`) is the primary active project for the LEC Platform. Other variants (`-develop`, `-finance`) are historical references or experiments.

Digital platform for multi-tenant operational and financial management across LEC business lines.

## Project Snapshot

Verified on **2026-05-02**:

- Build / typecheck: passing (`npm run build`)
- Vitest: passing (`26` files, `164` tests)
- ESLint: passing (`0` errors)
- Playwright E2E: passing (`10/10`)
- Sentry: active (`orb-lec`)
- `DEMO_MODE`: removed from production auth/API flow; `src/lib/demo/*` remains for tests and placeholder portal data

## Project Overview

The app is built with Next.js App Router and Supabase, with tenant isolation by `org_id`, RBAC, and operational modules such as finance, events, inventory, TOEFL, CENNI, documents, and invitations.

## Technology Stack

- Framework: Next.js 16.1.6
- Language: TypeScript
- Database and auth: Supabase PostgreSQL
- Styling: Tailwind CSS 4
- Components: Radix UI and Lucide
- Monitoring: Sentry (`@sentry/nextjs`)
- Testing: Vitest and Playwright

## Core Modules

- Caja Chica: movement tracking, balance, receipts, Excel import/export
- Presupuesto: monthly upsert plus budget-vs-actual comparison
- CENNI: CRUD, bulk import, status tracking, certificate upload/view/send
- Invitations: create, resend, accept via RPC, expiration flow
- Multi-tenant org management: RBAC, audit log, notifications, documents

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase URL and anon key in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` for invitations and CENNI certificate flows

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

## Documentation Index

- [Handoff Guide](./HANDOFF.md) - current status, risks, next steps
- [Project Roadmap](./docs/ROADMAP.md) - backlog and prioritization
- [Testing Guide](./docs/TESTING_GUIDE.md) - current test strategy and known gaps
- [Finance Modules Guide](./docs/FINANCE_MODULES.md) - Caja Chica and Presupuesto details
- [Database Schema](./docs/DATABASE_SCHEMA.md) - entities, enums, RPCs
- [API Modules](./docs/API_MODULES.md) - route reference

---

© 2026 LEC Platform. All rights reserved.
