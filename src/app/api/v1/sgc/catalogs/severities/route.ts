import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { canMutateSgc, forbiddenSgcMutation, mapSgcDbError } from "@/app/api/v1/sgc/_shared";

const createSeveritySchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().optional().nullable(),
    sequence: z.number().int().min(0).optional().default(100),
    is_active: z.boolean().optional().default(true),
});

export const GET = withAuth(async (_req, { supabase, member }) => {
    const { data, error } = await supabase
        .from("sgc_nc_severities")
        .select("*")
        .eq("org_id", member.org_id)
        .order("sequence", { ascending: true })
        .order("name", { ascending: true });

    if (error) return mapSgcDbError(error);
    return NextResponse.json({ severities: data ?? [] });
}, { module: "sgc", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const body = await req.json();
    const parsed = createSeveritySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    const { data, error } = await supabase
        .from("sgc_nc_severities")
        .insert({
            org_id: member.org_id,
            ...parsed.data,
        })
        .select("*")
        .single();

    if (error || !data) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_nc_severities",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ severity: data }, { status: 201 });
}, { module: "sgc", action: "edit" });
