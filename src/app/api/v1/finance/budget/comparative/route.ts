import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    // 1. Get all active categories
    const { data: categories, error: catError } = await supabase
        .from("petty_cash_categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (catError) throw catError;

    // 2. Get budgets for this period/org
    const { data: budgets, error: budError } = await supabase
        .from("budgets")
        .select("category_id, amount")
        .eq("org_id", orgId)
        .eq("month", month)
        .eq("year", year);

    if (budError) throw budError;

    // 3. Get actual expenses for this period/org
    const lastDay = new Date(year, month, 0).getDate();
    const startBound = `${year}-${String(month).padStart(2, "0")}-01`;
    const endBound = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const { data: expenses, error: expError } = await supabase
        .from("petty_cash_movements")
        .select("category_id, amount")
        .eq("org_id", orgId)
        .eq("type", "EXPENSE")
        .is("deleted_at", null)
        .gte("date", startBound)
        .lte("date", endBound);

    if (expError) throw expError;

    // 4. Join and calculate
    const comparative = (categories || []).map((cat: any) => {
        const budget = budgets?.find((b: any) => b.category_id === cat.id)?.amount || 0;
        const actual = expenses?.filter((e: any) => e.category_id === cat.id).reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0;
        const variation = budget - actual;
        const variation_pct = budget > 0 ? (variation / budget) * 100 : 0;

        return {
            category_id: cat.id,
            category_name: cat.name,
            category_slug: cat.slug,
            budgeted: budget,
            actual: actual,
            variation: variation,
            variation_pct: variation_pct
        };
    });

    return NextResponse.json({ comparative });
}, { module: "finanzas", action: "view" });
