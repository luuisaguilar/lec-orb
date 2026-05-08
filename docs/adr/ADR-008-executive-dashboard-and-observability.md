# ADR-008 - Dashboard Ejecutivo y Modulo de Observabilidad

**Estado:** Propuesto  
**Fecha:** 2026-05-05

---

## Contexto

LEC Orb tiene modulos operativos y financieros en crecimiento. La direccion necesita visibilidad rapida y confiable para decisiones; el equipo tecnico necesita visibilidad operacional para diagnostico (sin depender solo de Vercel/Sentry).

Riesgo actual:

- Mezclar audiencias (directivo vs tecnico) genera ruido y baja adopcion.
- KPIs sin definicion unica generan discusiones, no decisiones.
- Logs no estructurados impiden correlacion y aumentan MTTR.

---

## Decision

Se implementan dos experiencias separadas:

1. **Dashboard Ejecutivo** (decision y salud del negocio)
2. **Modulo Tecnico de Observabilidad** (operacion, soporte e ingenieria)

Y se establecen reglas de arquitectura:

- El dashboard ejecutivo consume **KPIs agregados** y muestra **insights accionables**.
- El modulo tecnico expone **logs + metricas + auditoria + alertas**, con filtros por tenant y correlacion.
- La definicion de KPIs se formaliza en un **diccionario versionado** (formula, fuente, periodicidad, owner).
- Toda instrumentacion y endpoints nuevos mantienen:
  - aislamiento por `org_id`
  - RBAC / permisos por modulo
  - auditoria en mutaciones (cuando aplique)

---

## Consecuencias

### Positivas

- Mayor adopcion: cada audiencia ve lo que necesita.
- Menor MTTR: observabilidad basica dentro de la plataforma.
- Menos discusiones: KPIs con definicion unica y trazable.
- Escalabilidad: se habilita v2 con proyecciones y alertas inteligentes.

### Negativas / trade-offs

- Se incrementa trabajo de instrumentacion (logging estructurado y endpoints agregados).
- Requiere disciplina de gobierno de datos (KPI dictionary).
- Puede requerir tablas adicionales (snapshots/alerts) si el performance lo demanda.

---

## Alternativas consideradas

1. Un solo dashboard con tabs para todos:
   - descartado por mezcla de audiencias, ruido y riesgo de permisos.
2. Ejecutar observabilidad solo con herramientas externas (Vercel/Sentry):
   - insuficiente para correlacion tenant/usuario/flujo y para soporte operativo.
3. Enviar solo reportes por email (sin UI):
   - util como complemento, pero no sustituye exploracion y drilldown.

---

## Implicaciones de datos

### KPI dictionary (obligatorio)

Cada KPI debe incluir:

- nombre y definicion
- formula exacta
- fuente (tabla/RPC/API)
- filtros (periodo, unidad, org)
- frecuencia de actualizacion
- owner (negocio + data)

### Tablas opcionales (segun performance/volumen)

Si los agregados en vivo son costosos, se permite introducir:

- `executive_kpi_snapshots` (cache historico)
- `ops_alerts` (estado de alertas)
- `ops_error_fingerprints` (agrupacion de errores)

Estas tablas deben nacer con RLS por `org_id` desde el dia 1.

---

## Estado de implementacion

La planeacion y backlog viven en:

- `docs/executive-observability/SCREENS_AND_KPIS.md`
- `docs/executive-observability/BACKLOG_MVP_V2.md`
- `docs/executive-observability/TICKETS_SPRINT_BOARD.md`
