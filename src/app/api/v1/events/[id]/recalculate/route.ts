import { NextResponse } from "next/server";

/**
 * DEPRECATED: This event-level recalculate endpoint is no longer safe.
 * It would delete ALL slots for the event and regenerate them without
 * session_id or component fields, breaking the session planner.
 *
 * Use the session-level endpoint instead:
 * POST /api/v1/events/[id]/sessions/[sessionId]/recalculate
 */
export async function POST() {
    return NextResponse.json({
        error: "Este endpoint está obsoleto. Usa POST /api/v1/events/[id]/sessions/[sessionId]/recalculate para recalcular por sesión.",
        deprecated: true
    }, { status: 410 });
}
