# ADR-006 - Reglas de workflow SGC en capa de base de datos

**Estado:** Aceptado  
**Fecha:** 2026-05-03

---

## Contexto

El flujo SGC tiene invariantes críticas de cumplimiento:

1. Una NC no debe cerrarse sin evaluación final.
2. Una NC no debe cerrarse si tiene acciones pendientes.
3. Las acciones no deben regresar a borrador tras abrirse.
4. Apertura/cierre deben registrar timestamps de forma consistente.

Si estas reglas se implementan solo en frontend o API, existe riesgo de inconsistencias por:

- clientes alternos
- scripts de mantenimiento
- futuros endpoints incompletos

## Decisión

Aplicar reglas de workflow directamente en la base de datos mediante triggers en:

- `public.sgc_nonconformities_before_write()`
- `public.sgc_actions_before_write()`

Además:

- sincronizar `status` desde `stage_id`
- autogenerar `opened_at` / `closed_at`
- bloquear transiciones inválidas

## Consecuencias

### Positivas

- Invariantes protegidas de forma centralizada.
- Comportamiento homogéneo sin importar el cliente que escriba.
- Menor riesgo de deuda de validación duplicada en API/UI.

### Negativas / trade-offs

- Más lógica en SQL/PLpgSQL (curva para debugging).
- Requiere pruebas de integración sobre transiciones de estado.
- Cambios de proceso SGC demandan versionar migraciones adicionales.

## Alternativas consideradas

1. Reglas solo en frontend:
   - insuficiente para cumplimiento y seguridad de datos.
2. Reglas solo en API:
   - mejor que frontend, pero aún vulnerable a escritura externa.
3. Regla híbrida (API + DB):
   - opción elegida; DB como guardrail final.

