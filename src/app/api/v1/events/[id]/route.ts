import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const selectShape = `
            *,
            school:schools(*),
            sessions:event_sessions(*),
            staff:event_staff(
                id, role, session_id, applicator_id,
                applicator:applicators(*)
            ),
            slots:event_slots(*)
        `;

    const { data: directEvent, error: directError } = await supabase
        .from("events")
        .select(selectShape)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .maybeSingle();

    if (directError) throw directError;

    let event = directEvent;

    // Backward compatibility:
    // some old links can open planner using a session id instead of event id.
    if (!event) {
        const { data: sessionRef, error: sessionRefError } = await supabase
            .from("event_sessions")
            .select("event_id")
            .eq("id", id)
            .maybeSingle();

        if (sessionRefError) throw sessionRefError;

        if (sessionRef?.event_id) {
            const { data: fallbackEvent, error: fallbackError } = await supabase
                .from("events")
                .select(selectShape)
                .eq("id", sessionRef.event_id)
                .eq("org_id", member.org_id)
                .maybeSingle();

            if (fallbackError) throw fallbackError;
            event = fallbackEvent;
        }
    }

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (event.slots) {
        event.slots.sort((a: any, b: any) => a.slot_number - b.slot_number);
    }

    return NextResponse.json({ event });
}, { module: "events", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const updateData = { ...body };
    delete updateData.id;
    delete updateData.org_id;

    const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "events", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "events", action: "delete" });
