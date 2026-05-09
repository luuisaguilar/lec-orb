---
title: "Invitaciones — campos obligatorios y contrato API"
slug: invitaciones-campos-y-api
date: 2026-05-09
updated: 2026-05-09
tags: [wiki, invitations, rbac, onboarding, zod, org_locations]
status: active
audience: [engineering]
related_components:
  - invitations-api
  - org-locations
  - hr_profiles
---

# Invitaciones: campos obligatorios y contrato `POST /api/v1/invitations`

## Por qué cambió el contrato

Las invitaciones deben **anclar al usuario a una sede** (`org_locations`) y a un **puesto** coherente con RRHH (perfil HR) o un **rol empresa** explícito. Sin eso, el alta en la org es ambigua para permisos, reportes y onboarding. Por eso el cuerpo del `POST` dejó de ser solo `email` + `role`.

## Cómo valida el servidor (orden real)

Todo ocurre en `src/app/api/v1/invitations/route.ts`:

1. **`inviteSchema` (Zod)** — Si falla → **400** `Datos invalidos` + `details` flatten. Aquí no se ha comprobado aún si el caller es admin.
2. **Rol miembro** — Si no es `admin` → **403** `Forbidden: Admins only`.
3. **`isAssignableOrgLocation`** — Comprueba que `location` (nombre exacto) exista en `org_locations` para `org_id`, `is_active = true`. Si no → **400**.
4. **`resolveInviteJobFields`** — Resuelve `job_title` final y `hr_profile_id` permitidos para insert. Si perfil HR inválido o sin título → **400** con mensaje específico.
5. **`insert` en `org_invitations`** — Incluye `job_title`, `hr_profile_id`, `location`, etc.
6. **Email opcional** — `sendInvitationEmail` si `sendEmail` es true; la respuesta puede incluir `emailSent` / `emailError`.

**Implicación para tests y clientes:** un `POST` sin `location` o sin puesto (ni `job_title` ni `hr_profile_id`) **siempre** devuelve **400** antes que **403**, aunque el usuario no sea admin.

## Esquema Zod (referencia)

Campos del objeto JSON:

| Campo | Tipo | Notas |
|-------|------|--------|
| `email` | string email | Obligatorio. |
| `role` | enum | `admin` \| `supervisor` \| `operador` \| `applicator`. |
| `sendEmail` | boolean | Opcional; default `true`. |
| `location` | string 1–200 | Obligatorio; debe coincidir con nombre en catálogo de sedes. |
| `job_title` | string ≤200 | Opcional si hay `hr_profile_id`; si no hay perfil, el texto debe ser no vacío tras trim (rol empresa). |
| `hr_profile_id` | UUID opcional | Vacío/`""`/`__custom__` se normaliza a ausente. Si está, debe existir en `hr_profiles` para la org. |
| `expiresInDays` | int 1–60 | Opcional; caducidad personalizada. |

**Regla cruzada (`superRefine`):** debe existir **al menos uno** de `hr_profile_id` válido en cliente **o** `job_title` con texto tras trim.

## Funciones de soporte

| Función | Archivo | Responsabilidad |
|---------|---------|-----------------|
| `isAssignableOrgLocation` | `src/lib/org/validate-location.ts` | Match exacto por nombre de sede activa. |
| `resolveInviteJobFields` | `src/lib/invitations/resolve-invite-job.ts` | Si hay `hr_profile_id`, toma `role_title` del perfil; si no, usa `job_title` manual. |

## Respuestas HTTP típicas

| Código | Cuándo |
|--------|--------|
| 200 | Invitación creada; cuerpo incluye `invitation`, `joinUrl`, y si aplica `emailSent` / `emailError`. |
| 400 | Validación Zod, sede inválida, o resolución de puesto fallida. |
| 403 | Miembro autenticado pero no admin. |

## Integración con onboarding

Guía extendida de flujos y copy: [ONBOARDING_INVITACIONES_Y_GUIAS](../ONBOARDING_INVITACIONES_Y_GUIAS.md).

Decisión histórica RPC / invitaciones: [ADR-001](../adr/ADR-001-invitation-rpc.md).

## Pruebas automatizadas

Los casos en `src/tests/api/invitations.test.ts` deben enviar **`location`** y **`job_title`** (o mockear `resolveInviteJobFields` / `isAssignableOrgLocation`) para cubrir 200/403; de lo contrario solo se ejercita el camino 400 de validación.

## Ver también

- [Índice Wiki](./README.md)
- [Mapa de documentación (MOC)](../index.md)

---

*Documento técnico; mantener sincronizado si cambia `inviteSchema` o políticas de sede/puesto.*
