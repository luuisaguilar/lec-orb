import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const planningRowSchema = z.object({
    city: z.string().optional().nullable(),
    project: z.string().optional().default("UNOi"),
    school_name: z.string().min(1),
    school_id: z.string().uuid().optional().nullable(),
    nivel: z.string().optional().nullable(),
    exam_type: z.string().min(1),
    students_planned: z.number().int().nonnegative().optional().nullable(),
    proposed_date: z.string().min(1),
    date_raw: z.string().optional().nullable(),
    propuesta: z.string().optional().nullable(),
    external_status: z.string().optional().nullable(),
    resultados: z.string().optional().nullable(),
    planning_status: z.enum(["proposed", "linked", "confirmed", "rescheduled", "cancelled"]).optional().default("proposed"),
    event_id: z.string().uuid().optional().nullable(),
    event_session_id: z.string().uuid().optional().nullable(),
    source_file: z.string().optional().nullable(),
    source_row: z.number().int().optional().nullable(),
    notes: z.string().optional().nullable(),
    planning_year: z.number().int().min(2000).max(2200).optional(),
    planning_cycle: z.string().trim().min(1).optional().default("annual"),
});

const createSchema = z.object({
    rows: z.array(planningRowSchema).min(1),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const school = url.searchParams.get("school");
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");
    const cycle = (url.searchParams.get("cycle") ?? "annual").trim() || "annual";
    const yearParam = Number(url.searchParams.get("year") ?? "");
    const planningYear = Number.isFinite(yearParam) ? yearParam : new Date().getFullYear();

    let query = supabase
        .from("unoi_planning_rows")
        .select(`
            *,
            school:schools(id, name, city),
            event:events(id, title, status, date),
            session:event_sessions(id, exam_type, date)
        `)
        .eq("org_id", member.org_id)
        .eq("planning_year", planningYear)
        .eq("planning_cycle", cycle)
        .order("proposed_date", { ascending: true })
        .order("school_name", { ascending: true });

    if (city) query = query.ilike("city", `%${city}%`);
    if (school) query = query.ilike("school_name", `%${school}%`);
    if (status) query = query.eq("planning_status", status);
    if (q) {
        query = query.or(`school_name.ilike.%${q}%,exam_type.ilike.%${q}%,propuesta.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ rows: data ?? [], total: data?.length ?? 0, year: planningYear, cycle });
}, { module: "events", action: "view" });

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data.rows.map((row) => ({
        ...row,
        org_id: member.org_id,
        planning_year: row.planning_year ?? new Date(row.proposed_date).getUTCFullYear(),
        planning_cycle: row.planning_cycle ?? "annual",
    }));

    const { data, error } = await supabase
        .from("unoi_planning_rows")
        .insert(payload)
        .select();
    if (error) throw error;
    return NextResponse.json({ rows: data, total: data.length }, { status: 201 });
}, { module: "events", action: "edit" });

