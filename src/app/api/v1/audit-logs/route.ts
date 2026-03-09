import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/v1/audit-logs — Retrieve platform-wide audit logs
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        // For now, only allow admins or directors to see the full audit log
        if (!["admin", "director_general"].includes(member.role)) {
            return NextResponse.json(
                { error: "Insufficient permissions to view audit logs" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limitStr = searchParams.get("limit") || "100";
        const offsetStr = searchParams.get("offset") || "0";
        const tableFilter = searchParams.get("table");
        const actionFilter = searchParams.get("action");
        const userFilter = searchParams.get("user");

        const limit = parseInt(limitStr, 10);
        const offset = parseInt(offsetStr, 10);

        let query = supabase
            .from("audit_log")
            .select("*", { count: "exact" })
            .order("changed_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (tableFilter) query = query.eq("table_name", tableFilter);
        if (actionFilter) query = query.eq("operation", actionFilter.toUpperCase());
        if (userFilter) query = query.eq("changed_by", userFilter);

        const { data: logs, count, error } = await query;

        if (error) {
            console.error("Audit log error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const changedByIds = Array.from(new Set(logs?.map(l => l.changed_by).filter(Boolean) || []));
        let profilesMap = new Map();

        if (changedByIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', changedByIds);

            if (profiles) {
                profilesMap = new Map((profiles as any[]).map(p => [p.id, p]));
            }
        }

        const formattedLogs = (logs || []).map((log: any) => ({
            ...log,
            profiles: profilesMap.get(log.changed_by) || null
        }));

        return NextResponse.json({
            logs: formattedLogs,
            pagination: {
                total: count || 0,
                limit,
                offset,
            },
        });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
