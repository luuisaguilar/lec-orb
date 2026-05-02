# Testing Patterns - LEC Orb

Guia de referencia para escribir y mantener tests en este proyecto.

Stack: **Vitest** (unit/integration) + **Playwright** (E2E).

---

## Estado actual

Verificado el **2026-05-02**:

- `npm run build`: pass
- `npm test`: pass (`26` archivos, `164` tests)
- `npm run lint`: pass
- `npm run test:e2e`: pass (`10/10`)

---

## Estructura de tests

```text
src/tests/
|- api/      # 22 modulos API cubiertos
|- lib/      # utilidades
`- setup.ts
```

---

## Comandos

```bash
npm run test
npm run test:watch
npm run test:e2e
```

---

## Patrones Vitest

### 1. Mock minimo para handlers con `withAuth`

```ts
vi.mock("@/lib/auth/with-handler", () => ({
  withAuth: (handler: unknown) => handler,
}));
```

Si la ruta usa auditoria:

```ts
vi.mock("@/lib/audit/log", () => ({
  logAudit: vi.fn(),
}));
```

### 2. Mock de `@/lib/demo/config` cuando el modulo lo importa

Aunque `DEMO_MODE` ya no controla el runtime productivo, algunos modulos y tests todavia dependen de esos exports.

```ts
vi.mock("@/lib/demo/config", () => ({
  DEMO_MODE: false,
  DEMO_USER:   { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
  DEMO_ORG:    { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
  DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));
```

Importante: incluir los 4 exports.

### 3. Mock simple de Supabase encadenable

```ts
const createMockSupabase = () => {
  const mock: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
  };

  return {
    ...mock,
    then: vi.fn((resolve) =>
      resolve({ data: null, error: null, count: 0 })
    ),
  };
};
```

### 4. Invocacion del handler

```ts
const response = await (GET as any)(req, {
  supabase: mockSupabase,
  user: { id: "u1" },
  member: { id: "m1", org_id: "org-uuid-001", role: "admin" },
});
```

### 5. `NextRequest` examples

```ts
const getReq = new NextRequest("http://localhost/api/v1/ruta");

const postReq = new NextRequest("http://localhost/api/v1/ruta", {
  method: "POST",
  body: JSON.stringify({ campo: "valor" }),
});

const deleteReq = new NextRequest("http://localhost/api/v1/ruta?id=uuid-123", {
  method: "DELETE",
});
```

### 6. Assertions comunes

```ts
const body = await response.json();

expect(response.status).toBe(200);
expect(body.items).toHaveLength(2);
expect(mockSupabase.insert).toHaveBeenCalled();
```

---

## Cobertura actual

| Area | Archivos | Estado |
|------|----------|--------|
| API routes | 22 | cubiertos |
| Lib / utilidades | 4 | cubiertos |
| Total | 26 | `164` tests pasando |

---

## Playwright

### Runtime real actual

- `playwright.config.ts` arranca `npm run dev` automaticamente
- `tests/e2e/auth.setup.ts` siembra sesion autenticada para navegador
- `tests/e2e/support/demo-api.ts` intercepta llamadas API en navegador para fixtures deterministas
- `src/lib/supabase/proxy.ts` no hace bypass de auth por `DEMO_MODE`

### Implicacion

El harness E2E ya esta alineado con auth real.

Resultado verificado el `2026-05-02`:

- `10/10` tests pasan

### Siguiente correccion recomendada

- mantener actualizado `tests/e2e/support/demo-api.ts` cuando cambien contratos API
- agregar specs para modulos nuevos (ej. Viaticos)

No reintroducir el bypass implicito de auth en middleware productivo.
