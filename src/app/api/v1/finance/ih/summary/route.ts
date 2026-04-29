import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ?? new Date().getFullYear().toString();

    type IhSession = {
        region: string; status: string; students_applied: number;
        subtotal_lec: number | null; amount_paid_ih: number | null;
        balance: number | null; session_date: string;
        school_name: string; exam_type: string;
    };

    const { data: sessions, error } = await supabase
        .from("ih_sessions")
        .select("region, status, students_applied, tariff, subtotal_lec, amount_paid_ih, balance, session_date, school_name, exam_type")
        .eq("org_id", member.org_id)
        .gte("session_date", `${year}-01-01`)
        .lte("session_date", `${year}-12-31`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const regions = ["SONORA", "BAJA_CALIFORNIA"] as const;
    const byRegion: Record<string, {
        executed: number; paid: number; balance: number; future: number;
        sessionCount: number; pendingCount: number;
        alerts: { school: string; balance: number; weeksOverdue: number }[];
    }> = {};

    for (const region of regions) {
        const r = ((sessions ?? []) as IhSession[]).filter(s => s.region === region);
        const executed = r.filter(s => s.status !== "FUTURE").reduce((a, s) => a + Number(s.subtotal_lec ?? 0), 0);
        const paid     = r.reduce((a, s) => a + Number(s.amount_paid_ih ?? 0), 0);
        const balance  = r.filter(s => s.status !== "FUTURE").reduce((a, s) => a + Number(s.balance ?? 0), 0);
        const future   = r.filter(s => s.status === "FUTURE").reduce((a, s) => a + Number(s.subtotal_lec ?? 0), 0);
        const pending  = r.filter(s => s.status === "PENDING");

        // Alertas: sesiones con balance > 0 agrupadas por escuela, más antiguas primero
        const schoolBalance: Record<string, { balance: number; oldest: Date }> = {};
        for (const s of pending) {
            if (Number(s.balance) <= 0) continue;
            const k = s.school_name;
            const d = new Date(s.session_date);
            if (!schoolBalance[k] || d < schoolBalance[k].oldest) {
                schoolBalance[k] = { balance: 0, oldest: d };
            }
            schoolBalance[k].balance += Number(s.balance ?? 0);
        }

        const now = new Date();
        const alerts = Object.entries(schoolBalance)
            .map(([school, { balance, oldest }]) => ({
                school,
                balance,
                weeksOverdue: Math.floor((now.getTime() - oldest.getTime()) / (7 * 24 * 3600 * 1000)),
            }))
            .filter(a => a.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        byRegion[region] = {
            executed, paid, balance, future,
            sessionCount: r.filter(s => s.status !== "FUTURE").length,
            pendingCount: pending.length,
            alerts,
        };
    }

    const total = {
        executed: Object.values(byRegion).reduce((a, r) => a + r.executed, 0),
        paid:     Object.values(byRegion).reduce((a, r) => a + r.paid, 0),
        balance:  Object.values(byRegion).reduce((a, r) => a + r.balance, 0),
        future:   Object.values(byRegion).reduce((a, r) => a + r.future, 0),
    };

    return NextResponse.json({ year, total, byRegion });
}, { module: "finanzas", action: "view" });
