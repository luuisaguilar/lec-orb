import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

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

    const { data, error } = await supabase
        .from("event_staff")
        .update({
            ...parsed.data,
            updated_at: new Date().toISOString(),
        })
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
