import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase }) => {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

    const { data: activeSessions, error: sessionError } = await supabase
        .from("event_sessions")
        .select("id")
        .or(`date.eq.${date},speaking_date.eq.${date}`);

    if (sessionError) throw sessionError;

    const sessionIds = (activeSessions ?? []).map((session: { id: string }) => session.id);
    if (sessionIds.length === 0) return NextResponse.json({ busyStaffIds: [] });

    const { data: busyStaff, error: staffError } = await supabase
        .from("event_staff")
        .select("applicator_id")
        .in("session_id", sessionIds);

    if (staffError) throw staffError;

    const busyIds = Array.from(
        new Set(
            (busyStaff ?? [])
                .map((staff: { applicator_id: string | null }) => staff.applicator_id)
                .filter((staffId: string | null): staffId is string => Boolean(staffId))
        )
    );
    return NextResponse.json({ busyStaffIds: busyIds });
}, { module: "events", action: "view" });
