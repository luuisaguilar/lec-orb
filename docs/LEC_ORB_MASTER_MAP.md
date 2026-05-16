# LEC Orb Master Map

Ultima actualizacion: 2026-05-15
Fuente principal: `README.md`, `PROJECT_CONTEXT.md`, `HANDOFF.md`, `docs/ROADMAP.md`.

---

## 1) Que es LEC Orb

`LEC Orb` es la plataforma canonica activa para operacion multi-tenant de LEC, enfocada en control financiero, operativo y de calidad.

Repositorio canonico: `lec-orb`.

---

## 2) Arquitectura de alto nivel

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind.
- **Backend app:** Route Handlers en `src/app/api/v1/**`.
- **Datos/Auth/Storage:** Supabase (PostgreSQL + Auth + Storage + RLS).
- **Observabilidad y entrega:** Sentry + Vercel + GitHub Actions.
- **Pruebas:** Vitest (unit/integration) + Playwright (E2E).

Principios estructurales:
- multi-tenancy obligatorio por `org_id`,
- control de acceso por RBAC,
- auditoria para mutaciones relevantes,
- validacion de entrada con esquemas.

---

## 3) Flujo tecnico transversal

1. Usuario autentica con Supabase Auth.
2. Resolucion de membresia/rol por organizacion.
3. API protegida con `withAuth` y chequeo de permisos por modulo/accion.
4. Operaciones de datos filtradas por tenant (`org_id`) + RLS.
5. Registro de auditoria en acciones de escritura.

Este flujo define la base comun de seguridad y consistencia para todos los modulos.

---

## 4) Mapa de modulos por dominio

### 4.1 Core institucional
- Organizaciones y membresias.
- Invitaciones y aceptacion de acceso.
- Permisos por modulo (RBAC).
- Documentos organizacionales.

### 4.2 Operacion academica y logistica
- Eventos y sesiones.
- Aplicadores y escuelas.
- Planeacion operativa y seguimiento.
- Inventario y movimientos por ubicacion.

### 4.3 Finanzas
- Caja chica (movimientos, balance, import/export).
- Presupuesto/POA.
- Viaticos.
- Nomina operativa por rol/evento.
- IH Billing (sesiones, facturas, pagos, conciliacion).
- Base para dashboard P&L consolidado.

### 4.4 Calidad (SGC)
- NC/CAPA/auditorias/revision.
- Trazabilidad y evidencia para cumplimiento interno.

### 4.5 Programas y certificaciones
- CENNI (casos, estatus, certificados).
- TOEFL y componentes relacionados.

### 4.6 Gestion de proyectos (PM)
- Fundacion documentada y rutas base de implementacion.
- Orientado a tableros/tareas transversales tipo kanban.

### 4.7 Coordinacion proyectos LEC (indicadores / Excel)
- Modulo nativo distinto del PM: tablas `lec_*`, API `/api/v1/coordinacion-proyectos/*`, UI `/dashboard/coordinacion-proyectos-lec/*`.
- Sidebar: **categoria padre** `Coordinación de proyectos` (mismo nivel que Coordinación de Exámenes); convenciones en `docs/wiki/sidebar-modulos-y-agrupacion.md`.
- Concentrado mensual, lineas de examenes, oferta de cursos, catalogos por org, comparativos KPI; import bulk JSON.
- Enlaces opcionales a `schools`, `events`, `crm_opportunities`, `pm_projects` y hub desde Coordinacion de Examenes (`/dashboard/coordinacion-examenes/proyectos`).
- Documentacion: `docs/COORDINACION_PROYECTOS_LEC.md`, wiki `docs/wiki/coordinacion-proyectos-lec.md`.

### 4.8 Cuatro coordinaciones LEC (arquitectura de producto)
- **Documento maestro:** `docs/COORDINACIONES_LEC_ARQUITECTURA.md`.
- **Ejes:** Coordinacion Examenes (sidebar anidado), Feria del Libro (`inventory` / categoria Logistica), Coordinacion Academica (`courses` / categoria Academico), hub Coordinacion de Proyectos (`coordinacion-proyectos-lec`).
- **Interconexion:** `lec_cp_departments` + FKs en `lec_program_projects`; departamentos seed incluyen BC y Feria — no son modulos de menu.
- **Multisede:** `org_locations`, `org_members.location`; plan RLS en `docs/wiki/sedes-multisede-y-aislamiento-operativo.md`.
- **Auditoria sidebar:** `docs/wiki/auditoria-coordinaciones-sidebar.md`.
- **Flujos E2E backend:** `docs/BACKEND_FLOWS.md` (F1–F7).

---

## 5) Estado de ejecucion y confiabilidad

Segun documentacion de estado verificado:
- build/typecheck: pass,
- lint: pass,
- suite Vitest: pass,
- suite E2E: pass.

Esto indica base tecnica estable para iteracion funcional continua.

---

## 6) Como opera en local y productivo

### Local
- `npm install`
- configurar `.env.local` desde `.env.example`
- `npm run dev`
- pruebas: `npm run test`, `npm run test:e2e`, `npm run build`

### Productivo
- deploy en Vercel,
- backend de datos/autenticacion en Supabase,
- cron operativo para expiracion de invitaciones,
- monitoreo de errores con Sentry.

---

## 7) Integraciones y dependencias clave

- **Supabase:** fuente central de datos, auth y RLS.
- **Resend:** envio de emails transaccionales (p. ej. invitaciones/certificados).
- **Vercel Cron:** tareas programadas.
- **Sentry:** seguimiento de incidentes.

---

## 8) Riesgos tecnicos priorizados

1. **Drift documental:** coexistencia de documentos en ramas/proyectos historicos que pueden confundir estado real.
2. **Hardening transversal incompleto:** necesidad de revisar limites/rate limiting en endpoints sensibles.
3. **Consistencia de definiciones ejecutivas:** fuente unica de ciertos KPIs financieros aun en cierre.
4. **Deuda tecnica puntual:** pendientes de estandarizacion y limpieza de backlog acumulado.

---

## 9) Dependencias operativas criticas

- `SUPABASE_SERVICE_ROLE_KEY` para flujos de invitaciones/certificados.
- Disciplina de migraciones SQL en entorno productivo.
- Politicas RLS activas en tablas tenant.
- Sincronizacion entre roadmap operativo y ejecucion real.

---

## 10) Prioridades inmediatas sugeridas

1. Publicar "estado canonico" mensual (modulos, pruebas, riesgos, bloqueos).
2. Cerrar endpoint y definicion final del P&L ejecutivo consolidado.
3. Completar fase inicial del modulo PM con criterios de adopcion operativa.
4. Mantener matriz de riesgos (seguridad, datos, despliegue, observabilidad) con owner y fecha compromiso.

---

## 11) Indice de referencia rapida

- Estado general: `README.md`, `HANDOFF.md`, `INFRASTRUCTURE_STATUS.md`
- Backlog y prioridades: `docs/ROADMAP.md`
- Modelo de datos: `docs/DATABASE_SCHEMA.md`
- Modulos API: `docs/API_MODULES.md`
- Finanzas: `docs/FINANCE_MODULES.md`
- Testing: `docs/TESTING_GUIDE.md`
- Dashboard ejecutivo: `docs/executive-observability/README.md`
- Coordinacion proyectos LEC: `docs/COORDINACION_PROYECTOS_LEC.md`, `docs/wiki/coordinacion-proyectos-lec.md`
