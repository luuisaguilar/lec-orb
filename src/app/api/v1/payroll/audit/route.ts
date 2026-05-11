import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

function iso(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function addDays(dateIso: string, days: number): Date {
    const d = new Date(`${dateIso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d;
}

function nextFriday(d: Date): Date {
    const day = d.getUTCDay();
    const friday = 5;
    const delta = (friday - day + 7) % 7;
    const out = new Date(d);
    out.setUTCDate(out.getUTCDate() + delta);
    return out;
}

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const periodId = url.searchParams.get("periodId");
    const cadence = url.searchParams.get("cadence") ?? "biweekly";

    if (!periodId) {
        return NextResponse.json({ error: "periodId is required" }, { status: 400 });
    }

    const { data: period, error: pErr } = await supabase
        .from("payroll_periods")
        .select("id, name, start_date, end_date, status, total_amount, notes")
        .eq("id", periodId)
        .eq("org_id", member.org_id)
        .single();

    if (pErr) throw pErr;
    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

    const start = period.start_date as string;
    const end = period.end_date as string;

    const { data: events, error: evErr } = await supabase
        .from("events")
        .select("id, date, status, title")
        .eq("org_id", member.org_id)
        .gte("date", start)
        .lte("date", end);
    if (evErr) throw evErr;

    const eventList = events ?? [];
    const payDates = eventList.map((e: { date: string }) => iso(nextFriday(addDays(e.date, 14))));
    const payDateCounts = new Map<string, number>();
    for (const d of payDates) payDateCounts.set(d, (payDateCounts.get(d) ?? 0) + 1);
    const weekly = Array.from(payDateCounts.entries())
        .map(([pay_date, count]) => ({ pay_date, events: count }))
        .sort((a, b) => a.pay_date.localeCompare(b.pay_date));

    const biweeklyWindows: { pay_dates: string[]; events: number }[] = [];
    if (cadence === "biweekly") {
        for (let i = 0; i < weekly.length; i += 2) {
            const a = weekly[i]!;
            const b = weekly[i + 1];
            biweeklyWindows.push({
                pay_dates: b ? [a.pay_date, b.pay_date] : [a.pay_date],
                events: a.events + (b?.events ?? 0),
            });
        }
    }

    const { data: entries, error: enErr } = await supabase
        .from("payroll_entries")
        .select("id, status, applicator_name, hours_worked, total")
        .eq("period_id", periodId)
        .eq("org_id", member.org_id);
    if (enErr) throw enErr;

    const entryRows = entries ?? [];
    const entryIds = entryRows.map((e: { id: string }) => e.id);

    let lineCount = 0;
    let autoLines = 0;
    let manualLines = 0;
    if (entryIds.length > 0) {
        const { data: lines, error: liErr } = await supabase
            .from("payroll_line_items")
            .select("id, source")
            .in("entry_id", entryIds)
            .eq("org_id", member.org_id);
        if (liErr) throw liErr;
        for (const li of lines ?? []) {
            lineCount += 1;
            const s = (li as { source: string }).source;
            if (s === "manual") manualLines += 1;
            if (s === "auto_event_staff") autoLines += 1;
        }
    }

    const pipeline = {
        period_status: period.status,
        entries_total: entryRows.length,
        lines_total: lineCount,
        auto_lines: autoLines,
        manual_lines: manualLines,
        events_in_window: eventList.length,
    };

    const productivityHint =
        entryRows.length > 0 && (period as { total_amount?: number }).total_amount != null
            ? `Monto consolidado del período: $${Number((period as { total_amount: number }).total_amount).toLocaleString("es-MX")}`
            : null;

    return NextResponse.json({
        period,
        cadence,
        payFridaysSuggested: weekly,
        biweeklyWindows: cadence === "biweekly" ? biweeklyWindows : null,
        pipeline,
        productivityHint,
    });
}, { module: "payroll", action: "view" });
