# ADR-007 - Fundacion del modulo Project Management (Asana/Trello/Monday style)

**Estado:** Propuesto  
**Fecha:** 2026-05-05

---

## Contexto

LEC Orb ya cuenta con piezas reutilizables para un modulo de gestion de trabajo:

- arquitectura multi-tenant con `org_id`
- `withAuth` + RBAC + `logAudit`
- navegacion dinamica por `module_registry`
- patrones de board en `SGC` (kanban y cambios de estado)

El equipo necesita un modulo transversal para coordinar operacion interna, con experiencia tipo Asana/Trello/Monday, sin acoplarse a un dominio unico (como SGC o Eventos).

## Decision

Adoptar un modulo nativo de Project Management por fases:

1. **Fase 1 (MVP operativo):**
   - proyectos, tableros, columnas, tareas
   - asignado, prioridad, fecha limite, etiquetas
   - kanban drag-and-drop + vista tabla
2. **Fase 2 (colaboracion):**
   - comentarios, subtareas, watchers, notificaciones basicas
3. **Fase 3 (planificacion avanzada):**
   - dependencias, timeline/calendario, reportes de carga y cumplimiento

Implementacion recomendada:

- nuevas tablas `pm_*` con RLS desde el dia 1
- endpoints bajo `/api/v1/pm/*` usando `withAuth`
- auditoria en toda mutacion via `logAudit`
- registro del modulo en `module_registry` como nativo

## Consecuencias

### Positivas

- estandariza seguimiento de trabajo para todas las areas
- reduce uso paralelo de Excel/WhatsApp para tracking operativo
- reusa patrones existentes, acelerando salida del MVP
- preserva aislamiento tenant y trazabilidad desde el inicio

### Negativas / trade-offs

- incrementa superficie de mantenimiento (API + UI + esquema)
- requiere acordar reglas de negocio transversales (estados, SLA, ownership)
- puede superponerse con flujos SGC si no se define claramente el alcance

## Alternativas consideradas

1. Usar solo `LEC Studio` (modulo 100% dinamico):
   - rapido para prototipos, pero limitado para DnD kanban, dependencias y UX avanzada.
2. Extender SGC para uso general:
   - descartado por acoplamiento semantico a calidad y auditoria.
3. Integrar SaaS externo (Asana/Monday):
   - agrega costo y friccion de integracion, sin control total de datos.

## Estado de implementacion

Este ADR documenta la direccion tecnica y de producto.  
No implica que el modulo PM ya este implementado en produccion.

