import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const PaymentSchema = z.object({
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount:       z.number().positive(),
    region:       z.enum(["SONORA", "BAJA_CALIFORNIA"]),
    reference:    z.string().optional().nullable(),
    notes:        z.string().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");

    let query = supabase
        .from("ih_payments")
        .select("*, ih_payment_sessions(id, session_id, students_paid, amount_applied, ih_sessions(school_name, exam_type, session_date))")
        .eq("org_id", member.org_id)
        .order("payment_date", { ascending: false });

    if (region) query = query.eq("region", region);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    // Acepta multipart (con comprobante) o JSON (sin archivo)
    const contentType = req.headers.get("content-type") ?? "";
    let paymentData: z.infer<typeof PaymentSchema>;
    let proofPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const parsed = PaymentSchema.safeParse({
            payment_date: form.get("payment_date"),
            amount:       Number(form.get("amount")),
            region:       form.get("region"),
            reference:    form.get("reference") || null,
            notes:        form.get("notes") || null,
        });
        if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
        paymentData = parsed.data;

        const file = form.get("proof") as File | null;
        if (file && file.size > 0) {
            // Upload comprobante
            const admin = createAdminClient();
            const ext  = file.name.split(".").pop() ?? "pdf";
            const tmpId = crypto.randomUUID();
            const path = `${member.org_id}/${tmpId}.${ext}`;
            const buffer = Buffer.from(await file.arrayBuffer());
            const { error: uploadErr } = await admin.storage
                .from("ih-payment-proofs")
                .upload(path, buffer, { contentType: file.type, upsert: true });
            if (!uploadErr) proofPath = path;
        }
    } else {
        const body   = await req.json();
        const parsed = PaymentSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
        paymentData = parsed.data;
    }

    const { data, error } = await supabase
        .from("ih_payments")
        .insert({ ...paymentData, proof_path: proofPath, org_id: member.org_id, created_by: user.id })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Actualizar proof_path con el ID real si se subió un archivo con ID temporal
    if (proofPath && proofPath.includes("tmp")) {
        const admin = createAdminClient();
        const newPath = `${member.org_id}/${data.id}.${proofPath.split(".").pop()}`;
        await admin.storage.from("ih-payment-proofs").move(proofPath, newPath);
        await supabase.from("ih_payments").update({ proof_path: newPath }).eq("id", data.id);
        data.proof_path = newPath;
    }

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_payments", record_id: data.id,
        action: "INSERT", new_data: data, performed_by: user.id,
    });
    return NextResponse.json(data, { status: 201 });
}, { module: "finanzas", action: "edit" });
