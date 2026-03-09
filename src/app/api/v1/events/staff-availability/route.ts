import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const date = url.searchParams.get("date");

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get session IDs that have this date (as main or speaking)
        const { data: activeSessions, error: sessionError } = await supabase
            .from("event_sessions")
            .select("id")
            .or(`date.eq.${date},speaking_date.eq.${date}`);

        if (sessionError) {
            console.error("Error fetching sessions:", sessionError);
            return NextResponse.json({ error: "Failed to fetch session data" }, { status: 500 });
        }

        const sessionIds = activeSessions?.map(s => s.id) || [];

        if (sessionIds.length === 0) {
            return NextResponse.json({ busyStaffIds: [] });
        }

        // Get staff assigned to those sessions
        const { data: busyStaff, error: staffError } = await supabase
            .from("event_staff")
            .select("applicator_id")
            .in("session_id", sessionIds);

        if (staffError) {
            console.error("Error fetching busy staff:", staffError);
            return NextResponse.json({ error: "Failed to fetch busy staff" }, { status: 500 });
        }

        const busyIds = Array.from(new Set(busyStaff.map(s => s.applicator_id)));

        return NextResponse.json({ busyStaffIds: busyIds });
    } catch (err: any) {
        console.error("Staff availability error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
