# Matriz: Excel logística Cambridge ↔ LEC Orb

Documento de referencia para digitalizar los libros locales (**IH COLEGIOS SONORA** y **LOGISTICA_UNOi**) hacia el modelo de datos de Orb.  
**Fuente canónica local:** archivos `.xlsx` acordados por operación (misma carpeta / versión controlada).

**Import en repo:** `npm run import:cambridge` — ver `scripts/import-cambridge-canonical.ts` y `src/lib/import/cambridge-canonical/`.

---

## Leyenda de estado

| Estado | Significado |
|--------|-------------|
| **Hecho** | Cobertura alineada: tabla/campo existe, flujo usable en prod o vía script estable. |
| **Parcial** | Parte mapeada; falta UI, reglas, catálogo, o el import no cubre todos los casos del Excel. |
| **Falta** | Sin modelo o sin flujo acordado; requiere diseño o migración nueva. |

---

## Libro A — IH COLEGIOS SONORA (`IH COLEGIOS SONORA 2025-2026 (1).xlsx`)

| Hoja / componente | Contenido principal | Tablas / artefactos Orb | Estado | Notas |
|-------------------|---------------------|-------------------------|--------|--------|
| **Colegios_Propuestas_Fechas** | Ciudad, proyecto, colegio, nivel, pares (conteo + fecha) por YLE/KEY/PET/FCE, propuesta, estatus, resultados | `schools`, `events`, `event_sessions` (`classrooms`, `parameters`, `exam_type`, fechas); metadatos IH en `events.parameters` | **Parcial** | Script `import-cambridge-canonical` parsea y puede crear filas (`--apply`). Falta UI de import con preview, reglas de duplicados en equipo, y filas con fechas atípicas. |
| **SALONES** | Salones / capacidad por sede | `schools.rooms` (JSON), `event_sessions.classrooms` (JSON) | **Parcial** | No hay import dedicado desde esta hoja; suele cargarse al armar sesiones o a mano. |
| **IH** | Resúmenes / datos para facturación IH | `ih_sessions`, `ih_tariffs`, `ih_invoices`, `ih_payments` | **Parcial** | Schema listo; falta puente sistemático desde el Excel “IH” a `ih_*` (import o pantalla). |
| **BAJA** | Bajas / colegios o aplicaciones fuera de ciclo | — (no hay tabla “bajas Cambridge”) | **Falta** | Candidatos: `events.status`, `schools.notes`, o tabla `cambridge_application_pipeline` / flags en `parameters`. Definir con negocio. |

---

## Libro B — LOGISTICA UNOi (`LOGISTICA_UNOi 2026.xlsx`)

### Hojas operativas por región y mes

Patrón de nombre: `HMO_*`, `OBRE_*`, `HMO-PCO *`, meses `FEB` / `MAR` / `ABRIL` / `MAYO`, etc.

| Hoja / componente | Contenido principal | Tablas / artefactos Orb | Estado | Notas |
|-------------------|---------------------|-------------------------|--------|--------|
| **Cuadrícula oral + escrito** (por hoja regional) | Sede, examen, alumnos, día, horario, Speaking Examiners (incl. `-REMOTO`), personal escrito, supervisores | `events`, `event_sessions`, `event_staff` (`SE`, `INVIGILATOR`, `SUPER`, `ADMIN`), `applicators` | **Parcial** | Parser regional en `parse-logistica-regional.ts`. Staff con `--apply-logistica-staff` requiere eventos IH alineados (misma escuela / fecha / examen). Falta generar `event_slots` y horarios finos desde el Excel. |
| **Líneas “FALTA N”** | Huecos de personal | — | **Falta** | Hoy texto libre; ideal: alertas en UI o checklist pre-evento. |

### Hojas de referencia y administración

| Hoja / componente | Contenido principal | Tablas / artefactos Orb | Estado | Notas |
|-------------------|---------------------|-------------------------|--------|--------|
| **DURACION** | Duraciones Speaking (reglas por alumnos / turnos) | Lógica en planificador / `event_sessions.parameters` / código | **Parcial** | No existe tabla catálogo 1:1 con el Excel. Pendiente: `speaking_duration_rules` (o JSON versionado por org/examen) consumido por planner y nómina. |
| **ZOOM** | Sesiones / reglas remotas | `event_sessions.delivery_mode`, `parameters` | **Parcial** | Campo `delivery_mode` existe; falta import desde hoja ZOOM y convención única en UI. |
| **MARZO / ABRIL / MAYO** (sin prefijo ciudad) | Posible agregado o copia histórica | Mismas entidades que hojas regionales | **Parcial** | Riesgo de doble verdad. Decidir si la fuente única son solo hojas `HMO_*` / `OBRE_*` y excluir estas del import automático. |
| **PRESUPUESTO GASTOS** | Presupuesto de gastos del despliegue | `budgets`, `poa_lines`, `petty_cash_*`, `travel_expense_reports` | **Parcial** | Finanzas existen; falta vínculo explícito **evento ↔ partidas** de logística y P&L por sesión como en el Excel maestro. |
| **TARIFAS UNOi_2023** | Tarifas por rol / examen / periodo | `applicators.rate_per_hour`, `event_staff.hourly_rate`, `ih_tariffs` | **Parcial** | No hay catálogo único “rol × examen × año” como la hoja. Nómina avanza con líneas por evento; alinear tarifas con esta tabla. |
| **Hoja 2 / Sheet2** | Variable | — | **Falta** | Revisar contenido; si no aporta, excluir del alcance de import. |

---

## Cruce rápido: conceptos del Excel → dónde viven en Orb

| Concepto Excel | Destino Orb principal | Estado |
|----------------|------------------------|--------|
| Colegio / escuela | `schools` | **Parcial** (import IH crea/empata por nombre) |
| Día / sesión de aplicación por examen | `events` + `event_sessions` | **Parcial** |
| Alumnos por salón / capacidad | `event_sessions.classrooms`, `parameters.candidates_count` | **Parcial** |
| Examinador oral (SE) | `event_staff.role = 'SE'` + `applicators` | **Parcial** |
| Personal escrito / vigilancia | `event_staff.role = 'INVIGILATOR'` (u `ADMIN` según negocio) | **Parcial** |
| Supervisor | `event_staff.role = 'SUPER'` | **Parcial** |
| Propuesta / estatus / resultados (IH) | `events.parameters` | **Parcial** |
| Tarifa por hora en evento | `event_staff.hourly_rate`, `fixed_payment` | **Parcial** |
| Nómina por periodo | `payroll_periods`, `payroll_entries`, `payroll_line_items`, RPC cálculo | **Parcial** (alinear migración/RPC con BD real) |
| Viáticos | `travel_expense_reports` (+ recibos) | **Hecho** módulo; **Parcial** enlace a cada `event_id` / periodo |
| Facturación IH (hoja IH) | `ih_sessions`, `ih_invoices`, `ih_payments` | **Parcial** |
| Bajas (hoja BAJA) | — | **Falta** |

---

## Próximos pasos sugeridos (prioridad)

1. **Congelar canónico:** qué hojas entran al import automático (evitar duplicar MARZO/ABRIL/MAYO sin prefijo si ya están las regionales).
2. **Completar import:** slots y horarios desde logística; opcional UI con preview.
3. **Catálogos:** migrar **DURACION** y **TARIFAS UNOi** a tablas o JSON versionado por `org_id` + año.
4. **IH financiero:** import o pantalla desde hoja **IH** → `ih_*`.
5. **BAJA + pipeline:** modelo único para estatus comercial y bajas.

---

## Referencias en el repo

| Recurso | Ruta |
|---------|------|
| Script CLI | `scripts/import-cambridge-canonical.ts` |
| Parsers | `src/lib/import/cambridge-canonical/` |
| Schema general | `docs/DATABASE_SCHEMA.md` |
| API eventos (crear con sesiones) | `src/app/api/v1/events/route.ts` |
| Staff por evento | `src/app/api/v1/events/[id]/staff/route.ts` |

---

*Última actualización: documento generado para alinear Excel local con Orb; actualizar filas conforme se cierren imports y migraciones.*
