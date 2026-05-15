---
title: "Coordinación proyectos LEC — guía operativa"
slug: coordinacion-proyectos-lec-wiki
date: 2026-05-15
updated: 2026-05-15
tags: [wiki, coordinacion-proyectos-lec, operations]
status: active
audience: [operations, product, engineering]
related_components:
  - coordinacion-proyectos-lec
---

# Coordinación proyectos LEC — guía operativa

Cómo usar el **hub de indicadores** que reemplaza los Excels de concentrado (INDICADORES PROYECTOS, EXAMENES 2026, cursos). Documentación técnica: [COORDINACION_PROYECTOS_LEC.md](../COORDINACION_PROYECTOS_LEC.md). Checklist de release: [coordinacion-proyectos-lec-auditoria-ui-runbook.md](./coordinacion-proyectos-lec-auditoria-ui-runbook.md).

**No confundir con:** [Proyectos (Empresa)](../PROJECT_MANAGEMENT_MODULE.md) (`project-management` / Kanban).

---

## 1. Cuándo usar este módulo

| Usar coordinación proyectos LEC | Usar PM empresa |
|--------------------------------|-----------------|
| Reportar ingresos, beneficiados, evidencias por mes | Gestionar tareas y tableros internos |
| Registrar líneas de examen vendidos | Seguimiento operativo de entregables |
| Oferta de cursos operativos (fechas, participantes) | — |
| Comparativos KPI por tamaño (MI/C/M/G) | — |

---

## 2. Cómo entrar

| Vía | Ruta |
|-----|------|
| Sidebar | **Coordinación de proyectos** → **Overview** |
| URL directa | `/dashboard/coordinacion-proyectos-lec` |
| Desde exámenes | `/dashboard/coordinacion-examenes/proyectos` (enlace rápido) |

**Permiso:** slug `coordinacion-proyectos-lec` en tu perfil (`member_module_access`). Roles típicos con acceso: admin, supervisor, operador.

---

## 3. Pestañas principales

| Pestaña | Para qué sirve |
|---------|----------------|
| **Overview** | Resumen del año: conteos, sumas de ingresos y beneficiados |
| **Concentrado** | Proyectos institucionales por mes (`lec_program_projects`) |
| **Exámenes** | Líneas mensuales tipo Excel exámenes |
| **Cursos** | Ofertas operativas (`lec_course_offerings`) — distinto del simulador en Académico |
| **Importar** | Carga masiva JSON (hasta 2000 filas por entidad) |

**Solo en sidebar (mismo permiso):**

| Enlace sidebar | Ruta |
|----------------|------|
| Catálogos | `…/catalogos` |
| Evidencias | `…/evidencias` |
| Comparativos | `…/comparativos` |

---

## 4. Departamentos (catálogo)

Al crear la org se cargan departamentos por defecto:

1. Coordinación Exámenes  
2. Baja California  
3. Feria del Libro  
4. Coordinación Académica  
5. Coordinación de Proyectos  

Puedes editarlos en **Catálogos**. El departamento clasifica filas del concentrado; **no** cambia el menú lateral.

Ver [COORDINACIONES_LEC_ARQUITECTURA.md](../COORDINACIONES_LEC_ARQUITECTURA.md) para la relación con los otros tres ejes.

---

## 5. Enlaces a otros módulos

Al capturar un proyecto en **Concentrado**, opcionalmente vincula:

| Campo | Módulo |
|-------|--------|
| Escuela | Directorio → Escuelas |
| Evento | Eventos / Coordinación exámenes |
| Oportunidad CRM | CRM pipeline |
| Proyecto PM | Proyectos (Empresa) |

Esto permite trazabilidad sin duplicar datos maestros.

---

## 6. Importación desde Excel

1. Ir a **Importar**.
2. Elegir entidad: `program_projects` o `exam_sales_lines`.
3. Pegar JSON con columnas flexibles (nombres tipo Excel aceptados — ver API en doc técnica).
4. Revisar resumen de filas creadas/actualizadas.

**Tip:** importar por mes y departamento reduce errores de clasificación.

---

## 7. Evidencias y cierre

En **Evidencias** aparecen proyectos con URLs de evidencia pendientes o checklist incompleto. Completar:

- `evidence_office_url`, `evidence_satisfaction_url`, `evidence_survey_url`
- Marcar `checklist_done` cuando aplique

---

## 8. Roles y restricciones

| Rol | Ver | Editar / importar |
|-----|-----|-------------------|
| admin | Sí | Sí |
| supervisor | Sí | Sí |
| operador | Sí | Sí (según permisos por miembro) |
| applicator | No (portal aparte) | No |

**Sede (futuro):** operadores de Baja California deberían ver solo filas de su región cuando se active RLS por sede — [sedes-multisede-y-aislamiento-operativo.md](./sedes-multisede-y-aislamiento-operativo.md).

---

## 9. Soporte y cambios

| Necesidad | Contacto / acción |
|-----------|-------------------|
| Falta permiso al módulo | Admin org → Usuarios → acceso módulos |
| Error en import | Revisar formato JSON; ver logs auditoría |
| Cambio de catálogo departamentos | Catálogos en UI o API catalog |

Para desarrollo: actualizar [COORDINACION_PROYECTOS_LEC.md](../COORDINACION_PROYECTOS_LEC.md) y tests en `src/tests/api/coordinacion-proyectos.test.ts`.

---

Volver a [auditoría coordinaciones](./auditoria-coordinaciones-sidebar.md) o al **[índice wiki](./README.md)**.
