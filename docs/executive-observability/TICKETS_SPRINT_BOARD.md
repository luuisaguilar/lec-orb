# Tickets Listos para Sprint

Backlog operativo en formato de tickets para Jira/GitHub Projects.

Convencion:
- **ID**: `EXE-` (Dashboard Ejecutivo), `OBS-` (Observabilidad), `PLT-` (plataforma transversal)
- **SP**: Story Points (1, 2, 3, 5, 8)
- **Owner**: FE, BE, DATA, QA, PROD

---

## Sprint MVP (2 semanas)

## Semana 1

### PLT-001 - Congelar diccionario de KPIs
- **Tipo**: Story
- **SP**: 3
- **Owner**: PROD + DATA
- **Descripcion**: Definir formulas oficiales, unidades, redondeos y semantica de cada KPI ejecutivo.
- **Aceptacion**:
  - Documento firmado por producto + negocio.
  - Cada KPI tiene fuente unica y criterio de corte temporal.
- **Dependencias**: Ninguna

### PLT-002 - Mapa de fuentes de datos por KPI
- **Tipo**: Story
- **SP**: 3
- **Owner**: DATA + BE
- **Descripcion**: Mapear KPIs a tablas/rpc/endpoints existentes y detectar brechas de datos.
- **Aceptacion**:
  - Matriz `KPI -> source -> owner -> refresh`.
  - Lista de gaps con plan de mitigacion.
- **Dependencias**: PLT-001

### EXE-001 - Skeleton de rutas UI ejecutivas
- **Tipo**: Story
- **SP**: 3
- **Owner**: FE
- **Descripcion**: Crear shell de rutas y layout base:
  - `/dashboard/executive`
  - `/dashboard/executive/finanzas`
  - `/dashboard/executive/operacion`
  - `/dashboard/executive/riesgo`
- **Aceptacion**:
  - Navegacion funcional.
  - Guardas de auth/rol respetadas.
- **Dependencias**: Ninguna

### EXE-002 - Endpoint overview ejecutivo
- **Tipo**: Story
- **SP**: 5
- **Owner**: BE
- **Descripcion**: Implementar `GET /api/v1/executive/overview` con KPIs P0.
- **Aceptacion**:
  - Respuesta tipada.
  - Datos acotados por org y periodo.
  - Manejo de errores consistente.
- **Dependencias**: PLT-001, PLT-002

### EXE-003 - KPI cards Home Ejecutivo
- **Tipo**: Story
- **SP**: 5
- **Owner**: FE
- **Descripcion**: Renderizar 8 KPI cards con estados loading/error/empty.
- **Aceptacion**:
  - Cards con delta vs periodo anterior.
  - Sin layout shift severo.
- **Dependencias**: EXE-002

### OBS-001 - Estandar de logging estructurado
- **Tipo**: Story
- **SP**: 5
- **Owner**: BE
- **Descripcion**: Definir y aplicar estructura minima: `request_id, org_id, user_id, endpoint, status, latency_ms`.
- **Aceptacion**:
  - Logs nuevos incluyen campos estandar.
  - Guia de uso para handlers nuevos.
- **Dependencias**: Ninguna

### OBS-002 - Rutas base observabilidad
- **Tipo**: Story
- **SP**: 3
- **Owner**: FE
- **Descripcion**: Crear shell del modulo:
  - `/dashboard/ops/observability`
  - `/dashboard/ops/observability/logs`
  - `/dashboard/ops/observability/errors`
  - `/dashboard/ops/observability/apis`
  - `/dashboard/ops/observability/audit`
- **Aceptacion**:
  - Navegacion completa y permisos aplicados.
- **Dependencias**: Ninguna

## Semana 2

### EXE-004 - Vista Finanzas Ejecutivo
- **Tipo**: Story
- **SP**: 5
- **Owner**: FE + BE
- **Descripcion**: Integrar cards y tendencia en vista de finanzas.
- **Aceptacion**:
  - Comparativo mes actual vs anterior.
  - Aging de cartera visible.
- **Dependencias**: EXE-002

### EXE-005 - Vista Operacion/Nomina Ejecutivo
- **Tipo**: Story
- **SP**: 5
- **Owner**: FE + BE
- **Descripcion**: Mostrar estado de corridas, backlog y tiempos de cierre.
- **Aceptacion**:
  - KPIs de proceso legibles en menos de 1 minuto.
- **Dependencias**: EXE-002

### EXE-006 - Filtros globales por periodo/unidad
- **Tipo**: Story
- **SP**: 3
- **Owner**: FE
- **Descripcion**: Filtro comun para todas las vistas ejecutivas.
- **Aceptacion**:
  - Filtro persistente entre navegacion.
  - Impacta todas las consultas de dashboard.
- **Dependencias**: EXE-003, EXE-004, EXE-005

### EXE-007 - Resumen narrativo semanal (reglas)
- **Tipo**: Story
- **SP**: 3
- **Owner**: DATA + BE
- **Descripcion**: Generar texto corto basado en variaciones principales.
- **Aceptacion**:
  - Incluye 3 insights maximo.
  - Sin lenguaje tecnico.
- **Dependencias**: EXE-004, EXE-005

### OBS-003 - Endpoint de logs + UI explorer
- **Tipo**: Story
- **SP**: 5
- **Owner**: BE + FE
- **Descripcion**: API y pantalla con filtros por tenant, endpoint, status y busqueda por request_id.
- **Aceptacion**:
  - Paginacion funcional.
  - Filtrado en < 2s para volumen esperado MVP.
- **Dependencias**: OBS-001, OBS-002

### OBS-004 - Panel de errores agrupados
- **Tipo**: Story
- **SP**: 5
- **Owner**: BE + FE
- **Descripcion**: Mostrar firmas de error, frecuencia y endpoints afectados.
- **Aceptacion**:
  - Top errores 24h/7d.
  - Drilldown a ejemplos.
- **Dependencias**: OBS-001, OBS-002

### OBS-005 - API health basico
- **Tipo**: Story
- **SP**: 3
- **Owner**: BE + FE
- **Descripcion**: Throughput, latencia promedio y error rate por endpoint.
- **Aceptacion**:
  - Vista ordenable por peor desempeno.
- **Dependencias**: OBS-001, OBS-002

### QA-001 - Plan de pruebas MVP dashboards
- **Tipo**: Task
- **SP**: 3
- **Owner**: QA
- **Descripcion**: Definir y ejecutar smoke + regresion funcional.
- **Aceptacion**:
  - Casos para formulas, filtros, permisos y errores.
  - Evidencia de pruebas adjunta.
- **Dependencias**: EXE-006, OBS-005

### PLT-003 - Readout de cierre MVP
- **Tipo**: Task
- **SP**: 2
- **Owner**: PROD
- **Descripcion**: Demo de cierre con negocio + retro de soporte tecnico.
- **Aceptacion**:
  - Lista de ajustes para v2 priorizada.
- **Dependencias**: QA-001

---

## v2 (1-2 meses)

### EXE-101 - Proyecciones de cierre mes/trimestre
- **SP**: 8
- **Owner**: DATA + BE + FE
- **Dependencias**: EXE-004, EXE-005

### EXE-102 - Comparativos YoY por unidad
- **SP**: 5
- **Owner**: DATA + FE
- **Dependencias**: EXE-101

### EXE-103 - Recomendaciones accionables por impacto
- **SP**: 5
- **Owner**: PROD + DATA
- **Dependencias**: EXE-101

### OBS-101 - p95/p99 y tendencias por endpoint
- **SP**: 5
- **Owner**: BE + FE
- **Dependencias**: OBS-005

### OBS-102 - Correlacion error tecnico vs impacto negocio
- **SP**: 8
- **Owner**: DATA + BE
- **Dependencias**: OBS-004, EXE-001

### OBS-103 - Alertas inteligentes + playbooks
- **SP**: 5
- **Owner**: BE + QA
- **Dependencias**: OBS-101, OBS-102

### EXE-104 - Riesgo/cumplimiento ejecutivo avanzado
- **SP**: 5
- **Owner**: FE + BE
- **Dependencias**: EXE-005

---

## Etiquetas sugeridas para tablero

- `area:executive`
- `area:observability`
- `type:story`
- `type:task`
- `priority:p0|p1|p2`
- `sprint:mvp-w1|mvp-w2|v2`
- `owner:fe|be|data|qa|prod`
