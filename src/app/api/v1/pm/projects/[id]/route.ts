import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateProjectSchema = z.object({
    key: z.string().trim().min(2).max(20).optional().nullable(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    status: z.enum(["active", "archived"]).optional(),
    owner_user_id: z.string().uuid().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data, error } = await supabase
        .from("pm_projects")
        .select(`
            *,
            boards:pm_boards(
                id,name,default_view,created_at,
                columns:pm_columns(id,name,slug,sort_order,is_done)
            )
        `)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project: data });
}, { module: "project-management", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
        .from("pm_projects")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const normalizedKey =
        updates.key === undefined ? undefined : updates.key ? updates.key.toUpperCase().replace(/\s+/g, "-") : null;

    const { data: updated, error } = await supabase
        .from("pm_projects")
        .update({
            ...updates,
            key: normalizedKey,
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
        table_name: "pm_projects",
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ project: updated });
}, { module: "project-management", action: "edit" });

