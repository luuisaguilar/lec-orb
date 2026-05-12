import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

/** List budget_lines for petty cash (non_fiscal) with item + category labels. */
export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const fiscalYear = parseInt(searchParams.get("fiscal_year") || new Date().getFullYear().toString(), 10);
    const month = searchParams.get("month");
    const channel = searchParams.get("channel") || "non_fiscal";

    let q = supabase
        .from("budget_lines")
        .select(
            "id, fiscal_year, month, channel, budgeted_amount, actual_amount, notes, item_id, budget_items(code, name, budget_categories(id, name, sort_order))"
        )
        .eq("org_id", orgId)
        .eq("fiscal_year", fiscalYear)
        .eq("channel", channel)
        .order("month", { ascending: true });

    if (month) {
        const m = parseInt(month, 10);
        if (m >= 1 && m <= 12) q = q.eq("month", m);
    }

    const { data, error } = await q;

    if (error) throw error;

    return NextResponse.json({ lines: data ?? [] });
}, { module: "finanzas", action: "view" });
