import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

/**
 * Nested budget catalog for presupuesto UI (categories → items → lines for a fiscal year).
 */
export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const fiscalYear = parseInt(searchParams.get("fiscal_year") || new Date().getFullYear().toString(), 10);

    const { data: items, error: itemsError } = await supabase
        .from("budget_items")
        .select("id, code, name, channel_scope, is_active, category_id, budget_categories(id, name, sort_order, is_active)")
        .eq("org_id", orgId)
        .order("code", { ascending: true });

    if (itemsError) throw itemsError;

    const { data: lines, error: linesError } = await supabase
        .from("budget_lines")
        .select("id, item_id, fiscal_year, month, channel, budgeted_amount, actual_amount, notes")
        .eq("org_id", orgId)
        .eq("fiscal_year", fiscalYear)
        .order("month", { ascending: true });

    if (linesError) throw linesError;

    const linesByItem = new Map<string, typeof lines>();
    for (const line of lines ?? []) {
        const list = linesByItem.get(line.item_id) ?? [];
        list.push(line);
        linesByItem.set(line.item_id, list);
    }

    type ItemRow = NonNullable<typeof items>[number];
    const categoriesMap = new Map<
        string,
        { id: string; name: string; sort_order: number | null; items: Array<ItemRow & { lines: NonNullable<typeof lines> }> }
    >();

    for (const item of items ?? []) {
        const cat = item.budget_categories as { id: string; name: string; sort_order: number | null } | null;
        if (!cat?.id) continue;
        let bucket = categoriesMap.get(cat.id);
        if (!bucket) {
            bucket = { id: cat.id, name: cat.name, sort_order: cat.sort_order ?? 0, items: [] };
            categoriesMap.set(cat.id, bucket);
        }
        bucket.items.push({
            ...item,
            lines: linesByItem.get(item.id) ?? [],
        });
    }

    const categories = [...categoriesMap.values()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return NextResponse.json({ fiscal_year: fiscalYear, categories });
}, { module: "finanzas", action: "view" });
