import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { canMutateSgc, forbiddenSgcMutation, mapSgcDbError } from "@/app/api/v1/sgc/_shared";

const updateSeveritySchema = z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().optional().nullable(),
    sequence: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
});

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSeveritySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    if (Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
        .from("sgc_nc_severities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Severity not found" }, { status: 404 });
    }

    const { data: updated, error } = await supabase
        .from("sgc_nc_severities")
        .update({
            ...parsed.data,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !updated) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_nc_severities",
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ severity: updated });
}, { module: "sgc", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
        .from("sgc_nc_severities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Severity not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from("sgc_nc_severities")
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_nc_severities",
        record_id: id,
        action: "DELETE",
        old_data: existing,
        performed_by: user.id,
    });

    return NextResponse.json({ ok: true });
}, { module: "sgc", action: "edit" });
