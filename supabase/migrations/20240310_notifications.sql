-- ─────────────────────────────────────────────────────────────────────────────
-- F1: Notification System
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type        VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info','warning','success','action_required')),
    title       VARCHAR(200) NOT NULL,
    body        TEXT,
    link        VARCHAR(500),
    module_slug VARCHAR(50),
    is_read     BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    slug        VARCHAR(50) NOT NULL,
    title_tmpl  VARCHAR(200) NOT NULL,
    body_tmpl   TEXT,
    type        VARCHAR(30) DEFAULT 'info',
    channel     VARCHAR(30) DEFAULT 'in_app' CHECK (channel IN ('in_app','email','both')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, slug)
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "notification_templates_select" ON public.notification_templates FOR SELECT TO authenticated
    USING (org_id IS NULL OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "notification_templates_write" ON public.notification_templates FOR ALL TO authenticated
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Seed default templates
INSERT INTO public.notification_templates (org_id, slug, title_tmpl, body_tmpl, type) VALUES
(NULL, 'event_assigned',    'Asignación a evento',         'Se te asignó al evento "{{event_name}}" el {{date}}.', 'info'),
(NULL, 'quote_approved',    'Cotización aprobada',         'La cotización {{reference}} fue aprobada por ${{total}}.', 'success'),
(NULL, 'lead_expired',      'Lead sin actividad',          'El lead "{{title}}" lleva {{days}} días sin actividad.', 'warning'),
(NULL, 'record_created',    'Nuevo registro',              'Se creó un registro en {{module_name}}.', 'info'),
(NULL, 'action_required',   'Acción requerida',            '{{message}}', 'action_required')
ON CONFLICT DO NOTHING;

-- Register in module_registry
INSERT INTO public.module_registry (slug, name, icon, category, is_native, sort_order, description)
VALUES ('notifications', 'Notificaciones', 'Bell', 'Ajustes', true, 63, 'Sistema de notificaciones in-app')
ON CONFLICT DO NOTHING;
