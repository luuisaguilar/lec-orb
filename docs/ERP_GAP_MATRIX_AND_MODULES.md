# ERP Gap Matrix and Module Functionalities

Fecha de corte: 2026-05-03  
Referencia comparativa: Odoo, ERPNext y ERPcafe (enfoque funcional).

---

## 1) Matriz GAP (LEC Orb vs ERP objetivo)

Escala:

- Cobertura actual: `Alta`, `Media`, `Baja`
- Prioridad: `Must`, `Should`, `Could`

| Dominio | Cobertura actual LEC Orb | Prioridad | Meta |
|---|---|---|---|
| CRM comercial | Baja | Must | Pipeline de venta completo y medible |
| Ventas (quote -> order -> invoice) | Media | Must | Flujo punta a punta con trazabilidad |
| CxC y cobranza | Media | Must | Control de aging y recuperacion |
| Contabilidad general | Baja | Must | Base contable ERP (polizas, conciliacion, EEFF) |
| Compras y proveedores | Media | Should | RFQ, recepcion, devoluciones y evaluacion |
| Inventario avanzado | Media | Should | Multi-almacen, lotes/series, transferencias |
| RRHH extendido | Media | Should | Ciclo completo colaborador y desempeno |
| BI ejecutivo | Media | Should | KPIs y tableros por unidad de negocio |
| SGC transversal | Media (base lista) | Must | NC/CAPA integradas al resto de modulos |
| Automatizaciones/BPM | Baja | Could | Workflows y alertas por SLA |

---

## 2) Funcionalidades requeridas por modulo

## 2.1 CRM comercial (Must)

Objetivo: capturar, calificar y convertir oportunidades.

Funcionalidades minimas:

1. Leads y oportunidades con etapas (`new`, `qualified`, `proposal`, `won`, `lost`).
2. Actividades comerciales (llamada, email, reunion, tarea) con vencimiento.
3. Historial de interacciones por cliente.
4. Probabilidad y monto esperado por oportunidad.
5. Motivos de perdida y analisis de conversion.
6. Reporte de pipeline por ejecutivo y periodo.

Integraciones clave:

1. Vinculo a cotizaciones.
2. Vinculo a cuentas por cobrar.
3. Vinculo a NC/quejas (SGC) cuando aplique.

## 2.2 Ventas (Must)

Objetivo: flujo comercial operativo completo.

Funcionalidades minimas:

1. Cotizacion versionada con vigencia.
2. Conversion cotizacion -> orden de venta.
3. Reglas de aprobacion por descuento/monto.
4. Facturacion desde orden de venta.
5. Estados de documento auditables.
6. Notas/terminos comerciales por cliente.

Integraciones clave:

1. CRM (origen de oportunidad).
2. CxC (saldo, pagos, vencidos).
3. Contabilidad (asientos contables).

## 2.3 Cuentas por cobrar y cobranza (Must)

Objetivo: proteger flujo de caja.

Funcionalidades minimas:

1. Estado de cuenta por cliente.
2. Aging de saldos (0-30, 31-60, 61-90, +90 dias).
3. Registro de pagos parciales y conciliacion contra facturas.
4. Alertas de vencimiento y recordatorios.
5. Promesas de pago y seguimiento.
6. KPI DSO y tasa de recuperacion.

Integraciones clave:

1. Ventas/facturacion.
2. Contabilidad general.
3. Notificaciones y cron jobs.

## 2.4 Contabilidad general (Must)

Objetivo: columna vertebral financiera ERP.

Funcionalidades minimas:

1. Catalogo de cuentas.
2. Polizas manuales y automaticas.
3. Diario general y auxiliares.
4. Conciliacion bancaria.
5. Balanza, estado de resultados y balance general.
6. Cierres mensuales y anuales con bitacora.

Integraciones clave:

1. Ventas/CxC.
2. Compras/CxP.
3. Nomina y gastos.

## 2.5 Compras y proveedores (Should)

Objetivo: gobernar gasto y suministro.

Funcionalidades minimas:

1. Solicitudes de compra (requisiciones).
2. RFQ y comparativo de proveedores.
3. Orden de compra con aprobaciones.
4. Recepcion contra OC (parcial/total).
5. Devoluciones y notas de credito proveedor.
6. Evaluacion de proveedor (tiempo, calidad, costo).

Integraciones clave:

1. Inventario.
2. CxP y contabilidad.
3. SGC (NC a proveedor).

## 2.6 Inventario avanzado (Should)

Objetivo: trazabilidad fisica y financiera de stock.

Funcionalidades minimas:

1. Multi-almacen y ubicaciones.
2. Transferencias internas con auditoria.
3. Lotes/series y caducidad (cuando aplique).
4. Ajustes de inventario con aprobacion.
5. Conteo ciclico.
6. Kardex y costo de inventario.

Integraciones clave:

1. Compras/recepciones.
2. Ventas/salidas.
3. SGC (bloqueo por no conformidad).

## 2.7 RRHH extendido (Should)

Objetivo: ciclo integral del colaborador.

Funcionalidades minimas:

1. Expediente de colaborador.
2. Asistencia, permisos y ausencias.
3. Evaluacion de desempeno.
4. Planes de capacitacion y certificaciones.
5. Incidencias conectadas a nomina.
6. KPI de rotacion y cumplimiento formativo.

Integraciones clave:

1. Nomina.
2. SGC (capacitacion y competencia).

## 2.8 BI ejecutivo (Should)

Objetivo: visibilidad para direccion.

Funcionalidades minimas:

1. Tablero comercial (pipeline, conversion, forecast).
2. Tablero financiero (ingresos, margen, cobranza).
3. Tablero operativo (cumplimiento eventos, productividad).
4. Tablero SGC (lead time NC, eficacia CAPA, reincidencia).
5. Filtros por org, unidad, periodo.
6. Exportaciones y snapshots.

## 2.9 SGC transversal (Must)

Objetivo: que SGC no sea un modulo aislado.

Funcionalidades minimas:

1. NC vinculables a cliente, proveedor, proceso o evento.
2. Acciones CAPA con responsables y vencimientos.
3. Auditorias y revisiones con evidencia.
4. Reglas de cierre y trazabilidad de cambios.
5. Indicadores de eficacia y recurrencia.
6. Integracion con DMS y notificaciones.

Integraciones clave:

1. Compras (NC proveedor).
2. Ventas/CRM (quejas cliente).
3. RRHH (capacitacion correctiva).
4. Operacion (eventos/logistica).

## 2.10 Automatizaciones y BPM (Could)

Objetivo: escalar operacion con menor carga manual.

Funcionalidades minimas:

1. Workflows de aprobacion configurables.
2. SLA y recordatorios automaticos.
3. Reglas de escalamiento.
4. Tareas recurrentes por modulo.
5. Trigger de acciones masivas auditables.

---

## 3) Secuencia recomendada de implementacion

1. CRM + Ventas + CxC.
2. Contabilidad general base.
3. Compras + Inventario avanzado.
4. RRHH extendido + BI ejecutivo.
5. Automatizaciones BPM.
6. SGC transversal en paralelo, integrando cada fase.

---

## 4) Criterio de "ERP listo"

Se considera que LEC Orb queda en nivel ERP robusto cuando:

1. Existe trazabilidad end-to-end de ingreso a cobranza.
2. Existe control financiero con reportes contables base.
3. Existe integracion operativa compras-inventario-ventas.
4. SGC impacta de forma real la operacion (no solo registro).
5. KPIs ejecutivos soportan decisiones de direccion.

