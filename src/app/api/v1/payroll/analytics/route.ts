import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

function num(v: unknown): number {
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

type LineRow = {
    entry_id: string;
    event_id: string | null;
    event_name: string | null;
    projected_amount: number | null;
    projected_hours: number | null;
    actual_amount: number | null;
    actual_hours: number | null;
    is_confirmed: boolean | null;
    line_type: string | null;
};

export const GET = withAuth(async (req, { supabase, member }) => {
    const periodId = new URL(req.url).searchParams.get("periodId");
    if (!periodId) {
        return NextResponse.json({ error: "periodId is required" }, { status: 400 });
    }

    const { data: period, error: pErr } = await supabase
        .from("payroll_periods")
        .select("id, name, start_date, end_date, status, total_amount")
        .eq("id", periodId)
        .eq("org_id", member.org_id)
        .single();

    if (pErr) throw pErr;
    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

    const { data: entries, error: eErr } = await supabase
        .from("payroll_entries")
        .select("id, applicator_id, applicator_name, hours_worked, subtotal, total, adjustments, status")
        .eq("period_id", periodId)
        .eq("org_id", member.org_id);

    if (eErr) throw eErr;

    const entryList = entries ?? [];
    const entryIds = entryList.map((e: { id: string }) => e.id);
    if (entryIds.length === 0) {
        return NextResponse.json({
            period,
            byApplicator: [],
            byEvent: [],
            bySchool: [],
            totals: { projected: 0, actual: 0, variance: 0 },
            quality: {
                missingEventId: 0,
                missingActual: 0,
                unconfirmedLines: 0,
                zeroProjectedHours: 0,
            },
            alerts: ["No hay entradas de nómina para este período."],
        });
    }

    const { data: lines, error: lErr } = await supabase
        .from("payroll_line_items")
        .select(
            "id, entry_id, event_id, event_name, projected_amount, projected_hours, actual_amount, actual_hours, is_confirmed, line_type, source, role"
        )
        .in("entry_id", entryIds)
        .eq("org_id", member.org_id);

    if (lErr) throw lErr;

    const lineItems = (lines ?? []) as LineRow[];

    const byApplicatorMap = new Map<
        string,
        {
            applicator_id: string;
            applicator_name: string;
            projectedTotal: number;
            actualTotal: number;
            projectedHours: number;
            actualHours: number;
            lineCount: number;
        }
    >();

    for (const e of entryList) {
        const row = e as { id: string; applicator_id: string; applicator_name: string };
        byApplicatorMap.set(row.id, {
            applicator_id: row.applicator_id,
            applicator_name: row.applicator_name,
            projectedTotal: 0,
            actualTotal: 0,
            projectedHours: 0,
            actualHours: 0,
            lineCount: 0,
        });
    }

    let totalsProjected = 0;
    let totalsActual = 0;
    let missingEventId = 0;
    let missingActual = 0;
    let unconfirmedLines = 0;
    let zeroProjectedHours = 0;

    const byEventMap = new Map<
        string,
        {
            event_id: string;
            title: string | null;
            date: string | null;
            school_id: string | null;
            school_name: string | null;
            projectedTotal: number;
            actualTotal: number;
            lineCount: number;
        }
    >();

    for (const row of lineItems) {
        const pa = num(row.projected_amount);
        const aa = row.actual_amount === null || row.actual_amount === undefined ? null : num(row.actual_amount);
        const ph = num(row.projected_hours);
        const ah =
            row.actual_hours === null || row.actual_hours === undefined ? null : num(row.actual_hours);

        totalsProjected += pa;
        if (aa !== null) totalsActual += aa;

        const agg = byApplicatorMap.get(row.entry_id);
        if (agg) {
            agg.projectedTotal += pa;
            if (aa !== null) agg.actualTotal += aa;
            agg.projectedHours += ph;
            if (ah !== null) agg.actualHours += ah;
            agg.lineCount += 1;
        }

        if (!row.event_id && row.line_type === "work") missingEventId += 1;
        if (aa === null && row.line_type === "work") missingActual += 1;
        if (row.is_confirmed === false) unconfirmedLines += 1;
        if (ph === 0 && row.line_type === "work") zeroProjectedHours += 1;

        const eid = row.event_id;
        if (eid) {
            const cur = byEventMap.get(eid) ?? {
                event_id: eid,
                title: row.event_name,
                date: null,
                school_id: null,
                school_name: null,
                projectedTotal: 0,
                actualTotal: 0,
                lineCount: 0,
            };
            byEventMap.set(eid, {
                ...cur,
                title: cur.title ?? row.event_name,
                projectedTotal: cur.projectedTotal + pa,
                actualTotal: cur.actualTotal + (aa ?? 0),
                lineCount: cur.lineCount + 1,
            });
        }
    }

    const eventIds = [...byEventMap.keys()];
    const schoolIds: string[] = [];
    if (eventIds.length > 0) {
        const { data: evs, error: evErr } = await supabase
            .from("events")
            .select("id, title, date, school_id")
            .in("id", eventIds)
            .eq("org_id", member.org_id);
        if (evErr) throw evErr;

        for (const ev of evs ?? []) {
            const e = ev as { id: string; title: string; date: string; school_id: string | null };
            const cur = byEventMap.get(e.id);
            if (!cur) continue;
            if (e.school_id) schoolIds.push(e.school_id);
            byEventMap.set(e.id, {
                ...cur,
                title: e.title,
                date: e.date,
                school_id: e.school_id,
            });
        }
    }

    const uniqSchools = [...new Set(schoolIds)];
    const schoolNameById = new Map<string, string>();
    if (uniqSchools.length > 0) {
        const { data: sch, error: sErr } = await supabase
            .from("schools")
            .select("id, name")
            .in("id", uniqSchools)
            .eq("org_id", member.org_id);
        if (sErr) throw sErr;
        for (const s of sch ?? []) {
            const row = s as { id: string; name: string };
            schoolNameById.set(row.id, row.name);
        }
    }

    for (const [eid, cur] of byEventMap) {
        if (!cur.school_id) continue;
        byEventMap.set(eid, {
            ...cur,
            school_name: schoolNameById.get(cur.school_id) ?? null,
        });
    }

    const bySchoolMap = new Map<
        string,
        { school_id: string; school_name: string; projectedTotal: number; actualTotal: number; lineCount: number }
    >();

    for (const row of lineItems) {
        if (!row.event_id) continue;
        const ev = byEventMap.get(row.event_id);
        const sid = ev?.school_id;
        if (!sid) continue;
        const sn = ev.school_name ?? schoolNameById.get(sid) ?? "Sede";
        const pa = num(row.projected_amount);
        const aa = row.actual_amount === null || row.actual_amount === undefined ? 0 : num(row.actual_amount);
        const cur =
            bySchoolMap.get(sid) ??
            { school_id: sid, school_name: sn, projectedTotal: 0, actualTotal: 0, lineCount: 0 };
        bySchoolMap.set(sid, {
            ...cur,
            school_name: sn,
            projectedTotal: cur.projectedTotal + pa,
            actualTotal: cur.actualTotal + aa,
            lineCount: cur.lineCount + 1,
        });
    }

    const byApplicator = [...byApplicatorMap.values()].map((a) => ({
        ...a,
        variance: a.actualTotal - a.projectedTotal,
    }));

    const byEvent = [...byEventMap.values()].map((e) => ({
        ...e,
        variance: e.actualTotal - e.projectedTotal,
    }));

    const bySchool = [...bySchoolMap.values()].map((s) => ({
        ...s,
        variance: s.actualTotal - s.projectedTotal,
    }));

    const variance = totalsActual - totalsProjected;
    const alerts: string[] = [];
    if (missingEventId > 0) alerts.push(`${missingEventId} líneas de trabajo sin evento asociado.`);
    if (missingActual > 0) alerts.push(`${missingActual} líneas sin monto real capturado (solo proyectado).`);
    if (unconfirmedLines > 0) alerts.push(`${unconfirmedLines} líneas marcadas como no confirmadas.`);
    if (zeroProjectedHours > 0) alerts.push(`${zeroProjectedHours} líneas con horas proyectadas en cero.`);

    return NextResponse.json({
        period,
        byApplicator,
        byEvent,
        bySchool,
        totals: {
            projected: totalsProjected,
            actual: totalsActual,
            variance,
        },
        quality: {
            missingEventId,
            missingActual,
            unconfirmedLines,
            zeroProjectedHours,
        },
        alerts,
    });
}, { module: "payroll", action: "view" });
