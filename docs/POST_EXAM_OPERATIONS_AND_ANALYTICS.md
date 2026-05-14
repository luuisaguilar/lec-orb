# Planificación Arquitectónica: Operaciones Post-Evento y Coordinación Logística

Este documento define la arquitectura y el flujo de trabajo para el ciclo de vida de un evento una vez que la planeación de fechas y aplicadores ha concluido. El objetivo es cubrir la recolección de documentos (DMS), el control estricto de inventario seguro (USBs, Speaking Packs), el registro de resultados, la gestión de certificaciones y la generación de reportes analíticos.

## 1. Módulo de Documentación Operativa (Event DMS)

Actualmente existe la tabla global `documents`. Se integrará al contexto de un evento para que los coordinadores tengan un "Expediente Digital" por aplicación.

### Tipos de Documentos por Evento (Clasificación)
- **Pre-evento**: 
  - Listas de candidatos inscritos (Excel/CSV).
  - *Seating Plans* y *Speaking Schedules*.
  - Solicitudes de Requerimientos Especiales (Special Arrangements).
- **Post-evento**:
  - Actas de Cierre y Reportes de Incidencias (Supervisor Reports).
  - Listas de asistencia firmadas (Scans).
  - Fotos de evidencia (si aplica).

### Vinculación con Certificaciones
Al estar vinculada a un evento (`event_id`), la documentación hereda el `exam_type` (OOPT, Cambridge, TOEFL, IELTS). Esto permite búsquedas globales de cumplimiento (ej. *Compliance Audits*).

---

## 2. Control de Inventario de Seguridad (Speaking Packs y USBs)

Basado en los estrictos requerimientos de Cambridge para el manejo de material de examen (*Secure Area Logging*). El actual módulo de inventario (`packs`) se expandirá para soportar no solo *Speaking Packs* sino también **USBs de Audio** y otros materiales controlados.

### Cambios al Esquema de Inventario
1. **Tipos de Material (`pack_type`)**: Clasificar en `SPEAKING_PACK`, `USB_AUDIO`, `TEST_PAPERS`.
2. **Log de Custodia Estricto (Movements)**: Modificar `movements` (o crear una vista/tabla de auditoría) para capturar exactamente el formato de Cambridge:
   - `Session Date` (Fecha del examen)
   - `Time Out` / `Date of removal` (Hora y fecha exacta de salida del área segura).
   - `Recipient` / `Signature` (Nombre y firma digital/acuse del aplicador o SE).
   - `Return Date` / `Return Time` (Hora exacta de reingreso al área segura).
   - `Returner Signature` (Firma digital de quien recibe el material de vuelta).

### Flujo Operativo en el Sistema
1. El coordinador de exámenes (Administrador del Área Segura) prepara los USBs y Speaking Packs.
2. Al entregarlos al aplicador, el sistema genera el **Log de Salida** con hora exacta. El aplicador firma de recibido (en una tablet/celular o aceptando una notificación en su portal).
3. Al terminar el evento, el aplicador devuelve el material. El coordinador registra el **Log de Entrada** asegurando que no se haya perdido ni copiado ningún material.

---

## 3. Gestión de Resultados (Scores & Results)

Estructura para almacenar a nivel granular los resultados de cada estudiante, independientemente de la casa certificadora.

### Propuesta de Esquema de Base de Datos (SQL)
```sql
CREATE TABLE public.event_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id),
    candidate_number TEXT, 
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    internal_id TEXT, -- Matrícula
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.candidate_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.event_candidates(id),
    exam_type TEXT NOT NULL,
    overall_score NUMERIC,
    overall_grade TEXT,
    component_scores JSONB, -- Ej. {"reading": 140, "writing": 150, "listening": 130, "speaking": 160}
    status TEXT DEFAULT 'PENDING'
);
```
**Flujo de Captura**: Importador genérico CSV para mapear masivamente los resultados entregados por las certificadoras a la base de datos de LEC.

---

## 4. Gestión y Rastreo de Certificaciones

Rastreo de la cadena de custodia de certificados emitidos.

### Flujo de Custodia (Cadena de Entrega)
1. **Recepción (LEC)**: Status = `RECEIVED_AT_LEC`.
2. **Armado**: Se agrupan por colegio y se imprime "Acuse de Entrega" (PDF).
3. **En Tránsito**: Status = `IN_TRANSIT`.
4. **Entregado al Colegio**: La escuela firma de recibido, LEC escanea el acuse y lo sube al DMS del evento. Status = `DELIVERED_TO_SCHOOL`.

---

## 5. Analítica y Reportes (Analytics)

### Reportes de Rendimiento por Colegio (School Reports)
- **Tasa de Aprobación**: Porcentaje que logró la banda objetivo (Ej. B2 en FCE).
- **Desempeño por Habilidad**: Radares mostrando fortalezas y debilidades (ej. fuerte en Reading, débil en Speaking).

### Analítica Interna para LEC (Executive Dashboard)
- **Volumen por Certificación**: OOPT vs Cambridge.
- **Tasa de Anomalías**: Eventos con reportes de incidencias o pérdida de material.
- **Eficiencia de Evaluadores (SEs)**: Correlación y consistencia de puntajes otorgados en Speaking.

---

## Fases de Implementación Propuestas (Sprints)

1. **Sprint A (Seguridad de Materiales y Fundamentos Documentales)**:
   - Expansión de inventario para USBs y log estricto de Cambridge (*Time out / Time return*).
   - UI en detalles de evento para drag & drop de archivos (DMS).
2. **Sprint B (Ingesta de Candidatos y Resultados)**: Tablas `event_candidates` y `candidate_results`, junto con el módulo de importación y mapeo de CSV.
3. **Sprint C (Logística de Certificados)**: Estados de entrega y generación de PDF de Acuses de Recibo.
4. **Sprint D (Analítica)**: Dashboards académicos cruzando la data de resultados por escuela.
