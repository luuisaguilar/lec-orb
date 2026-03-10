import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const updateSessionSchema = z.object({
    exam_type: z.string().min(1).optional(),
    date: z.string().optional(),
    speaking_date: z.string().optional().nullable(),
    classrooms: z.array(z.object({
        name: z.string(),
        capacity: z.number()
    })).min(1).optional(),
    parameters: z.object({
        start_time: z.string(),
        examiners: z.number().int().positive(),
        break_duration: z.number().int().min(0).optional().default(10),
        candidates_count: z.number().int().positive().optional()
    }).optional(),
    component_order: z.array(z.any()).optional(),
    delivery_mode: z.enum(['PAPER', 'DIGITAL']).optional(),
    staff: z.array(z.object({
        applicator_id: z.string().uuid(),
        role: z.enum(['EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE'])
    })).optional()
});

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id: eventId, sessionId } = await params;
    const body = await req.json();

    const parsed = updateSessionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });

    const { staff, classrooms, ...sessionData } = parsed.data;
    const updateData: any = { ...sessionData };

    if (classrooms) {
        updateData.classrooms = classrooms;
        const totalCandidates = classrooms.reduce((sum, c) => sum + c.capacity, 0);
        if (updateData.parameters) {
            updateData.parameters.candidates_count = totalCandidates;
        } else {
            updateData.parameters = { candidates_count: totalCandidates };
        }
    }

    const { data: updatedSession, error: updateError } = await supabase
        .from("event_sessions")
        .update(updateData)
        .eq("id", sessionId)
        .eq("event_id", eventId)
        .select()
        .single();

    if (updateError) throw updateError;

    if (staff) {
        await supabase.from("event_staff").delete().eq("session_id", sessionId).eq("event_id", eventId);
        if (staff.length > 0) {
            const staffInserts = staff.map(s => ({
                event_id: eventId,
                session_id: sessionId,
                applicator_id: s.applicator_id,
                role: s.role
            }));
            await supabase.from("event_staff").insert(staffInserts);
        }
    }

    return NextResponse.json({ session: updatedSession });
}, { module: "events", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id: eventId, sessionId } = await params;

    const { error } = await supabase
        .from("event_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("event_id", eventId);

    if (error) throw error;
    return NextResponse.json({ message: "Sesión eliminada correctamente" });
}, { module: "events", action: "delete" });
