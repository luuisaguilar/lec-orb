import type { AuditAction } from "./feed";

/**
 * logAudit
 * --------
 * Reusable helper for inserting audit log entries across all modules.
 * Wraps the insert in a silent try/catch so an audit logging failure
 * NEVER blocks the main API response.
 *
 * Canonical audit_log contract:
 *   org_id, table_name, record_id, action, old_data, new_data, performed_by, created_at
 */

export interface AuditEntry {
    org_id: string;
    table_name: string;
    record_id: string;
    action: AuditAction;
    /** Previous state (for UPDATE/DELETE) */
    old_data?: Record<string, unknown> | null;
    /** New state (for INSERT/UPDATE) */
    new_data?: Record<string, unknown> | null;
    /** user.id of the person performing the action */
    performed_by: string;
}

/**
 * Inserts an audit log entry. Silently swallows errors so a logging failure
 * never blocks the main API response.
 *
 * @param supabase - Authenticated Supabase server client
 * @param entry    - Audit entry data
 */
export async function logAudit(supabase: any, entry: AuditEntry): Promise<void> {
    try {
        await supabase.from("audit_log").insert({
            org_id: entry.org_id,
            table_name: entry.table_name,
            record_id: entry.record_id,
            action: entry.action,
            old_data: entry.old_data ?? null,
            new_data: entry.new_data ?? null,
            performed_by: entry.performed_by,
        });
    } catch {
        // Audit logging failures are non-fatal — log to console but don't throw
        console.warn(`[audit] Failed to log ${entry.action} on ${entry.table_name}:${entry.record_id}`);
    }
}
