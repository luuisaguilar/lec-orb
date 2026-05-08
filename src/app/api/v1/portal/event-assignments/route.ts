import { NextResponse } from "next/server";
import { withApplicatorAuth } from "@/lib/auth/with-applicator";

export const GET = withApplicatorAuth(async (_req, { supabase, applicator }) => {
    const { data: rows, error } = await supabase
        .from("event_staff")
        .select(`
            id,
            event_id,
            session_id,
            role,
            hourly_rate,
            fixed_payment,
            notes,
            acknowledgment_status,
            acknowledged_at,
            created_at,
            events (
                id,
                title,
                date,
                status,
                school_id,
                schools (
                    id,
                    name,
                    city
                )
            ),
            event_sessions (
                id,
                exam_type,
                date,
                speaking_date
            )
        `)
        .eq("applicator_id", applicator.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[portal/event-assignments] select:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const assignments = (rows ?? []).map((row: Record<string, unknown>) => ({
        id: row.id,
        event_id: row.event_id,
        session_id: row.session_id,
        role: row.role,
        hourly_rate: row.hourly_rate,
        fixed_payment: row.fixed_payment,
        notes: row.notes,
        acknowledgment_status:
            typeof row.acknowledgment_status === "string"
                ? row.acknowledgment_status
                : "pending",
        acknowledged_at: row.acknowledged_at ?? null,
        created_at: row.created_at ?? null,
        event: row.events ?? null,
        session: row.event_sessions ?? null,
    }));

    const pendingCount = assignments.filter(
        (a: (typeof assignments)[number]) => (a.acknowledgment_status || "pending") === "pending"
    ).length;

    return NextResponse.json({ assignments, pendingCount });
});
