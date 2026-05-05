import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { canMutateSgc, forbiddenSgcMutation, mapSgcDbError } from "@/app/api/v1/sgc/_shared";

const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const updateActionSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    type_action: z.enum(["immediate", "correction", "prevention", "improvement"]).optional(),
    priority: z.enum(["low", "normal"]).optional(),
    stage_id: idSchema.optional().nullable(),
    status: z.enum(["draft", "open", "in_progress", "done", "cancel"]).optional(),
    deadline_at: dateSchema.optional().nullable(),
    responsible_user_id: idSchema.optional().nullable(),
    manager_user_id: idSchema.optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data, error } = await supabase
        .from("sgc_actions")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    return NextResponse.json({ action: data });
}, { module: "sgc", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateActionSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
        .from("sgc_actions")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    if (updates.stage_id) {
        const { data: stageData, error: stageError } = await supabase
            .from("sgc_action_stages")
            .select("id")
            .eq("id", updates.stage_id)
            .eq("org_id", member.org_id)
            .single();
        if (stageError || !stageData) {
            return NextResponse.json({ error: "Invalid stage_id for this organization." }, { status: 400 });
        }
    }

    const { data: updated, error } = await supabase
        .from("sgc_actions")
        .update({
            ...updates,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !updated) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_actions",
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ action: updated });
}, { module: "sgc", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
        .from("sgc_actions")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    const { data: updated, error } = await supabase
        .from("sgc_actions")
        .update({
            status: "cancel",
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !updated) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_actions",
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ ok: true, action: updated });
}, { module: "sgc", action: "edit" });
