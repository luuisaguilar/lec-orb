import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const createSessionSchema = z.object({
    exam_type: z.string().min(1),
    date: z.string(),
    delivery_mode: z.enum(['PAPER', 'DIGITAL']).default('PAPER'),
    classrooms: z.array(z.object({
        name: z.string(),
        capacity: z.number()
    })).min(1),
    parameters: z.object({
        start_time: z.string(),
        examiners: z.number().int().positive(),
        break_duration: z.number().int().min(0).optional().default(10)
    }),
    component_order: z.array(z.string()),
    staff: z.array(z.object({
        applicator_id: z.string().uuid(),
        role: z.enum(['EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE'])
    })).default([])
});

export const POST = withAuth(async (req, { supabase, member }, { params }) => {
    const { id: eventId } = await params;
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });

    const { staff, classrooms, ...sessionData } = parsed.data;
    const totalCandidates = classrooms.reduce((sum, c) => sum + c.capacity, 0);

    const { data: newSession, error: sessionError } = await supabase
        .from("event_sessions")
        .insert({
            event_id: eventId,
            classrooms: classrooms,
            ...sessionData,
            parameters: {
                ...sessionData.parameters,
                candidates_count: totalCandidates
            }
        })
        .select()
        .single();

    if (sessionError || !newSession) throw sessionError || new Error("Failed to create session");

    if (staff.length > 0) {
        const staffInserts = staff.map(s => ({
            event_id: eventId,
            session_id: newSession.id,
            applicator_id: s.applicator_id,
            role: s.role
        }));
        await supabase.from("event_staff").insert(staffInserts);
    }

    return NextResponse.json({ session: newSession }, { status: 201 });
}, { module: "events", action: "edit" });
