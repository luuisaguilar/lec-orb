import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateAuditItemSchema = z.object({
    status: z.enum(["pending", "cumple", "noconf", "oport"]).optional(),
    notes: z.string().optional().nullable(),
    next_audit_date: z.string().optional().nullable(),
});

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateAuditItemSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.next_audit_date !== undefined) updates.next_audit_date = parsed.data.next_audit_date;

    const { data: updated, error } = await supabase
        .from("sgc_audit_checks")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("id, clause_id, title, question, status, notes, tags, sort_order, next_audit_date, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_audit_checks",
        record_id: updated.id,
        action: "UPDATE",
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ item: updated });
}, { module: "sgc", action: "edit" });
