import { z } from "zod";

export const CP_MODULE = "coordinacion-proyectos-lec" as const;

const uuid = z.string().uuid();
const monthDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-01

export const programProjectCreateSchema = z.object({
    period_month: monthDate,
    department_id: uuid.nullable().optional(),
    description: z.string().min(1).max(2000),
    client_type: z.string().min(1).max(120).default("Institución"),
    product_service_id: uuid.nullable().optional(),
    product_service_label: z.string().max(200).nullable().optional(),
    beneficiaries_count: z.number().int().min(0).default(0),
    revenue_amount: z.number().nullable().optional(),
    size_code: z.enum(["MI", "C", "M", "G"]).nullable().optional(),
    status: z.enum(["active", "closed", "cancelled"]).default("active"),
    evidence_office_url: z.string().max(2048).nullable().optional(),
    evidence_satisfaction_url: z.string().max(2048).nullable().optional(),
    evidence_survey_url: z.string().max(2048).nullable().optional(),
    checklist_done: z.boolean().optional(),
    source_year: z.number().int().min(2000).max(2100).optional(),
    school_id: uuid.nullable().optional(),
    event_id: uuid.nullable().optional(),
    crm_opportunity_id: uuid.nullable().optional(),
    pm_project_id: uuid.nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
});

export const programProjectUpdateSchema = programProjectCreateSchema.partial();

export const examSalesLineCreateSchema = z.object({
    exam_month: monthDate,
    line_no: z.number().int().nullable().optional(),
    candidate_or_institution: z.string().min(1).max(500),
    exam_type_id: uuid.nullable().optional(),
    exam_type_label: z.string().max(200).nullable().optional(),
    result_summary: z.string().max(1000).nullable().optional(),
    email: z.string().max(320).nullable().optional(),
    phone: z.string().max(80).nullable().optional(),
    confirmation: z.string().max(40).nullable().optional(),
    exam_at: z.string().max(40).nullable().optional(),
    quantity: z.number().int().min(1).default(1),
    amount: z.number().nullable().optional(),
    survey_sent: z.boolean().optional(),
    checklist_done: z.boolean().optional(),
    school_id: uuid.nullable().optional(),
    event_id: uuid.nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
});

export const examSalesLineUpdateSchema = examSalesLineCreateSchema.partial();

export const courseOfferingCreateSchema = z.object({
    name: z.string().min(1).max(500),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    participants_count: z.number().int().min(0).default(0),
    price_amount: z.number().nullable().optional(),
    program_project_id: uuid.nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
});

export const courseOfferingUpdateSchema = courseOfferingCreateSchema.partial();

export const catalogRowSchema = z.object({
    kind: z.enum(["department", "exam_type", "product_service"]),
    name: z.string().min(1).max(200),
    sort_order: z.number().int().optional(),
});

export const importBodySchema = z.object({
    entity: z.enum(["program_projects", "exam_sales_lines"]),
    rows: z.array(z.record(z.string(), z.any())).max(2000),
});
