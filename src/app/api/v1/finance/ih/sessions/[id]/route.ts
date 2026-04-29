import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";

const PatchSchema = z.object({
    school_name:      z.string().min(1).optional(),
    exam_type:        z.string().min(1).optional(),
    session_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    region:           z.enum(["SONORA", "BAJA_CALIFORNIA"]).optional(),
    students_applied: z.number().int().min(0).optional(),
    tariff:           z.number().positive().optional(),
    students_paid_ih: z.number().int().min(0).optional(),
    amount_paid_ih:   z.number().min(0).optional(),
    status:           z.enum(["PENDING", "PAID", "PAID_DIFF", "FUTURE"]).optional(),
    notes:            z.string().optional().nullable(),
    school_id:        z.string().uuid().optional().nullable(),
    ih_invoice_id:    z.string().uuid().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;
    const { data, error } = await supabase
        .from("ih_sessions")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(data);
}, { module: "finanzas", action: "view" });

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const body   = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { data: existing } = await supabase
        .from("ih_sessions")
        .select("id")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { data, error } = await supabase
        .from("ih_sessions")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_sessions", record_id: id,
        action: "UPDATE", new_data: data, performed_by: user.id,
    });
    return NextResponse.json(data);
}, { module: "finanzas", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { data: existing } = await supabase
        .from("ih_sessions")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { error } = await supabase.from("ih_sessions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_sessions", record_id: id,
        action: "DELETE", old_data: existing, performed_by: user.id,
    });
    return NextResponse.json({ ok: true });
}, { module: "finanzas", action: "delete" });
