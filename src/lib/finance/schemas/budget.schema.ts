import { z } from "zod";

export const BudgetCategorySchema = z.object({
    id: z.string().uuid().optional(),
    org_id: z.string().uuid(),
    name: z.string().min(1, "Name is required"),
    sort_order: z.number().int().default(0),
    is_active: z.boolean().default(true),
});

export const BudgetItemSchema = z.object({
    id: z.string().uuid().optional(),
    org_id: z.string().uuid(),
    category_id: z.string().uuid(),
    code: z.string().min(1, "Code is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    channel_scope: z.enum(["fiscal", "non_fiscal", "both"]),
    is_active: z.boolean().default(true),
});

export const BudgetLineSchema = z.object({
    id: z.string().uuid().optional(),
    org_id: z.string().uuid(),
    item_id: z.string().uuid(),
    fiscal_year: z.number().int(),
    month: z.number().int().min(1).max(12),
    channel: z.enum(["fiscal", "non_fiscal"]),
    budgeted_amount: z.number().min(0),
    actual_amount: z.number().min(0).optional(),
    notes: z.string().optional().nullable(),
});

export const BudgetLineFilterSchema = z.object({
    org_id: z.string().uuid().optional(),
    fiscal_year: z.number().int(),
    month: z.number().int().min(1).max(12).optional(),
    channel: z.enum(["fiscal", "non_fiscal"]).optional(),
});

export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;
export type BudgetItem = z.infer<typeof BudgetItemSchema>;
export type BudgetLine = z.infer<typeof BudgetLineSchema>;
