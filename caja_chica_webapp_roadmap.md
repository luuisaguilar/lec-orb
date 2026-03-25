# Caja Chica WebApp Roadmap

> Conversión a Markdown del archivo HTML interactivo.

> Nota: se preserva la estructura funcional del contenido, pero no la interactividad de pestañas, filtros y expandibles.

## Índice

- [Roadmap](#roadmap)
- [Backlog](#backlog)
- [Stack técnico](#stack-tecnico)
- [Modelo de datos](#modelo-de-datos)

## Roadmap

### Fase 1 — Fundación y registro de gastos
**Periodo:** Semanas 1–3

- Auth básico (Next-Auth)
- BD con empresas LEC / DISCOVER / URUS
- Formulario de registro de gasto
- Selector de empresa
- Tabla de movimientos unificada
- Cálculo de saldo en tiempo real
- Categorías con lista predefinida
- CRUD básico de movimientos

### Fase 2 — Dashboard consolidado y filtros
**Periodo:** Semanas 4–6

- Vista unificada todas las empresas
- KPIs: saldo, entradas, salidas
- Filtro por empresa / fecha / categoría
- Gráfica gastos por categoría
- Tabla consolidada con % del total
- Resumen por empresa
- Búsqueda de concepto
- Paginación de movimientos

### Fase 3 — Presupuesto y comparativa
**Periodo:** Semanas 7–9

- Módulo de presupuesto mensual
- Presupuesto por empresa y categoría
- Variación presupuesto vs real
- Indicadores de ahorro / exceso
- Selector de mes y año
- Alertas por categoría excedida
- Exportar a Excel

### Fase 4 — Refinamiento y experiencia
**Periodo:** Semanas 10–12

- Roles: admin / visor
- Subida de comprobante (imagen/PDF)
- Notas y parciales por movimiento
- Auditoría de cambios
- Saldo inicial configurable
- App mobile-first responsiva
- Importación desde Excel legacy

## Backlog

**Total de historias de usuario:** 21

### Fase 1

#### US-001 — Configurar proyecto Next.js
- **Story points:** 3
- **Descripción:** Setup inicial con TypeScript, Tailwind, ESLint y estructura de carpetas.
- **Tags:** setup, devops
- **Criterios de aceptación:** Repo corriendo en local. Variables de entorno documentadas. Estructura /app, /components, /lib definida.

#### US-002 — Modelo de datos y Prisma
- **Story points:** 5
- **Descripción:** Crear schema Prisma con Empresa, Movimiento, Presupuesto y correr migrations.
- **Tags:** backend, bd
- **Criterios de aceptación:** Schema válido. Seed con las 3 empresas (LEC, DISCOVER, URUS). Cliente Prisma generado.

#### US-003 — Autenticación con NextAuth
- **Story points:** 3
- **Descripción:** Login con email/contraseña. Protección de rutas con middleware.
- **Tags:** auth
- **Criterios de aceptación:** Usuario puede iniciar y cerrar sesión. Rutas protegidas redirigen a /login.

#### US-004 — Formulario de registro de gasto
- **Story points:** 5
- **Descripción:** Formulario con selector de empresa, fecha, concepto, categoría (dropdown), tipo (entrada/salida) y monto.
- **Tags:** feature, form
- **Criterios de aceptación:** Valida con Zod. Guarda en BD. Saldo se recalcula. Selector de empresa es obligatorio.

#### US-005 — Tabla unificada de movimientos
- **Story points:** 3
- **Descripción:** Vista de todos los movimientos de todas las empresas con columna empresa visible.
- **Tags:** feature, tabla
- **Criterios de aceptación:** Muestra #, fecha, empresa, concepto, categoría, entrada, salida, saldo. Ordenable por fecha.

#### US-006 — Saldo calculado en backend
- **Story points:** 2
- **Descripción:** Endpoint que calcula saldo acumulado por empresa usando saldo_inicial + entradas - salidas.
- **Tags:** backend
- **Criterios de aceptación:** El saldo en la tabla es correcto. Consistente con cambios en BD.

#### US-007 — Editar y eliminar movimiento
- **Story points:** 2
- **Descripción:** Desde la tabla, poder editar o eliminar un movimiento existente.
- **Tags:** crud
- **Criterios de aceptación:** Edición abre formulario pre-poblado. Eliminación pide confirmación. Saldo se recalcula.

### Fase 2

#### US-008 — Dashboard con KPIs por empresa
- **Story points:** 5
- **Descripción:** Vista consolidada mostrando saldo actual, total entradas, total salidas y número de movimientos de cada empresa.
- **Tags:** dashboard
- **Criterios de aceptación:** Tarjetas con datos de LEC, DISCOVER, URUS y fila CONSOLIDADO.

#### US-009 — Filtros en tabla de movimientos
- **Story points:** 3
- **Descripción:** Filtrar por empresa, categoría, rango de fechas y tipo (entrada/salida).
- **Tags:** filtros, ux
- **Criterios de aceptación:** Filtros combinables. URL actualiza con query params. Resultados en tiempo real.

#### US-010 — Gráfica de gastos por categoría
- **Story points:** 5
- **Descripción:** Chart de barras o dona mostrando distribución de gastos por categoría, filtrable por empresa y periodo.
- **Tags:** dashboard, charts
- **Criterios de aceptación:** Usa Recharts. Muestra LEC, DISCOVER, URUS por columna y total. % del total visible.

#### US-011 — Búsqueda por concepto
- **Story points:** 2
- **Descripción:** Input de búsqueda que filtra movimientos por texto en el campo concepto.
- **Tags:** ux, filtros
- **Criterios de aceptación:** Debounce 300ms. Resalta coincidencias. Compatible con otros filtros activos.

#### US-012 — Paginación de movimientos
- **Story points:** 2
- **Descripción:** Paginar tabla de movimientos con 50 registros por página.
- **Tags:** ux
- **Criterios de aceptación:** Controles prev/next. Muestra "N de M registros". Mantiene filtros activos.

### Fase 3

#### US-013 — Módulo de presupuesto mensual
- **Story points:** 5
- **Descripción:** Pantalla para ingresar presupuesto por empresa y categoría, seleccionando mes y año.
- **Tags:** feature, presupuesto
- **Criterios de aceptación:** Grid editable igual al Excel (Papelería, Limpieza, Oficina, Transporte, Alimentación, Servicios, Mantenimiento, Publicidad, Otros).

#### US-014 — Comparativa presupuesto vs real
- **Story points:** 5
- **Descripción:** Tabla con variación (presupuesto − real) y % de variación por empresa y categoría.
- **Tags:** presupuesto, dashboard
- **Criterios de aceptación:** Verde = ahorro, rojo = exceso. "Columnas": Presup., Real, Variación, % Var para cada empresa.

#### US-015 — Alertas de categoría excedida
- **Story points:** 3
- **Descripción:** Indicador visual cuando el gasto real supera el presupuesto de alguna categoría en el mes actual.
- **Tags:** alertas, ux
- **Criterios de aceptación:** Badge o banner visible en dashboard. Detalla empresa y categoría excedida.

#### US-016 — Exportar a Excel
- **Story points:** 3
- **Descripción:** Botón para descargar movimientos filtrados en formato .xlsx, respetando el formato del archivo original.
- **Tags:** export
- **Criterios de aceptación:** Usa ExcelJS. Incluye "columnas": #, fecha, empresa, concepto, categoría, parcial, entrada, salida, saldo.

### Fase 4

#### US-017 — Roles admin y visor
- **Story points:** 3
- **Descripción:** Admin puede crear, editar, eliminar. Visor solo puede ver.
- **Tags:** auth, roles
- **Criterios de aceptación:** Middleware de roles. UI oculta acciones no permitidas. API valida permisos.

#### US-018 — Subida de comprobante
- **Story points:** 5
- **Descripción:** Al registrar un gasto, permitir adjuntar imagen o PDF del comprobante.
- **Tags:** feature, files
- **Criterios de aceptación:** Upload a almacenamiento (S3 / Supabase Storage). Previsualización en detalle del movimiento.

#### US-019 — Campo parcial y notas
- **Story points:** 2
- **Descripción:** Agregar campo "parcial" (desglose de sub-conceptos) y "notas" al formulario de movimiento.
- **Tags:** feature, form
- **Criterios de aceptación:** Parcial es opcional. Notas es texto libre. Ambos se muestran en la tabla como columnas colapsables.

#### US-020 — Configuración de saldo inicial
- **Story points:** 3
- **Descripción:** Pantalla de configuración donde admin ajusta el saldo inicial de cada empresa por año.
- **Tags:** config
- **Criterios de aceptación:** Historial de saldos iniciales por año. El saldo actual se recalcula al cambiar.

#### US-021 — Importación desde Excel legacy
- **Story points:** 5
- **Descripción:** Subir el archivo .xlsx original y mapear automáticamente los datos a la BD.
- **Tags:** import, devops
- **Criterios de aceptación:** Parser detecta hojas LEC, DISCOVER, URUS. Importa movimientos evitando duplicados. Reporte de filas importadas.

## Stack técnico

### Frontend

- **Next.js 14 (App Router)** — framework
- **TypeScript** — tipado
- **Tailwind CSS** — estilos
- **shadcn/ui** — componentes
- **Recharts** — gráficas
- **React Hook Form + Zod** — formularios

### Backend / BD

- **Next.js Route Handlers** — API
- **Prisma ORM** — queries
- **PostgreSQL (Neon / Supabase)** — BD
- **NextAuth.js** — auth
- **ExcelJS** — export

### Estructura de rutas

- **/dashboard** — consolidado
- **/gastos** — registro y tabla
- **/gastos/nuevo** — formulario
- **/presupuesto** — por mes
- **/configuracion** — empresas, saldos
- **/api/...** — route handlers

### Decisiones de diseño

- **Caja única consolidada** — vs hojas separadas
- **Campo empresa en cada gasto** — filtrable
- **Saldo calculado en BD** — no en frontend
- **Categorías en tabla enum** — extensible
- **Multi-empresa desde día 1** — diseño

## Modelo de datos

### Empresa

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK |
| `nombre` | `String` | LEC, DISCOVER, URUS… |
| `saldo_inicial` | `Decimal` | configurable |
| `activa` | `Boolean` | default true |
| `createdAt` | `DateTime` | auto |

### Movimiento

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK |
| `empresa_id` | `UUID` | FK → Empresa |
| `fecha` | `Date` | requerido |
| `concepto` | `String` | descripción del gasto |
| `categoria` | `Enum` | Papelería, Limpieza… |
| `tipo` | `Enum` | ENTRADA | SALIDA |
| `monto` | `Decimal` | siempre positivo |
| `parcial` | `Decimal?` | opcional, sub-concepto |
| `comprobante_url` | `String?` | Fase 4 |
| `notas` | `String?` | Fase 4 |
| `createdAt` | `DateTime` | auto |
| `createdBy` | `UUID` | FK → Usuario |

### Presupuesto

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK |
| `empresa_id` | `UUID` | FK → Empresa |
| `mes` | `Int` | 1–12 |
| `año` | `Int` | ej. 2025 |
| `categoria` | `Enum` | mismas que Movimiento |
| `monto` | `Decimal` | monto presupuestado |
| `updatedAt` | `DateTime` | auto |
