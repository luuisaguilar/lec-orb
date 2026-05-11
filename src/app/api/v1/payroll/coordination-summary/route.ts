import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

/**
 * GET /api/v1/payroll/coordination-summary?view=applicator|event
 * Agregados multi-período para la vista de coordinación (sin filtrar por un solo período).
 */
export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    if (view !== "applicator" && view !== "event") {
        return NextResponse.json({ error: "Query view=applicator|view=event es obligatorio" }, { status: 400 });
    }

    const { data: periods, error: pErr } = await supabase
        .from("payroll_periods")
        .select("id")
        .eq("org_id", member.org_id);
    if (pErr) throw pErr;

    const periodIds = (periods ?? []).map((p: { id: string }) => p.id);
    if (periodIds.length === 0) {
        return NextResponse.json({ view, rows: [] as unknown[] });
    }

    if (view === "applicator") {
        const { data: entries, error: eErr } = await supabase
            .from("payroll_entries")
            .select("applicator_id, applicator_name, total, period_id")
            .in("period_id", periodIds)
            .eq("org_id", member.org_id);
        if (eErr) throw eErr;

        const byApp = new Map<
            string,
            { applicator_id: string; applicator_name: string; total: number; periodIds: Set<string> }
        >();
        for (const e of entries ?? []) {
            const row = e as {
                applicator_id: string;
                applicator_name: string;
                total: number | null;
                period_id: string;
            };
            const k = row.applicator_id;
            if (!byApp.has(k)) {
                byApp.set(k, {
                    applicator_id: k,
                    applicator_name: row.applicator_name,
                    total: 0,
                    periodIds: new Set(),
                });
            }
            const agg = byApp.get(k)!;
            agg.total += Number(row.total ?? 0);
            agg.periodIds.add(row.period_id);
        }

        const rows = [...byApp.values()]
            .map((a) => ({
                applicator_id: a.applicator_id,
                applicator_name: a.applicator_name,
                total_amount: Math.round(a.total * 100) / 100,
                periods_count: a.periodIds.size,
            }))
            .sort((x, y) => y.total_amount - x.total_amount);

        return NextResponse.json({ view, rows });
    }

    const { data: entryRows, error: enErr } = await supabase
        .from("payroll_entries")
        .select("id")
        .in("period_id", periodIds)
        .eq("org_id", member.org_id);
    if (enErr) throw enErr;

    const entryIds = (entryRows ?? []).map((r: { id: string }) => r.id);
    if (entryIds.length === 0) {
        return NextResponse.json({ view, rows: [] as unknown[] });
    }

    const { data: lines, error: liErr } = await supabase
        .from("payroll_line_items")
        .select("event_id, event_name, total_amount")
        .in("entry_id", entryIds)
        .eq("org_id", member.org_id)
        .not("event_id", "is", null);
    if (liErr) throw liErr;

    const byEv = new Map<
        string,
        { event_id: string; event_name: string; total_amount: number; line_count: number }
    >();
    for (const li of lines ?? []) {
        const row = li as { event_id: string; event_name: string | null; total_amount: number | null };
        const id = row.event_id;
        if (!id) continue;
        if (!byEv.has(id)) {
            byEv.set(id, {
                event_id: id,
                event_name: row.event_name?.trim() || "—",
                total_amount: 0,
                line_count: 0,
            });
        }
        const agg = byEv.get(id)!;
        agg.total_amount += Number(row.total_amount ?? 0);
        agg.line_count += 1;
    }

    const rows = [...byEv.values()]
        .map((r) => ({
            ...r,
            total_amount: Math.round(r.total_amount * 100) / 100,
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

    return NextResponse.json({ view, rows });
}, { module: "payroll", action: "view" });
