-- Coordinación de proyectos LEC: concentrado operativo/comercial (indicadores, exámenes vendidos, cursos).
-- Module slug: coordinacion-proyectos-lec

-- ── Catalog tables (per org) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lec_cp_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.lec_cp_exam_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.lec_cp_product_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

-- Main: concentrado de proyectos (INDICADORES)
CREATE TABLE IF NOT EXISTS public.lec_program_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_month date NOT NULL,
    department_id uuid NULL REFERENCES public.lec_cp_departments(id) ON DELETE SET NULL,
    description text NOT NULL,
    client_type text NOT NULL DEFAULT 'Institución',
    product_service_id uuid NULL REFERENCES public.lec_cp_product_services(id) ON DELETE SET NULL,
    product_service_label text NULL,
    beneficiaries_count int NOT NULL DEFAULT 0,
    revenue_amount numeric(14, 2) NULL,
    size_code text NULL CHECK (size_code IS NULL OR size_code IN ('MI', 'C', 'M', 'G')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
    evidence_office_url text NULL,
    evidence_satisfaction_url text NULL,
    evidence_survey_url text NULL,
    checklist_done boolean NOT NULL DEFAULT false,
    source_year int NOT NULL DEFAULT EXTRACT(year FROM now())::int,
    school_id uuid NULL REFERENCES public.schools(id) ON DELETE SET NULL,
    event_id uuid NULL REFERENCES public.events(id) ON DELETE SET NULL,
    crm_opportunity_id uuid NULL REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
    pm_project_id uuid NULL REFERENCES public.pm_projects(id) ON DELETE SET NULL,
    notes text NULL,
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lec_program_projects_org_month ON public.lec_program_projects(org_id, period_month);
CREATE INDEX IF NOT EXISTS idx_lec_program_projects_org_dept ON public.lec_program_projects(org_id, department_id);

-- Registro mensual tipo EXAMENES 2026
CREATE TABLE IF NOT EXISTS public.lec_exam_sales_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    exam_month date NOT NULL,
    line_no int NULL,
    candidate_or_institution text NOT NULL,
    exam_type_id uuid NULL REFERENCES public.lec_cp_exam_types(id) ON DELETE SET NULL,
    exam_type_label text NULL,
    result_summary text NULL,
    email text NULL,
    phone text NULL,
    confirmation text NULL,
    exam_at timestamptz NULL,
    quantity int NOT NULL DEFAULT 1,
    amount numeric(14, 2) NULL,
    survey_sent boolean NOT NULL DEFAULT false,
    checklist_done boolean NOT NULL DEFAULT false,
    school_id uuid NULL REFERENCES public.schools(id) ON DELETE SET NULL,
    event_id uuid NULL REFERENCES public.events(id) ON DELETE SET NULL,
    notes text NULL,
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lec_exam_sales_org_month ON public.lec_exam_sales_lines(org_id, exam_month);

-- Cursos operativos (evidencia DOCX / filas Curso)
CREATE TABLE IF NOT EXISTS public.lec_course_offerings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    starts_on date NULL,
    ends_on date NULL,
    participants_count int NOT NULL DEFAULT 0,
    price_amount numeric(14, 2) NULL,
    program_project_id uuid NULL REFERENCES public.lec_program_projects(id) ON DELETE SET NULL,
    notes text NULL,
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lec_course_offerings_org ON public.lec_course_offerings(org_id);

-- Comparativos manuales (hoja GRAFICA): buckets por tamaño
CREATE TABLE IF NOT EXISTS public.lec_kpi_size_comparison (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bucket_key text NOT NULL CHECK (bucket_key IN ('grandes', 'medianos', 'chicos', 'micro', 'totales')),
    count_2025 int NOT NULL DEFAULT 0,
    count_2026 int NOT NULL DEFAULT 0,
    projected_2026 int NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, bucket_key)
);

-- updated_at triggers (reuse handle_updated_at if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_lec_cp_departments') THEN
            CREATE TRIGGER handle_updated_at_lec_cp_departments
                BEFORE UPDATE ON public.lec_cp_departments
                FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_lec_cp_exam_types') THEN
            CREATE TRIGGER handle_updated_at_lec_cp_exam_types
                BEFORE UPDATE ON public.lec_cp_exam_types
                FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_lec_cp_product_services') THEN
            CREATE TRIGGER handle_updated_at_lec_cp_product_services
                BEFORE UPDATE ON public.lec_cp_product_services
                FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_lec_program_projects') THEN
            CREATE TRIGGER handle_updated_at_lec_program_projects
                BEFORE UPDATE ON public.lec_program_projects
                FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_lec_exam_sales_lines') THEN
            CREATE TRIGGER handle_updated_at_lec_exam_sales_lines
                BEFORE UPDATE ON public.lec_exam_sales_lines
                FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_lec_course_offerings') THEN
            CREATE TRIGGER handle_updated_at_lec_course_offerings
                BEFORE UPDATE ON public.lec_course_offerings
                FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        END IF;
    END IF;
END
$$;

-- RLS
ALTER TABLE public.lec_cp_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lec_cp_exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lec_cp_product_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lec_program_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lec_exam_sales_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lec_course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lec_kpi_size_comparison ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member
CREATE POLICY lec_cp_departments_select ON public.lec_cp_departments FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY lec_cp_exam_types_select ON public.lec_cp_exam_types FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY lec_cp_product_services_select ON public.lec_cp_product_services FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY lec_program_projects_select ON public.lec_program_projects FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY lec_exam_sales_lines_select ON public.lec_exam_sales_lines FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY lec_course_offerings_select ON public.lec_course_offerings FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
CREATE POLICY lec_kpi_size_comparison_select ON public.lec_kpi_size_comparison FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- WRITE: admin, supervisor, operador (same spirit as pm_tasks)
CREATE POLICY lec_cp_departments_write ON public.lec_cp_departments FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')));
CREATE POLICY lec_cp_exam_types_write ON public.lec_cp_exam_types FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')));
CREATE POLICY lec_cp_product_services_write ON public.lec_cp_product_services FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')));
CREATE POLICY lec_program_projects_write ON public.lec_program_projects FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')));
CREATE POLICY lec_exam_sales_lines_write ON public.lec_exam_sales_lines FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')));
CREATE POLICY lec_course_offerings_write ON public.lec_course_offerings FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')));
CREATE POLICY lec_kpi_size_comparison_write ON public.lec_kpi_size_comparison FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')))
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')));

-- Module registry + permissions
INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES (
    'coordinacion-proyectos-lec',
    'Coordinación proyectos LEC',
    'Layers',
    'Institucional',
    true,
    14,
    'Concentrado de proyectos, registro mensual de exámenes, cursos operativos e indicadores (reemplazo de Excels 2026).'
)
ON CONFLICT (org_id, slug) DO NOTHING;

DO $$
DECLARE
    v_module_id uuid;
BEGIN
    SELECT id INTO v_module_id FROM public.module_registry WHERE slug = 'coordinacion-proyectos-lec' AND org_id IS NULL LIMIT 1;
    IF v_module_id IS NOT NULL THEN
        INSERT INTO public.module_permissions (module_id, role, can_view, can_create, can_edit, can_delete) VALUES
            (v_module_id, 'admin',      true, true,  true,  true),
            (v_module_id, 'supervisor', true, true,  true,  false),
            (v_module_id, 'operador',   true, true,  false, false),
            (v_module_id, 'applicator', false, false, false, false)
        ON CONFLICT (module_id, role) DO NOTHING;
    END IF;
END
$$;

-- Seed member_module_access for existing members (same pattern as project-management)
INSERT INTO public.member_module_access (org_id, member_id, module, can_view, can_edit, can_delete)
SELECT
    m.org_id,
    m.id,
    'coordinacion-proyectos-lec',
    true,
    (m.role IN ('admin', 'supervisor', 'operador')),
    (m.role IN ('admin', 'supervisor'))
FROM public.org_members m
WHERE m.role != 'applicator'
ON CONFLICT (member_id, module) DO NOTHING;

-- Default catalog rows per org
INSERT INTO public.lec_cp_departments (org_id, name, sort_order)
SELECT o.id, v.name, v.ord
FROM public.organizations o
CROSS JOIN (
    VALUES
        ('Coordinación Exámenes', 1),
        ('Baja California', 2),
        ('Feria del Libro', 3),
        ('Coordinación Académica', 4),
        ('Coordinación de Proyectos', 5)
) AS v(name, ord)
ON CONFLICT (org_id, name) DO NOTHING;

INSERT INTO public.lec_cp_product_services (org_id, name, sort_order)
SELECT o.id, v.name, v.ord
FROM public.organizations o
CROSS JOIN (
    VALUES ('Exámenes', 1), ('Curso', 2), ('Plataforma', 3), ('Feria del libro', 4)
) AS v(name, ord)
ON CONFLICT (org_id, name) DO NOTHING;

INSERT INTO public.lec_cp_exam_types (org_id, name, sort_order)
SELECT o.id, v.name, v.ord
FROM public.organizations o
CROSS JOIN (
    VALUES
        ('YLE Starters', 1),
        ('YLE Movers', 2),
        ('YLE Flyers', 3),
        ('KET for Schools', 4),
        ('PET for Schools', 5),
        ('FCE for Schools', 6),
        ('TOEFL ITP', 7),
        ('TOEIC', 8),
        ('OOPT', 9),
        ('IELTS', 10),
        ('TKT', 11),
        ('MET', 12),
        ('Otro', 99)
) AS v(name, ord)
ON CONFLICT (org_id, name) DO NOTHING;

-- Default KPI comparison rows (editable in UI)
INSERT INTO public.lec_kpi_size_comparison (org_id, bucket_key, count_2025, count_2026, projected_2026)
SELECT o.id, v.k, 0, 0, 0
FROM public.organizations o
CROSS JOIN (VALUES ('grandes'), ('medianos'), ('chicos'), ('micro'), ('totales')) AS v(k)
ON CONFLICT (org_id, bucket_key) DO NOTHING;
