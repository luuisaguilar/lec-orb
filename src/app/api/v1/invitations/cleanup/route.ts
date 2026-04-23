import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

/**
 * DELETE /api/v1/invitations/cleanup
 * Permanently removes all non-pending invitations (revoked, expired, accepted)
 * for the current org. Admin only.
 */
export const DELETE = withAuth(async (req, { supabase, member }) => {
    if (member.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { count, error } = await supabase
        .from("org_invitations")
        .delete({ count: "exact" })
        .eq("org_id", member.org_id)
        .neq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ deleted: count ?? 0 });
}, { module: "users", action: "edit" });
