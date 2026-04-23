# Roadmap — LEC Orb

Última actualización: Abril 2026

---

## Estado Actual

### Completado

- Multi-tenant auth (aislamiento por `org_id`, RLS en todas las tablas)
- Flujo de invitaciones completo (crear → joinUrl → aceptar con RPC atómica)
- Módulo CENNI — 5 estatus, campos `fecha_recepcion`, `fecha_revision`, `motivo_rechazo`
- Finanzas — Caja Chica (movimientos, balance RPC, comprobantes) + Presupuesto (comparativo)
- Módulos operativos: Events, Applicators, Schools, TOEFL, Payroll
- Audit log, notificaciones, gestor de documentos (DMS)
- Cobertura Vitest: 26 archivos, 143 tests, 21/21 módulos API

### Pendiente / Con advertencia

- Email de invitaciones — `RESEND_API_KEY` y `RESEND_FROM_EMAIL` no configurados en Vercel.
  Los emails no se envían; el `joinUrl` es el fallback manual actual.

---

## Prioridad Alta

### 1. Configurar RESEND en Vercel

Agregar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en Vercel Dashboard.
Sin esto, los emails de invitación no se envían y el admin debe compartir el `joinUrl` manualmente.

Ver: `docs/RUNBOOK.md` → sección Variables de Entorno.

### 2. Dashboard CENNI por estatus

Vista de resumen con:
- Cards de conteo por cada uno de los 5 estatus
- Gráfica de distribución
- Filtro rápido por estatus en la tabla principal

### 3. Expiración de invitaciones (`expires_at`)

Agregar campo `expires_at TIMESTAMPTZ` a la tabla `org_invitations`.
- La RPC `fn_accept_invitation` debe rechazar invitaciones expiradas
- La UI debe mostrar el estado "Expirada" en el historial
- Job o trigger para marcar como expiradas automáticamente

---

## Prioridad Media

### 4. KPI cards y gráficas en Caja Chica

- Resumen visual de ingresos vs egresos por mes
- Gráfica de tendencia de balance
- Preview de comprobantes inline (sin salir del módulo)

### 5. Staging environment

- Crear un proyecto Supabase de staging separado
- Org de prueba dedicada con datos semilla
- Deploy automático de rama `develop` a Vercel Preview con vars de staging

### 6. Regenerar `database.types.ts`

Después de aplicar la migración CENNI (`20260422_cenni_estatus_and_new_fields.sql`),
regenerar los tipos TypeScript:

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

---

## Prioridad Baja

### 7. ADR formales

Documentar decisiones de arquitectura en `docs/adr/`.
Base inicial ya creada (ADR-001 a ADR-003). Continuar para nuevas decisiones relevantes.

### 8. E2E tests actualizados

Actualizar los tests Playwright para cubrir:
- Flujo completo de invitaciones con auth real
- Aceptación de invitación con token válido/inválido
- Flujo CENNI completo (crear, cambiar estatus, agregar motivo de rechazo)
