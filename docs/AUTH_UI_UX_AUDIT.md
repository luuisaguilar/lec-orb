# Auth UI/UX Audit (Login Focus)

Fecha: 2026-05-07  
Alcance: `src/app/(auth)/login/page.tsx` con referencia de consistencia frente a `register`, shell y branding LEC.

---

## Hallazgos principales

1. **Flujo portal sin contexto visual**
   - Antes del ajuste, cuando el usuario venia de `/join-portal/[token]`, el login no explicaba que debia usar el correo invitado.
   - Impacto: errores de vinculacion y confusion en soporte.
   - Estado: **corregido** con un banner contextual en login cuando `next` inicia con `/join-portal/`.

2. **Navegacion auth inconsistente**
   - En login se usaba `<a href="/register">` en lugar de `Link`, lo que puede romper transiciones y manejo consistente del router de Next.
   - Estado: **corregido** (migrado a `Link`).

3. **Sistema de estilos parcialmente divergente entre login y register**
   - Login usa estilo "glass dark premium" con logo asset.
   - Register usa estilo mas plano y branding textual (sin asset completo del logo).
   - Impacto: experiencia visual no uniforme en entrypoint de autenticacion.
   - Estado: **pendiente de homologacion** (recomendado siguiente sprint).

---

## Criterios de diseño LEC a preservar

- Identidad visual de alto contraste oscuro + acentos primarios.
- Uso consistente del logo oficial (`/lec_logo_pack/lec_logo_full.png`) en pantallas auth.
- Tipografia y jerarquia premium (headline fuerte + subtitulo corto).
- Mensajeria de ayuda orientada a tarea (contextual por flujo: normal vs portal).

---

## Acciones implementadas en esta iteracion

- Login muestra aviso contextual para flujo de portal:
  - "usa el mismo correo invitado" cuando `next=/join-portal/...`.
- Enlace a registro estandarizado con `Link`.
- Redireccion post-login por tipo de cuenta ya habilitada:
  - aplicador vinculado -> `/portal`
  - invitacion portal pendiente -> `/join-portal/[token]`
  - resto -> `/dashboard`

---

## Recomendaciones siguientes (UI/UX)

1. Homologar visual de `register` al mismo sistema de `login` (misma familia de card, logo y fondo).
2. Unificar copy de auth en diccionario i18n para reducir textos hardcoded.
3. Agregar microestado de "cargando destino" despues de submit exitoso, antes del redirect.
4. Definir checklist QA visual de auth:
   - desktop + mobile,
   - dark/light si aplica,
   - flujos normales y de invitacion portal.

---

## Decision operativa sobre aplicadores (contexto funcional)

Crear cuenta en auth **no** crea automaticamente registro en `applicators`.  
El registro de aplicador se mantiene como entidad operativa administrada por LEC y luego se vincula con `auth_user_id` via invitacion o asignacion interna.
