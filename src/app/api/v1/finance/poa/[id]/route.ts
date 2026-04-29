import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const patchSchema = z.object({
    budgeted_amount: z.number().min(0).optional(),
    real_amount:     z.number().min(0).nullable().optional(),
    section:         z.string().min(1).optional(),
    concept:         z.string().min(1).optional(),
    notes:           z.string().nullable().optional(),
    sort_order:      z.number().int().optional(),
});

// ─── PATCH /api/v1/finance/poa/[id] ────────────────────────────────────────

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos inválidos", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    // Verify ownership before updating
    const { data: existing } = await supabase
        .from("poa_lines")
        .select("id, org_id")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!existing) {
        return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
    }

    const { data: updated, error } = await supabase
        .from("poa_lines")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id:      member.org_id,
        table_name:  "poa_lines",
        record_id:   id,
        action:      "UPDATE",
        new_data:    updated,
        performed_by: user.id,
    });

    return NextResponse.json({ line: updated });
}, { module: "finanzas", action: "edit" });

// ─── DELETE /api/v1/finance/poa/[id] ───────────────────────────────────────

export const DELETE = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { data: existing } = await supabase
        .from("poa_lines")
        .select("id, org_id, concept, year, month, source")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!existing) {
        return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
    }

    const { error } = await supabase
        .from("poa_lines")
        .delete()
        .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id:      member.org_id,
        table_name:  "poa_lines",
        record_id:   id,
        action:      "DELETE",
        new_data:    existing,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true });
}, { module: "finanzas", action: "edit" });
