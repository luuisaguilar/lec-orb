-- Migration: 20260502_hr_audit_tables.sql
-- Description: Adds persistent RRHH audit checklist and corrective actions tables with tenant RLS and starter data.

CREATE TABLE IF NOT EXISTS public.hr_audit_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    clause_id VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    question TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'cumple', 'noconf', 'oport')),
    notes TEXT,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    sort_order INTEGER NOT NULL DEFAULT 0,
    next_audit_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, clause_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_audit_checks_org_sort
    ON public.hr_audit_checks(org_id, sort_order, clause_id);

ALTER TABLE public.hr_audit_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_audit_checks_select"
ON public.hr_audit_checks FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "hr_audit_checks_insert"
ON public.hr_audit_checks FOR INSERT TO authenticated
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
);

CREATE POLICY "hr_audit_checks_update"
ON public.hr_audit_checks FOR UPDATE TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
);

CREATE TABLE IF NOT EXISTS public.hr_audit_cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    audit_check_id UUID NOT NULL REFERENCES public.hr_audit_checks(id) ON DELETE CASCADE,
    car_code VARCHAR(30) NOT NULL,
    finding_clause_id VARCHAR(20) NOT NULL,
    finding_title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'closed')),
    root_cause TEXT,
    action_plan TEXT,
    owner_name VARCHAR(200),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, audit_check_id),
    UNIQUE(org_id, car_code)
);

CREATE INDEX IF NOT EXISTS idx_hr_audit_cars_org_status
    ON public.hr_audit_cars(org_id, status, created_at DESC);

ALTER TABLE public.hr_audit_cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_audit_cars_select"
ON public.hr_audit_cars FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "hr_audit_cars_insert"
ON public.hr_audit_cars FOR INSERT TO authenticated
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
);

CREATE POLICY "hr_audit_cars_update"
ON public.hr_audit_cars FOR UPDATE TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
);

WITH base(clause_id, title, question, tags, sort_order) AS (
    VALUES
    ('4.1', 'Contexto de la organizacion', 'Se han determinado las cuestiones externas e internas pertinentes para su proposito y direccion estrategica?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 1),
    ('4.2', 'Partes interesadas', 'Se comprenden las necesidades y expectativas de los estudiantes y otros beneficiarios?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 2),
    ('5.1', 'Liderazgo y compromiso', 'La alta direccion demuestra liderazgo y compromiso con el Sistema de Gestion?', ARRAY['ISO 9001']::TEXT[], 3),
    ('5.1.2', 'Enfoque al estudiante', 'Se mantiene el enfoque principal en la satisfaccion de las necesidades de los alumnos?', ARRAY['ISO 21001']::TEXT[], 4),
    ('5.2', 'Politica Integral', 'La politica es apropiada al proposito de la organizacion y se comunica?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 5),
    ('6.1', 'Acciones para abordar riesgos', 'Se han determinado los riesgos y oportunidades que es necesario abordar?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 6),
    ('6.2', 'Objetivos de Calidad', 'Se han establecido objetivos coherentes con la politica y son medibles?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 7),
    ('7.1.5', 'Recursos de seguimiento', 'Se determinan y proporcionan los recursos necesarios para la validez de los resultados?', ARRAY['ISO 9001']::TEXT[], 8),
    ('7.2', 'Competencia', 'Se asegura que el personal (especialmente instructores) es competente basado en educacion/experiencia?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 9),
    ('8.1', 'Planificacion y control', 'Se planifican, implementan y controlan los procesos necesarios para la provision del servicio educativo?', ARRAY['ISO 21001']::TEXT[], 10),
    ('8.5', 'Control de la prestacion', 'Se implementa el servicio bajo condiciones controladas y se valida el material didactico?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 11),
    ('9.1', 'Satisfaccion del cliente/estudiante', 'Se realiza seguimiento a las percepciones de los estudiantes sobre el cumplimiento de sus necesidades?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 12),
    ('9.2', 'Auditoria interna', 'Se llevan a cabo auditorias internas a intervalos planificados?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 13),
    ('10.2', 'No conformidad y accion correctiva', 'Se toman acciones para controlar y corregir las no conformidades?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 14),
    ('10.3', 'Mejora continua', 'Se mejora continuamente la conveniencia, adecuacion y eficacia del SGC?', ARRAY['ISO 9001', 'ISO 21001']::TEXT[], 15)
)
INSERT INTO public.hr_audit_checks (
    org_id,
    clause_id,
    title,
    question,
    tags,
    sort_order
)
SELECT
    o.id,
    b.clause_id,
    b.title,
    b.question,
    b.tags,
    b.sort_order
FROM public.organizations o
CROSS JOIN base b
ON CONFLICT (org_id, clause_id) DO NOTHING;
