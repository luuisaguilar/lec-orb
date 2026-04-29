import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";

const InvoiceSchema = z.object({
    invoice_number: z.string().min(1),
    region:         z.enum(["SONORA", "BAJA_CALIFORNIA"]),
    period_label:   z.string().min(1),
    invoice_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    total_students: z.number().int().min(0).default(0),
    total_amount:   z.number().min(0).default(0),
    status:         z.enum(["DRAFT", "SENT", "PAID", "PARTIAL"]).default("DRAFT"),
    notes:          z.string().optional().nullable(),
    session_ids:    z.array(z.string().uuid()).optional(), // sesiones a ligar
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");
    const status = searchParams.get("status");

    let query = supabase
        .from("ih_invoices")
        .select("*, ih_sessions(id, school_name, exam_type, session_date, students_applied, subtotal_lec, status)")
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

    if (region) query = query.eq("region", region);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body   = await req.json();
    const parsed = InvoiceSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { session_ids, ...invoiceData } = parsed.data;

    const { data, error } = await supabase
        .from("ih_invoices")
        .insert({ ...invoiceData, org_id: member.org_id, created_by: user.id })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Ligar sesiones a esta factura
    if (session_ids && session_ids.length > 0) {
        await supabase
            .from("ih_sessions")
            .update({ ih_invoice_id: data.id, updated_at: new Date().toISOString() })
            .in("id", session_ids)
            .eq("org_id", member.org_id);
    }

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_invoices", record_id: data.id,
        action: "INSERT", new_data: data, performed_by: user.id,
    });
    return NextResponse.json(data, { status: 201 });
}, { module: "finanzas", action: "edit" });
