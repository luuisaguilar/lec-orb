import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { sanitizeFilename } from "@/lib/oopt-pdf-splitter";
import {
    OOPT_PROJECTS_BUCKET,
    saveOoptProjectBodySchema,
} from "@/lib/oopt-projects-schema";

export const maxDuration = 120;

/**
 * GET — list saved OOPT projects for the current org.
 * POST — persist a processed split (metadata + PDFs to Storage).
 */
export const GET = withAuth(
    async (_req, { supabase, member }) => {
        const { data: rows, error } = await supabase
            .from("oopt_projects")
            .select(
                "id, title, event_id, total_pages, processed_count, errors_count, created_at, updated_at, source_pdf_filename"
            )
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(200);

        if (error) {
            console.error("[oopt/projects GET]", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ projects: rows ?? [] });
    },
    { module: "oopt-pdf", action: "view" }
);

export const POST = withAuth(
    async (req, { supabase, user, member, enrichAudit }) => {
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
        }

        const parsed = saveOoptProjectBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const payload = parsed.data;

        if (payload.event_id) {
            const { data: ev, error: evErr } = await supabase
                .from("events")
                .select("id")
                .eq("id", payload.event_id)
                .eq("org_id", member.org_id)
                .maybeSingle();
            if (evErr || !ev) {
                return NextResponse.json({ error: "El evento no existe en tu organización." }, { status: 400 });
            }
        }

        const approxBytes =
            (payload.source_pdf_base64?.length ?? 0) * 0.75 +
            payload.split.results.reduce((acc, r) => acc + (r.pdfBase64?.length ?? 0) * 0.75, 0);
        if (approxBytes > 48 * 1024 * 1024) {
            return NextResponse.json(
                {
                    error:
                        "El guardado supera el límite aproximado de 48 MB. Prueba sin el PDF fuente o divide la corrida en lotes más pequeños.",
                },
                { status: 413 }
            );
        }

        const splitErrors = payload.split.error_details ?? [];

        const { data: project, error: insErr } = await supabase
            .from("oopt_projects")
            .insert({
                org_id: member.org_id,
                event_id: payload.event_id ?? null,
                title: payload.title.trim(),
                logistics_notes: payload.logistics_notes?.trim() || null,
                analysis_notes: payload.analysis_notes?.trim() || null,
                general_notes: payload.general_notes?.trim() || null,
                source_pdf_filename: payload.source_pdf_filename?.trim() || null,
                total_pages: payload.split.total_pages,
                processed_count: payload.split.processed,
                errors_count: payload.split.errors,
                split_errors: splitErrors,
                created_by: user.id,
            })
            .select("id")
            .single();

        if (insErr || !project) {
            console.error("[oopt/projects POST insert]", insErr);
            return NextResponse.json({ error: insErr?.message ?? "No se pudo crear el proyecto." }, { status: 500 });
        }

        const projectId = project.id as string;
        const uploadedPaths: string[] = [];

        try {
            if (payload.source_pdf_base64) {
                const raw = Buffer.from(payload.source_pdf_base64, "base64");
                const srcName = sanitizeFilename(payload.source_pdf_filename || "consolidado.pdf");
                const path = `${member.org_id}/${projectId}/source-${srcName}`;
                const { error: upErr } = await supabase.storage
                    .from(OOPT_PROJECTS_BUCKET)
                    .upload(path, raw, { contentType: "application/pdf", upsert: true });
                if (upErr) throw new Error(upErr.message);
                uploadedPaths.push(path);
                const { error: upMeta } = await supabase
                    .from("oopt_projects")
                    .update({ source_pdf_storage_path: path })
                    .eq("id", projectId)
                    .eq("org_id", member.org_id);
                if (upMeta) throw new Error(upMeta.message);
            }

            for (const row of payload.split.results) {
                const safeName = sanitizeFilename(row.filename) || `p${row.page}.pdf`;
                const storagePath = `${member.org_id}/${projectId}/splits/p${String(row.page).padStart(3, "0")}-${safeName}`;
                const bin = Buffer.from(row.pdfBase64, "base64");
                const { error: upErr } = await supabase.storage
                    .from(OOPT_PROJECTS_BUCKET)
                    .upload(storagePath, bin, { contentType: "application/pdf", upsert: true });
                if (upErr) throw new Error(`Página ${row.page}: ${upErr.message}`);
                uploadedPaths.push(storagePath);

                const { error: rErr } = await supabase.from("oopt_results").insert({
                    org_id: member.org_id,
                    project_id: projectId,
                    page_number: row.page,
                    original_name: row.original_name,
                    final_name: row.final_name,
                    level: row.level,
                    score: row.score,
                    result_date: row.date,
                    source: row.source,
                    filename: row.filename,
                    pdf_storage_path: storagePath,
                    ue_score: row.ue_score ?? "",
                    ue_cef: row.ue_cef ?? "",
                    li_score: row.li_score ?? "",
                    li_cef: row.li_cef ?? "",
                });
                if (rErr) throw new Error(rErr.message);
            }
        } catch (e: any) {
            if (uploadedPaths.length > 0) {
                await supabase.storage.from(OOPT_PROJECTS_BUCKET).remove(uploadedPaths);
            }
            await supabase.from("oopt_results").delete().eq("project_id", projectId);
            await supabase.from("oopt_projects").delete().eq("id", projectId).eq("org_id", member.org_id);
            console.error("[oopt/projects POST rollback]", e);
            return NextResponse.json(
                { error: e?.message ?? "Error al subir archivos. Intenta de nuevo." },
                { status: 500 }
            );
        }

        enrichAudit({
            org_id: member.org_id,
            table_name: "oopt_projects",
            record_id: projectId,
            operation: "INSERT",
            new_data: { title: payload.title, processed: payload.split.processed },
            changed_by: user.id,
        });

        return NextResponse.json({ id: projectId }, { status: 201 });
    },
    { module: "oopt-pdf", action: "edit" }
);
