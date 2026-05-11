import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const bodySchema = z.object({
    periodIds: z.array(z.string().uuid()).min(1).max(30),
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    }

    const { periodIds } = parsed.data;

    const { data: periods, error: pErr } = await supabase
        .from("payroll_periods")
        .select("id")
        .eq("org_id", member.org_id)
        .in("id", periodIds);
    if (pErr) throw pErr;

    const allowed = new Set((periods ?? []).map((p: { id: string }) => p.id));
    const results: { periodId: string; ok: boolean; error?: string }[] = [];

    for (const periodId of periodIds) {
        if (!allowed.has(periodId)) {
            results.push({ periodId, ok: false, error: "not_found_or_org" });
            continue;
        }
        const { error } = await supabase.rpc("fn_calculate_payroll_for_period", {
            p_period_id: periodId,
        });
        if (error) {
            results.push({ periodId, ok: false, error: error.message });
        } else {
            results.push({ periodId, ok: true });
        }
    }

    return NextResponse.json({ results });
}, { module: "payroll", action: "edit" });
