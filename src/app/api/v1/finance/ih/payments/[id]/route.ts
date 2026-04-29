import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const PatchSchema = z.object({
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    amount:       z.number().positive().optional(),
    reference:    z.string().optional().nullable(),
    notes:        z.string().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;
    const { data, error } = await supabase
        .from("ih_payments")
        .select("*, ih_payment_sessions(id, session_id, students_paid, amount_applied, ih_sessions(school_name, exam_type, session_date, subtotal_lec))")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Generar signed URL del comprobante si existe
    if (data.proof_path) {
        const admin = createAdminClient();
        const { data: signed } = await admin.storage
            .from("ih-payment-proofs")
            .createSignedUrl(data.proof_path, 300);
        data.proof_url = signed?.signedUrl ?? null;
    }

    return NextResponse.json(data);
}, { module: "finanzas", action: "view" });

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id }  = await params;
    const body    = await req.json();
    const parsed  = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { data: existing } = await supabase
        .from("ih_payments").select("id").eq("id", id).eq("org_id", member.org_id).single();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { data, error } = await supabase
        .from("ih_payments")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_payments", record_id: id,
        action: "UPDATE", new_data: data, performed_by: user.id,
    });
    return NextResponse.json(data);
}, { module: "finanzas", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { data: existing } = await supabase
        .from("ih_payments").select("*").eq("id", id).eq("org_id", member.org_id).single();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Revertir conciliaciones antes de eliminar
    const { data: linked } = await supabase
        .from("ih_payment_sessions")
        .select("session_id, amount_applied, students_paid")
        .eq("payment_id", id);

    if (linked && linked.length > 0) {
        for (const link of linked) {
            const { data: session } = await supabase
                .from("ih_sessions")
                .select("amount_paid_ih, students_paid_ih")
                .eq("id", link.session_id)
                .single();
            if (session) {
                const newAmount = Math.max(0, (session.amount_paid_ih ?? 0) - link.amount_applied);
                const newStudents = Math.max(0, (session.students_paid_ih ?? 0) - link.students_paid);
                await supabase.from("ih_sessions").update({
                    amount_paid_ih: newAmount,
                    students_paid_ih: newStudents,
                    status: newAmount <= 0 ? "PENDING" : "PAID_DIFF",
                    updated_at: new Date().toISOString(),
                }).eq("id", link.session_id);
            }
        }
    }

    const { error } = await supabase.from("ih_payments").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Eliminar comprobante de Storage
    if (existing.proof_path) {
        const admin = createAdminClient();
        await admin.storage.from("ih-payment-proofs").remove([existing.proof_path]);
    }

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_payments", record_id: id,
        action: "DELETE", old_data: existing, performed_by: user.id,
    });
    return NextResponse.json({ ok: true });
}, { module: "finanzas", action: "delete" });
