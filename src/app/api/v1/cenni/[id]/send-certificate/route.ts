import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCertificateEmail } from "@/lib/email/resend";

const BUCKET = "cenni-certificates";
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 days — gives recipient time to download

const bodySchema = z.object({
    to: z.string().email("Correo electrónico inválido"),
});

export const POST = withAuth(async (req, { supabase, user, member, enrichAudit }, { params }) => {
    const { id } = await params;

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Correo inválido" }, { status: 400 });
    }

    const { to } = parsed.data;

    // Fetch case — verify it belongs to this org and has a certificate
    const { data: row, error: fetchError } = await supabase
        .from("cenni_cases")
        .select("id, folio_cenni, cliente_estudiante, certificate_storage_path")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .single();

    if (fetchError || !row) {
        return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
    }
    if (!row.certificate_storage_path) {
        return NextResponse.json({ error: "Este caso no tiene certificado subido" }, { status: 422 });
    }

    // Generate signed URL (7-day window for email delivery)
    let admin;
    try {
        admin = createAdminClient();
    } catch {
        return NextResponse.json({ error: "Storage admin no disponible" }, { status: 500 });
    }

    const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(row.certificate_storage_path, SIGNED_URL_EXPIRY);

    if (signError || !signed) {
        return NextResponse.json({ error: signError?.message ?? "Error al generar enlace" }, { status: 500 });
    }

    // Fetch org name for the email
    const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", member.org_id)
        .single();

    // Send email — non-blocking on failure (email is best-effort)
    const { sent, error: emailError } = await sendCertificateEmail({
        to,
        studentName: row.cliente_estudiante,
        folio: row.folio_cenni,
        orgName: org?.name ?? "LEC",
        downloadUrl: signed.signedUrl,
    });

    if (!sent) {
        return NextResponse.json({ error: emailError ?? "Error al enviar el correo" }, { status: 502 });
    }

    // Record when and to whom it was sent
    const now = new Date().toISOString();
    const { data: updatedCase, error: updateError } = await supabase
        .from("cenni_cases")
        .update({ certificate_sent_at: now, certificate_sent_to: to })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    enrichAudit({
        org_id: member.org_id,
        table_name: "cenni_cases",
        record_id: id,
        operation: "UPDATE",
        old_data: { certificate_sent_at: null, certificate_sent_to: null },
        new_data: { certificate_sent_at: now, certificate_sent_to: to },
        changed_by: user.id,
    });

    return NextResponse.json({ case: updatedCase, sent: true });
}, { module: "cenni", action: "edit" });
