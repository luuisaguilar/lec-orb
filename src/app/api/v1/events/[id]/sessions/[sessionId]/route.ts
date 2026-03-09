import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

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
    staff: z.array(z.object({
        applicator_id: z.string().uuid(),
        role: z.enum(['EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE'])
    })).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string, sessionId: string }> }) {
    try {
        const resolvedParams = await params;
        const { id: eventId, sessionId } = resolvedParams;

        const body = await request.json();
        const parsed = updateSessionSchema.safeParse(body);

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

        if (updateError) {
            console.error("Failed to update event session:", updateError);
            return NextResponse.json({ error: "Error al actualizar la sesión" }, { status: 500 });
        }

        // Handle staff updates if provided
        if (staff) {
            // Delete old staff for this session
            await supabase.from("event_staff").delete().eq("session_id", sessionId).eq("event_id", eventId);

            if (staff.length > 0) {
                const staffInserts = staff.map(s => ({
                    event_id: eventId,
                    session_id: sessionId,
                    applicator_id: s.applicator_id,
                    role: s.role
                }));
                const { error: staffError } = await supabase.from("event_staff").insert(staffInserts);
                if (staffError) console.error("Failed to insert new staff:", staffError);
            }
        }

        return NextResponse.json({ session: updatedSession });
    } catch (err: any) {
        console.error("Event Sessions PATCH error:", err);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, sessionId: string }> }) {
    try {
        const resolvedParams = await params;
        const { id: eventId, sessionId } = resolvedParams;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { error } = await supabase
            .from("event_sessions")
            .delete()
            .eq("id", sessionId)
            .eq("event_id", eventId);

        if (error) {
            console.error("Error deleting session:", error);
            return NextResponse.json({ error: "Error al eliminar la sesión" }, { status: 500 });
        }

        return NextResponse.json({ message: "Sesión eliminada correctamente" });
    } catch (err: any) {
        console.error("Event Sessions DELETE error:", err);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
