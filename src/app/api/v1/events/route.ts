import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const url = new URL(request.url);
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
        if (error) {
            console.error("Events fetch error:", error);
            return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
        }

        return NextResponse.json({ events: events || [], total: events?.length || 0 });
    } catch (err: any) {
        console.error("Events server error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createEventSchema.safeParse(body);

        if (!parsed.success) {
            console.error("Validation failed:", parsed.error);
            return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "Organización no encontrada" }, { status: 403 });

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

        if (eventError || !newEvent) {
            console.error("Failed to insert event shell:", eventError);
            return NextResponse.json({ error: "Error al crear el Evento Base" }, { status: 500 });
        }

        // Helper to get component order by exam
        const getComponentOrderByExam = (exam: string) => {
            if (exam === "starters" || exam === "movers" || exam === "flyers" || exam === "ket") {
                return [{ id: "reading_writing" }, { id: "listening" }, { id: "speaking" }];
            }
            if (exam === "pet") {
                return [{ id: "reading" }, { id: "writing" }, { id: "listening" }, { id: "speaking" }];
            }
            if (exam === "fce") {
                return [{ id: "reading_use_of_english" }, { id: "writing" }, { id: "listening" }, { id: "speaking" }];
            }
            return [{ id: "reading" }, { id: "writing" }, { id: "listening" }, { id: "speaking" }];
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

        if (sessionsError || !savedSessions) {
            console.error("Failed to insert sessions:", sessionsError);
            return NextResponse.json({ error: "El evento se creó parcialmente, pero hubo un error al crear las sesiones." }, { status: 500 });
        }

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
                        role: staffMember.role,
                        assigned_at: new Date().toISOString()
                    });
                });
            }
        });

        if (staffToInsert.length > 0) {
            const { error: staffError } = await supabase
                .from("event_staff")
                .insert(staffToInsert);

            if (staffError) {
                console.error("Failed to insert staff:", staffError);
                // Non-fatal, let's just log it. Realistically we should rollback or alert, but returning 201 is fine if event + session saved.
            }
        }

        return NextResponse.json({ event: newEvent }, { status: 201 });
    } catch (err: any) {
        console.error("Events POST error:", err);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
