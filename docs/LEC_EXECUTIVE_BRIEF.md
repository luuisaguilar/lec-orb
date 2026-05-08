# LEC Executive Brief

Ultima actualizacion: 2026-05-07
Fuente principal: `README.md`, `PROJECT_CONTEXT.md`, `HANDOFF.md`, `docs/ROADMAP.md`.

---

## 1) Perfil de la empresa

**Languages Education Consulting (LEC)** es una organizacion enfocada en evaluacion y operacion educativa de idiomas, con lineas activas documentadas en Cambridge, TOEFL y CENNI.

El enfoque operativo actual integra:
- aplicacion/logistica de examenes,
- control financiero por unidad,
- gestion de calidad (SGC),
- soporte administrativo transversal (RRHH, inventario, viaticos, proyectos).

---

## 2) Propuesta de valor observada

LEC combina operacion academica y control administrativo en una sola plataforma (`LEC Orb`) para:
- reducir dependencia de procesos manuales y Excel,
- mejorar trazabilidad de ejecucion y cobranza,
- elevar consistencia operativa entre sedes y equipos,
- soportar toma de decisiones con indicadores financieros y operativos.

---

## 3) Modelo operativo clave (Cambridge)

Cadena principal documentada:

`Cambridge / Sistema Uno -> IH -> LEC -> Escuelas`

Flujo de cobro descrito:
1. LEC aplica examenes por sesion en escuela.
2. Se consolidan sesiones en factura mensual para IH.
3. IH paga por transferencia.
4. LEC concilia aplicado vs cobrado y calcula pendientes.
5. Se da seguimiento por antiguedad de cobranza (CxC).

Esto posiciona a Cambridge como la linea con mayor peso operativo y financiero en la documentacion actual.

---

## 4) Huella operativa

- Presencia documentada: Sonora, Baja California y Nuevo Leon.
- Modelo multi-organizacion habilitado en sistema (aislamiento por `org_id`).
- Procesos ya digitalizados o en despliegue: caja chica, presupuesto, viaticos, nomina operativa, SGC, inventario y gestion de eventos.

---

## 5) Capacidades empresariales ya consolidadas en plataforma

- **Control financiero:** caja chica, presupuesto/POA, viaticos, nomina por rol y bases para P&L consolidado.
- **Operacion academica/logistica:** eventos, aplicadores, sesiones, conciliacion de flujos ligados a examenes.
- **Calidad y cumplimiento interno:** estructura SGC con NC/CAPA/auditoria y trazabilidad.
- **Gobierno de acceso:** multi-tenant con RBAC y auditoria por eventos.

---

## 6) Prioridades estrategicas (segun roadmap operativo)

- Consolidar dashboard gerencial de P&L multi-modulo.
- Completar automatizacion de observabilidad operativa.
- Estandarizar la gestion transversal de proyectos (modulo PM).
- Reducir drift documental y cerrar pendientes de hardening tecnico.

---

## 7) Riesgos empresariales actuales

- **Dependencia historica de procesos manuales** en ciertos frentes y datos heredados.
- **Desfase entre documentos de estado** (algunas piezas reportan implementado y otras pendiente).
- **Definiciones de KPI de direccion aun incompletas** en un solo documento ejecutivo.

---

## 8) Vacios de contexto para direccion (por cerrar)

Para tener un contexto corporativo 100% completo todavia faltan fuentes oficiales de:
- mision/vision/objetivos institucionales vigentes,
- estrategia comercial consolidada (segmentos, canales, conversiones),
- KPIs ejecutivos de negocio (ingresos por linea, margen por unidad, CAC/LTV/churn),
- metas 12-24 meses con responsables y umbrales de exito.

---

## 9) Decisiones recomendadas (proximos 30 dias)

1. Publicar un documento unico de direccion con estrategia, objetivos y KPIs corporativos.
2. Definir fuente oficial para ingresos MTD (facturado vs cobrado) en tableros ejecutivos.
3. Establecer corte de "estado canonico" para evitar contradicciones entre roadmap/handoff.
4. Acordar criterio de "ERP listo" (funcional, financiero y operativo) con fecha objetivo.
