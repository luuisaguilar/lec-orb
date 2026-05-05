import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { canMutateSgc, forbiddenSgcMutation, mapSgcDbError } from "@/app/api/v1/sgc/_shared";

const stageKindSchema = z.enum(["nc", "action"]);

const updateNcStageSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    state: z.enum(["draft", "analysis", "pending", "open", "done", "cancel"]).optional(),
    sequence: z.number().int().min(0).optional(),
    is_starting: z.boolean().optional(),
    is_terminal: z.boolean().optional(),
});

const updateActionStageSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    state: z.enum(["draft", "open", "in_progress", "done", "cancel"]).optional(),
    sequence: z.number().int().min(0).optional(),
    is_starting: z.boolean().optional(),
    is_ending: z.boolean().optional(),
});

function getKind(reqUrl: string) {
    const { searchParams } = new URL(reqUrl);
    const parsed = stageKindSchema.safeParse(searchParams.get("kind") ?? "nc");
    return parsed.success ? parsed.data : "nc";
}

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;
    const kind = getKind(req.url);
    const body = await req.json();
    const parsed = kind === "action"
        ? updateActionStageSchema.safeParse(body)
        : updateNcStageSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    if (Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const table = kind === "action" ? "sgc_action_stages" : "sgc_nc_stages";

    const { data: existing, error: existingError } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const { data: updated, error } = await supabase
        .from(table)
        .update({
            ...parsed.data,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !updated) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: table,
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ kind, stage: updated });
}, { module: "sgc", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;
    const kind = getKind(req.url);
    const table = kind === "action" ? "sgc_action_stages" : "sgc_nc_stages";

    const { data: existing, error: existingError } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: table,
        record_id: id,
        action: "DELETE",
        old_data: existing,
        performed_by: user.id,
    });

    return NextResponse.json({ ok: true, kind });
}, { module: "sgc", action: "edit" });
