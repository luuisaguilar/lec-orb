# Backlog MVP y v2

Backlog priorizado para implementar Dashboard Ejecutivo y Modulo de Observabilidad.

---

## MVP (2 semanas)

## Epic 1 - Fundacion de datos (P0)

### Historias
- [ ] Congelar definiciones de KPI con negocio (single source of truth).
- [ ] Alinear formulas entre finanzas, operaciones y producto.
- [ ] Documentar fuentes de datos por KPI (tabla/api/rpc).
- [ ] Definir catalogo de alertas (severidad y umbrales).

### Done
- [ ] Documento KPI firmado por negocio + tech lead.
- [ ] Fuentes de datos mapeadas con owner.

## Epic 2 - Dashboard Ejecutivo base (P0)

### Historias
- [ ] Construir `Home Ejecutivo` con 8 KPI cards.
- [ ] Construir vista de `Finanzas`.
- [ ] Construir vista de `Operacion y Nomina`.
- [ ] Filtros globales por periodo y unidad.
- [ ] Resumen narrativo semanal con reglas simples.

### Done
- [ ] Directivo responde 4 preguntas clave en <2 min.
- [ ] Datos sin discrepancias mayores al 2% vs reportes actuales.

## Epic 3 - Observabilidad base (P0)

### Historias
- [ ] Logs estructurados (request_id, org_id, user_id, endpoint, status, latency_ms).
- [ ] Pantalla de logs con filtros y busqueda.
- [ ] Panel de errores recientes agrupados.
- [ ] Metricas base: throughput, latency promedio, error rate.
- [ ] Bitacora de auditoria visible por entidad critica.

### Done
- [ ] Dev/soporte localiza causa probable de incidente en <10 min.
- [ ] Errores criticos visibles sin revisar Vercel manualmente.

## Epic 4 - Calidad y adopcion (P1)

### Historias
- [ ] Instrumentacion de eventos clave de dashboard.
- [ ] QA funcional de formulas y filtros.
- [ ] Mini onboarding para usuarios ejecutivos.

### Done
- [ ] Demo con direccion completada.
- [ ] Checklist QA firmado.

---

## v2 (1-2 meses)

## Epic 5 - Inteligencia financiera (P0)
- [ ] Proyecciones de cierre (mes/trimestre).
- [ ] Analisis comparativo YoY y por unidad.
- [ ] Recomendaciones accionables por impacto economico.

## Epic 6 - Observabilidad avanzada (P0)
- [ ] p95/p99 por endpoint y modulo.
- [ ] Correlacion error tecnico <-> impacto negocio.
- [ ] Alertas inteligentes por desviacion.
- [ ] Playbooks de respuesta con SLA.

## Epic 7 - Riesgo y cumplimiento ejecutivo (P1)
- [ ] Indicadores de cumplimiento por obligacion.
- [ ] Radar de riesgos (probabilidad/impacto).
- [ ] Auditoria ejecutiva de cambios sensibles.

## Epic 8 - Automatizacion de reportes (P1)
- [ ] Resumen semanal ejecutivo automatico.
- [ ] Reporte tecnico diario para equipo dev/soporte.
- [ ] Entrega por email/slack (segun canal definido).

---

## Dependencias y riesgos

- Definiciones financieras no cerradas pueden romper confianza del dashboard.
- Calidad de datos historicos (fechas nulas, catálogos inconsistentes).
- Falta de identificadores de correlacion en logs legado.
- Riesgo de mezclar audiencias (ejecutivo vs tecnico) en una sola vista.

---

## Criterios de priorizacion

1. Impacto en decision de negocio
2. Reduccion de riesgo operativo
3. Tiempo de implementacion
4. Dependencias tecnicas
5. Esfuerzo de adopcion por usuarios
