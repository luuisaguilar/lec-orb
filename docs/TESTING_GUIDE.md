# Testing Guide

Stack: **Vitest** (unit/integration) + **Playwright** (E2E).

## Comandos

```bash
npm run test          # Vitest — todos los tests (vitest run)
npm run test:watch    # Modo watch interactivo
npm run test:e2e      # Playwright E2E (requiere servidor demo corriendo)
npm run lint          # ESLint
npm run build         # Build gate — debe pasar antes de cualquier PR
```

---

## Vitest

26 archivos de test · 143 tests · 21/21 módulos API cubiertos.

```
src/tests/
├── api/                  ← Route handler tests
│   ├── finance/
│   │   ├── petty-cash.test.ts
│   │   └── budget.test.ts
│   ├── applicators.test.ts
│   ├── audit-logs.test.ts
│   ├── cenni.test.ts
│   ├── dashboard-stats.test.ts
│   ├── documents.test.ts
│   ├── events.test.ts
│   ├── exam-codes.test.ts
│   ├── invitations.test.ts
│   ├── modules.test.ts
│   ├── notifications.test.ts
│   ├── packs.test.ts
│   ├── payments.test.ts
│   ├── payroll.test.ts
│   ├── purchase-orders.test.ts
│   ├── quotes.test.ts
│   ├── scan.test.ts
│   ├── schools.test.ts
│   ├── settings.test.ts
│   ├── suppliers.test.ts
│   ├── toefl-administrations.test.ts
│   ├── toefl-codes.test.ts
│   └── users.test.ts
└── lib/
    ├── finance/
    │   └── xlsx-utils.test.ts
    └── env/
        └── app-url.test.ts
```

### Patrones

Ver `docs/TESTING_PATTERNS.md` para los patrones completos de:
- Mock de Supabase (simple, multi-tabla, secuencial, Storage, RPC)
- Invocación de handlers con `withAuth` mockeado
- Construcción de `NextRequest` para GET / POST JSON / POST FormData / DELETE

---

## Playwright (E2E)

Los tests E2E corren contra el servidor local en **modo demo** (datos in-memory,
sin Supabase, sin credenciales reales).

```bash
# Terminal 1 — servidor demo
NEXT_PUBLIC_DEMO_MODE=true npm run dev

# Terminal 2 — correr E2E
npm run test:e2e
```

Cobertura actual: flujos de finanzas (Caja Chica, Presupuesto) e invitaciones.

Ver `docs/DEMO_MODE.md` para detalles del entorno demo.
Ver `playwright.config.ts` para configuración del runner.

---

## Criterio de done para cualquier cambio

```bash
npm run build && npm run test
```

Si alguno falla, el sprint no está terminado.
