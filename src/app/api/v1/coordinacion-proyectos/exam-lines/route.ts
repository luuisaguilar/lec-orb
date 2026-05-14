import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE, examSalesLineCreateSchema } from "@/lib/coordinacion-proyectos/schemas";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10) || 200, 1000);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    let q = supabase
        .from("lec_exam_sales_lines")
        .select("*", { count: "exact" })
        .eq("org_id", member.org_id)
        .order("exam_month", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (year && month) {
        const y = parseInt(year, 10);
        const mo = parseInt(month, 10);
        if (!Number.isNaN(y) && mo >= 1 && mo <= 12) {
            const mm = String(mo).padStart(2, "0");
            const nextMo = mo === 12 ? 1 : mo + 1;
            const nextY = mo === 12 ? y + 1 : y;
            const mmNext = String(nextMo).padStart(2, "0");
            q = q.gte("exam_month", `${y}-${mm}-01`).lt("exam_month", `${nextY}-${mmNext}-01`);
        }
    } else if (year) {
        const y = parseInt(year, 10);
        if (!Number.isNaN(y)) {
            q = q.gte("exam_month", `${y}-01-01`).lte("exam_month", `${y}-12-31`);
        }
    }

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lines: data ?? [], total: count ?? 0 });
}, { module: CP_MODULE, action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = examSalesLineCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const row = {
        ...parsed.data,
        org_id: member.org_id,
        created_by: user.id,
        updated_by: user.id,
    };

    const { data, error } = await supabase.from("lec_exam_sales_lines").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "lec_exam_sales_lines",
        record_id: data.id,
        action: "INSERT",
        new_data: row as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
}, { module: CP_MODULE, action: "edit" });
