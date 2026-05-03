# SGC Module (ISO/QMS) - Phase 1

Este documento describe el diseño funcional y técnico inicial del módulo SGC (Sistema de Gestión de Calidad) para LEC Orb.

Fuente de implementación: `supabase/migrations/20260510_sgc_phase1.sql`.

---

## Objetivo

Agregar capacidades base de SGC orientadas a:

- No Conformidades (NC)
- Acciones correctivas/preventivas/mejora
- Auditorías internas
- Revisiones gerenciales
- Trazabilidad y auditoría por tenant (`org_id`)

---

## Alcance Fase 1

### Entidades principales

- `sgc_nonconformities`
- `sgc_actions`
- `sgc_audits`
- `sgc_reviews`

### Catálogos

- `sgc_nc_stages`
- `sgc_action_stages`
- `sgc_nc_severities`
- `sgc_nc_origins`
- `sgc_nc_causes`

### Relacionales

- `sgc_nonconformity_actions`
- `sgc_nonconformity_origins`
- `sgc_nonconformity_causes`
- `sgc_audit_auditors`
- `sgc_audit_auditees`
- `sgc_audit_checks`
- `sgc_audit_nonconformities`
- `sgc_audit_improvement_actions`
- `sgc_review_participants`
- `sgc_review_items`

---

## Reglas de negocio (DB-level)

### 1) Cierre de No Conformidad

Una NC no puede cerrar (`status='done'`) si:

- `evaluation_comments` está vacío
- Existe al menos una acción vinculada sin cerrar

### 2) Ciclo de vida de Acciones

- El estado se sincroniza desde `stage_id`.
- Al pasar de `draft` a estado activo se asigna `opened_at`.
- Al cerrar (`done`) se asigna `closed_at`.
- No se permite regresar a `draft` si la acción ya fue abierta.

### 3) Referencias legibles

Se generan automáticamente:

- NC: `NC-YYYY-######`
- Acción: `ACT-YYYY-######`
- Auditoría: `AUD-YYYY-######`
- Revisión: `REV-YYYY-######`

---

## Seguridad y multi-tenant

Todas las tablas SGC:

- tienen `org_id`
- tienen RLS habilitado
- usan políticas:
  - `SELECT`: miembros de la org
  - `INSERT/UPDATE/DELETE`: solo `admin` y `supervisor`

---

## Auditoría y timestamps

- Se adjuntan triggers `handle_updated_at()` en tablas con `updated_at`.
- Se adjuntan triggers `fn_audit_log()` en todo el bloque SGC para trazabilidad completa.

---

## Alineación con referencias investigadas

Patrones adoptados desde benchmark:

- OCA Management System: NC + acciones + auditoría + revisión
- ERPNext: flujo simple CAPA y estatus agregados
- OpenQMS: trazabilidad por etapas y enfoque de cumplimiento

---

## Siguiente fase sugerida

1. API `/api/v1/sgc/*` con `withAuth` y `logAudit`.
2. UI premium para tableros NC/CAPA (Kanban + filtros por severidad/origen).
3. Vinculación con DMS (`documents`) para evidencia.
4. Reportes KPI: tiempo de cierre, reincidencia, eficacia de acciones.

