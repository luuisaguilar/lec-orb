import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import {
    normalizeAuditLogForFeed,
    type AuditFeedEntry,
    type AuditLogRow,
    type AuditProfile,
} from "@/lib/audit/feed";

export const GET = withAuth(async (req, { supabase, member }) => {
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
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (tableFilter) query = query.eq("table_name", tableFilter);
    if (actionFilter) query = query.eq("action", actionFilter.toUpperCase());
    if (userFilter) query = query.eq("performed_by", userFilter);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    const auditLogs = (logs ?? []) as AuditLogRow[];
    const performedByIds = Array.from(new Set(auditLogs.map((log) => log.performed_by).filter(Boolean))) as string[];
    let profilesMap = new Map<string, AuditProfile>();

    if (performedByIds.length > 0) {
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", performedByIds);

        if (profiles) {
            profilesMap = new Map((profiles as AuditProfile[]).map((profile) => [profile.id, profile]));
        }
    }

    const formattedLogs: AuditFeedEntry[] = auditLogs.map((log) =>
        normalizeAuditLogForFeed(log, log.performed_by ? (profilesMap.get(log.performed_by) ?? null) : null)
    );

    return NextResponse.json({
        logs: formattedLogs,
        pagination: {
            total: count || 0,
            limit,
            offset,
        },
    });
}, { module: "audit-log", action: "view" });
