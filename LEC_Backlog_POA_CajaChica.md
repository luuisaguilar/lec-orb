# Backlog — Módulo Financiero LEC Platform
**POA Presupuestal + Caja Chica**
Versión 1.0 | Proyecto: LEC Platform | Stack: Next.js 16 · TypeScript · Supabase · Shadcn/ui

---

## Índice

- [Contexto y objetivos](#contexto-y-objetivos)
- [Definición de Done (DoD)](#definición-de-done-dod)
- [Convenciones](#convenciones)
- [Sprint 0 — Fundación y Esquema](#sprint-0--fundación-y-esquema)
- [Sprint 1 — API Core](#sprint-1--api-core)
- [Sprint 2 — UI Caja Chica](#sprint-2--ui-caja-chica)
- [Sprint 3 — UI Presupuesto y Dashboard](#sprint-3--ui-presupuesto-y-dashboard)
- [Sprint 4 — Alertas, Roles y Hardening](#sprint-4--alertas-roles-y-hardening)
- [Resumen de Story Points](#resumen-de-story-points)
- [Mapa de dependencias](#mapa-de-dependencias)

---

## Contexto y objetivos

El módulo financiero digitaliza y automatiza el flujo actualmente gestionado en Excel (POA LEC 2026):

- **Caja Chica** (`petty_cash_*`): registro transaccional diario de egresos no fiscales, con vinculación directa a partidas presupuestales del POA.
- **Presupuesto** (`budget_*`): establecimiento de metas mensuales (Pto 25, Pto 26), comparativo contra lo real ejecutado, y consolidado de canales fiscal + no fiscal.
- **Seguimiento**: alertas automáticas, flujo de reposición con aprobación, y dashboard de ejecución presupuestal.

**Principios arquitectónicos aplicados (LEC Platform):**

| Regla | Aplicación |
|---|---|
| Multi-tenancy | `org_id` en todas las tablas; RLS por `auth.uid()` |
| Patrón API | `withAuth(handler, { module, action })` en todos los endpoints |
| Precisión monetaria | `NUMERIC(12,2)`; cálculos vía RPC en PostgreSQL |
| Auditoría | `logAudit(supabase, ...)` en toda mutación significativa |
| Testing | Test de integración por ruta; Playwright en flujos críticos |

---

## Definición de Done (DoD)

Una historia se considera **Done** cuando cumple todos los puntos aplicables:

- [ ] Migración SQL con `org_id` y políticas RLS creadas en `supabase/migrations/`
- [ ] Validación Zod definida para todos los inputs
- [ ] Endpoint usa `withAuth` con módulo y acción correctos
- [ ] `logAudit` implementado en todas las acciones de escritura
- [ ] Test de integración en `src/tests/api/finance/` (GET + POST como mínimo)
- [ ] Módulo registrado en `module_registry` si aplica
- [ ] UI responsive y compatible con modo oscuro
- [ ] PR aprobado sin errores de TypeScript

---

## Convenciones

### Etiquetas de tipo

| Etiqueta | Descripción |
|---|---|
| `[DB]` | Migración SQL, trigger, función RPC |
| `[API]` | Endpoint REST en `src/app/api/v1/` |
| `[UI]` | Componente o vista en Next.js |
| `[TEST]` | Prueba de integración (Vitest) o E2E (Playwright) |
| `[INFRA]` | Configuración de infra, n8n, seed de datos |
| `[RLS]` | Política de seguridad Row Level Security |

### Estimación (Story Points)

| Puntos | Esfuerzo aproximado |
|---|---|
| 2 pts | Tarea simple, < 2h |
| 3 pts | Tarea estándar, ~0.5d |
| 4 pts | Tarea compleja, ~1d |
| 5 pts | Tarea crítica, ~1.5d |
| 6 pts | Épica pequeña, ~2d |

---

## Sprint 0 — Fundación y Esquema

**Duración:** Semana 1
**Objetivo:** Base de datos sólida con RLS, funciones RPC, triggers y registro del módulo.
**Total:** 26 story points

> Este sprint es el más crítico del proyecto. Un esquema mal diseñado aquí se hereda en todo el desarrollo posterior. No avanzar a Sprint 1 hasta que todos los tests del Sprint 0 pasen.

---

### LEC-001 · Migración: tablas maestras de presupuesto `[DB]` `[RLS]`
**Story Points:** 5

**Historia de usuario:**
Como desarrollador, necesito las tablas base del módulo de presupuesto con `org_id` en todas ellas y políticas RLS, para que los datos estén aislados por organización.

**Tareas:**
- [ ] Crear `supabase/migrations/XXXX_create_budget_tables.sql`
- [ ] Tabla `budget_categories` (`id`, `org_id`, `name`, `description`)
- [ ] Tabla `budget_items` (`id`, `org_id`, `category_id`, `code`, `name`, `channel CHECK IN ('fiscal','non_fiscal','both')`)
- [ ] Tabla `budget_lines` (`id`, `org_id`, `item_id`, `fiscal_year`, `month`, `budgeted_amount NUMERIC(12,2)`, `actual_amount NUMERIC(12,2)`)
- [ ] Habilitar RLS en las tres tablas
- [ ] Políticas: `SELECT/INSERT/UPDATE/DELETE` filtradas por `org_id` via `auth.uid()`
- [ ] Vista `budget_consolidated`: agrupa `budget_lines` por `item_id`, `fiscal_year`, `month` sumando ambos canales
- [ ] Validar con `python scripts/validate_migration.py` (o herramienta equivalente del proyecto)

**Criterios de aceptación:**
- Un usuario de org A no puede leer registros de org B
- La vista `budget_consolidated` devuelve `pct_executed` calculado correctamente
- Migración aplica sin errores en entorno local y staging

---

### LEC-002 · Migración: tablas de caja chica `[DB]` `[RLS]`
**Story Points:** 5

**Historia de usuario:**
Como desarrollador, necesito las tablas de caja chica con FK a `budget_lines` y trigger de balance atómico, para garantizar consistencia del saldo sin lógica en el cliente.

**Tareas:**
- [ ] Tabla `petty_cash_funds` (`id`, `org_id`, `name`, `initial_amount NUMERIC(12,2)`, `current_balance NUMERIC(12,2)`, `custodian_id`, `fiscal_year`, `status DEFAULT 'open'`)
- [ ] Tabla `petty_cash_movements` (`id`, `fund_id`, `budget_line_id FK`, `movement_date`, `concept`, `amount_in NUMERIC(12,2)`, `amount_out NUMERIC(12,2)`, `balance_after NUMERIC(12,2)`, `receipt_url`, `registered_by`, `approved_by`, `status DEFAULT 'pending'`)
- [ ] Tabla `replenishment_requests` (`id`, `fund_id`, `requested_amount`, `justification`, `status`, `requested_by`, `approved_by`, `approved_at`)
- [ ] Habilitar RLS con políticas por `org_id`
- [ ] Índices en `movement_date`, `budget_line_id`, `fund_id`

**Criterios de aceptación:**
- FK entre `petty_cash_movements.budget_line_id` y `budget_lines.id` es funcional
- RLS impide acceso cross-org en las tres tablas
- Campos monetarios son `NUMERIC(12,2)` sin excepción

---

### LEC-003 · Función RPC y triggers de cálculo atómico `[DB]`
**Story Points:** 5

**Historia de usuario:**
Como sistema, necesito que el saldo de caja chica y el gasto real del presupuesto se actualicen automáticamente en la base de datos al registrar un movimiento, para evitar inconsistencias de cálculo en el cliente.

**Tareas:**
- [ ] Función `fn_petty_cash_balance(org_id UUID, year INT)`: calcula `current_balance` sumando entradas y restando salidas
- [ ] Trigger `trg_update_balance`: al `INSERT` en `petty_cash_movements`, recalcula `current_balance` en `petty_cash_funds`
- [ ] Trigger `trg_update_budget_actual`: al `INSERT` en `petty_cash_movements`, incrementa `actual_amount` en `budget_lines` usando `budget_line_id`
- [ ] Trigger `handle_updated_at`: aplica en todas las tablas que tengan columna `updated_at`
- [ ] Tests unitarios de los triggers con datos de prueba en migration script

**Criterios de aceptación:**
- Insertar un movimiento de $500 en caja chica actualiza `current_balance` y `actual_amount` sin llamadas adicionales desde el cliente
- Los triggers son transaccionales (si falla uno, se revierte todo)

---

### LEC-004 · Políticas RLS completas `[RLS]`
**Story Points:** 3

**Historia de usuario:**
Como administrador de seguridad, necesito políticas RLS granulares que restrinjan acceso por organización y por rol, para cumplir el principio de least privilege.

**Tareas:**
- [ ] Política `budget_items_select`: solo miembros de la org pueden leer
- [ ] Política `budget_lines_insert`: solo roles `finance_admin` y `finance_viewer` (según `member.role`)
- [ ] Política `petty_cash_movements_insert`: solo el custodio del fondo o `finance_admin`
- [ ] Política `replenishment_requests_update`: solo `finance_admin` puede aprobar
- [ ] Documentar todas las políticas en `docs/security/rls-policies.md`

**Criterios de aceptación:**
- Test de aislamiento: usuario sin membresía no puede hacer SELECT en ninguna tabla del módulo
- Custodio solo puede insertar movimientos en su propio fondo

---

### LEC-005 · Registro en module_registry y seed de catálogo `[INFRA]`
**Story Points:** 2

**Historia de usuario:**
Como developer, necesito registrar los módulos de presupuesto y caja chica en `module_registry` y seedear el catálogo de partidas del POA 2026, para que aparezcan en el sidebar y tengan datos iniciales.

**Tareas:**
- [ ] INSERT en `module_registry` para `budget` (ruta, ícono, permisos requeridos)
- [ ] INSERT en `module_registry` para `petty-cash`
- [ ] Seed de `budget_categories`: Finanzas, Compras, Servicios, Administración
- [ ] Seed de `budget_items` con las partidas del POA LEC 2026 (Nómina Semanal, Nómina Quincenal, Nómina Externos, Aguinaldo, Uniformes, Arreglos, Festejos, Luz, Artículos de limpieza, etc.)
- [ ] Script de seed en `supabase/seed.sql` con `ON CONFLICT DO NOTHING`

**Criterios de aceptación:**
- Los módulos aparecen en el menú lateral de la plataforma
- Las partidas están disponibles en el selector del formulario de movimientos

---

### LEC-006 · Tests: validar RLS y triggers `[TEST]`
**Story Points:** 3

**Historia de usuario:**
Como QA, necesito tests automatizados que verifiquen el aislamiento multi-tenant y la integridad de los triggers, para detectar regresiones de seguridad desde el inicio.

**Tareas:**
- [ ] Test: org A no puede leer `budget_lines` de org B
- [ ] Test: insertar movimiento actualiza `current_balance` correctamente
- [ ] Test: insertar movimiento actualiza `actual_amount` en `budget_lines`
- [ ] Test: custodio sin permiso no puede insertar en fondo ajeno
- [ ] Ubicar en `src/tests/db/finance-rls.test.ts`

**Criterios de aceptación:**
- 100% de los tests pasan en CI
- Cobertura incluye casos de borde: monto $0, fondo cerrado, org_id nulo

---

## Sprint 1 — API Core

**Duración:** Semana 2
**Objetivo:** Endpoints REST completos con `withAuth`, validación Zod y `logAudit`.
**Total:** 28 story points

> Todos los endpoints deben seguir el patrón establecido en `src/app/api/v1/finance/petty-cash/route.ts`. Usar el mock factory de Supabase para los tests de integración.

---

### LEC-007 · API: CRUD budget_items `[API]`
**Story Points:** 4

**Historia de usuario:**
Como finance_admin, necesito endpoints para gestionar el catálogo de partidas presupuestales, para poder agregar, modificar y consultar conceptos sin acceder directamente a la base de datos.

**Ruta:** `src/app/api/v1/finance/budget/items/route.ts`

**Tareas:**
- [ ] `GET /api/v1/finance/budget/items` — lista de partidas con filtro por `category` y `channel`
- [ ] `POST /api/v1/finance/budget/items` — crear nueva partida
- [ ] `PATCH /api/v1/finance/budget/items/[id]` — actualizar nombre/categoría
- [ ] `withAuth(handler, { module: 'budget', action: 'manage' })`
- [ ] Schema Zod: `BudgetItemSchema` con validación de `channel`
- [ ] `logAudit` en POST y PATCH con `{ action: 'create_budget_item' | 'update_budget_item' }`

**Criterios de aceptación:**
- `GET` retorna solo partidas de la org del usuario autenticado
- `POST` falla con 403 si el rol no es `finance_admin`
- Respuesta incluye `category_name` (join con `budget_categories`)

---

### LEC-008 · API: GET/POST budget_lines por período `[API]`
**Story Points:** 5

**Historia de usuario:**
Como finance_admin, necesito consultar y registrar líneas presupuestales por mes y año, para gestionar el POA digitalmente.

**Ruta:** `src/app/api/v1/finance/budget/lines/route.ts`

**Tareas:**
- [ ] `GET /api/v1/finance/budget/lines?year=2026&month=1&channel=non_fiscal` — con filtros opcionales
- [ ] `POST /api/v1/finance/budget/lines` — crear o actualizar (upsert) línea presupuestal
- [ ] Respuesta incluye: `budgeted_amount`, `actual_amount`, `variance`, `pct_executed`
- [ ] Schema Zod: `BudgetLineSchema` con validación de mes (1-12) y monto positivo
- [ ] `logAudit` en POST con valor anterior y nuevo
- [ ] `withAuth(handler, { module: 'budget', action: 'write' })`

**Criterios de aceptación:**
- Upsert funciona: si ya existe la línea para ese período, actualiza; si no, crea
- `actual_amount` refleja el valor calculado por el trigger (no se acepta en el body)
- `variance` = `budgeted_amount - actual_amount` calculado en la query

---

### LEC-009 · API: GET concentrado consolidado `[API]`
**Story Points:** 4

**Historia de usuario:**
Como director financiero, necesito un endpoint que consolide gastos fiscales y no fiscales por partida y período, equivalente a la hoja CONCENTRADO 2026 del Excel.

**Ruta:** `src/app/api/v1/finance/budget/consolidated/route.ts`

**Tareas:**
- [ ] `GET /api/v1/finance/budget/consolidated?year=2026&month=1`
- [ ] Consulta sobre vista `budget_consolidated`
- [ ] Retorna: por partida → `total_budgeted`, `total_actual`, `pct_executed`, desglose `fiscal` y `non_fiscal`
- [ ] Soporte para `month=all` → devuelve todos los meses del año en un array
- [ ] `withAuth(handler, { module: 'budget', action: 'read' })`

**Criterios de aceptación:**
- Suma de canal fiscal + no fiscal == total consolidado
- `month=all` retorna 12 objetos correctamente
- Tiempo de respuesta < 500ms en staging

---

### LEC-010 · API: CRUD petty_cash_funds y movements `[API]`
**Story Points:** 5

**Historia de usuario:**
Como custodio de caja chica, necesito endpoints para abrir un fondo y registrar movimientos vinculados a partidas presupuestales, para llevar el registro operativo diario.

**Ruta:** `src/app/api/v1/finance/petty-cash/route.ts` (ya existe — extender)

**Tareas:**
- [ ] `POST /api/v1/finance/petty-cash/funds` — apertura de fondo con monto inicial
- [ ] `GET /api/v1/finance/petty-cash/funds` — lista de fondos activos de la org
- [ ] `POST /api/v1/finance/petty-cash/movements` — registrar entrada o salida
  - Body: `{ fund_id, budget_line_id, movement_date, concept, amount_in, amount_out }`
  - `budget_line_id` es requerido
- [ ] `GET /api/v1/finance/petty-cash/movements?fund_id=&month=&year=` — historial con filtros
- [ ] Schema Zod: `PettyCashMovementSchema` — validar que `amount_in` y `amount_out` no sean ambos > 0
- [ ] `logAudit` en todos los POST
- [ ] `withAuth(handler, { module: 'petty-cash', action: 'write' })`

**Criterios de aceptación:**
- No se puede registrar un movimiento con `budget_line_id` de otra organización
- `balance_after` es calculado por trigger, no aceptado en el body del request
- Retornar `fund.current_balance` actualizado en la respuesta del POST

---

### LEC-011 · API: flujo de reposición `[API]`
**Story Points:** 4

**Historia de usuario:**
Como custodio, necesito solicitar reposición de caja chica y que un aprobador la autorice digitalmente, para reemplazar el proceso manual de comprobación.

**Ruta:** `src/app/api/v1/finance/petty-cash/replenishment/route.ts`

**Tareas:**
- [ ] `POST /api/v1/finance/petty-cash/replenishment` — crear solicitud (status: `pending`)
- [ ] `PATCH /api/v1/finance/petty-cash/replenishment/[id]` — aprobar o rechazar (solo `finance_admin`)
  - Al aprobar: incrementar `current_balance` del fondo en la cantidad aprobada
- [ ] `GET /api/v1/finance/petty-cash/replenishment?status=pending` — solicitudes pendientes
- [ ] `logAudit` en ambas operaciones (solicitud y aprobación)

**Criterios de aceptación:**
- Solo `finance_admin` puede hacer PATCH (verificado con `withAuth`)
- Al aprobar, el saldo del fondo aumenta atómicamente en la DB
- Email/notificación al aprobador al crear solicitud (preparar hook, implementar en Sprint 4)

---

### LEC-012 · Tests de integración: todos los endpoints `[TEST]`
**Story Points:** 3

**Historia de usuario:**
Como QA, necesito tests de integración para todos los endpoints del módulo financiero, usando el mock factory de Supabase del proyecto.

**Tareas:**
- [ ] `src/tests/api/finance/budget-items.test.ts` — GET y POST
- [ ] `src/tests/api/finance/budget-lines.test.ts` — GET con filtros y POST upsert
- [ ] `src/tests/api/finance/budget-consolidated.test.ts` — GET con `month=all`
- [ ] `src/tests/api/finance/petty-cash-movements.test.ts` — POST con y sin `budget_line_id`
- [ ] `src/tests/api/finance/petty-cash-replenishment.test.ts` — solicitud + aprobación
- [ ] Test de autorización: verificar 403 cuando el rol no tiene permisos

**Criterios de aceptación:**
- Todos los métodos GET y POST cubiertos
- Tests usan mock factory de Supabase, sin efectos en DB real
- CI pasa en < 60 segundos

---

### LEC-013 · Zod schemas compartidos `[API]`
**Story Points:** 3

**Historia de usuario:**
Como developer, necesito schemas Zod centralizados para los módulos de presupuesto y caja chica, para reutilizarlos entre la API y el frontend.

**Tareas:**
- [ ] `src/lib/finance/schemas/budget.schema.ts` — `BudgetItemSchema`, `BudgetLineSchema`, `BudgetLineFilterSchema`
- [ ] `src/lib/finance/schemas/petty-cash.schema.ts` — `PettyCashFundSchema`, `PettyCashMovementSchema`, `ReplenishmentSchema`
- [ ] Exportar tipos TypeScript inferidos: `BudgetItem`, `BudgetLine`, `PettyCashMovement`
- [ ] Documentar campos opcionales vs requeridos con `.describe()`

**Criterios de aceptación:**
- Los schemas son importados desde la API y desde los formularios de frontend sin duplicación
- TypeScript no emite errores en ninguno de los dos contextos de uso

---

## Sprint 2 — UI Caja Chica

**Duración:** Semana 3
**Objetivo:** Módulo operativo completo en Next.js + shadcn/ui para uso diario.
**Total:** 30 story points

---

### LEC-014 · Layout y rutas del módulo petty-cash `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como developer, necesito la estructura de rutas y el layout del módulo de caja chica en Next.js App Router, para que la navegación sea coherente con el resto de la plataforma.

**Tareas:**
- [ ] Crear `src/app/[org]/finance/petty-cash/layout.tsx` con sidebar y tabs
- [ ] Ruta `(overview)/page.tsx` — resumen del fondo activo
- [ ] Ruta `movements/page.tsx` — historial de movimientos
- [ ] Ruta `replenishment/page.tsx` — solicitudes de reposición
- [ ] Breadcrumb consistente con la navegación global de LEC Platform
- [ ] Protección de ruta con `withAuth` verificando módulo `petty-cash`

**Criterios de aceptación:**
- Navegación entre tabs no hace full page reload
- Ruta es inaccesible para usuarios sin permiso del módulo

---

### LEC-015 · Componente: tarjetas resumen del fondo `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como custodio de caja chica, necesito ver el saldo actual, los egresos del mes y el porcentaje del presupuesto ejecutado en tarjetas de resumen, para tener visibilidad del estado de mi fondo de un vistazo.

**Tareas:**
- [ ] Componente `PettyCashSummaryCards` en `src/components/finance/petty-cash/`
- [ ] Card 1: Saldo actual (verde si > 20% del fondo inicial, amarillo si < 20%, rojo si < 10%)
- [ ] Card 2: Total egresado en el mes corriente
- [ ] Card 3: % ejecutado vs presupuesto de la partida más consumida
- [ ] Card 4: Solicitudes de reposición pendientes (badge con número)
- [ ] Actualización optimista al registrar nuevo movimiento
- [ ] Skeleton loading mientras se carga la data

**Criterios de aceptación:**
- Los colores semáforo son correctos según los umbrales definidos
- Cards se actualizan sin reload completo al agregar un movimiento

---

### LEC-016 · Componente: tabla de movimientos `[UI]`
**Story Points:** 5

**Historia de usuario:**
Como custodio, necesito una tabla de movimientos con filtros y paginación para consultar el historial de egresos e ingresos de mi caja chica.

**Tareas:**
- [ ] Componente `PettyCashMovementsTable` usando `shadcn/ui` DataTable
- [ ] Columnas: Fecha · Concepto · Partida · Entrada · Salida · Saldo · Estado · Comprobante
- [ ] Filtros: por mes/año, por partida presupuestal, por tipo (entrada/salida)
- [ ] Ordenamiento por fecha (default: más reciente primero)
- [ ] Paginación client-side (25 por página)
- [ ] Badge de estado: `pending` (amarillo) · `approved` (verde) · `rejected` (rojo)
- [ ] Ícono de paperclip si tiene `receipt_url` (link al comprobante)

**Criterios de aceptación:**
- Tabla es usable en pantalla de 375px (mobile)
- Filtros se combinan correctamente (AND entre ellos)
- Click en comprobante abre URL en nueva pestaña

---

### LEC-017 · Formulario: registro de movimiento `[UI]`
**Story Points:** 5

**Historia de usuario:**
Como custodio, necesito un formulario rápido para registrar un egreso o ingreso de caja chica, vinculándolo obligatoriamente a una partida presupuestal del POA.

**Tareas:**
- [ ] Componente `PettyCashMovementForm` (Sheet/Drawer lateral en móvil, Dialog en desktop)
- [ ] Campos:
  - Fecha (date picker, default hoy)
  - Tipo: Egreso / Ingreso (toggle)
  - Concepto (textarea, max 200 chars)
  - Partida presupuestal (Select desde `budget_items`, requerido)
  - Monto (input numérico con validación > 0)
  - Comprobante (upload, ver LEC-022)
- [ ] Validación con `react-hook-form` + Zod (`PettyCashMovementSchema`)
- [ ] Al confirmar: POST a `/api/v1/finance/petty-cash/movements`
- [ ] Toast de éxito con saldo actualizado; toast de error con mensaje específico
- [ ] Reset del formulario al cerrar

**Criterios de aceptación:**
- No se puede enviar sin `budget_line_id`
- Si el monto excede el saldo disponible, mostrar advertencia (no bloquear)
- El select de partida muestra código y nombre (ej. "FIN-NOM-SEM · Nómina Semanal")

---

### LEC-018 · UI: flujo de reposición `[UI]`
**Story Points:** 5

**Historia de usuario:**
Como custodio, necesito solicitar reposición de fondo desde la UI; como aprobador, necesito ver las solicitudes pendientes y aprobarlas o rechazarlas con un click.

**Tareas:**
- [ ] Vista `replenishment/page.tsx` con dos secciones: "Mis solicitudes" y "Pendientes de aprobación"
- [ ] Formulario de solicitud: monto, justificación (textarea), adjunto opcional
- [ ] Lista de solicitudes propias con estado y fecha
- [ ] Lista de pendientes (visible solo para `finance_admin`): tabla con botones Aprobar / Rechazar
- [ ] Modal de confirmación antes de aprobar con monto y justificación visibles
- [ ] Al aprobar: actualizar la vista de saldo del fondo sin reload

**Criterios de aceptación:**
- Custodio solo ve sus propias solicitudes en "Mis solicitudes"
- `finance_admin` ve todas las solicitudes pendientes de su org
- Estado se actualiza en tiempo real (o con refetch tras acción)

---

### LEC-019 · Componente: upload de comprobante `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como custodio, necesito adjuntar el comprobante de cada gasto (foto o PDF) directamente desde el formulario, para digitalizar el archivo físico de caja chica.

**Tareas:**
- [ ] Componente `ReceiptUploader` en `src/components/finance/`
- [ ] Acepta: JPG, PNG, PDF (máx 5MB)
- [ ] Preview inline: imagen en miniatura o ícono PDF
- [ ] Sube a Supabase Storage en bucket `receipts/{org_id}/{year}/{month}/`
- [ ] Guarda `receipt_url` en el movimiento
- [ ] Botón de eliminar con confirmación
- [ ] Manejo de error si el upload falla (retry automático x1)

**Criterios de aceptación:**
- Upload funciona en móvil (camera roll access)
- URL almacenada es accesible con autenticación (Storage RLS)
- Archivos > 5MB muestran error descriptivo antes del upload

---

### LEC-020 · Exportación: movimientos a Excel `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como administrador, necesito exportar el historial de movimientos de caja chica a Excel, respetando los filtros activos, para reportes externos o auditorías.

**Tareas:**
- [ ] Botón "Exportar Excel" en la toolbar de `PettyCashMovementsTable`
- [ ] Usar librería `xlsx` desde `src/lib/finance/export.ts`
- [ ] Exporta solo los registros actualmente filtrados (no toda la historia)
- [ ] Columnas: Fecha · Concepto · Categoría · Partida · Entrada · Salida · Saldo · Registrado por
- [ ] Nombre de archivo: `CajaChica_{org_name}_{mes}_{año}.xlsx`
- [ ] Loading state en el botón durante la generación

**Criterios de aceptación:**
- Archivo abre correctamente en Excel y Google Sheets
- Los montos tienen formato de número, no texto
- Si no hay movimientos con los filtros actuales, mostrar mensaje en lugar de exportar vacío

---

### LEC-021 · Tests E2E: flujo caja chica `[TEST]`
**Story Points:** 3

**Historia de usuario:**
Como QA, necesito tests E2E que simulen el flujo completo de un custodio registrando movimientos y solicitando reposición, para detectar regresiones en el módulo más crítico.

**Tareas:**
- [ ] `src/tests/e2e/petty-cash.spec.ts` con Playwright
- [ ] Escenario 1: Login → seleccionar org → abrir caja chica → registrar egreso → verificar saldo actualizado
- [ ] Escenario 2: Registrar egreso → verificar que partida presupuestal es requerida
- [ ] Escenario 3: Custodio solicita reposición → admin aprueba → saldo aumenta
- [ ] Escenario 4: Exportar movimientos → verificar descarga de archivo .xlsx

**Criterios de aceptación:**
- Los 4 escenarios pasan en Chrome y Firefox
- Tests limpian datos creados al finalizar (teardown)
- Tiempo de ejecución < 3 minutos en CI

---

## Sprint 3 — UI Presupuesto y Dashboard

**Duración:** Semana 4
**Objetivo:** Vista POA completa, dashboard de seguimiento y herramientas de análisis.
**Total:** 32 story points

---

### LEC-022 · Layout y rutas del módulo budget `[UI]`
**Story Points:** 2

**Historia de usuario:**
Como developer, necesito la estructura de rutas del módulo de presupuesto con tabs para POA, Concentrado, Comparativo y Dashboard.

**Tareas:**
- [ ] `src/app/[org]/finance/budget/layout.tsx` con tabs de navegación
- [ ] Rutas: `poa/`, `consolidated/`, `year-over-year/`, `dashboard/`
- [ ] Selector de año fiscal (2025 / 2026) persistido en URL params
- [ ] Protección de ruta con módulo `budget`

**Criterios de aceptación:**
- Año fiscal seleccionado persiste al navegar entre tabs
- Ruta es inaccesible para usuarios sin permiso del módulo budget

---

### LEC-023 · Vista: tabla POA mensual `[UI]`
**Story Points:** 6

**Historia de usuario:**
Como finance_admin, necesito una tabla interactiva que muestre el presupuesto vs lo real por partida y mes, equivalente al Excel CAJA CHICA 2026 y CUENTA BAC 2026, para gestionar el POA digitalmente.

**Tareas:**
- [ ] Componente `BudgetPOATable`
- [ ] Estructura: filas = partidas agrupadas por categoría; columnas = Ene–Dic + Total + Promedio
- [ ] Para cada mes: celda con Pto (editable inline) · Real (read-only) · % Ejecución
- [ ] Color semáforo en % Ejecución: verde < 80%, amarillo 80–95%, rojo > 95%
- [ ] Edición inline de `budgeted_amount`: click → input → blur guarda → PATCH a API
- [ ] Toggle de canal: BAC (fiscal) / Caja Chica (no fiscal) / Consolidado
- [ ] Totales al pie por columna
- [ ] Sticky header con los meses al hacer scroll horizontal

**Criterios de aceptación:**
- Edición inline guarda correctamente con `logAudit`
- Toggle de canal refresca la data sin reload completo
- Tabla es usable en pantalla de 1280px sin scroll horizontal para 12 meses

---

### LEC-024 · Dashboard: resumen de ejecución presupuestal `[UI]`
**Story Points:** 5

**Historia de usuario:**
Como director financiero, necesito un dashboard con tarjetas por categoría y métricas de ejecución, para tener visibilidad ejecutiva del estado del presupuesto anual.

**Tareas:**
- [ ] Página `dashboard/page.tsx`
- [ ] 4 cards de métricas: Total Presupuestado · Total Ejecutado · % Global · Mes en Curso
- [ ] Grid de categorías: una card por categoría con barra de progreso y monto restante
- [ ] Alerta visual si alguna categoría supera el 90% de ejecución
- [ ] Indicador de partidas sin presupuesto asignado para el mes corriente
- [ ] Data se actualiza al cambiar selector de año

**Criterios de aceptación:**
- Dashboard carga en < 2s (datos agregados desde vista `budget_consolidated`)
- Categorías con > 90% de ejecución tienen fondo rojo pálido en su card
- Porcentajes usan máximo 1 decimal

---

### LEC-025 · Gráfica: ejecución acumulada mensual `[UI]`
**Story Points:** 4

**Historia de usuario:**
Como finance_admin, necesito una gráfica de líneas que muestre el presupuesto acumulado vs lo real ejecutado mes a mes durante el año, para identificar tendencias y desviaciones.

**Tareas:**
- [ ] Componente `BudgetExecutionChart` usando Recharts o Chart.js
- [ ] Línea 1: Presupuesto acumulado (ene → dic)
- [ ] Línea 2: Real ejecutado acumulado
- [ ] Eje Y: monto en pesos mexicanos con formato `$xxx,xxx`
- [ ] Tooltips con valor absoluto de cada línea y varianza al hover
- [ ] Punto actual del año resaltado en la línea real
- [ ] Responsive: se adapta al ancho del contenedor

**Criterios de aceptación:**
- Gráfica es legible en pantalla de 768px
- Tooltips muestran información en español
- Manejo correcto de meses futuros (línea real termina en el mes actual)

---

### LEC-026 · Vista: concentrado fiscal + no fiscal `[UI]`
**Story Points:** 4

**Historia de usuario:**
Como director financiero, necesito ver el concentrado consolidado de gastos (BAC + Caja Chica) por partida, equivalente a la hoja CONCENTRADO 2026 del Excel.

**Tareas:**
- [ ] Página `consolidated/page.tsx`
- [ ] Tabla con columnas: Concepto · BAC Pto · BAC Real · Caja Pto · Caja Real · Total Pto · Total Real · Varianza
- [ ] Filtro de mes (individual o "Año completo")
- [ ] Agrupación colapsable por categoría
- [ ] Fila de totales al pie

**Criterios de aceptación:**
- Total consolidado == suma de BAC + Caja Chica para cada partida
- Agrupación colapsable funciona con animación smooth
- Vista "Año completo" carga todos los meses en una sola query

---

### LEC-027 · Vista: comparativo interanual (YoY) `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como finance_admin, necesito una vista que compare lo real ejecutado en 2025 vs el presupuesto 2026 vs lo real 2026, para identificar tendencias y ajustar el plan.

**Tareas:**
- [ ] Página `year-over-year/page.tsx`
- [ ] Tabla: Concepto · Real 2025 · Pto 2026 · Real 2026 · Delta vs 2025 (%) · Delta vs Pto (%)
- [ ] Filtro por categoría
- [ ] Delta positivo en verde, negativo en rojo
- [ ] Exportación de esta vista a Excel

**Criterios de aceptación:**
- Delta se calcula correctamente: `(Real 2026 - Real 2025) / Real 2025 * 100`
- Partidas sin dato en 2025 muestran "N/A" en las columnas de comparativo

---

### LEC-028 · Importación: POA desde Excel `[UI]` `[API]`
**Story Points:** 5

**Historia de usuario:**
Como finance_admin, necesito importar el presupuesto anual desde el archivo Excel del POA LEC 2026, para migrar los datos históricos sin ingreso manual uno a uno.

**Tareas:**
- [ ] Componente `BudgetImportWizard` con 3 pasos: Upload → Preview → Confirmar
- [ ] Parseo de .xlsx con librería `xlsx` en `src/lib/finance/import.ts`
- [ ] Mapeo de columnas del Excel a campos de `budget_lines`
- [ ] Preview: tabla con los registros parseados y posibles errores de mapeo
- [ ] `POST /api/v1/finance/budget/import` — inserción masiva con transacción
- [ ] `logAudit` de la importación con número de registros creados/actualizados
- [ ] Reporte post-importación: X creados, Y actualizados, Z errores

**Criterios de aceptación:**
- Importación de 200 líneas en < 5 segundos
- Si cualquier fila falla, la transacción se revierte completa (o se importa con reporte de errores por fila)
- Se puede re-importar el mismo archivo (upsert, no duplica)

---

### LEC-029 · Tests E2E: flujo presupuesto + concentrado `[TEST]`
**Story Points:** 3

**Historia de usuario:**
Como QA, necesito tests E2E que verifiquen el flujo de ingreso de presupuesto y su reflejo en el dashboard y concentrado.

**Tareas:**
- [ ] `src/tests/e2e/budget.spec.ts` con Playwright
- [ ] Escenario 1: Ingresar presupuesto mensual → verificar en tabla POA
- [ ] Escenario 2: Registrar movimiento de caja chica → verificar % ejecución actualizado en dashboard
- [ ] Escenario 3: Importar archivo Excel pequeño (3 partidas) → verificar preview y confirmación
- [ ] Escenario 4: Exportar reporte POA a Excel → verificar descarga

**Criterios de aceptación:**
- 4 escenarios pasan en CI
- Escenario 2 verifica la cadena completa: movimiento → trigger DB → API → UI

---

## Sprint 4 — Alertas, Roles y Hardening

**Duración:** Semana 5
**Objetivo:** Automatizaciones n8n, permisos granulares, experiencia de usuario pulida y seguridad.
**Total:** 24 story points

---

### LEC-030 · n8n: alerta Telegram al 80% de ejecución `[INFRA]`
**Story Points:** 4

**Historia de usuario:**
Como finance_admin, necesito recibir una alerta automática por Telegram cuando cualquier partida presupuestal supere el 80% de ejecución, para actuar antes de agotar el presupuesto.

**Tareas:**
- [ ] Webhook Supabase Database → n8n (trigger en `budget_lines` al actualizar `actual_amount`)
- [ ] Nodo n8n: evaluar `actual_amount / budgeted_amount >= 0.80`
- [ ] Nodo n8n: obtener nombre de partida y datos de la org
- [ ] Nodo Telegram: enviar mensaje con formato:
  ```
  ⚠️ Alerta Presupuestal — [ORG_NAME]
  Partida: [NOMBRE]
  Ejecutado: $[ACTUAL] / $[PTO] ([PCT]%)
  Restante: $[RESTANTE]
  ```
- [ ] Anti-spam: no enviar si ya se notificó en las últimas 24h para la misma partida
- [ ] Documentar el workflow en `docs/automation/budget-alerts.md`

**Criterios de aceptación:**
- Alerta llega en < 60 segundos tras superar el umbral
- No se duplican alertas si el monto sube de 80% a 85% en el mismo día
- El mensaje identifica claramente la org, partida y montos

---

### LEC-031 · n8n: alerta de reposición pendiente `[INFRA]`
**Story Points:** 3

**Historia de usuario:**
Como finance_admin, necesito recibir una notificación por Telegram cuando un custodio crea una solicitud de reposición, para aprobarla a tiempo sin depender de comunicación manual.

**Tareas:**
- [ ] Trigger: INSERT en `replenishment_requests` con `status = 'pending'`
- [ ] Nodo n8n: buscar `finance_admin` de la org y su `telegram_chat_id`
- [ ] Mensaje Telegram:
  ```
  🔄 Reposición Pendiente — [ORG_NAME]
  Solicitado por: [NOMBRE]
  Monto: $[MONTO]
  Justificación: [TEXTO]
  Aprobar: [LINK_DEEPLINK]
  ```
- [ ] Guardar `telegram_chat_id` en perfil de usuario (agregar campo si no existe)

**Criterios de aceptación:**
- Notificación llega al aprobador en < 2 minutos
- Link en el mensaje lleva directo a la solicitud pendiente en la plataforma

---

### LEC-032 · Permisos granulares: roles del módulo `[RLS]`
**Story Points:** 4

**Historia de usuario:**
Como admin de la plataforma, necesito roles específicos para el módulo financiero con permisos diferenciados, para aplicar el principio de menor privilegio.

**Tareas:**
- [ ] Definir roles en `src/lib/auth/permissions.ts`:
  - `finance_admin`: acceso completo al módulo (presupuesto + caja chica)
  - `finance_viewer`: solo lectura en presupuesto y concentrado
  - `petty_cash_custodian`: registrar movimientos en su fondo asignado
- [ ] Actualizar `withAuth` para validar estos roles específicos
- [ ] Actualizar políticas RLS para reflejar los roles
- [ ] UI: ocultar controles de edición para `finance_viewer`
- [ ] Documentar en `docs/security/roles.md`

**Criterios de aceptación:**
- `finance_viewer` no puede registrar ningún movimiento (403 en API + botones ocultos en UI)
- `petty_cash_custodian` no puede ver el módulo de presupuesto (ruta protegida)
- Cambio de rol de un usuario es efectivo en la siguiente request (sin cache de sesión)

---

### LEC-033 · UI: vista de audit log financiero `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como finance_admin, necesito una vista del audit log del módulo financiero con filtros, para rastrear quién hizo qué cambio y cuándo.

**Tareas:**
- [ ] Página `src/app/[org]/finance/audit/page.tsx` (solo visible para `finance_admin`)
- [ ] Tabla: Timestamp · Usuario · Acción · Módulo · Valor anterior · Valor nuevo
- [ ] Filtros: por usuario, por acción, por rango de fechas, por módulo (budget/petty-cash)
- [ ] Acciones con badge de color: CREATE (verde) · UPDATE (amarillo) · DELETE (rojo) · APPROVE (azul)
- [ ] Paginación de 50 registros por página

**Criterios de aceptación:**
- Solo `finance_admin` puede acceder a la ruta (redirigir si no tiene permiso)
- Los valores "anterior" y "nuevo" son legibles (no JSON crudo)
- Filtros combinados funcionan correctamente

---

### LEC-034 · UX: estados de carga, error y validación `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como usuario final, necesito feedback visual claro al realizar operaciones (carga, éxito, error), para entender el estado de mis acciones sin incertidumbre.

**Tareas:**
- [ ] Skeleton loaders en tablas (POA, movimientos, concentrado) y cards del dashboard
- [ ] Toast de éxito con ícono y mensaje descriptivo tras cada operación de escritura
- [ ] Toast de error con mensaje del servidor (no solo "algo salió mal")
- [ ] Loading state en todos los botones de acción (spinner + texto "Guardando...")
- [ ] Mensajes de validación Zod inline en todos los formularios (campo por campo)
- [ ] Estado vacío: mensajes y call-to-action cuando no hay datos (primer uso)

**Criterios de aceptación:**
- No existe ningún botón sin loading state en operaciones asíncronas
- Los errores de API muestran el mensaje específico del servidor cuando está disponible
- Los estados vacíos tienen un mensaje útil y un botón de acción

---

### LEC-035 · Responsive mobile: caja chica en campo `[UI]`
**Story Points:** 3

**Historia de usuario:**
Como custodio de caja chica, necesito poder registrar un movimiento desde mi teléfono mientras estoy fuera de la oficina, para no tener que esperar a estar en el escritorio.

**Tareas:**
- [ ] Optimizar `PettyCashMovementForm` para pantallas de 375px
- [ ] Formulario accesible como Drawer (bottom sheet) en móvil
- [ ] Reemplazar tabla por lista de cards en `movements/page.tsx` en < 768px
- [ ] Touch targets de mínimo 44px en todos los controles
- [ ] `ReceiptUploader` con acceso a cámara en móvil (capture="environment")
- [ ] Testing en iPhone SE (375px) y Pixel 5 (393px)

**Criterios de aceptación:**
- Registro de movimiento completo posible en móvil sin zoom ni scroll horizontal
- Upload de comprobante con cámara funcional en iOS y Android
- Bottom sheet del formulario no se superpone con el teclado virtual

---

### LEC-036 · Hardening: seguridad y revisión final `[RLS]` `[TEST]`
**Story Points:** 4

**Historia de usuario:**
Como tech lead, necesito una revisión de seguridad completa del módulo financiero antes de ir a producción, para asegurar que no hay fugas de datos ni vulnerabilidades.

**Tareas:**
- [ ] Audit: verificar que el 100% de los endpoints usan `withAuth`
- [ ] Audit: verificar que el 100% de las tablas tienen RLS habilitado
- [ ] Audit: verificar que el 100% de las mutaciones tienen `logAudit`
- [ ] Audit: verificar que ningún endpoint acepta `org_id` como parámetro del body (debe venir del contexto de `member`)
- [ ] Rate limiting en rutas de escritura (máx 30 req/min por usuario)
- [ ] Sanitización de inputs: verificar que no hay inyección SQL posible en filtros
- [ ] Documentar resultados en `docs/security/audit-report-sprint4.md`

**Criterios de aceptación:**
- 0 endpoints sin `withAuth`
- 0 tablas del módulo sin RLS
- Reporte de auditoría generado y aprobado por tech lead
- Rate limiting verificado con test de carga básico

---

## Resumen de Story Points

| Sprint | Descripción | Historias | Points |
|---|---|---|---|
| Sprint 0 | Fundación y Esquema | 6 | 26 pts |
| Sprint 1 | API Core | 7 | 28 pts |
| Sprint 2 | UI Caja Chica | 8 | 30 pts |
| Sprint 3 | UI Presupuesto y Dashboard | 8 | 32 pts |
| Sprint 4 | Alertas, Roles y Hardening | 7 | 24 pts |
| **Total** | | **36 historias** | **140 pts** |

**Duración estimada:** 5 semanas con un desarrollador full-stack dedicado (1 sp ≈ 0.5 día).
Con dos desarrolladores trabajando en paralelo (backend/frontend desde Sprint 1), el timeline puede reducirse a 3–3.5 semanas.

---

## Mapa de dependencias

```
LEC-001 (tablas budget)
LEC-002 (tablas petty cash)  ──┐
LEC-003 (RPC + triggers)     ──┤──> LEC-007..011 (API) ──> LEC-014..021 (UI Caja Chica)
LEC-004 (RLS)                ──┤                       ──> LEC-022..028 (UI Presupuesto)
LEC-005 (registry + seed)    ──┘                       ──> LEC-030..031 (n8n alertas)
LEC-006 (tests DB)

LEC-013 (Zod schemas) ──> LEC-007..011 (API) y LEC-017, LEC-019 (UI forms)

LEC-032 (roles/permisos) ──> LEC-033 (audit log) + actualiza LEC-004 (RLS)

LEC-036 (hardening) ──> depende de todos los sprints anteriores completados
```

**Regla:** No avanzar al Sprint N+1 hasta que los tests del Sprint N pasen en CI.

---

*Documento generado para LEC Platform — Módulo Financiero POA + Caja Chica*
*Actualizado: 2026-03-26*
