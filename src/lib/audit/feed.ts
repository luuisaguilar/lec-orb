export type AuditAction = "INSERT" | "UPDATE" | "DELETE" | "SOFT_DELETE" | "RESTORE" | "MOVEMENT";

export interface AuditLogRow {
    id: string;
    org_id: string;
    table_name: string;
    record_id: string | null;
    action: AuditAction | string;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    performed_by: string | null;
    created_at: string;
}

export interface AuditProfile {
    id: string;
    full_name: string | null;
}

export interface AuditFeedEntry extends AuditLogRow {
    operation: AuditLogRow["action"];
    changed_by: AuditLogRow["performed_by"];
    changed_at: AuditLogRow["created_at"];
    profiles: AuditProfile | null;
}

export function normalizeAuditLogForFeed(log: AuditLogRow, profile: AuditProfile | null): AuditFeedEntry {
    return {
        ...log,
        operation: log.action,
        changed_by: log.performed_by,
        changed_at: log.created_at,
        profiles: profile,
    };
}
