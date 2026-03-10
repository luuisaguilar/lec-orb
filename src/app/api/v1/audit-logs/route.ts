import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase }) => {
    const { searchParams } = new URL(req.url);
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
    if (error) throw error;

    const changedByIds = Array.from(new Set(logs?.map((l: any) => l.changed_by).filter(Boolean) || []));
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
}, { module: "audit-log", action: "view" });
