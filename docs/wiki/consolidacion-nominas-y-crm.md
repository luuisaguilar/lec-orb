# Consolidación de Nóminas y CRM (Sesión 14-May-2026)

## 1. Nómina: Desglose de Eventos y Horas
Se resolvió el problema donde el Portal de Aplicadores mostraba $0 o campos vacíos en el desglose histórico.

### Lo que se hizo:
- **Inyección de `payroll_line_items`**: Se poblaron los registros de Febrero y Marzo 2026 para las aplicadoras principales (Selene, Lupita, Claudia, Ruth).
- **Vinculación**: Cada línea de pago ahora está ligada a un `entry_id` y un `event_id`, lo que permite que el portal muestre el nombre del evento y las horas trabajadas.
- **Periodos**: Se crearon manualmente los periodos de **Abril (Q1/Q2)** y **Mayo (Q1/Q2)** para que el motor de cálculo automático pueda funcionar.

### Pendiente:
- **Recálculo de Mayo**: En el dashboard de Admin, entrar a "Mayo Q1", seleccionar a los aplicadores y dar clic en **"Recalcular Nómina"** para que el sistema jale automáticamente los eventos de "Nueva Galicia" y similares que aún no tienen su `line_item`.

## 2. CRM: Visibilidad del Pipeline
Se detectó que el Kanban no mostraba registros a pesar de existir en la base de datos.

### Lo que se hizo:
- **Fix de Propiedad**: El componente `CrmPipeline` buscaba los datos en `data.data`, pero la API los envía en `data.opportunities`. Se corrigió el mapeo.
- **Tipado**: Se actualizó el esquema de TypeScript para evitar errores de compilación (Build Fix).

## 3. Registro de Aplicadores (Selene Moreno)
Se arregló el flujo de "Auto-link" que fallaba en producción.

### Lo que se hizo:
- **Parche de Base de Datos**: Se creó la migración `20260612_fix_applicator_portal_registration_and_linking.sql`. 
- **Resiliencia**: El trigger `handle_new_user` ahora es más robusto y maneja casos donde el email no está pre-cargado en la tabla de aplicadores.

---

## Próximos Pasos (To-Do)
1. [ ] **Aplicar Migraciones**: Ejecutar el contenido de `supabase/migrations/20260612_...` en el SQL Editor de Supabase (Producción).
2. [ ] **Validar Mayo**: Confirmar que el botón "Recalcular Nómina" genera los desgloses para los eventos actuales de Mayo.
3. [ ] **Portal de Escuelas**: Iniciar fase de requerimientos (ver `.codex-review/NEXT_SESSION_TODO.md`).
