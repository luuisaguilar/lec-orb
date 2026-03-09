# Auditoría completa de cambios (commit `3f8ffab` vs `55468d4`)

## Alcance
- Se revisaron los cambios introducidos en el commit `3f8ffab` respecto a `55468d4`.
- Resultado del diff: **53 archivos modificados**, **5408 inserciones**, **446 eliminaciones**.
- Se evaluaron áreas de seguridad, control de acceso, calidad de código, mantenibilidad y estado de build/lint.

## Resumen ejecutivo
- El cambio agrega funcionalidades grandes y estratégicas: Studio (módulos dinámicos), DMS de documentos y sistema de notificaciones.
- Hay valor funcional alto, pero el estado actual **no está listo para producción** por errores de lint que bloquean CI y una brecha de autorización en lectura de registros dinámicos.
- Build no validado end-to-end por dependencia externa de Google Fonts en este entorno.

## Hallazgos

### 1) [ALTA] Lectura de registros dinámicos sin validar permisos de módulo por rol
**Archivo:** `src/app/api/v1/modules/[slug]/records/route.ts`

En `GET /api/v1/modules/[slug]/records`, se valida usuario/org y que el módulo exista, pero no se valida `module_permissions.can_view` para roles no admin antes de listar registros. Esto permite que miembros de la organización lean registros de módulos custom aunque ese rol no tenga visibilidad funcional esperada.

- Evidencia de lectura sin check por rol en GET. 
- Sí existe validación de permisos en `POST` para `can_create`, lo cual deja inconsistencia entre lectura y escritura.

**Riesgo:** exposición de datos internos entre roles (p. ej., operador/aplicador leyendo módulos que deberían estar ocultos).

**Recomendación:** replicar patrón de autorización por rol (`can_view`) en GET de listado y GET por `recordId`.

### 2) [MEDIA] GET por ID de registro también carece de validación `can_view`
**Archivo:** `src/app/api/v1/modules/[slug]/records/[recordId]/route.ts`

El endpoint `GET /api/v1/modules/[slug]/records/[recordId]` valida pertenencia org y módulo, pero no verifica permisos de visibilidad por rol.

**Riesgo:** bypass de UI y acceso directo por URL/API a registros específicos.

**Recomendación:** exigir `can_view` para no-admin igual que en listado.

### 3) [MEDIA] Error de lint por comillas sin escapar en JSX (rompe `npm run lint`)
**Archivo:** `src/app/(dashboard)/dashboard/studio/StudioClient.tsx`

Hay comillas dobles literales en JSX que violan `react/no-unescaped-entities`.

**Impacto:** pipeline de lint falla.

**Recomendación:** escapar como `&quot;` o estructurar el texto evitando comillas directas.

### 4) [MEDIA] Error de lint por creación de componente durante render
**Archivo:** `src/components/dynamic/DynamicModule.tsx`

La línea `const ModuleIcon = getIcon(module.icon);` crea un componente dinámico durante render y dispara regla `react-hooks/static-components`.

**Impacto:** lint falla y potenciales re-mounts innecesarios.

**Recomendación:** resolver icono fuera del render o mapear a componente estable/memoizado.

### 5) [BAJA] Deuda técnica por warnings de variables no usadas
Hay múltiples warnings de no-unused-vars en páginas y APIs nuevas.

**Impacto:** ruido en CI, reduce señal de errores reales, dificulta mantenimiento.

**Recomendación:** limpiar imports/vars no usadas antes de promover release.

### 6) [INFORMATIVO] Endpoint de recálculo de eventos fue deprecado correctamente
**Archivo:** `src/app/api/v1/events/[id]/recalculate/route.ts`

El endpoint antiguo ahora responde `410` con mensaje de deprecación y redirección funcional al endpoint por sesión. Cambio positivo para integridad del planner.

## Verificaciones ejecutadas
- `npm run lint` → falla con **3 errores** y **26 warnings**.
- `npm run build` → falla en este entorno por descarga de fuentes de Google (`Geist`, `Geist Mono`).

## Recomendación de salida a producción
**No aprobar para producción todavía**.

### Criterios mínimos de cierre
1. Corregir autorización `can_view` en GET de records (listado + detalle).
2. Dejar `npm run lint` en cero errores.
3. Revalidar build en entorno con acceso a fuentes (o self-host de fuentes para eliminar dependencia externa).
4. Añadir tests de autorización para módulos dinámicos por rol.
