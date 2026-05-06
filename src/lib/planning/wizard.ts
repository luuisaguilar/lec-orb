import { z } from "zod";

export const sourceTypeSchema = z.enum(["excel", "byDate", "planTable", "examMatrix"]);
export const projectTypeSchema = z.enum(["unoi", "cambridge", "custom"]);

export const wizardRowSchema = z.object({
    city: z.string().optional().nullable(),
    project: z.string().optional().default("UNOi"),
    school_name: z.string().min(1),
    nivel: z.string().optional().nullable(),
    exam_type: z.string().min(1),
    students_planned: z.number().int().nonnegative().optional().nullable(),
    proposed_date: z.string().min(1),
    notes: z.string().optional().nullable(),
});

export const wizardCreateSchema = z.object({
    projectType: projectTypeSchema,
    sourceType: sourceTypeSchema,
    planningYear: z.number().int().min(2000).max(2200),
    planningCycle: z.string().trim().min(1).default("annual"),
    rows: z.array(wizardRowSchema).min(1),
    createIfMissing: z.boolean().default(true),
});

export type WizardCreatePayload = z.infer<typeof wizardCreateSchema>;
