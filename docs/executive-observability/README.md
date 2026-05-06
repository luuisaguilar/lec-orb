# Dashboard Ejecutivo + Observabilidad

Paquete de planeacion y ejecucion para dos frentes:

1. **Dashboard Ejecutivo** (directivo/socio/dueno de negocio)
2. **Modulo Tecnico de Observabilidad** (programador/soporte/admin tecnico)

Este directorio concentra la documentacion operativa para implementar el alcance sin ambiguedad.

## Documentos

- `docs/executive-observability/SCREENS_AND_KPIS.md`
  - Definicion de pantallas, tarjetas, graficas, resumenes ejecutivos y KPI dictionary.
- `docs/executive-observability/BACKLOG_MVP_V2.md`
  - Backlog por fases (MVP 2 semanas y v2 1-2 meses), con criterios de done y dependencias.
- `docs/executive-observability/HANDOFF_DASHBOARDS.md`
  - Handoff de producto/tecnico para continuidad entre squads.
- `docs/executive-observability/RUNBOOK_DASHBOARD_OBSERVABILITY.md`
  - Operacion diaria, triage de incidentes, checklist de release y monitoreo.
- `docs/executive-observability/PATHS_AND_ROUTES.md`
  - Rutas UI, endpoints API, tablas sugeridas y ownership por modulo.
- `docs/executive-observability/TICKETS_SPRINT_BOARD.md`
  - Tickets listos para Jira/GitHub Projects con SP, owner y dependencias.
- `docs/executive-observability/DB_SCHEMA_PROPOSAL.md`
  - Propuesta de esquema (snapshots/alerts/agrupacion de errores) para cuando se requieran migraciones.

## Scope acordado

- El ejecutivo tiene un dashboard orientado a decisiones, no a logs tecnicos.
- Programador/soporte operan desde un modulo de observabilidad separado dentro de admin.
- Logs se amplian a observabilidad completa: **logs + metricas + auditoria + alertas**.

## Resultado esperado

- Un directivo puede responder en menos de 2 minutos:
  - Como va el negocio hoy
  - Donde se esta perdiendo dinero
  - Que riesgo existe este mes
  - Que decisiones tomar esta semana
- Un desarrollador puede diagnosticar un incidente en menos de 10 minutos.
