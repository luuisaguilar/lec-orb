import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

/**
 * DELETE /api/v1/invitations/cleanup
 * 1. Sweeps any pending invitation past expires_at and flips its status to 'expired'.
 * 2. Permanently removes all non-pending invitations (revoked, expired, accepted)
 *    for the current org.
 * Admin only.
 */
export const DELETE = withAuth(async (req, { supabase, member }) => {
    if (member.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // Step 1: flip expired pendientes (scoped to this org)
    const nowIso = new Date().toISOString();
    const { error: expireError } = await supabase
        .from("org_invitations")
        .update({ status: "expired" })
        .eq("org_id", member.org_id)
        .eq("status", "pending")
        .lt("expires_at", nowIso);

    if (expireError) {
        console.warn("[invitations/cleanup] Could not auto-expire pending:", expireError.message);
    }

    // Step 2: delete all non-pending
    const { count, error } = await supabase
        .from("org_invitations")
        .delete({ count: "exact" })
        .eq("org_id", member.org_id)
        .neq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ deleted: count ?? 0 });
}, { module: "users", action: "edit" });
