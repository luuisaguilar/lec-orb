import { z } from "zod";

export const ooptSplitRowSaveSchema = z.object({
    page: z.number().int().positive(),
    original_name: z.string(),
    final_name: z.string(),
    level: z.string(),
    score: z.string(),
    date: z.string(),
    filename: z.string().min(1).max(500),
    source: z.enum(["table", "pdf"]),
    status: z.string(),
    ue_score: z.string().optional(),
    ue_cef: z.string().optional(),
    li_score: z.string().optional(),
    li_cef: z.string().optional(),
    pdfBase64: z.string().min(1),
});

export const saveOoptProjectBodySchema = z.object({
    title: z.string().min(1).max(240),
    event_id: z.string().uuid().optional().nullable(),
    logistics_notes: z.string().max(50000).optional().nullable(),
    analysis_notes: z.string().max(50000).optional().nullable(),
    general_notes: z.string().max(50000).optional().nullable(),
    source_pdf_filename: z.string().max(500).optional().nullable(),
    source_pdf_base64: z.string().optional().nullable(),
    split: z.object({
        total_pages: z.number().int().nonnegative(),
        processed: z.number().int().nonnegative(),
        errors: z.number().int().nonnegative(),
        results: z.array(ooptSplitRowSaveSchema).max(400),
        error_details: z
            .array(
                z.object({
                    page: z.number().int().positive(),
                    name: z.string(),
                    error: z.string(),
                })
            )
            .optional(),
    }),
});

export type SaveOoptProjectBody = z.infer<typeof saveOoptProjectBodySchema>;

export const OOPT_PROJECTS_BUCKET = "oopt-projects";
