# Runbook - Dashboard Ejecutivo y Observabilidad

Operacion diaria para monitoreo, triage y release del frente de dashboards.

---

## 1) Operacion diaria (15-20 min)

### Paso 1 - Sanidad de datos ejecutivos
- Revisar cards principales del Home Ejecutivo.
- Validar que no haya saltos anormales por carga incompleta.
- Confirmar timestamp de ultima actualizacion por bloque.

### Paso 2 - Sanidad tecnica
- Revisar error rate general (ultimas 24h).
- Revisar endpoints con mayor latencia p95.
- Confirmar que no existan errores nuevos de alto impacto.

### Paso 3 - Alertas
- Atender alertas rojas primero.
- Clasificar alertas en:
  - dato/fuente
  - aplicacion
  - infraestructura

---

## 2) Checklist de release (MVP/v2)

- [ ] KPI dictionary vigente y versionado.
- [ ] Comparativo de formulas vs fuente validado.
- [ ] Filtros globales funcionales (periodo, unidad).
- [ ] Logs estructurados presentes en endpoints criticos.
- [ ] Pantallas cargan sin errores de permisos (RBAC).
- [ ] Build/lint/test en verde.

---

## 3) Triage de incidentes

## Incidente tipo A - KPI inconsistente
1. Confirmar formula en diccionario de KPI.
2. Verificar query/fuente usada por endpoint.
3. Comparar con reporte base (mismo rango y filtros).
4. Si error de transformacion, corregir mapper y recalcular.

## Incidente tipo B - Dashboard lento
1. Identificar bloque/pantalla lenta.
2. Revisar endpoint y latencia p95.
3. Verificar joins pesados / falta de indices.
4. Mitigar con agregados materializados o cache de lectura.

## Incidente tipo C - Error 5xx recurrente
1. Filtrar logs por request_id y endpoint.
2. Revisar firma de error y frecuencia.
3. Aplicar fix/feature flag segun impacto.
4. Monitorear 24h post-fix.

---

## 4) SLAs sugeridos

- Incidente critico ejecutivo (datos erraticos en Home): respuesta < 30 min.
- Incidente tecnico degradante (error rate alto): respuesta < 15 min.
- Correccion de formula no critica: dentro del siguiente ciclo de despliegue.

---

## 5) Ownership recomendado

- Producto: semaforos, prioridades de insight, narrativa ejecutiva.
- Data: formulas, definiciones de KPI y consistencia.
- Backend: contratos API, logging estructurado, alertas.
- Frontend: UX de lectura rapida y filtros.
- QA: regresion funcional de indicadores y observabilidad.
