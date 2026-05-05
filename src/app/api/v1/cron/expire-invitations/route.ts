import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vercel Cron handler to expire old invitations.
 * Route: /api/v1/cron/expire-invitations
 * 
 * Secure this route using CRON_SECRET if provided by Vercel.
 */
export async function GET(req: Request) {
    // 1. Verify Authorization (Vercel Cron Secret)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();
        
        // Call the RPC function defined in the database
        const { data, error } = await supabase.rpc("fn_expire_old_invitations");

        if (error) {
            console.error("[cron] RPC fn_expire_old_invitations failed:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            expiredCount: data || 0,
            timestamp: new Date().toISOString()
        });
    } catch (err: any) {
        console.error("[cron] Unexpected error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
