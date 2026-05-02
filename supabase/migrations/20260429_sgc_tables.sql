-- Migration: 20260429_sgc_tables.sql
-- Description: Creates the foundation for the SGC module (Quality Management System)
--              Includes processes, KPIs, and risk assessments tables.

CREATE TABLE IF NOT EXISTS public.sgc_processes (
    id VARCHAR(50) PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    improvements TEXT,
    actors TEXT,
    inputs_outputs TEXT,
    resources TEXT,
    documents TEXT,
    mermaid_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kpi_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id VARCHAR(50) REFERENCES public.sgc_processes(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    metric_name VARCHAR(200) NOT NULL,
    target_value VARCHAR(100),
    current_value VARCHAR(100),
    frequency VARCHAR(50),
    evidence_source TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id VARCHAR(50) REFERENCES public.sgc_processes(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    risk_name VARCHAR(200) NOT NULL,
    severity VARCHAR(50),
    probability VARCHAR(50),
    mitigation_plan TEXT,
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.sgc_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- sgc_processes
CREATE POLICY "sgc_processes_select" ON public.sgc_processes FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "sgc_processes_insert" ON public.sgc_processes FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "sgc_processes_update" ON public.sgc_processes FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

-- kpi_metrics
CREATE POLICY "kpi_metrics_select" ON public.kpi_metrics FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "kpi_metrics_insert" ON public.kpi_metrics FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "kpi_metrics_update" ON public.kpi_metrics FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- risk_assessments
CREATE POLICY "risk_assessments_select" ON public.risk_assessments FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "risk_assessments_insert" ON public.risk_assessments FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "risk_assessments_update" ON public.risk_assessments FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- Seed the initial processes from the hardcoded list
INSERT INTO public.sgc_processes (id, title, improvements, actors, inputs_outputs, resources, documents, mermaid_code) VALUES
('PROC_RRHH', 'Proceso de Recursos Humanos', '1. Implementación de un módulo de RRHH en el Sistema Integral.\n2. Análisis de riesgos psicosociales (NOM-035).', 'Director General, Área Solicitante, Recursos Humanos, Aspirante Externo, Personal Interno.', 'Entradas: Solicitud de Personal (Todas las áreas).\nSalidas: Personal Contratado, Evaluación de Desempeño.', 'Humanos: Reclutador, Capacitadores.\nTecnológicos: Sistema Integral, Plataformas de Empleo.', '1. Perfil de Puesto.pdf\n2. Expediente de Personal\n3. Formato de Evaluación de Desempeño.xlsx', 'graph TD\n    A[Solicitud de Personal] --> B{"¿Talento interno?"}\n    B -- Sí --> C[Ascenso / Reubicación]\n    B -- No --> D[Reclutamiento Externo]\n    D --> E[Entrevistas]\n    E --> F[Firma de Contrato y Alta IMSS]\n    F --> G[Inducción y Capacitación Inicial]\n    C --> G'),
('PROC_FINANZAS', 'Proceso de Finanzas', '1. Automatización de reportes financieros.\n2. Integración de la plataforma de cobranza.', 'Gerente de Administración y Finanzas, Director General, Proceso Ventas, Proveedores.', 'Entradas: Órdenes de Compra, Facturas (Proceso Ventas, Proyectos).\nSalidas: Pagos, Reportes Financieros, Presupuestos.', 'Financieros: Cuentas bancarias.\nTecnológicos: Software Contable, Sistema Integral.', '1. Reporte de Flujo de Efectivo.xlsx\n2. Comprobantes de Pago.pdf\n3. Presupuesto Anual', 'graph TD\n    A[Recepción de Solicitud de Pago] --> B{"¿Presupuesto Aprobado?"}\n    B -- Sí --> C[Validación de Factura]\n    B -- No --> D[Autorización de Director General]\n    D --> C\n    C --> E[Programación de Pago]\n    E --> F[Ejecución y Registro Contable]')
ON CONFLICT (id) DO NOTHING;

-- Seed some dummy KPIs based on the hardcoded strings
INSERT INTO public.kpi_metrics (process_id, metric_name, target_value, current_value, frequency, evidence_source) VALUES
('PROC_RRHH', 'Capacitaciones programadas cumplidas', '95%', '92%', 'Mensual', 'Reporte RRHH'),
('PROC_RRHH', 'Reducción en rotación de personal', '10%', '8%', 'Trimestral', 'Reporte RRHH'),
('PROC_FINANZAS', 'Conciliaciones bancarias al día', '100%', '100%', 'Diario', 'Estado de Cuenta'),
('PROC_FINANZAS', 'Reducción de cuentas por cobrar (>30 días)', '15%', '12%', 'Mensual', 'Reporte Cobranza');

-- Seed some dummy Risks based on the hardcoded strings
INSERT INTO public.risk_assessments (process_id, risk_name, severity, probability, mitigation_plan, status) VALUES
('PROC_RRHH', 'Inconformidad del empleado por falta de claridad', 'Media', 'Alta', 'Mejorar descripciones de puesto y onboarding', 'Activo'),
('PROC_RRHH', 'Contratar aspirantes que no reúnen requisitos', 'Alta', 'Media', 'Validar filtros técnicos y pruebas psicométricas', 'Activo'),
('PROC_FINANZAS', 'Flujo de caja insuficiente para obligaciones', 'Crítica', 'Baja', 'Reservas de emergencia y seguimiento diario de flujo', 'Mitigado'),
('PROC_FINANZAS', 'Errores en facturación o pagos a proveedores', 'Alta', 'Media', 'Doble validación en autorizaciones de pago', 'Activo');
