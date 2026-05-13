import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { OOPT_PROJECTS_BUCKET } from "@/lib/oopt-projects-schema";

const patchSchema = z.object({
    title: z.string().min(1).max(240).optional(),
    event_id: z.string().uuid().nullable().optional(),
    logistics_notes: z.string().max(50000).nullable().optional(),
    analysis_notes: z.string().max(50000).nullable().optional(),
    general_notes: z.string().max(50000).nullable().optional(),
});

export const GET = withAuth(
    async (_req, { supabase, member }, { params }) => {
        const { id } = await params;

        const { data: project, error: pErr } = await supabase
            .from("oopt_projects")
            .select(
                `
                id, org_id, event_id, title, logistics_notes, analysis_notes, general_notes,
                source_pdf_filename, source_pdf_storage_path, total_pages, processed_count,
                errors_count, split_errors, created_at, updated_at
            `
            )
            .eq("id", id)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .maybeSingle();

        if (pErr) {
            console.error("[oopt/projects/[id] GET]", pErr);
            return NextResponse.json({ error: pErr.message }, { status: 500 });
        }
        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
        }

        let linked_event: { id: string; title: string; date: string | null; status: string | null } | null =
            null;
        if (project.event_id) {
            const { data: ev } = await supabase
                .from("events")
                .select("id, title, date, status")
                .eq("id", project.event_id as string)
                .eq("org_id", member.org_id)
                .maybeSingle();
            if (ev) linked_event = ev as typeof linked_event;
        }

        const { data: results, error: rErr } = await supabase
            .from("oopt_results")
            .select(
                "id, page_number, original_name, final_name, level, score, result_date, source, filename, pdf_storage_path, ue_score, ue_cef, li_score, li_cef"
            )
            .eq("project_id", id)
            .eq("org_id", member.org_id)
            .order("page_number", { ascending: true });

        if (rErr) {
            console.error("[oopt/projects/[id] GET results]", rErr);
            return NextResponse.json({ error: rErr.message }, { status: 500 });
        }

        return NextResponse.json({ project, linked_event, results: results ?? [] });
    },
    { module: "oopt-pdf", action: "view" }
);

export const PATCH = withAuth(
    async (req, { supabase, user, member, enrichAudit }, { params }) => {
        const { id } = await params;

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
        }

        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
        }

        const { data: existing, error: exErr } = await supabase
            .from("oopt_projects")
            .select("id, title, event_id, logistics_notes, analysis_notes, general_notes")
            .eq("id", id)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .maybeSingle();

        if (exErr || !existing) {
            return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
        }

        const patch = parsed.data;
        if (patch.event_id !== undefined && patch.event_id !== null) {
            const { data: ev, error: evErr } = await supabase
                .from("events")
                .select("id")
                .eq("id", patch.event_id)
                .eq("org_id", member.org_id)
                .maybeSingle();
            if (evErr || !ev) {
                return NextResponse.json({ error: "El evento no existe en tu organización." }, { status: 400 });
            }
        }

        const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.title !== undefined) update.title = patch.title.trim();
        if (patch.event_id !== undefined) update.event_id = patch.event_id;
        if (patch.logistics_notes !== undefined) update.logistics_notes = patch.logistics_notes?.trim() || null;
        if (patch.analysis_notes !== undefined) update.analysis_notes = patch.analysis_notes?.trim() || null;
        if (patch.general_notes !== undefined) update.general_notes = patch.general_notes?.trim() || null;

        const { data: updated, error: upErr } = await supabase
            .from("oopt_projects")
            .update(update)
            .eq("id", id)
            .eq("org_id", member.org_id)
            .select("id, title, event_id, logistics_notes, analysis_notes, general_notes, updated_at")
            .single();

        if (upErr || !updated) {
            console.error("[oopt/projects/[id] PATCH]", upErr);
            return NextResponse.json({ error: upErr?.message ?? "No se pudo actualizar." }, { status: 500 });
        }

        enrichAudit({
            org_id: member.org_id,
            table_name: "oopt_projects",
            record_id: id,
            operation: "UPDATE",
            old_data: existing as Record<string, unknown>,
            new_data: updated as Record<string, unknown>,
            changed_by: user.id,
        });

        return NextResponse.json({ project: updated });
    },
    { module: "oopt-pdf", action: "edit" }
);

export const DELETE = withAuth(
    async (_req, { supabase, user, member, enrichAudit }, { params }) => {
        const { id } = await params;

        const { data: project, error: pErr } = await supabase
            .from("oopt_projects")
            .select("id, source_pdf_storage_path, title")
            .eq("id", id)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .maybeSingle();

        if (pErr || !project) {
            return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
        }

        const { data: resRows, error: rErr } = await supabase
            .from("oopt_results")
            .select("pdf_storage_path")
            .eq("project_id", id)
            .eq("org_id", member.org_id);

        if (rErr) {
            return NextResponse.json({ error: rErr.message }, { status: 500 });
        }

        const paths: string[] = [];
        if (project.source_pdf_storage_path) paths.push(project.source_pdf_storage_path as string);
        for (const r of resRows ?? []) {
            if (r.pdf_storage_path) paths.push(r.pdf_storage_path as string);
        }

        if (paths.length > 0) {
            const { error: rmErr } = await supabase.storage.from(OOPT_PROJECTS_BUCKET).remove(paths);
            if (rmErr) {
                console.error("[oopt/projects DELETE storage]", rmErr);
                return NextResponse.json({ error: rmErr.message }, { status: 500 });
            }
        }

        const { error: delErr } = await supabase.from("oopt_projects").delete().eq("id", id).eq("org_id", member.org_id);
        if (delErr) {
            console.error("[oopt/projects DELETE]", delErr);
            return NextResponse.json({ error: delErr.message }, { status: 500 });
        }

        enrichAudit({
            org_id: member.org_id,
            table_name: "oopt_projects",
            record_id: id,
            operation: "DELETE",
            old_data: { title: project.title },
            changed_by: user.id,
        });

        return NextResponse.json({ success: true });
    },
    { module: "oopt-pdf", action: "delete" }
);
