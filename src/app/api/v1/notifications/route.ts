import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/v1/notifications — list user's notifications
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
        const unreadOnly = searchParams.get("unread") === "true";

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let query = supabase
            .from("notifications")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (unreadOnly) query = query.eq("is_read", false);

        const { data: notifications, count, error } = await query;
        if (error) throw error;

        // Also get unread count separately for badge
        const { count: unreadCount } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        return NextResponse.json({
            notifications: notifications ?? [],
            unread_count: unreadCount ?? 0,
            total: count ?? 0,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/v1/notifications — mark notifications as read
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { ids, mark_all } = body as { ids?: string[]; mark_all?: boolean };

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (mark_all) {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);
        } else if (ids?.length) {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .in("id", ids);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}
