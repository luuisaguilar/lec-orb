# Backlog SGC (Pendiente)

Fecha base: 2026-05-03  
Base técnica actual: `20260510_sgc_phase1.sql`

Plan de ejecución por sprint: `docs/SGC_SPRINT_PLAN.md`
Tablero operativo Sprint 01: `docs/SGC_SPRINT01_EXECUTION_BOARD.md`

---

## Resumen

La base de datos SGC Fase 1 está implementada.  
El pendiente principal es convertir ese dominio en capacidad operativa completa (API + UI + reportes + evidencia).

Estado al 2026-05-04:
- Completado: estabilización de esquema + hooks/UI de auditoría SGC + flujo CAR.
- Completado: hardening de seguridad RLS SGC vía migración delta.
- Completado: **Estabilización de API SGC (Stats & Detail)** - Resolución de errores 500 y resiliencia de timeline.
- Pendiente: evidencia documental (DMS) y exportables PDF.
- Pendiente: automatización de recordatorios de vencimiento.

---

## Épica 1 - API SGC v1

### Objetivo

Exponer CRUD y flujos del módulo SGC con `withAuth` + `logAudit`.

### Historias

1. Endpoints NC
   - `GET /api/v1/sgc/nonconformities`
   - `POST /api/v1/sgc/nonconformities`
   - `PATCH /api/v1/sgc/nonconformities/[id]`
   - `DELETE /api/v1/sgc/nonconformities/[id]` (soft delete o cancelación por estado)
2. Endpoints de acciones CAPA
3. Endpoints de auditorías y checklist
4. Endpoints de revisiones
5. Endpoints para catálogos SGC (origen/causa/severidad/etapas)

### Criterios de aceptación

- Todas las rutas mutantes usan `withAuth`.
- Todas las mutaciones exitosas registran `logAudit`.
- Filtros por `org_id` obligatorios.
- Test API mínimo: casos happy path + permisos + errores de transición.

---

## Épica 2 - UI Operativa SGC (Dashboard)

### Objetivo

Habilitar operación diaria del SGC por usuarios `admin/supervisor`.

### Historias

1. Tablero NC (lista + filtros + búsqueda)
2. Vista Kanban de NC por etapa
3. Detalle NC con:
   - causas y orígenes
   - plan de acción
   - evaluación y cierre
4. Tablero de acciones CAPA
5. Módulo de auditorías (cabecera + checklist + hallazgos)
6. Módulo de revisiones gerenciales

### Criterios de aceptación

- Diseño Premium SaaS consistente con resto de la app.
- Estados y badges sincronizados con `status` real en DB.
- Acciones bloqueadas por rol donde aplique.

---

## Épica 3 - Evidencia documental y trazabilidad

### Objetivo

Adjuntar evidencia documental a NC/acciones/auditorías/revisiones.

### Historias

1. Integrar tablas SGC con `documents` (DMS existente).
2. Mostrar timeline de evidencia por entidad.
3. Validar permisos de descarga/visualización por tenant.

### Criterios de aceptación

- Archivo subido queda asociado a entidad SGC + `org_id`.
- Evidencia visible en UI y accesible desde APIs.
- Operación auditada.

---

## Épica 4 - Reportes y KPIs SGC

### Objetivo

Dar visibilidad ejecutiva del desempeño del SGC.

### Historias

1. KPI: tiempo promedio de cierre de NC
2. KPI: tasa de NC reabiertas/reincidentes
3. KPI: cumplimiento de SLA de acciones
4. Dashboard por periodo, severidad y origen

### Criterios de aceptación

- Métricas calculadas con consultas reproducibles.
- Filtros por fecha, área y severidad.
- Exportable (CSV/XLSX o PDF en iteración posterior).

---

## Épica 5 - Compliance avanzado (Fase 2)

### Objetivo

Elevar robustez para auditorías externas más estrictas.

### Historias

1. Firmas por etapa (`*_by`, `*_on`) en NC/CAPA.
2. Matriz de aprobaciones por rol.
3. Plantillas de auditoría y checklists predefinidos por estándar.
4. Recordatorios automáticos por SLA (cron + notificaciones).

### Criterios de aceptación

- Transiciones sensibles requieren usuario autorizado.
- Se conserva rastro de aprobación con timestamp.
- Alertas de vencimiento operativas.

---

## Orden sugerido de ejecución

1. Épica 1 (API) - bloqueo principal.
2. Épica 2 (UI) - habilita operación real.
3. Épica 3 (evidencia) - cierra ciclo documental.
4. Épica 4 (KPIs) - capa de gestión.
5. Épica 5 (compliance avanzado) - endurecimiento.

---

## Riesgos y dependencias

### Riesgos

- Desalineación entre estados de UI y reglas DB.
- Complejidad de UX en flujos largos (NC -> CAPA -> cierre).
- Sobrecarga inicial del equipo sin plantillas de proceso.

### Dependencias

- Módulo de usuarios/roles estable (`org_members`).
- `logAudit()` aplicado en las nuevas rutas API.
- Integración DMS estable para evidencia.
