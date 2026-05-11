import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { isFinanceAdminRole } from "@/lib/finance/finance-access";

const patchSchema = z.object({
    action: z.enum(["approve", "reject"]),
    notes: z.string().optional().nullable(),
});

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    if (!isFinanceAdminRole(member.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { data: existing, error: loadError } = await supabase
        .from("replenishment_requests")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .maybeSingle();

    if (loadError) throw loadError;
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.status !== "pending") {
        return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
    }

    const nextStatus = parsed.data.action === "approve" ? "approved" : "rejected";
    const patch: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
        notes: parsed.data.notes ?? existing.notes,
    };

    if (parsed.data.action === "approve") {
        patch.approved_by = user.id;
        patch.approved_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
        .from("replenishment_requests")
        .update(patch)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select()
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "replenishment_requests",
        record_id: id,
        action: "UPDATE",
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ replenishment: updated });
}, { module: "finanzas", action: "edit" });
