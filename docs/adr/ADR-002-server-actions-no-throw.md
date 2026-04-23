# ADR-002 — Server Actions nunca usan throw — siempre redirect con ?error=

**Estado:** Aceptado  
**Fecha:** 2026-04-23  
**PR:** #14

---

## Contexto

En Next.js 15+, si un Server Action lanza una excepción no controlada (`throw new Error(...)`),
el runtime de Next.js la intercepta y muestra una pantalla de "Application error" al usuario,
sin información útil y sin posibilidad de recuperarse sin recargar la página.

Este comportamiento es especialmente problemático en el flujo de aceptación de invitaciones
(`src/app/join/[token]/actions.ts`), donde varios error paths legítimos (token inválido,
invitación ya usada, error de DB) producían pantalla blanca en producción.

Además, en desarrollo, Next.js permite que algunos `throw` pasen silenciosamente, lo que
hace que el problema solo aparezca en producción — dificultando el diagnóstico.

## Decisión

**Ningún Server Action en este proyecto debe usar `throw`.** Todos los error paths deben
terminar con una llamada a `redirect()` usando un parámetro `?error=` con el mensaje
URL-encoded.

```ts
// Patrón MAL — produce pantalla blanca en producción
export async function acceptInvitationAction(token: string) {
  const result = await processInvitation(token);
  if (!result) throw new Error('Token inválido');
}

// Patrón CORRECTO — redirige con error inline
export async function acceptInvitationAction(token: string) {
  const result = await processInvitation(token);
  if (!result) {
    redirect(`/join/${token}?error=${encodeURIComponent('Invitación inválida')}`);
  }
}
```

La página de destino lee el error desde `searchParams`:
```tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams;
  if (error) return <ErrorMessage message={decodeURIComponent(error)} />;
}
```

## Consecuencias

**Positivas:**
- Los errores se muestran inline en la página sin pantalla blanca
- El usuario puede intentar de nuevo sin recargar manualmente
- El comportamiento es consistente entre desarrollo y producción

**Negativas / Restricciones:**
- Las páginas deben leer `searchParams.error` y renderizar el mensaje apropiado
- Los mensajes de error viajan por la URL — no incluir información sensible en ellos
- `redirect()` en Next.js lanza internamente un error especial (`NEXT_REDIRECT`) — no envolver en try/catch sin re-lanzar ese error específico
