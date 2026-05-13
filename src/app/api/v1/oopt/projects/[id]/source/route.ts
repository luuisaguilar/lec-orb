import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { OOPT_PROJECTS_BUCKET } from "@/lib/oopt-projects-schema";

export const GET = withAuth(
    async (_req, { supabase, member }, { params }) => {
        const { id } = await params;

        const { data: project, error: pErr } = await supabase
            .from("oopt_projects")
            .select("id, source_pdf_storage_path, source_pdf_filename")
            .eq("id", id)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .maybeSingle();

        if (pErr || !project) {
            return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
        }
        if (!project.source_pdf_storage_path) {
            return NextResponse.json({ error: "No hay PDF consolidado guardado." }, { status: 404 });
        }

        const { data: signed, error: sErr } = await supabase.storage
            .from(OOPT_PROJECTS_BUCKET)
            .createSignedUrl(project.source_pdf_storage_path as string, 120);

        if (sErr || !signed?.signedUrl) {
            console.error("[oopt/source signed]", sErr);
            return NextResponse.json({ error: sErr?.message ?? "No se pudo generar el enlace." }, { status: 500 });
        }

        return NextResponse.json({
            url: signed.signedUrl,
            filename: (project.source_pdf_filename as string) || "consolidado.pdf",
        });
    },
    { module: "oopt-pdf", action: "view" }
);
