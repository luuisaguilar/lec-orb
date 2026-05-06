import { NextResponse } from "next/server";
import { withApplicatorAuth } from "@/lib/auth/with-applicator";

export const GET = withApplicatorAuth(async (_req, { supabase, applicator }) => {
    const { data: entries, error: entriesError } = await supabase
        .from("payroll_entries")
        .select("id, status, hours_worked, total, events_count, slots_count")
        .eq("org_id", applicator.org_id)
        .eq("applicator_id", applicator.id);

    if (entriesError) {
        return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    const entryIds = (entries ?? []).map((entry: any) => entry.id);
    const { data: lines, error: linesError } = entryIds.length
        ? await supabase
              .from("payroll_line_items")
              .select("entry_id, role")
              .in("entry_id", entryIds)
              .eq("line_type", "work")
        : { data: [], error: null as any };

    if (linesError) {
        return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    const totals = (entries ?? []).reduce(
        (acc: any, entry: any) => {
            acc.total_hours += Number(entry.hours_worked ?? 0);
            acc.total_events += Number(entry.events_count ?? 0);
            acc.total_slots += Number(entry.slots_count ?? 0);
            acc.pending_balance += entry.status === "paid" ? 0 : Number(entry.total ?? 0);
            acc.total_paid += entry.status === "paid" ? Number(entry.total ?? 0) : 0;
            return acc;
        },
        {
            total_hours: 0,
            total_events: 0,
            total_slots: 0,
            pending_balance: 0,
            total_paid: 0,
        }
    );

    const role_distribution = (lines ?? []).reduce((acc: Record<string, number>, line: any) => {
        const role = line.role ?? "UNKNOWN";
        acc[role] = (acc[role] ?? 0) + 1;
        return acc;
    }, {});

    return NextResponse.json({
        ...totals,
        role_distribution,
        certified_levels: applicator.certified_levels ?? [],
    });
});
