import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE, catalogRowSchema } from "@/lib/coordinacion-proyectos/schemas";

export const GET = withAuth(async (_req, { supabase, member }) => {
    const [departments, examTypes, productServices] = await Promise.all([
        supabase
            .from("lec_cp_departments")
            .select("*")
            .eq("org_id", member.org_id)
            .order("sort_order"),
        supabase
            .from("lec_cp_exam_types")
            .select("*")
            .eq("org_id", member.org_id)
            .order("sort_order"),
        supabase
            .from("lec_cp_product_services")
            .select("*")
            .eq("org_id", member.org_id)
            .order("sort_order"),
    ]);

    if (departments.error) return NextResponse.json({ error: departments.error.message }, { status: 500 });
    if (examTypes.error) return NextResponse.json({ error: examTypes.error.message }, { status: 500 });
    if (productServices.error) return NextResponse.json({ error: productServices.error.message }, { status: 500 });

    return NextResponse.json({
        departments: departments.data ?? [],
        examTypes: examTypes.data ?? [],
        productServices: productServices.data ?? [],
    });
}, { module: CP_MODULE, action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = catalogRowSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const table =
        parsed.data.kind === "department"
            ? "lec_cp_departments"
            : parsed.data.kind === "exam_type"
              ? "lec_cp_exam_types"
              : "lec_cp_product_services";

    const row = {
        org_id: member.org_id,
        name: parsed.data.name,
        sort_order: parsed.data.sort_order ?? 0,
    };

    const { data, error } = await supabase.from(table).insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: table,
        record_id: data.id,
        action: "INSERT",
        new_data: row as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
}, { module: CP_MODULE, action: "edit" });
