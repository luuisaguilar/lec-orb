import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";

const PatchSchema = z.object({
    invoice_number: z.string().min(1).optional(),
    period_label:   z.string().min(1).optional(),
    invoice_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    total_students: z.number().int().min(0).optional(),
    total_amount:   z.number().min(0).optional(),
    status:         z.enum(["DRAFT", "SENT", "PAID", "PARTIAL"]).optional(),
    notes:          z.string().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;
    const { data, error } = await supabase
        .from("ih_invoices")
        .select("*, ih_sessions(id, school_name, exam_type, session_date, students_applied, tariff, subtotal_lec, status, region)")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(data);
}, { module: "finanzas", action: "view" });

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id }  = await params;
    const body    = await req.json();
    const parsed  = PatchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { data: existing } = await supabase
        .from("ih_invoices").select("id").eq("id", id).eq("org_id", member.org_id).single();
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const { data, error } = await supabase
        .from("ih_invoices")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_invoices", record_id: id,
        action: "UPDATE", new_data: data, performed_by: user.id,
    });
    return NextResponse.json(data);
}, { module: "finanzas", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { data: existing } = await supabase
        .from("ih_invoices").select("*").eq("id", id).eq("org_id", member.org_id).single();
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    // Desligar sesiones antes de eliminar
    await supabase
        .from("ih_sessions")
        .update({ ih_invoice_id: null, updated_at: new Date().toISOString() })
        .eq("ih_invoice_id", id)
        .eq("org_id", member.org_id);

    const { error } = await supabase.from("ih_invoices").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_invoices", record_id: id,
        action: "DELETE", old_data: existing, performed_by: user.id,
    });
    return NextResponse.json({ ok: true });
}, { module: "finanzas", action: "delete" });
