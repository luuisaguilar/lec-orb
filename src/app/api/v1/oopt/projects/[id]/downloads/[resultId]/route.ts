import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { OOPT_PROJECTS_BUCKET } from "@/lib/oopt-projects-schema";

/**
 * GET — JSON with signed URL to download one split PDF (short-lived).
 */
export const GET = withAuth(
    async (_req, { supabase, member }, { params }) => {
        const { id, resultId } = await params;

        const { data: project, error: pErr } = await supabase
            .from("oopt_projects")
            .select("id")
            .eq("id", id)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .maybeSingle();

        if (pErr || !project) {
            return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
        }

        const { data: row, error: rErr } = await supabase
            .from("oopt_results")
            .select("id, filename, pdf_storage_path")
            .eq("id", resultId)
            .eq("project_id", id)
            .eq("org_id", member.org_id)
            .maybeSingle();

        if (rErr || !row) {
            return NextResponse.json({ error: "Resultado no encontrado." }, { status: 404 });
        }

        const { data: signed, error: sErr } = await supabase.storage
            .from(OOPT_PROJECTS_BUCKET)
            .createSignedUrl(row.pdf_storage_path as string, 120);

        if (sErr || !signed?.signedUrl) {
            console.error("[oopt/downloads signed]", sErr);
            return NextResponse.json({ error: sErr?.message ?? "No se pudo generar el enlace." }, { status: 500 });
        }

        return NextResponse.json({
            url: signed.signedUrl,
            filename: row.filename as string,
        });
    },
    { module: "oopt-pdf", action: "view" }
);
