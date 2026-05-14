# Project Context & Architecture: LEC Platform

Este documento define el estado, tecnologías y reglas arquitectónicas del proyecto **LEC Platform** para proporcionar contexto completo a otros agentes de IA y desarrolladores.

---

## 🚀 Identidad y Propósito
**LEC Platform** es una plataforma multi-tenant diseñada para la gestión integral de diversos portafolios de negocios (LEC, DISCOVER, URUS, etc.). El enfoque actual es la eficiencia financiera y el control operativo.

### Módulos Principales
- **Caja Chica (Petty Cash)**: Registro transaccional diario (Ingresos/Egresos) por organización.
- **Presupuesto (Budgeting)**: Establecimiento de metas mensuales y análisis de variaciones.
- **CRM**: Pipeline, contactos, oportunidades y actividades.
- **SGC (Calidad)**: No conformidades, auditorías, evaluaciones de riesgo.
- **Gestión de Organizaciones**: Infraestructura multi-empresa con RBAC granular.

### Portales
- **Portal Aplicadores** (`/portal`): Dashboard, turnos, nómina, métricas. Auth: `withApplicatorAuth()`.
- **Portal Escuelas** (🔜 planeado): Escuelas piden acceso. Alcance por definir.
- **Portal Ejecutivos** (🔜 planeado): Sin demanda actual.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Lenguaje** | TypeScript |
| **Base de Datos** | Supabase (PostgreSQL) con RLS |
| **Autenticación** | Supabase Auth + Custom `withAuth` HOC |
| **Estilos** | Tailwind CSS 4 + Vanilla CSS |
| **Componentes** | Radix UI / Lucide Icons / Shadcn/ui |
| **Validación** | Zod |
| **Testing** | Vitest (Unit/Int) & Playwright (E2E) |
| **Archivos** | `xlsx` (Excel integration) |

---

## 🏗️ Arquitectura y Reglas de Oro

### 1. Multi-tenancy por Diseño
- **Regla**: Todos los datos **DEBEN** estar vinculados a un `org_id`.
- **Implementación**: Las tablas tienen `org_id` y las políticas de RLS (Row Level Security) restringen el acceso basándose en la membresía de la organización (`auth.uid()`).
- **Consecuencia**: Todas las consultas API y funciones DB deben incluir el filtro por `org_id`.

### 2. Patrón de API (Server Side)
- **Localización**: `src/app/api/v1/...`
- **Autenticación**: Se usa el HOC `withAuth(handler, { module, action })`.
- **Contexto**: El handler recibe `supabase`, `user` y `member` (con datos de la organización y el rol).
- **Alias resolution**: `checkServerPermission()` resuelve `MODULE_ALIAS_MAP` automáticamente
  (ej. `"finanzas"` → `"payments"`, `"examenes"` → `"exam-codes"`).
- **Fail-closed**: Si no existe row en `member_module_access`, el acceso se niega (admin siempre pasa).
- **Ejemplo**: `src/app/api/v1/finance/petty-cash/route.ts`.

### 3. Lógica de Negocio y Dinero
- **Precisión**: Cálculos de saldos y dinero se realizan en la base de datos (PostgreSQL) mediante funciones RPC para asegurar consistencia atómica y evitar errores de precisión en el cliente.
- **Tipo**: Usar `NUMERIC(12,2)` para campos monetarios.
- **Función Clave**: `fn_petty_cash_balance(org_id, year)`.

### 4. Seguimiento y Auditoría
- **Audit Logs**: Cada mutación significativa (Insert/Update/Delete) debe registrarse usando la utilidad `logAudit(supabase, ...)`.
- **DB Triggers**: Existen triggers automáticos (`fn_audit_log`, `handle_updated_at`) para el mantenimiento de integridad y trazabilidad.

### 5. Estrategia de Testing
- **Integración**: Cada nueva ruta API debe tener una prueba de integración que valide los métodos `GET` y `POST` (ej. `src/tests/api/finance/...`).
- **Mocking**: Se utiliza un factory de mocks para Supabase en `src/tests/` para simular respuestas de la DB sin efectos secundarios reales.
- **E2E**: Flujos críticos de usuario (login, creación de flujo de caja) se verifican con Playwright.

---

## 📂 Directorios Clave

- `src/app`: Rutas del frontend (App Router) y Handlers de API.
- `src/components`: Componentes UI reutilizables (Radix/Shadcn).
- `src/lib/auth`: Lógica de permisos, roles y gestión de sesiones.
- `src/lib/finance`: Lógica específica de importación/exportación y utilidades financieras.
- `supabase/migrations`: Definición del esquema y políticas RLS.
- `docs/`: Documentación técnica detallada (Schema, Testing Guide).

---

## 📝 Reglas para Nuevos Módulos
Al desarrollar un nuevo módulo (ej. Inventario, Nómina):
1. **Esquema**: Definir tablas con `org_id` y habilitar RLS.
2. **Module Registry**: Registrar el módulo en `module_registry` (migración SQL) **antes** de usarlo como guard.
3. **API**: Usar `withAuth` con el slug del módulo. Si se usa un alias español, asegurar que esté en `MODULE_ALIAS_MAP`.
4. **Validación**: Definir esquemas Zod para todos los inputs de usuario.
5. **Logs**: Implementar `logAudit` en todas las acciones de escritura.
6. **Tests**: Crear el archivo de test correspondiente en `src/tests/` antes de completar la implementación.
7. **Documentación**: Actualizar `CLAUDE.md`, `HANDOFF.md` y `.codex-review/RBAC_MATRIX_2026-05-13.md`.
