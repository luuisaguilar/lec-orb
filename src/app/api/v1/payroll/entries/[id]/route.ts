import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

function num(v: unknown): number {
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

const patchSchema = z.object({
    adjustments: z.number().optional(),
    notes: z.string().max(2000).nullable().optional(),
    status: z.string().max(40).optional(),
});

export const PATCH = withAuth(
    async (req, { supabase, member }, ctx) => {
        const { id } = await ctx.params;
        const parsed = patchSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
        }

        const { data: existing, error: exErr } = await supabase
            .from("payroll_entries")
            .select("id, period_id, org_id")
            .eq("id", id)
            .eq("org_id", member.org_id)
            .single();
        if (exErr) throw exErr;
        if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        const body = parsed.data;
        if (body.adjustments !== undefined) patch.adjustments = body.adjustments;
        if (body.notes !== undefined) patch.notes = body.notes;
        if (body.status !== undefined) patch.status = body.status;

        if (body.adjustments !== undefined) {
            const { data: row, error: rErr } = await supabase
                .from("payroll_entries")
                .select("subtotal, adjustments")
                .eq("id", id)
                .eq("org_id", member.org_id)
                .single();
            if (rErr) throw rErr;
            if (row) {
                const sub = num(row.subtotal);
                const adj = num(body.adjustments);
                patch.total = sub + adj;
            }
        }

        const { data: updated, error: uErr } = await supabase
            .from("payroll_entries")
            .update(patch)
            .eq("id", id)
            .eq("org_id", member.org_id)
            .select()
            .single();
        if (uErr) throw uErr;

        return NextResponse.json({ entry: updated });
    },
    { module: "payroll", action: "edit" }
);
