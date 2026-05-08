import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const moveTaskSchema = z.object({
    column_id: z.string().uuid(),
    sort_order: z.number().int().optional(),
});

export const POST = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = moveTaskSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const payload = parsed.data;

    const { data: existing, error: existingError } = await supabase
        .from("pm_tasks")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data: targetColumn, error: columnError } = await supabase
        .from("pm_columns")
        .select("id, board_id, is_done")
        .eq("id", payload.column_id)
        .eq("org_id", member.org_id)
        .single();

    if (columnError || !targetColumn) {
        return NextResponse.json({ error: "Invalid column_id for this organization." }, { status: 400 });
    }

    let newSortOrder = payload.sort_order;
    if (typeof newSortOrder !== "number") {
        const { data: maxRow } = await supabase
            .from("pm_tasks")
            .select("sort_order")
            .eq("org_id", member.org_id)
            .eq("column_id", targetColumn.id)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();
        newSortOrder = (maxRow?.sort_order ?? 0) + 1000;
    }

    const completedAt = targetColumn.is_done ? new Date().toISOString() : null;

    const { data: updated, error } = await supabase
        .from("pm_tasks")
        .update({
            board_id: targetColumn.board_id,
            column_id: targetColumn.id,
            sort_order: newSortOrder,
            completed_at: completedAt,
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

