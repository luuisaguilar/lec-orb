-- ============================================================
-- Sprint 2: IH Billing — Cuentas por Cobrar Cambridge
-- ============================================================

-- Tarifas Cambridge por año y tipo de examen
CREATE TABLE ih_tariffs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year        INT  NOT NULL CHECK (year >= 2020),
    exam_type   TEXT NOT NULL,
    tariff      NUMERIC(10,2) NOT NULL CHECK (tariff > 0),
    UNIQUE(org_id, year, exam_type)
);
ALTER TABLE ih_tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage ih_tariffs"
    ON ih_tariffs FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Facturas emitidas a IH
CREATE TABLE ih_invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number  TEXT NOT NULL,
    region          TEXT NOT NULL CHECK (region IN ('SONORA', 'BAJA_CALIFORNIA')),
    period_label    TEXT NOT NULL,
    invoice_date    DATE,
    total_students  INT NOT NULL DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'PARTIAL')),
    notes           TEXT,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ih_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage ih_invoices"
    ON ih_invoices FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Sesiones de examen aplicadas por LEC
CREATE TABLE ih_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    school_id        UUID REFERENCES schools(id),
    school_name      TEXT NOT NULL,
    exam_type        TEXT NOT NULL,
    session_date     DATE NOT NULL,
    region           TEXT NOT NULL DEFAULT 'SONORA'
                     CHECK (region IN ('SONORA', 'BAJA_CALIFORNIA')),
    students_applied INT  NOT NULL DEFAULT 0 CHECK (students_applied >= 0),
    tariff           NUMERIC(10,2) NOT NULL CHECK (tariff > 0),
    subtotal_lec     NUMERIC(12,2) GENERATED ALWAYS AS (students_applied * tariff) STORED,
    -- Conciliación
    students_paid_ih INT  NOT NULL DEFAULT 0 CHECK (students_paid_ih >= 0),
    amount_paid_ih   NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance          NUMERIC(12,2) GENERATED ALWAYS AS (students_applied * tariff - amount_paid_ih) STORED,
    status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'PAID', 'PAID_DIFF', 'FUTURE')),
    notes            TEXT,
    ih_invoice_id    UUID REFERENCES ih_invoices(id) ON DELETE SET NULL,
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, school_name, exam_type, session_date)
);
ALTER TABLE ih_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage ih_sessions"
    ON ih_sessions FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Pagos recibidos de IH
CREATE TABLE ih_payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_date     DATE NOT NULL,
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    region           TEXT NOT NULL CHECK (region IN ('SONORA', 'BAJA_CALIFORNIA')),
    reference        TEXT,
    notes            TEXT,
    proof_path       TEXT,          -- Storage: ih-payment-proofs/{org_id}/{id}.{ext}
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ih_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage ih_payments"
    ON ih_payments FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Tabla de conciliación: qué sesiones cubre cada pago
CREATE TABLE ih_payment_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id      UUID NOT NULL REFERENCES ih_payments(id) ON DELETE CASCADE,
    session_id      UUID NOT NULL REFERENCES ih_sessions(id) ON DELETE CASCADE,
    students_paid   INT  NOT NULL DEFAULT 0,
    amount_applied  NUMERIC(12,2) NOT NULL CHECK (amount_applied > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(payment_id, session_id)
);
ALTER TABLE ih_payment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage ih_payment_sessions"
    ON ih_payment_sessions FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Índices de rendimiento
CREATE INDEX idx_ih_sessions_org_region  ON ih_sessions(org_id, region);
CREATE INDEX idx_ih_sessions_status      ON ih_sessions(org_id, status);
CREATE INDEX idx_ih_sessions_school      ON ih_sessions(org_id, school_name);
CREATE INDEX idx_ih_payments_org_region  ON ih_payments(org_id, region);
CREATE INDEX idx_ih_invoices_org_region  ON ih_invoices(org_id, region);

-- Seed de tarifas históricas 2023-2026 (se aplicará con org_id del admin via API)
-- No incluido en migración para evitar hardcodear org_id.
-- El endpoint POST /api/v1/finance/ih/tariffs/seed lo aplica al primer uso.
