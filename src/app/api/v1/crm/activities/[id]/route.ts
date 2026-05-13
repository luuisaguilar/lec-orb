import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateActivitySchema = z.object({
    status: z.enum(["pending", "done", "cancelled"]).optional(),
    type: z.enum(["call", "email", "meeting", "task", "whatsapp", "note"]).optional(),
    subject: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    due_date: z.string().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/crm/activities/[id]
// Update activity (especially for marking as done)
// ─────────────────────────────────────────────────────────────────────────────

export const PATCH = withAuth(async (req, { supabase, member, user }) => {
    const id = req.url.split("/crm/activities/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing activity ID" }, { status: 400 });

    const body = await req.json();
    const parsed = updateActivitySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    // Get old data
    const { data: oldAct } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!oldAct) {
        return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    // Handle completed_at timestamp
    if (updates.status && updates.status !== oldAct.status) {
        if (updates.status === "done") {
            updates.completed_at = new Date().toISOString();
        } else {
            updates.completed_at = null;
        }
    }

    const { data: activity, error } = await supabase
        .from("crm_activities")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !activity) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_activities",
        record_id: activity.id,
        action: "UPDATE",
        old_data: oldAct,
        new_data: activity,
        performed_by: user.id,
    });

    return NextResponse.json({ activity });
}, { module: "crm", action: "edit" });

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/crm/activities/[id]
// Hard delete
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE = withAuth(async (req, { supabase, member, user }) => {
    const id = req.url.split("/crm/activities/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing activity ID" }, { status: 400 });

    const { data: oldAct } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!oldAct) {
        return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from("crm_activities")
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_activities",
        record_id: id,
        action: "DELETE",
        old_data: oldAct,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true });
}, { module: "crm", action: "edit" });
