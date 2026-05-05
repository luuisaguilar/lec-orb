import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data: directEvent, error: directError } = await supabase
        .from("events")
        .select("*")
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
                .select("*")
                .eq("id", sessionRef.event_id)
                .eq("org_id", member.org_id)
                .maybeSingle();

            if (fallbackError) throw fallbackError;
            event = fallbackEvent;
        }
    }

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const eventId = event.id;

    const [
        { data: school },
        { data: sessions },
        { data: staff },
        { data: slots },
    ] = await Promise.all([
        event.school_id
            ? supabase.from("schools").select("*").eq("id", event.school_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
        supabase.from("event_sessions").select("*").eq("event_id", eventId),
        supabase.from("event_staff").select("id, role, session_id, applicator_id, applicator:applicators(*)").eq("event_id", eventId),
        supabase.from("event_slots").select("*").eq("event_id", eventId),
    ]);

    const safeSlots = (slots || []).sort((a: any, b: any) => (a.slot_number || 0) - (b.slot_number || 0));

    return NextResponse.json({
        event: {
            ...event,
            school: school || null,
            sessions: sessions || [],
            staff: staff || [],
            slots: safeSlots,
        },
    });
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
