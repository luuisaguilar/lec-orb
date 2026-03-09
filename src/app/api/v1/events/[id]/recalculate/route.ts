import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const recalculateSchema = z.object({
    exam_type: z.string().min(1),
    parameters: z.object({
        start_time: z.string(),
        candidates_count: z.number().int().positive(),
        examiners: z.number().int().positive(),
        break_duration: z.number().int().nonnegative().optional().default(10),
    }),
});

const EXAM_CONFIGS: Record<string, { speaking: { duration: number, capacity: number }, written: { name: string, duration: number }[] }> = {
    "starters": {
        speaking: { duration: 7, capacity: 1 },
        written: [
            { name: "Reading and Writing", duration: 20 },
            { name: "Listening", duration: 20 }
        ]
    },
    "movers": {
        speaking: { duration: 9, capacity: 1 },
        written: [
            { name: "Reading and Writing", duration: 30 },
            { name: "Listening", duration: 28 }
        ]
    },
    "flyers": {
        speaking: { duration: 11, capacity: 1 },
        written: [
            { name: "Reading and Writing", duration: 40 },
            { name: "Listening", duration: 28 }
        ]
    },
    "ket": {
        speaking: { duration: 12, capacity: 2 },
        written: [
            { name: "Reading and Writing", duration: 60 },
            { name: "Listening", duration: 30 }
        ]
    },
    "pet": {
        speaking: { duration: 14, capacity: 2 },
        written: [
            { name: "Reading", duration: 45 },
            { name: "Writing", duration: 45 },
            { name: "Listening", duration: 35 }
        ]
    },
    "fce": {
        speaking: { duration: 16, capacity: 2 },
        written: [
            { name: "Reading, Use of English, Writing", duration: 155 },
            { name: "Listening", duration: 45 }
        ]
    },
};

function generateSlots(parameters: { start_time: string, candidates_count: number, examiners: number, break_duration?: number }, exam_type: string) {
    const config = EXAM_CONFIGS[exam_type.toLowerCase()];
    if (!config) return [];

    const breakDuration = parameters.break_duration ?? 10;

    const slots = [];
    const [hours, minutes] = parameters.start_time.split(':').map(Number);
    const currentTime = new Date();
    currentTime.setHours(hours, minutes, 0, 0);

    let slotCounter = 1;

    // 1. Generate written slots
    for (const part of config.written) {
        const startTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        currentTime.setMinutes(currentTime.getMinutes() + part.duration);
        const endTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        slots.push({
            slot_number: slotCounter++,
            start_time: startTime,
            end_time: endTime,
            is_break: false,
            candidates: ["TODOS (" + part.name + ")"],
            status: 'PENDING'
        });

        // break between written parts
        const bStart = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
        const bEnd = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        slots.push({
            slot_number: slotCounter++,
            start_time: bStart,
            end_time: bEnd,
            is_break: true,
            candidates: [],
            status: 'PENDING'
        });
    }

    // break before speaking
    const preSpeakingBreakStart = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
    const preSpeakingBreakEnd = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    slots.push({
        slot_number: slotCounter++,
        start_time: preSpeakingBreakStart,
        end_time: preSpeakingBreakEnd,
        is_break: true,
        candidates: [],
        status: 'PENDING'
    });

    // 2. Generate speaking slots
    const speakingConfig = config.speaking;
    const totalSpeakingSessions = Math.ceil(parameters.candidates_count / speakingConfig.capacity);
    let candidateOffset = 1;

    for (let i = 0; i < totalSpeakingSessions; i++) {
        if (i > 0 && i % (6 * parameters.examiners) === 0) {
            const bStart = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
            const bEnd = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            slots.push({
                slot_number: slotCounter++,
                start_time: bStart,
                end_time: bEnd,
                is_break: true,
                candidates: [],
                status: 'PENDING'
            });
        }

        const startTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        currentTime.setMinutes(currentTime.getMinutes() + speakingConfig.duration);
        const endTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        const selectedCandidates = [];
        for (let c = 0; c < speakingConfig.capacity; c++) {
            if (candidateOffset <= parameters.candidates_count) {
                selectedCandidates.push(`#${String(candidateOffset).padStart(4, '0')}`);
                candidateOffset++;
            }
        }

        slots.push({
            slot_number: slotCounter++,
            start_time: startTime,
            end_time: endTime,
            is_break: false,
            candidates: selectedCandidates,
            status: 'PENDING'
        });

        if ((i + 1) % parameters.examiners !== 0) {
            currentTime.setMinutes(currentTime.getMinutes() - speakingConfig.duration);
        }
    }

    return slots;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const body = await request.json();
        const parsed = recalculateSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

        const resolvedParams = await params;
        const eventId = resolvedParams.id;

        // Delete all old slots
        await supabase.from("event_slots").delete().eq("event_id", eventId);

        // Update event parameters
        await supabase.from("events").update({
            exam_type: parsed.data.exam_type,
            parameters: parsed.data.parameters
        }).eq("id", eventId).eq("org_id", member.org_id);

        // Generate new slots
        const generatedSlots = generateSlots(parsed.data.parameters, parsed.data.exam_type);
        if (generatedSlots.length > 0) {
            const slotInserts = generatedSlots.map(slot => ({
                event_id: eventId,
                ...slot
            }));
            const { error: slotsError } = await supabase.from("event_slots").insert(slotInserts);
            if (slotsError) console.error("Failed to insert slots:", slotsError);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Recalculate error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
