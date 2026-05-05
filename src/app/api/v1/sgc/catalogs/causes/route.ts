import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { canMutateSgc, forbiddenSgcMutation, mapSgcDbError } from "@/app/api/v1/sgc/_shared";

const createCauseSchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().optional().nullable(),
    ref_code: z.string().max(40).optional().nullable(),
    sequence: z.number().int().min(0).optional().default(100),
    parent_id: z.string().uuid().optional().nullable(),
    is_active: z.boolean().optional().default(true),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parent_id");
    const includeInactive = searchParams.get("include_inactive") === "true";

    let query = supabase
        .from("sgc_nc_causes")
        .select("*")
        .eq("org_id", member.org_id)
        .order("sequence", { ascending: true })
        .order("name", { ascending: true });

    if (!includeInactive) query = query.eq("is_active", true);
    if (parentId === "null") query = query.is("parent_id", null);
    else if (parentId) query = query.eq("parent_id", parentId);

    const { data, error } = await query;
    if (error) return mapSgcDbError(error);
    return NextResponse.json({ causes: data ?? [] });
}, { module: "sgc", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const body = await req.json();
    const parsed = createCauseSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    const { data, error } = await supabase
        .from("sgc_nc_causes")
        .insert({
            org_id: member.org_id,
            ...parsed.data,
        })
        .select("*")
        .single();

    if (error || !data) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_nc_causes",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ cause: data }, { status: 201 });
}, { module: "sgc", action: "edit" });
