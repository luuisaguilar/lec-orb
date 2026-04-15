# LEC Platform (LEC Orb) 🚀

**Canonical Project Status**: This repository (`lec-orb`) is the **primary active project** for the LEC Platform. Other variants (`-develop`, `-finance`) are considered historical references or experimental branches.

Digital platform for comprehensive management of multiple business portfolios, focusing on financial efficiency and operational control.

## 🏗️ Project Overview
The LEC Platform is a multi-tenant Next.js application designed to manage diverse business units (LEC, DISCOVER, URUS, etc.) through a unified interface. It features robust financial modules for tracking petty cash and managing budgets.

## 🛠️ Technology Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (PostgreSQL) — *No Prisma*
- **Styling**: Tailwind CSS 4 / Vanilla CSS (OKLCH Color Space)
- **Components**: Radix UI / Lucide Icons
- **Design System**: "Stitch" (Editorial Authority style)
- **Data Portability**: XLSX (Excel integration)
- **Testing**: Vitest (Unit/Integration) & Playwright (E2E)

## 📁 Core Modules
- **Caja Chica (Petty Cash)**: Real-time tracking of income and expenses per organization.
- **Presupuesto (Budgeting)**: Monthly target planning and comparative variance analysis.
- **Organization Management**: Multi-tenant isolation with RBAC.

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Supabase Project URL & Anon Key (configured in `.env.local`)

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

## 📚 Documentation Index
- [**Handoff Guide** (./HANDOFF.md)](./HANDOFF.md) - **Start here** for technical overview and RBAC.
- [Finance Modules Guide](./docs/FINANCE_MODULES.md) - Deep dive into Caja Chica & Presupuesto.
- [Project Roadmap](./docs/caja_chica_webapp_roadmap.md) - Implementation status and backlog.
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Entity relationship and RPC documentation.

---
© 2026 LEC Platform. All rights reserved.
