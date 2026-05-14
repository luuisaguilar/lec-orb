import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const yStart = `${year}-01-01`;
    const yEnd = `${year}-12-31`;

    const [
        projCount,
        examCount,
        courseCount,
        missingRev,
        projRows,
        examRows,
    ] = await Promise.all([
        supabase
            .from("lec_program_projects")
            .select("id", { count: "exact", head: true })
            .eq("org_id", member.org_id)
            .gte("period_month", yStart)
            .lte("period_month", yEnd),
        supabase
            .from("lec_exam_sales_lines")
            .select("id", { count: "exact", head: true })
            .eq("org_id", member.org_id)
            .gte("exam_month", yStart)
            .lte("exam_month", yEnd),
        supabase
            .from("lec_course_offerings")
            .select("id", { count: "exact", head: true })
            .eq("org_id", member.org_id),
        supabase
            .from("lec_program_projects")
            .select("id", { count: "exact", head: true })
            .eq("org_id", member.org_id)
            .gte("period_month", yStart)
            .lte("period_month", yEnd)
            .is("revenue_amount", null),
        supabase
            .from("lec_program_projects")
            .select("beneficiaries_count, revenue_amount")
            .eq("org_id", member.org_id)
            .gte("period_month", yStart)
            .lte("period_month", yEnd)
            .limit(5000),
        supabase
            .from("lec_exam_sales_lines")
            .select("quantity, amount")
            .eq("org_id", member.org_id)
            .gte("exam_month", yStart)
            .lte("exam_month", yEnd)
            .limit(5000),
    ]);

    for (const q of [projCount, examCount, courseCount, missingRev, projRows, examRows]) {
        if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 });
    }

    let beneficiaries = 0;
    let revenue = 0;
    for (const r of projRows.data ?? []) {
        beneficiaries += Number(r.beneficiaries_count ?? 0);
        if (r.revenue_amount != null) revenue += Number(r.revenue_amount);
    }
    let examQty = 0;
    let examAmount = 0;
    for (const r of examRows.data ?? []) {
        examQty += Number(r.quantity ?? 0);
        if (r.amount != null) examAmount += Number(r.amount);
    }

    return NextResponse.json({
        year,
        programProjects: {
            count: projCount.count ?? 0,
            beneficiariesTotal: beneficiaries,
            revenueTotal: revenue,
            missingRevenueCount: missingRev.count ?? 0,
        },
        examLines: {
            count: examCount.count ?? 0,
            quantityTotal: examQty,
            amountTotal: examAmount,
        },
        courseOfferingsCount: courseCount.count ?? 0,
    });
}, { module: CP_MODULE, action: "view" });
