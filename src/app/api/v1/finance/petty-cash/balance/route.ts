import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);
    const fundId = searchParams.get("fund_id");

    if (!orgId) {
        return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
    }

    if (fundId) {
        const { data: fund, error } = await supabase
            .from("petty_cash_funds")
            .select("current_balance, fiscal_year, status")
            .eq("id", fundId)
            .eq("org_id", orgId)
            .maybeSingle();

        if (error) throw error;
        if (!fund) {
            return NextResponse.json({ error: "Fund not found" }, { status: 404 });
        }

        return NextResponse.json({
            balance: fund.status === "open" ? Number(fund.current_balance ?? 0) : 0,
            fiscal_year: fund.fiscal_year,
        });
    }

    const { data, error } = await supabase.rpc("fn_petty_cash_balance", {
        p_org_id: orgId,
        p_year: year,
    });

    if (error) throw error;

    return NextResponse.json({ balance: data != null ? Number(data) : 0, year });
}, { module: "finanzas", action: "view" });
