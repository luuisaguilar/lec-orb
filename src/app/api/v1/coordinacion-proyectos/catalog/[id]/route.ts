import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
    kind: z.enum(["department", "exam_type", "product_service"]),
    name: z.string().min(1).max(200).optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
});

export const PATCH = withAuth(async (req, { supabase, user, member }, ctx: RouteCtx) => {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const table =
        parsed.data.kind === "department"
            ? "lec_cp_departments"
            : parsed.data.kind === "exam_type"
              ? "lec_cp_exam_types"
              : "lec_cp_product_services";

    const { data: existing, error: fe } = await supabase.from(table).select("*").eq("org_id", member.org_id).eq("id", id).single();
    if (fe || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.sort_order !== undefined) patch.sort_order = parsed.data.sort_order;
    if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;

    const { error } = await supabase.from(table).update(patch).eq("org_id", member.org_id).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: table,
        record_id: id,
        action: "UPDATE",
        old_data: existing as Record<string, unknown>,
        new_data: patch,
        performed_by: user.id,
    });

    return NextResponse.json({ ok: true });
}, { module: CP_MODULE, action: "edit" });

export const DELETE = withAuth(async (req, { supabase, user, member }, ctx: RouteCtx) => {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");
    const parsedKind = z.enum(["department", "exam_type", "product_service"]).safeParse(kind);
    if (!parsedKind.success) {
        return NextResponse.json({ error: "Query ?kind=department|exam_type|product_service es requerido" }, { status: 400 });
    }

    const table =
        parsedKind.data === "department"
            ? "lec_cp_departments"
            : parsedKind.data === "exam_type"
              ? "lec_cp_exam_types"
              : "lec_cp_product_services";

    const { data: existing, error: fe } = await supabase.from(table).select("*").eq("org_id", member.org_id).eq("id", id).single();
    if (fe || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error } = await supabase.from(table).delete().eq("org_id", member.org_id).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: table,
        record_id: id,
        action: "DELETE",
        old_data: existing as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ ok: true });
}, { module: CP_MODULE, action: "delete" });
