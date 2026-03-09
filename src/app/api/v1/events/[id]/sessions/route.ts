import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

const createSessionSchema = z.object({
    exam_type: z.string().min(1),
    date: z.string(), // ISO date string
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const eventId = resolvedParams.id;

        const body = await request.json();
        const parsed = createSessionSchema.safeParse(body);

        if (!parsed.success) {
            console.error("Validation failed:", parsed.error);
            return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const canEdit = await checkServerPermission(supabase, user.id, "eventos", "edit");
        if (!canEdit) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

        const { staff, classrooms, ...sessionData } = parsed.data;

        const totalCandidates = classrooms.reduce((sum, c) => sum + c.capacity, 0);

        // 1. Insert Event Session
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

        if (sessionError || !newSession) {
            console.error("Failed to insert event session:", sessionError);
            return NextResponse.json({ error: "Error al crear la sesión del evento" }, { status: 500 });
        }

        // 2. Insert Staff assignments linked to this session
        if (staff.length > 0) {
            const staffInserts = staff.map(s => ({
                event_id: eventId,
                session_id: newSession.id,
                applicator_id: s.applicator_id,
                role: s.role
            }));
            const { error: staffError } = await supabase.from("event_staff").insert(staffInserts);
            if (staffError) console.error("Failed to insert staff:", staffError);
        }

        // Note: Slot generation will be handled separately when the user hits "Generate Schedule" 
        // or we can generate a basic timeline here based on parameters. 
        // For now, we only store the parameters and component_order in the session.
        // Full timetable generation with specific rooms/components comes later.

        return NextResponse.json({ session: newSession }, { status: 201 });
    } catch (err: any) {
        console.error("Event Sessions POST error:", err);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
