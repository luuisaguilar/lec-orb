# ADR 004: Premium SaaS Design System & Visual Aesthetics

## Contexto

La plataforma LEC Orb ha evolucionado de un prototipo funcional a una herramienta de producción real. Para mejorar la retención de usuarios, reducir la fatiga visual en jornadas largas y proyectar una imagen profesional y moderna (High-Fidelity), se decidió realizar un refinamiento integral de la interfaz de usuario (UI).

## Decisión

Implementar un sistema de diseño basado en principios de "Premium SaaS", caracterizado por:

1. **Glassmorphism controlado**: Uso de fondos traslúcidos (`bg-slate-900/60`), desenfoque de fondo (`backdrop-blur-md`) y bordes sutiles de alto contraste (`border-slate-700/50`).
2. **Temas Dinámicos por Examen**: Los módulos relacionados con certificaciones (Cambridge, TOEFL) deben reaccionar visualmente al nivel seleccionado.
   - Definición de un objeto `EXAM_THEMES` con tokens de color, resplandor (*glow*) y anillos de enfoque específicos.
   - Aplicación de estos tokens a bordes, estados activos y fondos de componentes.
3. **Jerarquía Visual de Datos**: 
   - Las métricas (KPI cards) deben priorizar el valor numérico/dato.
   - Los iconos deben servir como apoyo sutil, preferentemente alineados en la parte inferior o superior del bloque de datos para evitar ruidos visuales.
4. **Legibilidad y Contraste**: 
   - Estándar de texto: `slate-200` para descripciones y `white` para títulos/valores principales.
   - Los CTAs primarios deben tener un contraste audaz (ej. `bg-primary` con `text-white`) y evitar efectos "lavados" o de bajo contraste.
5. **Layout Simétrico**: En módulos de configuración, asegurar que los inputs y selectores compartan dimensiones y pesos visuales para evitar la sensación de desorden.

## Consecuencias

- **Positivas**: Interfaz más atractiva y profesional, mejor diferenciación visual entre niveles de examen, reducción de la carga cognitiva.
- **Negativas**: Mayor complejidad en el código CSS/Tailwind al manejar estados dinámicos; requiere mantenimiento del objeto de temas.
- **Neutrales**: Se mantiene Tailwind CSS 4 como motor de estilos principal.

## Estado

**Aceptado / Implementado** (Mayo 2026).
