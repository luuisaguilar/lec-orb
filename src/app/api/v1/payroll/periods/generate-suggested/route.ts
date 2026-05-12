import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

type SuggestedPeriod = {
    start_date: string;
    end_date: string;
    name: string;
};

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

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = (await req.json().catch(() => null)) as
        | { from?: string; to?: string; cadence?: "weekly" | "biweekly" }
        | null;

    const from = body?.from ?? "2025-01-01";
    const to = body?.to ?? "2026-12-31";
    const cadence = body?.cadence ?? "biweekly";

    const { data: events, error: evErr } = await supabase
        .from("events")
        .select("id, date")
        .eq("org_id", member.org_id)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true });
    if (evErr) throw evErr;

    const payDates = (events ?? []).map((e: any) => iso(nextFriday(addDays(e.date, 14))));
    const payDateCounts = new Map<string, number>();
    for (const d of payDates) payDateCounts.set(d, (payDateCounts.get(d) ?? 0) + 1);
    const weekly = Array.from(payDateCounts.entries())
        .map(([pay_date, events]) => ({ pay_date, events }))
        .sort((a, b) => a.pay_date.localeCompare(b.pay_date));

    const suggestedPeriods: SuggestedPeriod[] = [];
    if (cadence === "weekly") {
        for (const w of weekly) {
            const end = new Date(`${w.pay_date}T00:00:00Z`);
            const start = new Date(end);
            start.setUTCDate(start.getUTCDate() - 6);
            suggestedPeriods.push({
                name: `Nómina — pago ${w.pay_date}`,
                start_date: iso(start),
                end_date: w.pay_date,
            });
        }
    } else {
        for (let i = 0; i < weekly.length; i += 2) {
            const a = weekly[i]!;
            const b = weekly[i + 1];
            const endDate = (b ?? a).pay_date;
            const end = new Date(`${a.pay_date}T00:00:00Z`);
            const start = new Date(end);
            start.setUTCDate(start.getUTCDate() - 6);
            const label = b ? `${a.pay_date} + ${b.pay_date}` : `${a.pay_date}`;
            suggestedPeriods.push({
                name: `Nómina quincenal — pagos ${label}`,
                start_date: iso(start),
                end_date: endDate,
            });
        }
    }

    const toCreate = suggestedPeriods.map((p) => ({
        org_id: member.org_id,
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
        status: "open",
        notes: `Auto-sugerido (${cadence}) para rango ${from}..${to} · por ${user.email ?? user.id}`,
    }));

    if (!toCreate.length) {
        return NextResponse.json({ ok: true, created: 0 });
    }

    // Avoid duplicate conflicts: insert in chunks, ignore duplicate by re-checking exact window.
    const created: any[] = [];
    for (const row of toCreate) {
        const { data: existing, error: exErr } = await supabase
            .from("payroll_periods")
            .select("id")
            .eq("org_id", member.org_id)
            .eq("start_date", row.start_date)
            .eq("end_date", row.end_date)
            .maybeSingle();
        if (exErr) throw exErr;
        if (existing?.id) continue;

        const { data, error } = await supabase.from("payroll_periods").insert(row).select("id").single();
        if (error) throw error;
        created.push(data);
    }

    return NextResponse.json({ ok: true, created: created.length });
}, { module: "payroll", action: "edit" });

