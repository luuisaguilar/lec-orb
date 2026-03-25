import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const budgetSchema = z.object({
    org_id: z.string().uuid(),
    category_id: z.string().uuid(),
    month: z.number().min(1).max(12),
    year: z.number(),
    amount: z.number().min(0),
});

const bulkBudgetSchema = z.array(budgetSchema);

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const { data: budgets, error } = await supabase
        .from("budgets")
        .select("*, petty_cash_categories(name, slug)")
        .eq("org_id", orgId)
        .eq("month", month)
        .eq("year", year);

    if (error) throw error;

    return NextResponse.json({ budgets });
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    
    // Support bulk upsert
    const isArray = Array.isArray(body);
    const parsed = isArray ? bulkBudgetSchema.safeParse(body) : budgetSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const entries = isArray ? parsed.data : [parsed.data];
    
    const { data: upsertedBudgets, error } = await supabase
        .from("budgets")
        .upsert(entries.map(e => ({
            ...e,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        })), { onConflict: "org_id, category_id, month, year" })
        .select()

    if (error) throw error;

    // Audit log (simplified for bulk)
    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "budgets",
        record_id: "batch",
        action: "UPSERT",
        new_data: upsertedBudgets,
        performed_by: user.id,
    });

    return NextResponse.json({ budgets: upsertedBudgets });
}, { module: "finanzas", action: "edit" });
