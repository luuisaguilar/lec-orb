-- Migration: 20260505_hr_and_processes_update.sql
-- Description: Adds missing SGC processes, updates HR profiles for new roles, and removes deprecated roles.

-- 1. Insert missing SGC processes
INSERT INTO public.sgc_processes (id, title, improvements, actors, inputs_outputs, resources, documents, mermaid_code)
VALUES
('PROC_ACADEMICA', 'Proceso de Gestión Académica', '1. Actualización continua de materiales didácticos.\n2. Implementación de encuestas de satisfacción automatizadas.', 'Coordinador Académico, Instructores, Estudiantes, Clientes.', 'Entradas: Requerimiento de curso, Perfil de estudiantes.\nSalidas: Curso impartido, Evaluación de estudiantes.', 'Humanos: Instructores capacitados.\nTecnológicos: Plataformas educativas (LMS), Material didáctico.', '1. Plan de Estudios.pdf\n2. Evaluación Docente.xlsx\n3. Lista de Asistencia.pdf', 'graph TD\n    A[Solicitud de Curso] --> B[Diseño/Adaptación del Programa]\n    B --> C[Asignación de Instructor]\n    C --> D[Impartición del Curso]\n    D --> E[Evaluación de Estudiantes y Docente]\n    E --> F[Entrega de Resultados/Constancias]'),

('PROC_FERIA_LIBRO', 'Proceso de Feria del Libro', '1. Digitalización del control de inventario en tiempo real.\n2. Estrategias de preventa en escuelas.', 'Coordinadora de Feria del Libro, Auxiliar, Editoriales, Escuelas.', 'Entradas: Solicitud de feria por escuela, Catálogo de editoriales.\nSalidas: Libros vendidos, Reporte de ventas y utilidades.', 'Físicos: Libros, Material de montaje (Stands, cajas registadoras).\nLogísticos: Transporte.', '1. Inventario de Feria.xlsx\n2. Reporte de Ventas.pdf\n3. Convenio con Escuela.pdf', 'graph TD\n    A[Planificación y Convenio con Escuela] --> B[Solicitud de Material a Editoriales]\n    B --> C[Recepción y Etiquetado de Inventario]\n    C --> D[Montaje de Feria]\n    D --> E[Atención y Venta]\n    E --> F[Desmontaje y Cierre de Caja]\n    F --> G[Reporte de Resultados]'),

('SUBPROC_COORD_ACADEMICA', 'Subproceso de Coordinación Académica', '1. Estandarización de rúbricas de evaluación.\n2. Creación de un banco de recursos compartidos para instructores.', 'Coordinador Académico, Instructores, Dirección General.', 'Entradas: Retroalimentación de alumnos, Nuevos requerimientos educativos.\nSalidas: Programas de estudio aprobados, Reportes de desempeño.', 'Tecnológicos: Sistema Integral, Plataformas LMS.', '1. Rúbricas de Evaluación.pdf\n2. Reporte de Desempeño Docente.xlsx', 'graph TD\n    A[Revisión de Requerimientos Educativos] --> B[Diseño Curricular]\n    B --> C[Validación de Contenidos]\n    C --> D[Capacitación a Instructores]\n    D --> E[Supervisión de Clases]\n    E --> F[Retroalimentación y Mejora Continua]'),

('SUBPROC_AUDITORIAS_INTERNAS', 'Subproceso de Auditorías Internas y SGC', '1. Uso de software para el seguimiento de hallazgos.\n2. Capacitación continua en cultura de calidad.', 'Coordinadora de Calidad y RS, Auditores Internos, Dueños de Procesos.', 'Entradas: Programa Anual de Auditorías, Manual de Calidad.\nSalidas: Informes de Auditoría, Acciones Correctivas (SAC).', 'Humanos: Auditores capacitados.\nTecnológicos: Sistema de Gestión Documental.', '1. Plan de Auditoría.pdf\n2. Informe de Auditoría.pdf\n3. Registro de SAC.xlsx', 'graph TD\n    A[Elaboración del Programa de Auditorías] --> B[Planificación de Auditoría Específica]\n    B --> C[Ejecución de la Auditoría]\n    C --> D[Elaboración de Informe y Hallazgos]\n    D --> E[Apertura de SAC (No Conformidades)]\n    E --> F[Seguimiento y Cierre de Hallazgos]'),

('SUBPROC_GESTION_PROYECTOS', 'Subproceso de Gestión de Proyectos y Eventos', '1. Implementación de metodologías ágiles.\n2. Plantillas estandarizadas para planificación de eventos.', 'Coordinadora de Proyectos, Especialista de Eventos, Proveedores, Clientes.', 'Entradas: Propuesta de Proyecto/Evento, Presupuesto.\nSalidas: Proyecto concluido, Evento realizado, Reporte final.', 'Financieros: Presupuesto asignado.\nTecnológicos: Software de gestión de proyectos (Trello, Asana).', '1. Cronograma de Actividades.xlsx\n2. Presupuesto del Proyecto.xlsx\n3. Reporte de Cierre.pdf', 'graph TD\n    A[Recepción de Requerimiento/Propuesta] --> B[Planificación y Presupuesto]\n    B --> C[Aprobación del Proyecto]\n    C --> D[Ejecución y Coordinación de Proveedores]\n    D --> E[Monitoreo y Control de Avances]\n    E --> F[Cierre del Proyecto/Evento]\n    F --> G[Evaluación de Resultados]')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    improvements = EXCLUDED.improvements,
    actors = EXCLUDED.actors,
    inputs_outputs = EXCLUDED.inputs_outputs,
    resources = EXCLUDED.resources,
    documents = EXCLUDED.documents,
    mermaid_code = EXCLUDED.mermaid_code,
    updated_at = NOW();

-- 2. Delete deprecated roles
DELETE FROM public.hr_profiles WHERE node_id IN ('ASISTENTE DE DIRECCIÓN', 'GERENTE DE RECURSOS HUMANOS');

-- 3. Update the required profiles with new missions, processes and requirements
-- ESPECIALISTA PARA ORGANIZACIÓN DE EVENTOS Y PROTOCOLO
INSERT INTO public.hr_profiles (org_id, node_id, role_title, holder_name, area, role_type, mission, responsibilities, requirements, parent_node_id, process_id)
VALUES (
    (SELECT id FROM public.organizations LIMIT 1), 
    'ESPECIALISTA PARA ORGANIZACIÓN DE EVENTOS Y PROTOCOLO', 
    'Especialista para Organización de Eventos y Protocolo', 
    'Vacante / Por asignar', 
    'ESPECIALISTA', 
    'operative', 
    'Planificar, organizar y ejecutar eventos corporativos, académicos y protocolarios de la organización, asegurando la máxima calidad, la correcta proyección de la imagen institucional y la satisfacción de los asistentes y partes interesadas.', 
    '["Diseñar, planificar y coordinar la logística integral de los eventos de la organización.","Seleccionar, negociar y coordinar proveedores (catering, audiovisuales, sedes, etc.).","Gestionar las invitaciones, registro y atención a los asistentes.","Velar por el cumplimiento de los estándares de calidad y protocolo.","Evaluar los resultados de los eventos y presentar reportes de mejora.","Participar en las actividades de ESR que se le asignen.","Asegurar el aumento del desempeño del SGC y SGOE."]'::jsonb, 
    '{"education":"Licenciatura o Carrera Técnica","experience":"Deseable 1 año","specialty":"Comunicación, Relaciones Públicas, Organización de Eventos, Administración o afín.","languages":"Español, Nivel deseable Inglés B1 MCRE","knowledge":"Protocolo y etiqueta de eventos. Negociación con proveedores. Gestión de presupuestos. Dominio de herramientas de ofimática y software de gestión de proyectos.","skills":"Excelente comunicación verbal y escrita. Habilidades de organización y planificación. Atención al detalle. Capacidad de resolución de problemas bajo presión. Creatividad y enfoque al cliente.","travel":"Si","sex":"Indistinto"}'::jsonb, 
    'GERENTE DE OPERACIONES', 
    'SUBPROC_GESTION_PROYECTOS'
)
ON CONFLICT (org_id, node_id) DO UPDATE SET
    role_title = EXCLUDED.role_title,
    mission = EXCLUDED.mission,
    responsibilities = EXCLUDED.responsibilities,
    requirements = EXCLUDED.requirements,
    parent_node_id = EXCLUDED.parent_node_id,
    process_id = EXCLUDED.process_id,
    updated_at = NOW();

-- AUXILIAR DE OPERACIONES
INSERT INTO public.hr_profiles (org_id, node_id, role_title, holder_name, area, role_type, mission, responsibilities, requirements, parent_node_id, process_id)
VALUES (
    (SELECT id FROM public.organizations LIMIT 1), 
    'AUXILIAR DE OPERACIONES', 
    'Auxiliar de operaciones', 
    'Vacante / Por asignar', 
    'AUXILIAR', 
    'operative', 
    'Brindar soporte operativo y administrativo a la Gerencia de Operaciones para garantizar la correcta ejecución de los procesos internos, el cumplimiento de las metas departamentales y la fluidez en la prestación de servicios.', 
    '["Asistir en la planificación y seguimiento de las actividades operativas diarias.","Actualizar bases de datos y registros internos de la operación.","Apoyar en la elaboración de reportes e informes de seguimiento.","Controlar el flujo de documentación y correspondencia operativa.","Atender requerimientos logísticos básicos del equipo de operaciones.","Colaborar con otras áreas para el buen desarrollo de los proyectos.","Asegurar el cumplimiento de las directrices del SGC."]'::jsonb, 
    '{"education":"Preparatoria, Carrera Técnica o Licenciatura Trunca","experience":"Deseable 6 meses","specialty":"Administración, Operaciones o afín.","languages":"Español","knowledge":"Manejo de paquetería Office (Word, Excel, PowerPoint). Conocimiento básico de procesos administrativos y logísticos.","skills":"Organización, seguimiento oportuno de tareas, comunicación efectiva, trabajo en equipo, capacidad para seguir instrucciones precisas y manejo básico de herramientas digitales.","travel":"Ocasional","sex":"Indistinto"}'::jsonb, 
    'GERENTE DE OPERACIONES', 
    'PROC_RRHH'
)
ON CONFLICT (org_id, node_id) DO UPDATE SET
    role_title = EXCLUDED.role_title,
    mission = EXCLUDED.mission,
    responsibilities = EXCLUDED.responsibilities,
    requirements = EXCLUDED.requirements,
    parent_node_id = EXCLUDED.parent_node_id,
    process_id = EXCLUDED.process_id,
    updated_at = NOW();
