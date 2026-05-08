import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import type { Database } from "@/types/database.types";

type EventStaffUpdate = Database["public"]["Tables"]["event_staff"]["Update"];

const updateStaffSchema = z.object({
    role: z.enum(["SE", "ADMIN", "INVIGILATOR", "SUPER"]).optional(),
    hourly_rate: z.number().positive().optional().nullable(),
    fixed_payment: z.number().positive().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id: eventId, staffId } = await params;
    const body = await req.json();
    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const { data: currentStaff, error: fetchError } = await supabase
        .from("event_staff")
        .select("*")
        .eq("id", staffId)
        .eq("event_id", eventId)
        .eq("org_id", member.org_id)
        .single();

    if (fetchError || !currentStaff) {
        return NextResponse.json({ error: "Staff assignment not found" }, { status: 404 });
    }

    const mergedUpdate: EventStaffUpdate = {
        ...parsed.data,
        updated_at: new Date().toISOString(),
    };

    const materialChanged =
        (parsed.data.role !== undefined && parsed.data.role !== currentStaff.role) ||
        (parsed.data.hourly_rate !== undefined && parsed.data.hourly_rate !== currentStaff.hourly_rate) ||
        (parsed.data.fixed_payment !== undefined &&
            parsed.data.fixed_payment !== currentStaff.fixed_payment) ||
        (parsed.data.notes !== undefined && parsed.data.notes !== currentStaff.notes);

    if (materialChanged) {
        mergedUpdate.acknowledgment_status = "pending";
        mergedUpdate.acknowledged_at = null;
    }

    const { data, error } = await supabase
        .from("event_staff")
        .update(mergedUpdate)
        .eq("id", staffId)
        .select(`
            *,
            applicator:applicators (
                id,
                name,
                email
            )
        `)
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "event_staff",
        record_id: staffId,
        action: "UPDATE",
        old_data: currentStaff,
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ assignment: data });
}, { module: "events", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id: eventId, staffId } = await params;

    const { data: currentStaff, error: fetchError } = await supabase
        .from("event_staff")
        .select("*")
        .eq("id", staffId)
        .eq("event_id", eventId)
        .eq("org_id", member.org_id)
        .single();

    if (fetchError || !currentStaff) {
        return NextResponse.json({ error: "Staff assignment not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from("event_staff")
        .delete()
        .eq("id", staffId);

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "event_staff",
        record_id: staffId,
        action: "DELETE",
        old_data: currentStaff,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true });
}, { module: "events", action: "edit" });
