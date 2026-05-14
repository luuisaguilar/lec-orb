import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolves default landing page after login.
 * If user is linked to an applicator profile, prefer /portal.
 */
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ redirectTo: "/login" }, { status: 401 });
    }

    const { data: applicator } = await supabase
        .from("applicators")
        .select("id")
        .eq("auth_user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

    if (applicator) {
        return NextResponse.json({ redirectTo: "/portal" });
    }

    if (user.email) {
        try {
            const admin = createAdminClient();
            const normalizedEmail = user.email.trim().toLowerCase();

            // Option B: auto-link applicator by email when auth_user_id not set yet
            const { data: unlinkedApplicator } = await admin
                .from("applicators")
                .select("id")
                .ilike("email", normalizedEmail)
                .is("auth_user_id", null)
                .is("deleted_at", null)
                .maybeSingle();

            if (unlinkedApplicator) {
                await admin
                    .from("applicators")
                    .update({ auth_user_id: user.id })
                    .eq("id", unlinkedApplicator.id);
                return NextResponse.json({ redirectTo: "/portal" });
            }
            const nowIso = new Date().toISOString();
            const { data: pendingPortalInvite } = await admin
                .from("applicator_portal_invitations")
                .select("token")
                .eq("status", "pending")
                .ilike("email", normalizedEmail)
                .gt("expires_at", nowIso)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (pendingPortalInvite?.token) {
                return NextResponse.json({
                    redirectTo: `/join-portal/${pendingPortalInvite.token}`,
                });
            }

            const { data: pendingOrgInvites } = await admin
                .from("org_invitations")
                .select("token, expires_at")
                .eq("status", "pending")
                .ilike("email", normalizedEmail)
                .order("created_at", { ascending: false })
                .limit(10);

            const validOrgInvite = (pendingOrgInvites ?? []).find((invite) => {
                if (!invite.expires_at) return true;
                return new Date(invite.expires_at).getTime() > Date.now();
            });

            if (validOrgInvite?.token) {
                return NextResponse.json({
                    redirectTo: `/join/${validOrgInvite.token}`,
                });
            }
        } catch {
            // Do not block login redirection when service role is unavailable.
        }
    }

    return NextResponse.json({
        redirectTo: "/dashboard",
    });
}
