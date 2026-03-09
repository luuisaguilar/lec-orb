import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EXAM_CONFIGS: Record<string, { duration: number, capacity: number, components: Record<string, number> }> = {
    "starters": { duration: 7, capacity: 2, components: { reading_writing: 20, listening: 20, speaking: 7 } },
    "movers": { duration: 9, capacity: 2, components: { reading_writing: 30, listening: 28, speaking: 9 } },
    "flyers": { duration: 11, capacity: 2, components: { reading_writing: 40, listening: 28, speaking: 11 } },
    "ket": { duration: 10, capacity: 2, components: { reading_writing: 60, listening: 30, speaking: 10 } },
    "pet": { duration: 14, capacity: 2, components: { reading: 45, writing: 45, listening: 35, speaking: 14 } },
    "fce": { duration: 16, capacity: 2, components: { reading_use_of_english: 75, writing: 80, listening: 45, speaking: 16 } },
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string, sessionId: string }> }) {
    try {
        const resolvedParams = await params;
        const { id: eventId, sessionId } = resolvedParams;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: session, error: sessionError } = await supabase
            .from("event_sessions")
            .select(`
                *,
                event:events(
                    *,
                    school:schools(operating_hours)
                )
            `)
            .eq("id", sessionId)
            .eq("event_id", eventId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
        }

        const examType = session.exam_type.toLowerCase();
        const config = EXAM_CONFIGS[examType] || { duration: 15, capacity: 1, components: { speaking: 15 } };
        const parameters = session.parameters;
        const componentOrder = session.component_order || ["reading", "writing", "listening", "speaking"];
        const schoolHours = session.event?.school?.operating_hours;

        const [startH, startM] = parameters.start_time.split(':').map(Number);
        const currentTime = new Date(session.date + 'T00:00:00');
        currentTime.setHours(startH, startM, 0, 0);

        let schoolOpenTime: Date | null = null;
        let schoolCloseTime: Date | null = null;
        if (schoolHours && schoolHours.open && schoolHours.close) {
            const [oh, om] = schoolHours.open.split(':').map(Number);
            const [ch, cm] = schoolHours.close.split(':').map(Number);
            schoolOpenTime = new Date(session.date + 'T00:00:00');
            schoolOpenTime.setHours(oh, om, 0, 0);

            schoolCloseTime = new Date(session.date + 'T00:00:00');
            schoolCloseTime.setHours(ch, cm, 0, 0);

            if (currentTime < schoolOpenTime) {
                return NextResponse.json({ error: `La hora de inicio (${parameters.start_time}) es anterior a la apertura de la escuela (${schoolHours.open})` }, { status: 400 });
            }
        }

        const slots = [];
        let slotCounter = 1;

        const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const checkSchoolClose = (time: Date) => {
            if (schoolCloseTime && time > schoolCloseTime) {
                throw new Error(`El cronograma calculado excede el horario de cierre de la escuela (${schoolHours.close}).`);
            }
        };

        const totalSessionsNeeded = Math.ceil(parameters.candidates_count / config.capacity);
        const allCandidates = [];
        for (let i = 1; i <= parameters.candidates_count; i++) {
            allCandidates.push(`#${String(i).padStart(4, '0')}`);
        }

        for (let i = 0; i < componentOrder.length; i++) {
            const componentItem = componentOrder[i];
            const component = typeof componentItem === 'string' ? componentItem : componentItem.id;
            const componentDate = typeof componentItem === 'string' ? null : componentItem.date;

            const isSpeaking = component === 'speaking' || component === 'SPEAKING';
            const slotDate = componentDate || (isSpeaking ? session.speaking_date : null) || session.date;

            if (component === "speaking") {
                let candidateIdx = 0;
                const loops = Math.ceil(totalSessionsNeeded / parameters.examiners);

                for (let loop = 0; loop < loops; loop++) {
                    const loopStartTime = formatTime(currentTime);
                    currentTime.setMinutes(currentTime.getMinutes() + config.duration);
                    checkSchoolClose(currentTime);
                    const loopEndTime = formatTime(currentTime);

                    for (let ex = 0; ex < parameters.examiners; ex++) {
                        const selectedCandidates = [];
                        for (let c = 0; c < config.capacity; c++) {
                            if (candidateIdx < allCandidates.length) {
                                selectedCandidates.push(allCandidates[candidateIdx]);
                                candidateIdx++;
                            }
                        }

                        if (selectedCandidates.length > 0) {
                            slots.push({
                                event_id: eventId,
                                session_id: sessionId,
                                slot_number: slotCounter++,
                                component: "speaking",
                                date: slotDate,
                                start_time: loopStartTime,
                                end_time: loopEndTime,
                                is_break: false,
                                candidates: selectedCandidates,
                                status: 'PENDING'
                            });
                        }
                    }
                }
            } else {
                const compDuration = config.components[component] || 45;
                const startTime = formatTime(currentTime);
                currentTime.setMinutes(currentTime.getMinutes() + compDuration);
                checkSchoolClose(currentTime);
                const endTime = formatTime(currentTime);

                const classrooms = session.classrooms && Array.isArray(session.classrooms) && session.classrooms.length > 0
                    ? session.classrooms
                    : [{ name: "Salón Principal", capacity: parameters.candidates_count }];

                for (const room of classrooms) {
                    slots.push({
                        event_id: eventId,
                        session_id: sessionId,
                        slot_number: slotCounter++,
                        component: component,
                        date: slotDate,
                        start_time: startTime,
                        end_time: endTime,
                        is_break: false,
                        candidates: [`${room.name} (${room.capacity} alumnos)`],
                        status: 'PENDING'
                    });
                }
            }

            if (i < componentOrder.length - 1) {
                const breakStart = formatTime(currentTime);
                currentTime.setMinutes(currentTime.getMinutes() + (parameters.break_duration || 10));
                checkSchoolClose(currentTime);
                const breakEnd = formatTime(currentTime);

                slots.push({
                    event_id: eventId,
                    session_id: sessionId,
                    slot_number: slotCounter++,
                    component: "break",
                    date: slotDate,
                    start_time: breakStart,
                    end_time: breakEnd,
                    is_break: true,
                    candidates: [],
                    status: 'PENDING'
                });
            }
        }

        await supabase.from("event_slots").delete().eq("session_id", sessionId);

        const { error: insertError } = await supabase.from("event_slots").insert(slots);

        if (insertError) {
            console.error("Failed to insert new slots:", insertError);
            return NextResponse.json({ error: `Error interno de base de datos: ${insertError.message || JSON.stringify(insertError)}`, details: insertError }, { status: 500 });
        }

        return NextResponse.json({ message: "Horarios recalculados", slots });

    } catch (err: any) {
        console.error("Recalculate error:", err);
        return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
    }
}
