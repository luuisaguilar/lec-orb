# Demo Mode — Guía completa

Demo Mode es un entorno de desarrollo local completamente in-memory: sin Supabase,
sin autenticación real, con datos seed predeterminados. Es la base de los tests
Playwright E2E del proyecto.

---

## Activación

```bash
# .env.local
NEXT_PUBLIC_DEMO_MODE=true
```

Solo funciona en `NODE_ENV=development`. En producción la variable es ignorada.

```ts
// src/lib/demo/config.ts
export const DEMO_MODE =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";
```

---

## Identidades demo

```ts
// src/lib/demo/config.ts
DEMO_USER  = { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" }
DEMO_ORG   = { id: "demo-org-001",  name: "LEC Demo", slug: "lec-demo" }
DEMO_MEMBER = { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" }
```

---

## Datos seed (`src/lib/demo/data.ts`)

Todos los stores son **mutables en memoria** — los tests pueden escribir y leer
en la misma sesión del servidor. Se reinician al reiniciar el proceso.

| Store | Registros | IDs de referencia |
|-------|-----------|-------------------|
| `mockPacks` | 8 packs | `pack-001` … `pack-008` (codigos: SPK-0001 … SPK-0008) |
| `mockMovements` | 3 movimientos | `mov-001` … `mov-003` |
| `mockSchools` | 4 escuelas | `school-001` … `school-004` |
| `mockApplicators` | 5 aplicadores | `applicator-001` … `applicator-005` |
| `mockEvents` | 3 eventos | `event-001` … `event-003` |
| `mockEventExams` | 5 exámenes | `ee-001` … `ee-005` |
| `mockSlots` | 8 slots | `slot-001` … `slot-008` |
| `mockPayrollPeriods` | 2 periodos | `period-001` (paid), `period-002` (open) |
| `mockPayrollEntries` | 8 entradas | `pe-001` … `pe-008` |
| `mockCenniCases` | 12 casos | `cenni-001` … `cenni-012` |
| `mockOrgMembers` | 4 miembros | `member-001` … `member-004` |
| `mockOrgInvitations` | 3 invitaciones | `invitation-001` … `invitation-003` |
| `mockExamCatalog` | 6 exámenes | `exam-001` … `exam-006` |

### Helpers de mutación disponibles

```ts
addMockPack(pack)               // → MockPack
addMockMovement(mov)            // → MockMovement
addMockSchool(school)           // → MockSchool
addMockApplicator(app)          // → MockApplicator
addBulkMockApplicators(apps[])  // → MockApplicator[]
addMockEvent(event)             // → MockEvent
addMockOrgInvitation(inv)       // → MockOrgInvitation
updateMockOrgInvitationStatus(id, status)
deleteMockOrgMember(id)         // → boolean
addMockCenniCase(c)             // → MockCenniCase
updateMockCenniCase(id, updates)
addBulkMockCenni(cennis[])      // → MockCenniCase[]
```

---

## Rutas API que usan DEMO_MODE

Cuando `DEMO_MODE=true`, estas rutas **nunca llaman a Supabase** — devuelven
o mutan datos del store en memoria:

| Ruta | Métodos con branch demo |
|------|------------------------|
| `/api/v1/applicators` | GET, POST |
| `/api/v1/applicators/bulk` | POST |
| `/api/v1/packs` | GET, POST |
| `/api/v1/scan` | GET, POST |
| `/api/v1/schools` | GET, POST |
| `/api/v1/payroll` | GET |
| `/api/v1/settings` | GET, PUT |

> Las rutas no listadas (finance, cenni, events, users, invitations, etc.)
> **no tienen branch demo** — siempre usan Supabase real.

---

## Cómo mockear DEMO_MODE en Vitest

Para desactivarlo (modo real con Supabase mockeado):

```ts
vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: false,
    DEMO_USER:   { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG:    { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));
```

**Importante:** el mock debe incluir TODOS los exports (`DEMO_USER`, `DEMO_ORG`,
`DEMO_MEMBER`) porque `src/lib/demo/data.ts` los importa en el módulo. Omitir
alguno provoca `No "X" export is defined` en tiempo de test.

Para activarlo (testear el branch demo directamente):

```ts
vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: true,
    DEMO_USER:   { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG:    { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));
```

---

## Cómo usar DEMO_MODE en Playwright

Los tests E2E arrancan el servidor en modo demo para tener datos deterministas
sin depender de Supabase:

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev   # terminal 1
npm run test:e2e                          # terminal 2
```

El harness de Playwright intercepta llamadas al API y verifica respuestas
contra los stores in-memory. Ver `tests/e2e/` para ejemplos.
