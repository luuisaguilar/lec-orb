import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const updateSlotSchema = z.object({
    updates: z.array(z.object({
        id: z.string().uuid(),
        applicator_id: z.string().uuid().nullable().optional(),
        status: z.enum(['PENDING', 'CONFIRMED']).optional(),
        start_time: z.string().optional(),
        end_time: z.string().optional(),
        slot_number: z.number().optional()
    })).optional(),
    inserts: z.array(z.object({
        session_id: z.string().uuid(),
        component: z.string(),
        date: z.string(),
        slot_number: z.number(),
        start_time: z.string(),
        end_time: z.string(),
        is_break: z.boolean(),
        candidates: z.array(z.string()).optional()
    })).optional(),
    deletes: z.array(z.string().uuid()).optional()
});

export const PATCH = withAuth(async (req, { supabase }, { params }) => {
    const { id: eventId } = await params;
    const body = await req.json();
    const parsed = updateSlotSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    if (parsed.data.updates && parsed.data.updates.length > 0) {
        for (const update of parsed.data.updates) {
            const updatePayload: any = {};
            if (update.applicator_id !== undefined) updatePayload.applicator_id = update.applicator_id;
            if (update.status !== undefined) updatePayload.status = update.status;
            if (update.start_time !== undefined) updatePayload.start_time = update.start_time;
            if (update.end_time !== undefined) updatePayload.end_time = update.end_time;
            if (update.slot_number !== undefined) updatePayload.slot_number = update.slot_number;

            await supabase
                .from("event_slots")
                .update(updatePayload)
                .eq("id", update.id)
                .eq("event_id", eventId);
        }
    }

    if (parsed.data.inserts && parsed.data.inserts.length > 0) {
        const insertsPayload = parsed.data.inserts.map(insert => ({
            event_id: eventId,
            session_id: insert.session_id,
            component: insert.component,
            date: insert.date,
            slot_number: insert.slot_number,
            start_time: insert.start_time,
            end_time: insert.end_time,
            is_break: insert.is_break,
            candidates: insert.candidates || [],
            status: 'PENDING'
        }));
        const { error: insertError } = await supabase.from("event_slots").insert(insertsPayload);
        if (insertError) throw insertError;
    }

    if (parsed.data.deletes && parsed.data.deletes.length > 0) {
        const { error: deleteError } = await supabase
            .from("event_slots")
            .delete()
            .in("id", parsed.data.deletes)
            .eq("event_id", eventId);
        if (deleteError) throw deleteError;
    }

    return NextResponse.json({ success: true });
}, { module: "events", action: "edit" });
