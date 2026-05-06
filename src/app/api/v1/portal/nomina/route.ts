import { NextResponse } from "next/server";
import { withApplicatorAuth } from "@/lib/auth/with-applicator";

export const GET = withApplicatorAuth(async (req, { supabase, applicator }) => {
    const url = new URL(req.url);
    const periodId = url.searchParams.get("periodId");

    const baseQuery = supabase
        .from("payroll_entries")
        .select("*")
        .eq("org_id", applicator.org_id)
        .eq("applicator_id", applicator.id)
        .order("created_at", { ascending: false });

    const { data: entries, error: entriesError } = periodId
        ? await baseQuery.eq("period_id", periodId)
        : await baseQuery;

    if (entriesError) {
        return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    const periodIds = Array.from(new Set((entries ?? []).map((entry: any) => entry.period_id)));
    const entryIds = (entries ?? []).map((entry: any) => entry.id);

    const { data: periods, error: periodsError } = periodIds.length
        ? await supabase
              .from("payroll_periods")
              .select("id, name, start_date, end_date, status")
              .in("id", periodIds)
        : { data: [], error: null as any };

    if (periodsError) {
        return NextResponse.json({ error: periodsError.message }, { status: 500 });
    }

    const { data: lineItems, error: linesError } = entryIds.length
        ? await supabase
              .from("payroll_line_items")
              .select(`
                id,
                entry_id,
                event_id,
                event_name,
                role,
                line_type,
                source,
                projected_hours,
                projected_rate,
                projected_amount,
                actual_hours,
                actual_rate,
                actual_amount,
                is_confirmed
              `)
              .in("entry_id", entryIds)
        : { data: [], error: null as any };

    if (linesError) {
        return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    return NextResponse.json({
        periods: periods ?? [],
        entries: entries ?? [],
        line_items: lineItems ?? [],
    });
});
