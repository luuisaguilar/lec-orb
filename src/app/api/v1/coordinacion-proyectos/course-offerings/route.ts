import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE, courseOfferingCreateSchema } from "@/lib/coordinacion-proyectos/schemas";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    const { data, error, count } = await supabase
        .from("lec_course_offerings")
        .select("*", { count: "exact" })
        .eq("org_id", member.org_id)
        .order("starts_on", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offerings: data ?? [], total: count ?? 0 });
}, { module: CP_MODULE, action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = courseOfferingCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const row = {
        ...parsed.data,
        org_id: member.org_id,
        created_by: user.id,
        updated_by: user.id,
    };

    const { data, error } = await supabase.from("lec_course_offerings").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "lec_course_offerings",
        record_id: data.id,
        action: "INSERT",
        new_data: row as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
}, { module: CP_MODULE, action: "edit" });
