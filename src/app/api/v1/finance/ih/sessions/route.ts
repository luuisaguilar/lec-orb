import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";

const SessionSchema = z.object({
    school_name:      z.string().min(1),
    exam_type:        z.string().min(1),
    session_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    region:           z.enum(["SONORA", "BAJA_CALIFORNIA"]).default("SONORA"),
    students_applied: z.number().int().min(0),
    tariff:           z.number().positive(),
    status:           z.enum(["PENDING", "PAID", "PAID_DIFF", "FUTURE"]).default("PENDING"),
    notes:            z.string().optional().nullable(),
    school_id:        z.string().uuid().optional().nullable(),
    ih_invoice_id:    z.string().uuid().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const region  = searchParams.get("region");
    const status  = searchParams.get("status");
    const year    = searchParams.get("year");
    const school  = searchParams.get("school");

    let query = supabase
        .from("ih_sessions")
        .select("*")
        .eq("org_id", member.org_id)
        .order("session_date", { ascending: false });

    if (region) query = query.eq("region", region);
    if (status) query = query.eq("status", status);
    if (year)   query = query.gte("session_date", `${year}-01-01`).lte("session_date", `${year}-12-31`);
    if (school) query = query.ilike("school_name", `%${school}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body   = await req.json();
    const parsed = SessionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { data, error } = await supabase
        .from("ih_sessions")
        .insert({ ...parsed.data, org_id: member.org_id, created_by: user.id })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Ya existe una sesión con esa escuela, examen y fecha." },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_sessions", record_id: data.id,
        action: "INSERT", new_data: data, performed_by: user.id,
    });
    return NextResponse.json(data, { status: 201 });
}, { module: "finanzas", action: "edit" });
