import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const periodId = url.searchParams.get("periodId");

    if (periodId) {
        const { data: period, error: pError } = await supabase
            .from("payroll_periods")
            .select("*")
            .eq("id", periodId)
            .eq("org_id", member.org_id)
            .single();

        if (pError) throw pError;
        if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

        const { data: entries, error: eError } = await supabase
            .from("payroll_entries")
            .select("*")
            .eq("period_id", periodId);

        if (eError) throw eError;
        return NextResponse.json({ period, entries });
    }

    const { data: periods, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("org_id", member.org_id)
        .order("start_date", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ periods, total: periods.length });
}, { module: "payroll", action: "view" });
