-- Migration: Insert missing SGC processes referenced by hr_profiles seed
-- Run this BEFORE the hr_data_seed.sql

INSERT INTO public.sgc_processes (id, title, improvements, actors, inputs_outputs, resources, documents, mermaid_code) VALUES
('PROC_EXAMENES', 'Proceso de Exámenes y Certificaciones', 
 '1. Digitalización de registros de aplicación.\n2. Automatización de reportes de resultados.',
 'Coordinadora de Exámenes, Aplicadores, Auxiliar de Exámenes, Cambridge/IH.',
 'Entradas: Solicitud de aplicación, Material de examen.\nSalidas: Resultados, Certificados emitidos.',
 'Humanos: Aplicadores certificados.\nTecnológicos: Plataforma de registro, Sistema Integral.',
 '1. Registro de Aplicación.pdf\n2. Acta de Examen.pdf\n3. Reporte de Resultados.xlsx',
 'graph TD\n    A[Solicitud de Aplicación] --> B[Programación y Logística]\n    B --> C[Distribución de Material]\n    C --> D[Aplicación del Examen]\n    D --> E[Envío de Evidencias]\n    E --> F[Recepción de Resultados]\n    F --> G[Entrega de Certificados]'),

('PROC_VENTAS', 'Proceso de Ventas', 
 '1. Implementación de CRM para seguimiento de prospectos.\n2. Automatización de cotizaciones.',
 'Ejecutivo de Ventas, Responsable de Comunicación, Gerente de Operaciones, Clientes.',
 'Entradas: Prospectos, Solicitudes de cotización.\nSalidas: Contratos firmados, Órdenes de servicio.',
 'Humanos: Equipo comercial.\nTecnológicos: CRM, Redes sociales, Sistema Integral.',
 '1. Cotización.pdf\n2. Contrato de Servicios.pdf\n3. Reporte de Ventas Mensual.xlsx',
 'graph TD\n    A[Prospección de Clientes] --> B[Contacto y Detección de Necesidades]\n    B --> C[Elaboración de Cotización]\n    C --> D[Negociación y Cierre]\n    D --> E[Firma de Contrato]\n    E --> F[Seguimiento Postventa]')

ON CONFLICT (id) DO NOTHING;
