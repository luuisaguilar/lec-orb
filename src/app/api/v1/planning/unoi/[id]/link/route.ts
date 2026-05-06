import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { getComponentOrderByExam } from "@/lib/import/cambridge-canonical/exam-labels";

type PlanningRow = {
    id: string;
    org_id: string;
    school_id: string | null;
    school_name: string;
    exam_type: string;
    proposed_date: string;
    city: string | null;
    project: string | null;
    students_planned: number | null;
};

    planning_year?: number;
};

function normalizeSchoolName(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

export const POST = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const createIfMissing = Boolean(body?.createIfMissing);

    const { data: rowRaw, error: rowErr } = await supabase
        .from("unoi_planning_rows")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();
    const row = rowRaw as PlanningRow | null;
    if (rowErr || !row) {
        return NextResponse.json({ error: "Planning row not found" }, { status: 404 });
    }

    let schoolId = row.school_id;
    if (!schoolId) {
        const { data: school } = await supabase
            .from("schools")
            .select("id")
            .eq("org_id", member.org_id)
            .ilike("name", row.school_name)
            .maybeSingle();
        schoolId = school?.id ?? null;
        if (!schoolId) {
            const { data: schools } = await supabase
                .from("schools")
                .select("id, name")
                .eq("org_id", member.org_id);
            const target = normalizeSchoolName(row.school_name);
            const match = (schools ?? []).find((s: { id: string; name: string }) => normalizeSchoolName(s.name) === target);
            schoolId = match?.id ?? null;
        }
        if (schoolId) {
            await supabase.from("unoi_planning_rows").update({ school_id: schoolId }).eq("id", row.id);
        }
    }
    if (!schoolId) {
        return NextResponse.json({ error: "No matching school for planning row" }, { status: 400 });
        return NextResponse.json(
            {
                error: "No matching school for planning row",
                match_status: "missing_school",
                school_name: row.school_name,
                suggested_action: "Create or rename school in catalog before linking.",
            },
            { status: 400 }
        );
    }

    const dayStart = `${row.proposed_date}T00:00:00.000Z`;
    const dayEnd = `${row.proposed_date}T23:59:59.999Z`;

    let eventId: string | null = null;
    const explicitEventId = typeof body?.eventId === "string" ? body.eventId.trim() : null;
    if (explicitEventId) {
        const { data: ownedEvent, error: ownedEvErr } = await supabase
            .from("events")
            .select("id")
            .eq("id", explicitEventId)
            .eq("org_id", member.org_id)
            .maybeSingle();
        if (ownedEvErr || !ownedEvent) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }
        eventId = ownedEvent.id;
    } else {
        const { data: existingMulti } = await supabase
            .from("events")
            .select("id")
            .eq("org_id", member.org_id)
            .eq("school_id", schoolId)
            .eq("exam_type", "MULTI")
            .gte("date", dayStart)
            .lte("date", dayEnd)
            .limit(1)
            .maybeSingle();
        eventId = existingMulti?.id ?? null;
    }

    if (!eventId && createIfMissing) {
        const { data: createdEvent, error: createErr } = await supabase
            .from("events")
            .insert({
                org_id: member.org_id,
                school_id: schoolId,
                title: `${row.school_name} · ${row.proposed_date}`,
                date: `${row.proposed_date}T12:00:00.000Z`,
                exam_type: "MULTI",
                status: "DRAFT",
                parameters: {
                    import_source: "unoi_planning_rows",
                    city: row.city,
                    project: row.project ?? "UNOi",
                },
            })
            .select("id")
            .single();
        if (createErr) throw createErr;
        eventId = createdEvent.id;
    }

    if (!eventId) {
        return NextResponse.json({ error: "No matching event found. Use createIfMissing=true." }, { status: 404 });
    }

    let sessionId: string | null = null;
    const explicitSessionId =
        typeof body?.eventSessionId === "string" ? body.eventSessionId.trim() : null;
    if (explicitSessionId) {
        const { data: sessRow, error: sessErr } = await supabase
            .from("event_sessions")
            .select("id, event_id")
            .eq("id", explicitSessionId)
            .maybeSingle();
        if (sessErr || !sessRow) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        const { data: sessEvent, error: sessEvErr } = await supabase
            .from("events")
            .select("id")
            .eq("id", sessRow.event_id)
            .eq("org_id", member.org_id)
            .maybeSingle();
        if (sessEvErr || !sessEvent) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        if (sessRow.event_id !== eventId) {
            return NextResponse.json(
                { error: "Session does not belong to the resolved event" },
                { status: 400 }
            );
        }
        sessionId = sessRow.id;
    } else {
        const { data: existingSession } = await supabase
            .from("event_sessions")
            .select("id")
            .eq("event_id", eventId)
            .eq("exam_type", row.exam_type)
            .limit(1)
            .maybeSingle();
        sessionId = existingSession?.id ?? null;
    }

    if (!sessionId && createIfMissing) {
        const { data: createdSession, error: sesErr } = await supabase
            .from("event_sessions")
            .insert({
                event_id: eventId,
                exam_type: row.exam_type,
                date: `${row.proposed_date}T12:00:00.000Z`,
                classrooms: [{ name: "Planeación UNOi", capacity: row.students_planned ?? 0 }],
                parameters: {
                    start_time: "09:00",
                    candidates_count: row.students_planned ?? 0,
                    examiners: 1,
                    break_duration: 0,
                },
                component_order: getComponentOrderByExam(row.exam_type),
            })
            .select("id")
            .single();
        if (sesErr) throw sesErr;
        sessionId = createdSession.id;
    }

    const { data: updated, error: upErr } = await supabase
        .from("unoi_planning_rows")
        .update({
            school_id: schoolId,
            event_id: eventId,
            event_session_id: sessionId,
            planning_status: sessionId ? "linked" : "proposed",
        })
        .eq("id", row.id)
        .select()
        .single();
    if (upErr) throw upErr;

    return NextResponse.json({
        row: updated,
        linked: { event_id: eventId, event_session_id: sessionId },
    });
}, { module: "events", action: "edit" });

