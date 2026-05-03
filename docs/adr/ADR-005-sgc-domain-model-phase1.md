# ADR-005 - Modelo de dominio SGC Fase 1 en Supabase

**Estado:** Aceptado  
**Fecha:** 2026-05-03

---

## Contexto

LEC Orb requería incorporar capacidades SGC/ISO con enfoque multi-tenant:

1. No conformidades (NC)
2. Acciones correctivas/preventivas (CAPA)
3. Auditorías y revisiones
4. Reglas de cierre auditables

Se evaluaron referencias ERP/QMS maduras (OCA/Odoo, ERPNext, OpenQMS).  
El reto era trasladar patrones empresariales a un esquema compatible con Supabase + RLS sin adoptar un ERP completo.

## Decisión

Implementar un modelo SGC nativo en la base de datos de LEC Orb, mediante la migración:

- `supabase/migrations/20260510_sgc_phase1.sql`

Con esta estructura:

- Núcleo: `sgc_nonconformities`, `sgc_actions`, `sgc_audits`, `sgc_reviews`
- Catálogos: `sgc_nc_stages`, `sgc_action_stages`, `sgc_nc_severities`, `sgc_nc_origins`, `sgc_nc_causes`
- Relaciones: tablas puente para vínculos NC-acción, auditoría y revisión

## Consecuencias

### Positivas

- El dominio SGC queda formalizado en SQL y no solo en lógica de aplicación.
- Se mantiene aislamiento por tenant (`org_id`) desde el origen.
- La base queda lista para APIs/UI incrementales sin rehacer schema.
- Se preserva trazabilidad con `fn_audit_log()`.

### Negativas / trade-offs

- Mayor complejidad de esquema respecto a un MVP de una sola tabla.
- Requiere disciplina de catálogo/etapas para evitar configuraciones inconsistentes por org.
- Algunas necesidades avanzadas (firma por etapa, gestión documental estricta) quedan para fase posterior.

## Alternativas consideradas

1. Reusar esquema simplificado estilo ERPNext:
   - Más rápido inicialmente, menor cobertura de taxonomías.
2. Esquema detallado tipo OCA:
   - Más completo, mayor complejidad inicial.
3. Integrar ERP externo:
   - Alto costo de integración y acoplamiento.

Se eligió una versión intermedia: rica en dominio, pero adaptada a Supabase.

