import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

const BUCKET = "cenni-certificates";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const POST = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "Se requiere un archivo PDF" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: "El archivo excede el límite de 10 MB" }, { status: 400 });
    }

    // Verify the case belongs to this org
    const { data: existing, error: fetchError } = await supabase
        .from("cenni_cases")
        .select("id")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .single();

    if (fetchError || !existing) {
        return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
    }

    // Stable path per case — upsert replaces previous certificate
    const storagePath = `${member.org_id}/${id}.pdf`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
            contentType: "application/pdf",
            upsert: true,
        });

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const now = new Date().toISOString();

    const { data: updatedCase, error: updateError } = await supabase
        .from("cenni_cases")
        .update({
            certificate_storage_path: storagePath,
            certificate_uploaded_at: now,
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("audit_log").insert({
        org_id: member.org_id,
        table_name: "cenni_cases",
        record_id: id,
        action: "UPDATE",
        old_data: { certificate_storage_path: null },
        new_data: { certificate_storage_path: storagePath, certificate_uploaded_at: now },
        performed_by: user.id,
    });

    return NextResponse.json({ case: updatedCase }, { status: 200 });
}, { module: "cenni", action: "edit" });
