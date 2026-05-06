import { NextResponse } from "next/server";
import { withApplicatorAuth } from "@/lib/auth/with-applicator";

export const GET = withApplicatorAuth(async (_req, { supabase, applicator }) => {
    const { data, error } = await supabase
        .from("event_slots")
        .select(`
            id,
            event_id,
            session_id,
            start_time,
            end_time,
            status,
            event_sessions (
                id,
                exam_type,
                date
            ),
            events (
                id,
                title,
                exam_type,
                date,
                school_id,
                schools (
                    id,
                    name
                )
            )
        `)
        .eq("applicator_id", applicator.id)
        .order("id", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const slots = (data ?? []).map((slot: any) => ({
        id: slot.id,
        event_id: slot.event_id,
        session_id: slot.session_id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: slot.status,
        exam_type: slot.event_sessions?.exam_type ?? slot.events?.exam_type ?? null,
        event_date: slot.event_sessions?.date ?? slot.events?.date ?? null,
        event_title: slot.events?.title ?? "Evento",
        school_name: slot.events?.schools?.name ?? "Sede",
    }));

    return NextResponse.json({ slots, total: slots.length });
});
