import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateTaskSchema = z.object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(10000).optional().nullable(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    assignee_user_id: z.string().uuid().optional().nullable(),
    reporter_user_id: z.string().uuid().optional().nullable(),
    sort_order: z.number().int().optional(),
    scope: z.enum(["team", "role", "personal"]).optional(),
    role_target: z.enum(["admin", "supervisor", "operador", "applicator"]).optional().nullable(),
    is_private: z.boolean().optional(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data, error } = await supabase
        .from("pm_tasks")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task: data });
}, { module: "project-management", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (updates.scope === "role" && updates.role_target === undefined) {
        return NextResponse.json({ error: "role_target is required when scope=role." }, { status: 400 });
    }
    if (updates.scope && updates.scope !== "role" && updates.role_target === undefined) {
        updates.role_target = null;
    }
    if (updates.scope === "personal" && updates.is_private === undefined) {
        updates.is_private = true;
    }

    const { data: existing, error: existingError } = await supabase
        .from("pm_tasks")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data: updated, error } = await supabase
        .from("pm_tasks")
        .update({
            ...updates,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !updated) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "pm_tasks",
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ task: updated });
}, { module: "project-management", action: "edit" });

