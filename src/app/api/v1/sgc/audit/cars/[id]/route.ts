import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateCarSchema = z.object({
    status: z.enum(["open", "in_progress", "closed"]).optional(),
    root_cause: z.string().optional().nullable(),
    action_plan: z.string().optional().nullable(),
    owner_name: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
});

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCarSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.root_cause !== undefined) updates.root_cause = parsed.data.root_cause;
    if (parsed.data.action_plan !== undefined) updates.action_plan = parsed.data.action_plan;
    if (parsed.data.owner_name !== undefined) updates.owner_name = parsed.data.owner_name;
    if (parsed.data.due_date !== undefined) updates.due_date = parsed.data.due_date;

    const { data, error } = await supabase
        .from("sgc_audit_cars")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("id, audit_check_id, car_code, finding_clause_id, finding_title, description, status, root_cause, action_plan, owner_name, due_date, created_at, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_audit_cars",
        record_id: data.id,
        action: "UPDATE",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ car: data });
}, { module: "sgc", action: "edit" });
