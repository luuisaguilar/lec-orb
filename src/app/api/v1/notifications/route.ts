import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const unreadOnly = searchParams.get("unread") === "true";

    let query = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data: notifications, count, error } = await query;
    if (error) throw error;

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
}, { module: "notifications", action: "view" });

export const PATCH = withAuth(async (req, { supabase, user }) => {
    const body = await req.json();
    const { ids, mark_all } = body as { ids?: string[]; mark_all?: boolean };

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
}, { module: "notifications", action: "view" }); // Using view for reading notifications
