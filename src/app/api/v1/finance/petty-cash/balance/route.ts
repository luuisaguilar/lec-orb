import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    if (!orgId) {
        return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("fn_petty_cash_balance", {
        p_org_id: orgId,
        p_year: year
    });

    if (error) throw error;

    return NextResponse.json({ balance: data || 0 });
}, { module: "finanzas", action: "view" });
