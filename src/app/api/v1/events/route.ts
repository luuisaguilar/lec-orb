import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    let query = supabase
        .from("events")
        .select(`
            *,
            school:schools(name, city),
            sessions:event_sessions(id, exam_type, date),
            staff:event_staff(
                id, role,
                applicator:applicators(id, name, external_id)
            )
        `)
        .eq("org_id", member.org_id)
        .order("date", { ascending: true });

    if (status) {
        query = query.eq("status", status);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    return NextResponse.json({ events: events || [], total: events?.length || 0 });
}, { module: "events", action: "view" });

const createEventSchema = z.object({
    title: z.string().min(2),
    school_id: z.string().uuid(),
    sessions: z.array(z.object({
        exam_type: z.string().min(1),
        date: z.string().min(1),
        parameters: z.object({
            start_time: z.string(),
            examiners: z.number(),
            break_duration: z.number()
        }),
        classrooms: z.array(z.object({
            name: z.string(),
            capacity: z.number()
        })).min(1, "Al menos un salón"),
        staff: z.array(z.object({
            applicator_id: z.string(),
            role: z.string()
        })).optional()
    })).min(1, "Debes agregar al menos una sesión de examen")
});

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });
    }

    // 1. Insert Event Shell
    const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
            org_id: member.org_id,
            title: parsed.data.title,
            school_id: parsed.data.school_id,
            status: 'DRAFT',
            date: new Date().toISOString(),
            exam_type: 'MULTI',
        })
        .select()
        .single();

    if (eventError || !newEvent) throw eventError || new Error("Failed to create event shell");

    // Audit log
    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "events",
        record_id: newEvent.id,
        action: "INSERT",
        new_data: newEvent,
        performed_by: user.id,
    });

    const getComponentOrderByExam = (exam: string) => {
        const standard = [{ id: "reading" }, { id: "writing" }, { id: "listening" }, { id: "speaking" }];
        if (["starters", "movers", "flyers", "ket"].includes(exam)) {
            return [{ id: "reading_writing" }, { id: "listening" }, { id: "speaking" }];
        }
        if (exam === "pet") return standard;
        if (exam === "fce") {
            return [{ id: "reading_use_of_english" }, { id: "writing" }, { id: "listening" }, { id: "speaking" }];
        }
        return standard;
    };

    // 2. Insert Sessions
    const sessionsToInsert = parsed.data.sessions.map((s) => {
        const totalCandidates = s.classrooms.reduce((sum, c) => sum + c.capacity, 0);
        return {
            event_id: newEvent.id,
            exam_type: s.exam_type,
            date: s.date,
            classrooms: s.classrooms,
            parameters: {
                start_time: s.parameters.start_time,
                candidates_count: totalCandidates,
                examiners: s.parameters.examiners,
                break_duration: s.parameters.break_duration
            },
            component_order: getComponentOrderByExam(s.exam_type)
        };
    });

    const { data: savedSessions, error: sessionsError } = await supabase
        .from("event_sessions")
        .insert(sessionsToInsert)
        .select();

    if (sessionsError || !savedSessions) throw sessionsError || new Error("Failed to insert sessions");

    // 3. Insert Staff
    const staffToInsert: any[] = [];
    parsed.data.sessions.forEach((s, index) => {
        const savedSession = savedSessions[index];
        if (s.staff && s.staff.length > 0 && savedSession) {
            s.staff.forEach(staffMember => {
                staffToInsert.push({
                    event_id: newEvent.id,
                    session_id: savedSession.id,
                    applicator_id: staffMember.applicator_id,
                    role: staffMember.role
                });
            });
        }
    });

    if (staffToInsert.length > 0) {
        const { error: staffError } = await supabase
            .from("event_staff")
            .insert(staffToInsert);
        if (staffError) console.error("Staff insert error:", staffError);
    }

    return NextResponse.json({ event: newEvent }, { status: 201 });
}, { module: "events", action: "edit" });
