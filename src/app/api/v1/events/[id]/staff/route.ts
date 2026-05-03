import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

/**
 * Event Staff API
 * -----------------
 * Manages the assignment of applicators to events with specific roles.
 */

const staffAssignmentSchema = z.object({
    applicator_id: z.string().uuid(),
    role: z.enum(["SE", "ADMIN", "INVIGILATOR", "SUPER"]), // SE (Speaking Examiner)
    hourly_rate: z.number().positive().optional().nullable(),
    fixed_payment: z.number().positive().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { id: eventId } = await params;

    // Fetch staff with applicator details
    const { data, error } = await supabase
        .from("event_staff")
        .select(`
            *,
            applicator:applicators (
                id,
                name,
                email,
                rate_per_hour
            )
        `)
        .eq("org_id", member.org_id)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ staff: data });
}, { module: "events", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id: eventId } = await params;
    const body = await req.json();
    const parsed = staffAssignmentSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const payload = parsed.data;

    const { data, error } = await supabase
        .from("event_staff")
        .insert({
            org_id: member.org_id,
            event_id: eventId,
            applicator_id: payload.applicator_id,
            role: payload.role,
            hourly_rate: payload.hourly_rate ?? null,
            fixed_payment: payload.fixed_payment ?? null,
            notes: payload.notes ?? null,
        })
        .select(`
            *,
            applicator:applicators (
                id,
                name,
                email,
                rate_per_hour
            )
        `)
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Applicator already assigned to this event" },
                { status: 409 }
            );
        }
        throw error;
    }

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "event_staff",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ assignment: data }, { status: 201 });
}, { module: "events", action: "edit" });
