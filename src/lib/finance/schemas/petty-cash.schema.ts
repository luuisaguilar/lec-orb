import { z } from "zod";

export const PettyCashFundSchema = z.object({
    id: z.string().uuid().optional(),
    org_id: z.string().uuid(),
    fiscal_year: z.number().int(),
    name: z.string().min(1, "Fund name is required"),
    custodian_id: z.string().uuid(),
    initial_amount: z.number().min(0),
    current_balance: z.number().min(0).optional(),
    status: z.enum(["open", "closed"]).default("open"),
});

export const ReplenishmentSchema = z.object({
    id: z.string().uuid().optional(),
    org_id: z.string().uuid(),
    fund_id: z.string().uuid(),
    requested_amount: z.number().positive(),
    justification: z.string().min(1, "Justification is required"),
    notes: z.string().optional().nullable(),
});

export const PettyCashMovementSchema = z.object({
    id: z.string().uuid().optional(),
    org_id: z.string().uuid(),
    fund_id: z.string().uuid(),
    budget_line_id: z.string().uuid().optional().nullable(),
    replenishment_request_id: z.string().uuid().optional().nullable(),
    movement_date: z.string(),
    concept: z.string().min(1, "Concept is required"),
    amount_in: z.number().min(0).default(0),
    amount_out: z.number().min(0).default(0),
    receipt_url: z.string().optional().nullable(),
    status: z.enum(["posted", "cancelled"]).default("posted"),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).refine(data => {
    // Exact only one > 0
    return (data.amount_in > 0 && data.amount_out === 0) || (data.amount_in === 0 && data.amount_out > 0);
}, {
    message: "Exactly one of amount_in or amount_out must be greater than zero",
    path: ["amount_in"]
}).refine(data => {
    // Budget line required for expenses
    if (data.amount_out > 0) return !!data.budget_line_id;
    return true;
}, {
    message: "Budget line is required for expenses",
    path: ["budget_line_id"]
});

export type PettyCashFund = z.infer<typeof PettyCashFundSchema>;
export type PettyCashMovement = z.infer<typeof PettyCashMovementSchema>;
export type ReplenishmentRequest = z.infer<typeof ReplenishmentSchema>;
