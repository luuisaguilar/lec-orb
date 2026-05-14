---
title: "Coordinación proyectos LEC — guía operativa y wiki"
slug: coordinacion-proyectos-lec-wiki
date: 2026-05-14
updated: 2026-05-14
tags: [wiki, projects, indicators, exams, courses, navigation, supabase]
status: active
audience: [engineering, operations]
related_components:
  - coordinacion-proyectos-lec
  - module-registry
  - sidebar-nav
---

# Coordinación proyectos LEC — guía operativa

Este módulo digitaliza el **concentrado de proyectos** (indicadores por mes/departamento/producto), el **registro mensual de exámenes** vendidos/aplicados y el **catálogo operativo de cursos** (cohortes con fechas y precio). Complementa Eventos, Escuelas, CRM y Documentos sin reemplazarlos.

**Documentación técnica completa:** [COORDINACION_PROYECTOS_LEC.md](../COORDINACION_PROYECTOS_LEC.md)  
**API detallada:** [API_MODULES.md](../API_MODULES.md) (sección Coordinación proyectos LEC)

---

## 1. Cómo acceder

1. Inicia sesión en LEC Orb con un rol que tenga el módulo en `member_module_access` (semilla automática en migración para admin/supervisor/operador existentes).
2. En el sidebar, bajo **Coordinación de proyectos**: enlace principal **Coordinación de proyectos (LEC)** y entradas **Catálogos**, **Evidencias**, **Comparativos**; el resto de secciones sigue en **pestañas** arriba del contenido. Convenciones: [sidebar-modulos-y-agrupacion](./sidebar-modulos-y-agrupacion.md).
3. Atajo adicional: desde **Coordinación de Exámenes → Proyectos (Coordinación)** (`/dashboard/coordinacion-examenes/proyectos`) hay enlace directo al mismo módulo.

Si no ves el menú: revisar permisos en **Usuarios** o que la migración `20260614_coordinacion_proyectos_lec.sql` esté aplicada y el slug `coordinacion-proyectos-lec` exista en `module_registry`.

---

## 2. Subpantallas (qué hace cada una)

| Pestaña | Uso diario |
|---------|------------|
| **Overview** | Totales del año: número de proyectos, beneficiarios, ingreso proyectos, conteos de líneas de examen y cursos. Alerta “sin ingreso” en proyectos. |
| **Concentrado** | Tabla del Excel de indicadores (una fila = un proyecto institucional). |
| **Exámenes** | Tabla tipo hoja mensual EXAMENES (candidato o escuela, examen, cantidades, montos). |
| **Cursos** | Cursos reales impartidos (fechas, participantes, precio). **No** es el simulador de márgenes en Académico. |
| **Catálogos** | Departamentos, tipos de examen y producto/servicio — sirven para normalizar nombres (evitar “COORDINACION EXAMNES” duplicado). |
| **Evidencias** | Lista proyectos con oficio, carta, encuesta o checklist pendientes. |
| **Importar** | Pega un arreglo JSON para carga masiva (ver sección 4). |
| **Comparativos** | Edita conteos 2025 / 2026 / proyectado por bucket (grandes, medianos, chicos, micro, totales). |

---

## 3. Relación con otros módulos LEC

```text
Excel / operación manual
        ↓
  Coordinación proyectos LEC (este módulo)
        ↘ opcional                    ↘ opcional
    Eventos + Escuelas          CRM (oportunidad)
        ↘
    Documentos (evidencias PDF / enlaces)
        ↘
    Proyectos (Empresa) Kanban  ← solo si se enlaza pm_project_id
```

- **Eventos / escuelas:** usar `event_id` y `school_id` cuando la fila nazca de una sesión o cliente ya digitalizado.
- **CRM:** vincular `crm_opportunity_id` para trazabilidad comercial.
- **Documentos:** guardar URLs en `evidence_office_url`, `evidence_satisfaction_url`, `evidence_survey_url` o evolucionar a FK a `documents`.
- **PM (Proyectos Empresa):** usar solo si el equipo quiere tablero de tareas **separado** del concentrado numérico.

---

## 4. Importación masiva (pantalla Importar)

1. Elige entidad: **Concentrado de proyectos** o **Líneas de exámenes**.
2. Pega un JSON que sea un **arreglo** de objetos (máx. 2000 filas por petición).

### 4.1 Proyectos (`entity: "program_projects"`)

El backend intenta reconocer columnas similares al Excel de indicadores (mayúsculas/minúsculas flexibles):

| Campo reconocido | Ejemplo | Notas |
|------------------|---------|--------|
| `Mes` / `mes` / `MES` | `ENE`, `FEB`, … | Se convierte al primer día del mes del **año calendario actual** del servidor al importar; para otro año, normaliza fechas en API o amplía el importador. |
| `Departamento` | Debe coincidir (sin distinguir mayúsculas) con un nombre en `lec_cp_departments`. |
| `Descripción` / `descripcion` | Texto obligatorio. |
| `Tipo de cliente` / `client_type` | Default `Institución`. |
| `Producto/Servicio` / `product_service` | Se resuelve a `product_service_id` si coincide con catálogo; si no, se guarda `product_service_label`. |
| `Beneficiados` / `beneficiaries` | Entero. |
| `Ingreso` / `ingreso` / `revenue` | Numérico. |
| `Tamaño` / `size` | `MI`, `C`, `M`, `G`. |

### 4.2 Exámenes (`entity: "exam_sales_lines"`)

| Campo | Notas |
|-------|--------|
| `exam_month` o `Mes` | Fecha `YYYY-MM-DD` o etiqueta de mes como arriba. |
| `Nombre del candidato / institución` / `candidate_or_institution` / `Nombre` | Obligatorio. |
| `Examen solicitado` / `examen` / `exam_type_label` | Se mapea a catálogo `lec_cp_exam_types` por nombre. |
| `Cantidad aplicados` / `quantity` | Default 1. |
| `Monto acumulado` / `monto` / `amount` | Opcional. |
| `Confirmación`, `Correo electrónico`, `Celular` | Opcionales. |

Si una fila falla validación Zod, se omite y el mensaje aparece en el array `errors` de la respuesta (máx. 50 mensajes devueltos).

---

## 5. Operación en Supabase

- **Migración:** `supabase/migrations/20260614_coordinacion_proyectos_lec.sql` (no editar migraciones ya aplicadas; solo añadir nuevas).
- **RLS:** no desactivar en tablas `lec_*`.
- **Tipos TypeScript:** regenerar `database.types.ts` tras aplicar migración.

---

## 6. Diferencia clara vs “Proyectos (Empresa)”

| Pregunta | Coordinación proyectos LEC | Proyectos (Empresa) |
|----------|---------------------------|---------------------|
| ¿Es Kanban? | No | Sí (`pm_tasks`, columnas, etc.) |
| ¿Lleva ingresos y beneficiados por fila? | Sí | No (es gestión de trabajo) |
| ¿Reemplaza el Excel de indicadores? | Objetivo sí | No |

---

## 7. Referencias de código

| Qué | Dónde |
|-----|--------|
| Rutas dashboard | `src/app/(dashboard)/dashboard/coordinacion-proyectos-lec/` |
| API | `src/app/api/v1/coordinacion-proyectos/` |
| Zod + slug módulo | `src/lib/coordinacion-proyectos/schemas.ts` |
| Sidebar | `src/components/sidebar-nav.tsx` (`NATIVE_ROUTES`) |
| Hub coordinación exámenes | `src/app/(dashboard)/dashboard/coordinacion-examenes/proyectos/page.tsx` |

---

Volver al **[índice del Wiki](./README.md)** o al **[MOC principal](../index.md)**.
