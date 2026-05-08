-- Migration: 20260515_project_management_module_phase1.sql
-- Description: Project Management MVP (projects, boards, columns, tasks, labels)

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.pm_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NULL,
    name text NOT NULL,
    description text NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    owner_user_id uuid NULL REFERENCES auth.users(id),
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, key)
);

CREATE TABLE IF NOT EXISTS public.pm_boards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    default_view text NOT NULL DEFAULT 'kanban' CHECK (default_view IN ('kanban', 'table')),
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_columns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    board_id uuid NOT NULL REFERENCES public.pm_boards(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    wip_limit int NULL,
    is_done boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, board_id, slug)
);

CREATE TABLE IF NOT EXISTS public.pm_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
    board_id uuid NOT NULL REFERENCES public.pm_boards(id) ON DELETE CASCADE,
    column_id uuid NOT NULL REFERENCES public.pm_columns(id) ON DELETE RESTRICT,
    ref text NULL,
    title text NOT NULL,
    description text NULL,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date date NULL,
    assignee_user_id uuid NULL REFERENCES auth.users(id),
    reporter_user_id uuid NULL REFERENCES auth.users(id),
    sort_order int NOT NULL DEFAULT 0,
    completed_at timestamptz NULL,
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, ref)
);

CREATE TABLE IF NOT EXISTS public.pm_labels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.pm_task_labels (
    task_id uuid NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
    label_id uuid NOT NULL REFERENCES public.pm_labels(id) ON DELETE CASCADE,
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, label_id)
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_pm_projects_org_status ON public.pm_projects(org_id, status);
CREATE INDEX IF NOT EXISTS idx_pm_boards_org_project ON public.pm_boards(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_pm_columns_org_board_order ON public.pm_columns(org_id, board_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_board_col_order ON public.pm_tasks(org_id, board_id, column_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_project_due ON public.pm_tasks(org_id, project_id, due_date);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_assignee_due ON public.pm_tasks(org_id, assignee_user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_pm_task_labels_org ON public.pm_task_labels(org_id);

-- 3) updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_projects') THEN
        CREATE TRIGGER handle_updated_at_pm_projects
            BEFORE UPDATE ON public.pm_projects
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_boards') THEN
        CREATE TRIGGER handle_updated_at_pm_boards
            BEFORE UPDATE ON public.pm_boards
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_columns') THEN
        CREATE TRIGGER handle_updated_at_pm_columns
            BEFORE UPDATE ON public.pm_columns
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_tasks') THEN
        CREATE TRIGGER handle_updated_at_pm_tasks
            BEFORE UPDATE ON public.pm_tasks
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_labels') THEN
        CREATE TRIGGER handle_updated_at_pm_labels
            BEFORE UPDATE ON public.pm_labels
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- 4) RLS
ALTER TABLE public.pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_task_labels ENABLE ROW LEVEL SECURITY;

-- 4.1 Read policies (org members)
CREATE POLICY "pm_projects_select"
    ON public.pm_projects FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_boards_select"
    ON public.pm_boards FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_columns_select"
    ON public.pm_columns FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_tasks_select"
    ON public.pm_tasks FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_labels_select"
    ON public.pm_labels FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_task_labels_select"
    ON public.pm_task_labels FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- 4.2 Write policies
-- Projects/boards/columns/labels: admin/supervisor
CREATE POLICY "pm_projects_write"
    ON public.pm_projects FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "pm_boards_write"
    ON public.pm_boards FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "pm_columns_write"
    ON public.pm_columns FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "pm_labels_write"
    ON public.pm_labels FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- Tasks + task labels: admin/supervisor/operador
CREATE POLICY "pm_tasks_write"
    ON public.pm_tasks FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    );

CREATE POLICY "pm_task_labels_write"
    ON public.pm_task_labels FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    );

-- 5) Seed permission rows in member_module_access for existing members
INSERT INTO public.member_module_access (org_id, member_id, module, can_view, can_edit, can_delete)
SELECT
    m.org_id,
    m.id,
    'project-management',
    true,
    (m.role IN ('admin', 'supervisor', 'operador')),
    (m.role IN ('admin', 'supervisor'))
FROM public.org_members m
ON CONFLICT (member_id, module) DO NOTHING;

-- Migration: 20260515_project_management_module_phase1.sql
-- Description: Project Management MVP (projects, boards, columns, tasks, labels)

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.pm_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NULL,
    name text NOT NULL,
    description text NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    owner_user_id uuid NULL REFERENCES auth.users(id),
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, key)
);

CREATE TABLE IF NOT EXISTS public.pm_boards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    default_view text NOT NULL DEFAULT 'kanban' CHECK (default_view IN ('kanban', 'table')),
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_columns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    board_id uuid NOT NULL REFERENCES public.pm_boards(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    wip_limit int NULL,
    is_done boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, board_id, slug)
);

CREATE TABLE IF NOT EXISTS public.pm_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
    board_id uuid NOT NULL REFERENCES public.pm_boards(id) ON DELETE CASCADE,
    column_id uuid NOT NULL REFERENCES public.pm_columns(id) ON DELETE RESTRICT,
    ref text NULL,
    title text NOT NULL,
    description text NULL,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date date NULL,
    assignee_user_id uuid NULL REFERENCES auth.users(id),
    reporter_user_id uuid NULL REFERENCES auth.users(id),
    sort_order int NOT NULL DEFAULT 0,
    completed_at timestamptz NULL,
    created_by uuid NULL REFERENCES auth.users(id),
    updated_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, ref)
);

CREATE TABLE IF NOT EXISTS public.pm_labels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.pm_task_labels (
    task_id uuid NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
    label_id uuid NOT NULL REFERENCES public.pm_labels(id) ON DELETE CASCADE,
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, label_id)
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_pm_projects_org_status ON public.pm_projects(org_id, status);
CREATE INDEX IF NOT EXISTS idx_pm_boards_org_project ON public.pm_boards(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_pm_columns_org_board_order ON public.pm_columns(org_id, board_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_board_col_order ON public.pm_tasks(org_id, board_id, column_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_project_due ON public.pm_tasks(org_id, project_id, due_date);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_org_assignee_due ON public.pm_tasks(org_id, assignee_user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_pm_task_labels_org ON public.pm_task_labels(org_id);

-- 3) updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_projects') THEN
        CREATE TRIGGER handle_updated_at_pm_projects
            BEFORE UPDATE ON public.pm_projects
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_boards') THEN
        CREATE TRIGGER handle_updated_at_pm_boards
            BEFORE UPDATE ON public.pm_boards
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_columns') THEN
        CREATE TRIGGER handle_updated_at_pm_columns
            BEFORE UPDATE ON public.pm_columns
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_tasks') THEN
        CREATE TRIGGER handle_updated_at_pm_tasks
            BEFORE UPDATE ON public.pm_tasks
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_pm_labels') THEN
        CREATE TRIGGER handle_updated_at_pm_labels
            BEFORE UPDATE ON public.pm_labels
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- 4) RLS
ALTER TABLE public.pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_task_labels ENABLE ROW LEVEL SECURITY;

-- 4.1 Read policies (org members)
CREATE POLICY "pm_projects_select"
    ON public.pm_projects FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_boards_select"
    ON public.pm_boards FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_columns_select"
    ON public.pm_columns FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_tasks_select"
    ON public.pm_tasks FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_labels_select"
    ON public.pm_labels FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "pm_task_labels_select"
    ON public.pm_task_labels FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- 4.2 Write policies
-- Projects/boards/columns/labels: admin/supervisor
CREATE POLICY "pm_projects_write"
    ON public.pm_projects FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "pm_boards_write"
    ON public.pm_boards FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "pm_columns_write"
    ON public.pm_columns FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "pm_labels_write"
    ON public.pm_labels FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- Tasks + task labels: admin/supervisor/operador
CREATE POLICY "pm_tasks_write"
    ON public.pm_tasks FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    );

CREATE POLICY "pm_task_labels_write"
    ON public.pm_task_labels FOR ALL TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'operador')
        )
    );

-- 5) Seed permission rows in member_module_access for existing members
INSERT INTO public.member_module_access (org_id, member_id, module, can_view, can_edit, can_delete)
SELECT
    m.org_id,
    m.id,
    'project-management',
    true,
    (m.role IN ('admin', 'supervisor', 'operador')),
    (m.role IN ('admin', 'supervisor'))
FROM public.org_members m
ON CONFLICT (member_id, module) DO NOTHING;

