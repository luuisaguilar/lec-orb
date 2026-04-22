# Testing Patterns — LEC Orb

Guía de referencia para escribir tests en este proyecto.
Stack: **Vitest** (unit/integration) + **Playwright** (E2E).

---

## Vitest — Estructura general

```
src/tests/
├── api/                  ← Tests de route handlers (21 módulos)
│   ├── finance/
│   │   ├── petty-cash.test.ts
│   │   └── budget.test.ts
│   ├── invitations.test.ts
│   ├── users.test.ts
│   └── ...               ← Un archivo por módulo API
├── lib/
│   ├── finance/
│   │   └── xlsx-utils.test.ts
│   └── env/
│       └── app-url.test.ts
└── setup.ts              ← Solo importa @testing-library/jest-dom
```

### Comandos

```bash
npm run test          # Correr todos los tests (vitest run)
npm run test:watch    # Modo watch interactivo
```

---

## Patrón estándar para tests de rutas API

### 1. Mocks obligatorios en cada archivo

```ts
// Bypassea el middleware de auth — el handler recibe { supabase, user, member } directamente
vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

// Silencia logAudit en rutas que lo usan
vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

// Para rutas que usan DEMO_MODE — siempre incluir los 4 exports
vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: false,
    DEMO_USER:   { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG:    { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));
```

### 2. Mock de Supabase — cadena encadenable simple

Para rutas que usan **una sola tabla** y encadenan `.from().select().eq()...`:

```ts
const createMockSupabase = () => {
    const mock: any = {
        from:   vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        is:     vi.fn().mockReturnThis(),
        in:     vi.fn().mockReturnThis(),
        or:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockReturnThis(),
        range:  vi.fn().mockReturnThis(),
        limit:  vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        ilike:  vi.fn().mockReturnThis(),
        // then resuelve la promesa con los valores actuales de _data/_error
        then: vi.fn((resolve) => resolve({ data: mock._data, error: mock._error, count: mock._count })),
        _data:  null,
        _error: null,
        _count: 0,
    };
    return mock;
};

// En el test:
mockSupabase._data = [{ id: "x1", name: "Test" }];
mockSupabase._count = 1;
```

### 3. Mock de Supabase — múltiples tablas (patrón de factory)

Para rutas que hacen `from("tabla_a")` y `from("tabla_b")`:

```ts
const makeChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then:   vi.fn((resolve: any) => resolve({ data, error })),
});

const mockSupabase = {
    from: vi.fn((table: string) => {
        if (table === "tabla_a") return makeChain(dataA);
        if (tabla === "tabla_b") return makeChain(dataB);
        return makeChain(null);
    }),
};
```

### 4. Mock de Supabase — llamadas secuenciales a la misma tabla

Cuando la misma tabla se consulta dos veces con distintos resultados:

```ts
let callCount = 0;
const mockSupabase = {
    from: vi.fn(() => callCount++ === 0 ? firstChain : secondChain),
};
```

### 5. Mock de Supabase Storage

Para rutas que suben o eliminan archivos:

```ts
const mockSupabase = {
    from: vi.fn(() => makeChain(docData)),
    storage: {
        from: vi.fn(() => ({
            upload: vi.fn().mockResolvedValue({ error: null }),
            remove: vi.fn().mockResolvedValue({ error: null }),
        })),
    },
};
```

### 6. Mock de Supabase RPC

Para rutas que usan `.rpc("nombre_funcion", params)`:

```ts
const mockSupabase = {
    from: vi.fn(() => makeChain(packData)),
    rpc:  vi.fn().mockResolvedValue({ data: rpcResult, error: null }),
};
```

---

## Invocación del handler en tests

`withAuth` es mockeado para que pase el handler directamente. La firma cambia:

```ts
// Handler real (en producción):
export const GET = withAuth(async (req, { supabase, user, member }) => { ... });

// En el test, se llama así:
const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
```

### Fixtures estándar de usuario/miembro

```ts
const mockUser   = { id: "u1" };
const mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
```

Para tests que verifican control de acceso, cambiar `role`:

```ts
const nonAdminMember = { ...mockMember, role: "operador" };
```

---

## Construcción de NextRequest en tests

```ts
import { NextRequest } from "next/server";

// GET simple
const req = new NextRequest("http://localhost/api/v1/ruta");

// GET con query params
const req = new NextRequest("http://localhost/api/v1/ruta?page=2&status=PAID");

// POST con JSON body
const req = new NextRequest("http://localhost/api/v1/ruta", {
    method: "POST",
    body: JSON.stringify({ campo: "valor" }),
});

// DELETE con param en URL
const req = new NextRequest("http://localhost/api/v1/ruta?id=uuid-123", {
    method: "DELETE",
});

// POST con FormData (documentos)
const formData = new FormData();
formData.append("file", new File(["content"], "doc.pdf", { type: "application/pdf" }));
formData.append("module_slug", "cenni");
const req = new NextRequest("http://localhost/api/v1/documents", {
    method: "POST",
    body: formData,
});
```

---

## Verificación de respuestas

```ts
const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
const body = await response.json();

// Status code
expect(response.status).toBe(200);
expect(response.status).toBe(201);
expect(response.status).toBe(400);
expect(response.status).toBe(403);
expect(response.status).toBe(404);
expect(response.status).toBe(409);

// Forma del body
expect(body.items).toHaveLength(2);
expect(body.items[0].name).toBe("Esperado");
expect(body.error).toBeDefined();
expect(body.error).toContain("texto parcial");

// Verificar que supabase recibió los datos correctos
expect(mockSupabase.insert).toHaveBeenCalledWith(
    expect.objectContaining({ org_id: "org-uuid-001", campo: "valor" })
);
expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
```

---

## Estructura recomendada de un archivo de test

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/v1/modulo/route";

// --- Mocks (al inicio del archivo, fuera de describe) ---
vi.mock("@/lib/auth/with-handler", () => ({ withAuth: (h: any) => h }));
vi.mock("@/lib/audit/log", () => ({ logAudit: vi.fn() }));

// --- Helper de mock Supabase ---
const createMockSupabase = () => { ... };

describe("Módulo API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();   // ← siempre limpiar mocks entre tests
        mockSupabase = createMockSupabase();
        mockMember   = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser     = { id: "u1" };
    });

    describe("GET /api/v1/modulo", () => {
        it("should return ...", async () => { ... });
        it("should return empty array when ...", async () => { ... });
    });

    describe("POST /api/v1/modulo", () => {
        it("should create ... and return 201", async () => { ... });
        it("should return 400 when ... is missing", async () => { ... });
    });
});
```

---

## Cobertura actual de tests

| Área | Archivos | Tests |
|------|----------|-------|
| API — Finance | 2 | 4 |
| API — Otros módulos | 19 | 117 |
| Lib — Finance utils | 1 | 2 |
| Lib — Env | 1 | 4 |
| **Total** | **26** | **143** |

Todos los 21 módulos API tienen cobertura. Ver `src/tests/api/` para los archivos
de cada módulo.

---

## Playwright (E2E)

Los tests E2E corren contra el servidor local en modo demo.

```bash
# Terminal 1 — servidor con DEMO_MODE activado
NEXT_PUBLIC_DEMO_MODE=true npm run dev

# Terminal 2 — correr E2E
npm run test:e2e
```

Ver `docs/DEMO_MODE.md` para detalles del entorno demo.
Ver `playwright.config.ts` para la configuración del runner.
