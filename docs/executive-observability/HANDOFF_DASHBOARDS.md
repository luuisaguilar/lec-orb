# Handoff - Dashboard Ejecutivo y Observabilidad

Documento de transferencia para continuidad de implementacion entre producto, data y desarrollo.

---

## 1) Objetivo del frente

Entregar dos experiencias complementarias:

- **Ejecutivo:** tablero de decision y salud del negocio.
- **Tecnico:** modulo de observabilidad para soporte e ingenieria.

No fusionar ambas audiencias en una misma interfaz principal.

---

## 2) Decisiones cerradas

- Se construye dashboard dedicado para directivo/socio/dueno.
- Vista de programador se implementa como modulo de admin/ops.
- Alcance de logs se amplia a observabilidad integral:
  - logs
  - metricas
  - auditoria
  - alertas

---

## 3) Entregables por equipo

## Producto / UX
- Flujos y wireframes de 4 pantallas ejecutivas.
- Flujos y wireframes de 4-5 pantallas tecnicas.
- Reglas de semaforos y estados de alerta.

## Data / BI
- Diccionario de KPIs con formula exacta.
- Tabla de fuentes por KPI (tabla/API/RPC).
- Validacion de consistencia vs reportes operativos actuales.

## Backend
- Endpoints agregados para cards y series de tiempo.
- Estandar de logging estructurado.
- Exposicion de metricas base para observabilidad.

## Frontend
- Shell de dashboard ejecutivo.
- Modulo observabilidad en seccion admin.
- Filtros globales y persistencia de rango de fechas.

## QA
- Suite minima de regresion para formulas y filtros.
- Casos de smoke para incidentes tecnicos.

---

## 4) Criterios de aceptacion transversales

- KPI cards sin discrepancias >2% contra fuente acordada.
- Semaforos de riesgo con umbrales visibles y trazables.
- Logs con request_id y contexto minimo util.
- Diagnostico de incidente posible en <10 minutos.

---

## 5) Riesgos abiertos

- Definiciones de negocio aun sujetas a ajuste.
- Datos historicos con calidad desigual.
- Posible sesgo visual: demasiada densidad de datos para ejecutivo.
- Dependencia de instrumentacion backend para observabilidad util.

---

## 6) Siguiente checkpoint recomendado

Semana 1 (fin): demo interna de MVP con datos reales de una unidad.

Semana 2 (fin): validacion con direccion + retro de soporte tecnico para observabilidad.
