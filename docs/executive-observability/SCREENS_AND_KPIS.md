# Pantallas y KPIs

Definicion funcional para diseno/implementacion del Dashboard Ejecutivo y el Modulo de Observabilidad.

---

## 1) Dashboard Ejecutivo

### Objetivo
Entregar visibilidad de negocio para toma de decisiones rapida en finanzas, operacion, personas y riesgo.

### Perfil usuario
- Dueno / socio / direccion general
- Gerencia administrativa-financiera
- Lideres de unidad con enfoque de resultados

## Pantalla 1: Home Ejecutivo

### Bloques
- Hero de estado general (semana/mes)
- Tarjetas KPI clave
- Tendencia 6 meses
- Alertas criticas
- Resumen ejecutivo narrativo

### KPI cards (prioridad P0)
- Ingresos MTD
- Costo nomina MTD
- Margen bruto %
- Flujo neto proyectado 30 dias
- Cuentas por cobrar vencidas
- Nominas pendientes/con error
- Incidencias criticas abiertas
- Headcount activo

### Resumen narrativo (ejemplo)
"Esta semana el costo de nomina subio 8% por horas extra en X unidad; la cobranza mejoro 12%; existen 3 alertas de riesgo alto por vencimientos."

## Pantalla 2: Finanzas

### Bloques
- Ingreso vs costo por periodo
- Margen por unidad/linea
- Aging de cartera (0-30, 31-60, 61-90, +90)
- Proyeccion de cierre mensual

### KPIs
- Ingreso cobrado vs facturado
- Costo nomina total
- Margen operativo estimado
- DSO (days sales outstanding) simplificado
- Monto vencido > 30 dias

## Pantalla 3: Operacion y Nomina

### Bloques
- Estado de corridas de nomina
- Tiempos de cierre
- Errores por tipo
- Backlog operativo por area

### KPIs
- Nominas procesadas / pendientes / error
- Tiempo promedio de cierre
- % cumplimiento de calendario
- Incidencias operativas abiertas

## Pantalla 4: Riesgo y Cumplimiento

### Bloques
- Semaforo de riesgo (rojo/amarillo/verde)
- Eventos de control y auditoria
- Obligaciones proximas a vencer
- Cambios sensibles recientes

### KPIs
- Alertas criticas activas
- Eventos de alto impacto (7/30 dias)
- % obligaciones al corriente
- Casos con evidencia incompleta

---

## 2) Modulo Tecnico: Observabilidad

### Objetivo
Reducir MTTR y facilitar diagnostico tecnico sin contaminar el dashboard ejecutivo con ruido operacional.

### Pantalla A: Logs Explorer
- Tabla de logs estructurados
- Filtros por tenant, user, endpoint, status, severidad
- Busqueda por request_id/correlation_id

### Pantalla B: Error Monitor
- Errores agrupados por firma
- Frecuencia y tendencia
- Impacto estimado (usuarios afectados/endpoints)

### Pantalla C: API Health
- Throughput por endpoint
- Latencia p50/p95/p99
- Tasa de error por endpoint
- Top endpoints degradados

### Pantalla D: Audit Timeline
- Quien hizo que y cuando (mutaciones criticas)
- Drilldown por entidad (ej. nomina, viaticos, invitaciones)

### Pantalla E: Alertas y Playbooks
- Reglas activas
- Ultimos disparos
- Checklist de respuesta por tipo de incidente

---

## 3) KPI Dictionary (MVP)

## Ejecutivo
- **Ingresos MTD:** suma de ingresos cobrados del mes en curso.
- **Costo Nomina MTD:** suma de egresos de nomina del mes en curso.
- **Margen Bruto %:** `(ingresos - costos directos) / ingresos * 100`.
- **Flujo Neto 30d:** ingresos proyectados - egresos proyectados proximos 30 dias.
- **Cartera Vencida %:** `monto vencido / cartera total * 100`.
- **Cumplimiento Calendario %:** hitos a tiempo / hitos planificados * 100.

## Observabilidad
- **Error Rate %:** `respuestas 5xx + errores de negocio criticos / total requests * 100`.
- **Latency p95:** percentil 95 de latencia por endpoint.
- **MTTR:** tiempo medio de resolucion de incidente.
- **Eventos Auditados:** total de mutaciones con registro completo en auditoria.

---

## 4) Resumenes automáticos recomendados

- Resumen semanal ejecutivo (1 parrafo + 3 recomendaciones)
- Top 5 variaciones del periodo (subidas/bajadas relevantes)
- Alertas priorizadas por impacto economico
- Resumen tecnico diario (errores nuevos, endpoints degradados, regresiones)
