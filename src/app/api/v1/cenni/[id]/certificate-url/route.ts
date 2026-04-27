import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cenni-certificates";
const EXPIRY_SECONDS = 300;

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data: row, error } = await supabase
        .from("cenni_cases")
        .select("certificate_storage_path")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .single();

    if (error || !row) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    if (!row.certificate_storage_path) {
        return NextResponse.json({ error: "No certificate uploaded" }, { status: 404 });
    }

    let admin;
    try {
        admin = createAdminClient();
    } catch {
        return NextResponse.json({ error: "Storage admin not available" }, { status: 500 });
    }

    const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(row.certificate_storage_path, EXPIRY_SECONDS);

    if (signError || !signed) {
        return NextResponse.json({ error: signError?.message || "Failed to sign URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl, expiresIn: EXPIRY_SECONDS });
}, { module: "cenni", action: "view" });
