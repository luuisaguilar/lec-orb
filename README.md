# LEC Platform 🚀

Digital platform for comprehensive management of multiple business portfolios, focusing on financial efficiency and operational control.

## 🏗️ Project Overview
The LEC Platform is a multi-tenant Next.js application designed to manage diverse business units (LEC, DISCOVER, URUS, etc.) through a unified interface. It features robust financial modules for tracking petty cash and managing budgets.

## 🛠️ Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS / Vanilla CSS
- **Components**: Radix UI / Lucide Icons
- **Data Portability**: XLSX (Excel integration)
- **Testing**: Vitest (Unit/Integration) & Playwright (E2E)

## 📁 Core Modules
- **Caja Chica (Petty Cash)**: Real-time tracking of income and expenses per organization.
- **Presupuesto (Budgeting)**: Monthly target planning and comparative variance analysis.
- **Payments & Receipts**: Digital record-keeping with Supabase Storage integration.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Project URL & Anon Key (configured in `.env.local`)

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Testing
```bash
# Run unit and integration tests
npm run test

# Run E2E tests
npm run test:e2e
```

## 📚 Documentation
Detailed documentation is available in the [`/docs`](./docs) directory:
- [Finance Modules Guide](./docs/FINANCE_MODULES.md) - Deep dive into Caja Chica & Presupuesto.
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Entity relationship and RPC documentation.
- [Testing Guide](./docs/TESTING_GUIDE.md) - How to maintain and expand the test suite.

---
© 2026 LEC Platform. All rights reserved.
