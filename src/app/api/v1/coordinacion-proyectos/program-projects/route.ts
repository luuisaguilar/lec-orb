import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE, programProjectCreateSchema } from "@/lib/coordinacion-proyectos/schemas";

const SELECT_REL = "*";

function emptyToNull<T extends Record<string, unknown>>(row: T): T {
    const out = { ...row };
    for (const k of Object.keys(out)) {
        if (out[k] === "") (out as any)[k] = null;
    }
    return out;
}

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    let q = supabase
        .from("lec_program_projects")
        .select(SELECT_REL, { count: "exact" })
        .eq("org_id", member.org_id)
        .order("period_month", { ascending: false })
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
            q = q.gte("period_month", `${y}-${mm}-01`).lt("period_month", `${nextY}-${mmNext}-01`);
        }
    } else if (year) {
        const y = parseInt(year, 10);
        if (!Number.isNaN(y)) {
            q = q.gte("period_month", `${y}-01-01`).lte("period_month", `${y}-12-31`);
        }
    }

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ projects: data ?? [], total: count ?? 0 });
}, { module: CP_MODULE, action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = programProjectCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const row = emptyToNull({
        ...parsed.data,
        org_id: member.org_id,
        created_by: user.id,
        updated_by: user.id,
        evidence_office_url: parsed.data.evidence_office_url ?? null,
        evidence_satisfaction_url: parsed.data.evidence_satisfaction_url ?? null,
        evidence_survey_url: parsed.data.evidence_survey_url ?? null,
    });

    const { data, error } = await supabase.from("lec_program_projects").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "lec_program_projects",
        record_id: data.id,
        action: "INSERT",
        new_data: row as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
}, { module: CP_MODULE, action: "edit" });
