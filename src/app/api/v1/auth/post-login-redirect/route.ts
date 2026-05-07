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
            const { data: pendingInvite } = await admin
                .from("applicator_portal_invitations")
                .select("token")
                .eq("status", "pending")
                .eq("email", normalizedEmail)
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (pendingInvite?.token) {
                return NextResponse.json({
                    redirectTo: `/join-portal/${pendingInvite.token}`,
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
