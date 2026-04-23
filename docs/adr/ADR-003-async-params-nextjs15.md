# ADR-003 — Tipificar params y searchParams como Promise en páginas server de Next.js 15+

**Estado:** Aceptado  
**Fecha:** 2026-04-23  
**PR:** #13

---

## Contexto

En Next.js 15+, los props `params` y `searchParams` de las páginas server-side son
**Promises**, no objetos síncronos. En Next.js 14 y anteriores, eran objetos directos.

El problema es que Next.js 15 en desarrollo muestra un warning pero permite acceder a los
valores síncronamente (via un Proxy que resuelve la Promise). Sin embargo, en producción
(y en builds con `next build`), el acceso sin `await` produce un "Application error".

Esto causó el crash en `/join/[token]/page.tsx` cuando accedía a `params.token` directamente.

## Decisión

**Todas las páginas dinámicas server-side** deben tipar `params` y `searchParams` como
`Promise<{...}>` y hacer `await` antes de acceder a sus valores.

```tsx
// Patrón INCORRECTO — falla en producción con Next.js 15+
interface Props {
  params: { token: string };
  searchParams: { error?: string };
}

export default async function Page({ params, searchParams }: Props) {
  const token = params.token;       // crash en producción
  const error = searchParams.error; // crash en producción
}
```

```tsx
// Patrón CORRECTO — obligatorio en este proyecto
interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function Page({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
}
```

Este patrón aplica a:
- Cualquier página con segmentos dinámicos en la ruta (`[id]`, `[token]`, `[slug]`, etc.)
- Cualquier página que lea `searchParams` en un componente server-side

No aplica a componentes client-side (`"use client"`), que usan hooks como `useParams()` y `useSearchParams()`.

## Consecuencias

**Positivas:**
- Compatibilidad total con Next.js 15+ en producción
- TypeScript fuerza el `await` al tipar correctamente — el compilador atrapa errores antes del deploy

**Negativas / Restricciones:**
- Todo código nuevo con páginas dinámicas debe seguir este patrón obligatoriamente
- Al revisar PRs, verificar que ninguna página dinámica nueva use el patrón antiguo
- Si se encuentran páginas existentes con el patrón antiguo, migrarlas en el mismo PR que las modifique
