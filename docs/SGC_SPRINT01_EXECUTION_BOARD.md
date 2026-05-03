# SGC-01 Execution Board (API + Catálogos)

Fecha de inicio sugerida: 2026-05-05  
Duración objetivo: 2 semanas  
Capacidad objetivo: 23 pts

---

## Sprint Goal

Tener API SGC mínima productiva para operar No Conformidades y Acciones CAPA con seguridad multi-tenant, auditoría y pruebas base.

---

## Equipo sugerido

- `Backend-1` (owner API NC + catálogos)
- `Backend-2` (owner API acciones + RBAC)
- `QA-1` (owner plan de pruebas + regresión)
- `Tech Lead` (owner de criterios de salida y hardening)

---

## Alcance comprometido (23 pts)

1. API NC CRUD - 5 pts
2. API Acciones CRUD - 5 pts
3. API Catálogos SGC - 3 pts
4. RBAC mutaciones + validación permisos - 3 pts
5. Tests API críticos - 5 pts
6. Documentación técnica de endpoints - 2 pts

---

## Tablero (To Do / In Progress / Done)

### To Do

1. `BE-01` - Scaffold rutas NC
   - Owner: `Backend-1`
   - Entregable: `src/app/api/v1/sgc/nonconformities/route.ts`, `src/app/api/v1/sgc/nonconformities/[id]/route.ts`
   - Puntos: 2

2. `BE-02` - Implementar list/create NC con filtros por `org_id`
   - Owner: `Backend-1`
   - Entregable: GET/POST funcional + validación payload
   - Puntos: 2

3. `BE-03` - Implementar update/delete NC y manejo de errores de transición DB
   - Owner: `Backend-1`
   - Entregable: PATCH/DELETE + mensajes de error consistentes
   - Puntos: 1

4. `BE-04` - Scaffold rutas acciones CAPA
   - Owner: `Backend-2`
   - Entregable: `src/app/api/v1/sgc/actions/route.ts`, `src/app/api/v1/sgc/actions/[id]/route.ts`
   - Puntos: 2

5. `BE-05` - Implementar list/create/update/delete acciones CAPA
   - Owner: `Backend-2`
   - Entregable: CRUD completo con filtros tenant
   - Puntos: 3

6. `BE-06` - Endpoints catálogos SGC (stages, origins, causes, severities)
   - Owner: `Backend-1`
   - Entregable: rutas de catálogo para lectura y administración
   - Puntos: 3

7. `BE-07` - Hardening RBAC en mutaciones
   - Owner: `Backend-2`
   - Entregable: verificación `admin/supervisor` + negativas 403
   - Puntos: 3

8. `QA-01` - Suite de tests API SGC
   - Owner: `QA-1`
   - Entregable: tests de happy path + permisos + errores de transición
   - Puntos: 5

9. `DOC-01` - Documentación de contratos API SGC
   - Owner: `Tech Lead`
   - Entregable: addendum en `docs/API_MODULES.md`
   - Puntos: 2

### In Progress

- Sin tareas al iniciar sprint.

### Done

- Sin tareas al iniciar sprint.

---

## Definition of Ready (DoR)

Una tarea entra a `In Progress` solo si:

1. Tiene endpoint/archivo destino claro.
2. Tiene criterios de aceptación explícitos.
3. Tiene owner asignado.
4. Tiene dependencias desbloqueadas.

---

## Criterios de aceptación por bloque

### API NC

1. GET devuelve solo registros de la `org` del usuario.
2. POST/PATCH/DELETE usa `withAuth`.
3. Mutación exitosa registra `logAudit`.
4. Errores de reglas DB se traducen a respuesta API legible.

### API Acciones

1. CRUD funcional bajo tenant correcto.
2. Transiciones inválidas no rompen el handler (respuesta controlada).
3. Permisos de escritura limitados a `admin/supervisor`.

### Catálogos

1. Lectura para miembros de la org.
2. Escritura restringida a roles autorizados.
3. No permite duplicados críticos por org.

### QA

1. Casos positivos en verde.
2. Casos 401/403/404 cubiertos.
3. Casos de transición inválida cubiertos.

---

## Dependencias técnicas

1. Migración `20260510_sgc_phase1.sql` aplicada en entorno objetivo.
2. Tipos Supabase actualizados (`src/types/database.types.ts`) tras aplicar migraciones.
3. Funciones utilitarias listas:
   - `withAuth`
   - `logAudit`

---

## Riesgos del sprint y mitigación

1. Riesgo: errores por constraints/triggers al cerrar NC
   - Mitigación: tests de transición tempranos en `BE-03` y `QA-01`
2. Riesgo: desalineación de permisos entre API y RLS
   - Mitigación: pruebas negativas por rol en cada endpoint mutante
3. Riesgo: retraso por documentación al final
   - Mitigación: `DOC-01` paralelo desde mitad de sprint

---

## Definition of Done (DoD) Sprint SGC-01

1. Todas las tareas del alcance comprometido en `Done`.
2. `npm run build` en verde.
3. `npm run lint` en verde.
4. Tests SGC API en verde.
5. Documentación actualizada:
   - `docs/API_MODULES.md`
   - `docs/CHANGELOG.md`
   - `docs/BACKLOG_SGC.md` (si cambia alcance)

---

## Checklist de cierre para demo interna

1. Crear NC -> editar -> cerrar (con y sin errores de transición).
2. Crear acción CAPA -> cambiar etapa -> cerrar.
3. Probar usuarios `operador` vs `supervisor` para permisos.
4. Verificar entradas en `audit_log` para mutaciones SGC.
5. Confirmar que no hay fugas cross-tenant en listados.

