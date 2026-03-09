import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo/config";
import {
    mockPayrollPeriods,
    mockPayrollEntries,
} from "@/lib/demo/data";

// GET /api/v1/payroll — List payroll periods with entries
export async function GET(request: Request) {
    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");

    if (DEMO_MODE) {
        if (periodId) {
            const period = mockPayrollPeriods.find((p) => p.id === periodId);
            if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });
            const entries = mockPayrollEntries.filter((e) => e.period_id === periodId);
            return NextResponse.json({ period, entries });
        }

        const periods = mockPayrollPeriods.map((period) => {
            const entries = mockPayrollEntries.filter((e) => e.period_id === period.id);
            return {
                ...period,
                entry_count: entries.length,
                total_amount: entries.reduce((sum, e) => sum + e.total, 0),
            };
        });
        return NextResponse.json({ periods, total: periods.length });
    }

    return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
