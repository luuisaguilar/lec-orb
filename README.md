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

## Project Management Module (In Progress)

LEC Orb now has a transversal work management module in MVP implementation (Asana/Trello/Monday style) reusing the existing multi-tenant architecture.

- Scope target: projects, boards, columns, tasks, assignees, due dates, labels
- Added in phase 1.1: `team/role/personal` task scope with private personal tracking
- UI target: `/dashboard/proyectos` with `Equipo / Por puesto / Mi registro`
- Backend target: `/api/v1/pm/*` with `withAuth` + `logAudit`
- DB target: dedicated `pm_*` tables with RLS from day one

Decision log: `docs/adr/ADR-007-project-management-module-foundation.md`  
Runbook: `docs/PM_RUNBOOK.md`  
Paths and routes: `docs/PM_PATHS_AND_ROUTES.md`

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
- [Infrastructure Status](./INFRASTRUCTURE_STATUS.md) - launch readiness and live execution status
- [Project Roadmap](./docs/ROADMAP.md) - backlog and prioritization
- [ADR-007 Project Management Module Foundation](./docs/adr/ADR-007-project-management-module-foundation.md) - architecture decision for PM module rollout
- [PM Runbook](./docs/PM_RUNBOOK.md) - PM operational checks and troubleshooting
- [PM Paths and Routes](./docs/PM_PATHS_AND_ROUTES.md) - PM files, routes, and migrations map
- [Testing Guide](./docs/TESTING_GUIDE.md) - current test strategy and known gaps
- [Finance Modules Guide](./docs/FINANCE_MODULES.md) - Caja Chica and Presupuesto details
- [Database Schema](./docs/DATABASE_SCHEMA.md) - entities, enums, RPCs
- [API Modules](./docs/API_MODULES.md) - route reference
- [Project Management Module](./docs/PROJECT_MANAGEMENT_MODULE.md) - technical blueprint for PM MVP implementation
- [Executive Dashboard + Observability](./docs/executive-observability/README.md) - screens, KPIs, backlog, handoff, runbook, and paths
- [Executive Dashboard Ticket Board](./docs/executive-observability/TICKETS_SPRINT_BOARD.md) - sprint-ready tickets with estimates and dependencies

---

© 2026 LEC Platform. All rights reserved.
