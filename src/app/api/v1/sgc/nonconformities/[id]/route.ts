import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { canMutateSgc, forbiddenSgcMutation, mapSgcDbError } from "@/app/api/v1/sgc/_shared";

const idSchema = z.string().uuid();

const nonconformityUpdateSchema = z.object({
    title: z.string().min(1).max(200).optional().nullable(),
    related_reference: z.string().max(120).optional().nullable(),
    partner_name: z.string().max(200).optional().nullable(),
    description: z.string().min(1).optional(),
    stage_id: idSchema.optional().nullable(),
    status: z.enum(["draft", "analysis", "pending", "open", "done", "cancel"]).optional(),
    kanban_state: z.enum(["normal", "done", "blocked"]).optional(),
    responsible_user_id: idSchema.optional().nullable(),
    manager_user_id: idSchema.optional().nullable(),
    reported_by: idSchema.optional().nullable(),
    severity_id: idSchema.optional().nullable(),
    analysis: z.string().optional().nullable(),
    action_plan_comments: z.string().optional().nullable(),
    evaluation_comments: z.string().optional().nullable(),
    origin_ids: z.array(idSchema).optional(),
    cause_ids: z.array(idSchema).optional(),
    action_links: z.array(z.object({
        action_id: idSchema,
        relation_type: z.enum(["immediate", "planned"]).default("planned"),
    })).optional(),
});

async function validateIds(
    supabase: any,
    orgId: string,
    table: string,
    ids: string[],
    label: string,
) {
    if (ids.length === 0) return { ok: true as const };
    const { data, error } = await supabase
        .from(table)
        .select("id")
        .eq("org_id", orgId)
        .in("id", ids);

    if (error) return { ok: false as const, response: mapSgcDbError(error) };
    if ((data ?? []).length !== new Set(ids).size) {
        return {
            ok: false as const,
            response: NextResponse.json(
                { error: `${label} contains IDs outside the current organization.` },
                { status: 400 },
            ),
        };
    }
    return { ok: true as const };
}

async function loadRelations(supabase: any, orgId: string, nonconformityId: string) {
    const [originsResult, causesResult, actionsResult] = await Promise.all([
        supabase
            .from("sgc_nonconformity_origins")
            .select("origin_id")
            .eq("org_id", orgId)
            .eq("nonconformity_id", nonconformityId),
        supabase
            .from("sgc_nonconformity_causes")
            .select("cause_id")
            .eq("org_id", orgId)
            .eq("nonconformity_id", nonconformityId),
        supabase
            .from("sgc_nonconformity_actions")
            .select("action_id, relation_type")
            .eq("org_id", orgId)
            .eq("nonconformity_id", nonconformityId),
    ]);

    if (originsResult.error) return { ok: false as const, response: mapSgcDbError(originsResult.error) };
    if (causesResult.error) return { ok: false as const, response: mapSgcDbError(causesResult.error) };
    if (actionsResult.error) return { ok: false as const, response: mapSgcDbError(actionsResult.error) };

    return {
        ok: true as const,
        data: {
            origin_ids: (originsResult.data ?? []).map((row: { origin_id: string }) => row.origin_id),
            cause_ids: (causesResult.data ?? []).map((row: { cause_id: string }) => row.cause_id),
            action_links: (actionsResult.data ?? []).map((row: { action_id: string; relation_type: "immediate" | "planned" }) => ({
                action_id: row.action_id,
                relation_type: row.relation_type,
            })),
        },
    };
}

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data, error } = await supabase
        .from("sgc_nonconformities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Nonconformity not found" }, { status: 404 });
    }

    const relations = await loadRelations(supabase, member.org_id, id);
    if (!relations.ok) return relations.response;

    // Fetch timeline from audit_log with resilience for column names
    // We try to fetch both old and new naming conventions
    const { data: auditRows, error: auditError } = await supabase
        .from("audit_log")
        .select("*")
        .eq("org_id", member.org_id)
        .eq("table_name", "sgc_nonconformities")
        .eq("record_id", id)
        .order("created_at", { ascending: false })
        .limit(30);

    if (auditError) {
        console.warn("Audit Log Fetch Warning:", auditError.message);
    }

    // Map audit rows to a consistent format
    const timeline = (auditRows ?? []).map((row: any) => ({
        id: row.id,
        action: row.action || row.operation,
        old_data: row.old_data,
        new_data: row.new_data,
        performed_by: row.performed_by || row.changed_by,
        created_at: row.created_at || row.changed_at,
    }));

    return NextResponse.json({
        nonconformity: {
            ...data,
            ...relations.data,
        },
        timeline,
    });
}, { module: "sgc", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;
    const body = await req.json();
    const parsed = nonconformityUpdateSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    const payload = parsed.data;
    const hasCoreFields = Object.keys(payload).some((key) => !["origin_ids", "cause_ids", "action_links"].includes(key));
    const hasRelationFields = payload.origin_ids !== undefined || payload.cause_ids !== undefined || payload.action_links !== undefined;
    if (!hasCoreFields && !hasRelationFields) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
        .from("sgc_nonconformities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Nonconformity not found" }, { status: 404 });
    }

    if (payload.origin_ids !== undefined) {
        const originCheck = await validateIds(
            supabase,
            member.org_id,
            "sgc_nc_origins",
            [...new Set(payload.origin_ids)],
            "origin_ids",
        );
        if (!originCheck.ok) return originCheck.response;
    }

    if (payload.cause_ids !== undefined) {
        const causeCheck = await validateIds(
            supabase,
            member.org_id,
            "sgc_nc_causes",
            [...new Set(payload.cause_ids)],
            "cause_ids",
        );
        if (!causeCheck.ok) return causeCheck.response;
    }

    if (payload.action_links !== undefined) {
        const actionCheck = await validateIds(
            supabase,
            member.org_id,
            "sgc_actions",
            [...new Set(payload.action_links.map((item) => item.action_id))],
            "action_links",
        );
        if (!actionCheck.ok) return actionCheck.response;
    }

    let updated = existing;
    if (hasCoreFields) {
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        };

        const coreKeys = Object.keys(payload).filter((key) => !["origin_ids", "cause_ids", "action_links"].includes(key));
        for (const key of coreKeys) {
            updates[key] = (payload as Record<string, unknown>)[key];
        }

        const { data: updatedRow, error: updateError } = await supabase
            .from("sgc_nonconformities")
            .update(updates)
            .eq("id", id)
            .eq("org_id", member.org_id)
            .select("*")
            .single();

        if (updateError || !updatedRow) return mapSgcDbError(updateError);
        updated = updatedRow;
    }

    if (payload.origin_ids !== undefined) {
        const { error: deleteError } = await supabase
            .from("sgc_nonconformity_origins")
            .delete()
            .eq("org_id", member.org_id)
            .eq("nonconformity_id", id);
        if (deleteError) return mapSgcDbError(deleteError);

        const uniqueOrigins = [...new Set(payload.origin_ids)];
        if (uniqueOrigins.length > 0) {
            const { error: insertError } = await supabase
                .from("sgc_nonconformity_origins")
                .insert(uniqueOrigins.map((originId) => ({
                    org_id: member.org_id,
                    nonconformity_id: id,
                    origin_id: originId,
                })));
            if (insertError) return mapSgcDbError(insertError);
        }
    }

    if (payload.cause_ids !== undefined) {
        const { error: deleteError } = await supabase
            .from("sgc_nonconformity_causes")
            .delete()
            .eq("org_id", member.org_id)
            .eq("nonconformity_id", id);
        if (deleteError) return mapSgcDbError(deleteError);

        const uniqueCauses = [...new Set(payload.cause_ids)];
        if (uniqueCauses.length > 0) {
            const { error: insertError } = await supabase
                .from("sgc_nonconformity_causes")
                .insert(uniqueCauses.map((causeId) => ({
                    org_id: member.org_id,
                    nonconformity_id: id,
                    cause_id: causeId,
                })));
            if (insertError) return mapSgcDbError(insertError);
        }
    }

    if (payload.action_links !== undefined) {
        const { error: deleteError } = await supabase
            .from("sgc_nonconformity_actions")
            .delete()
            .eq("org_id", member.org_id)
            .eq("nonconformity_id", id);
        if (deleteError) return mapSgcDbError(deleteError);

        if (payload.action_links.length > 0) {
            const { error: insertError } = await supabase
                .from("sgc_nonconformity_actions")
                .insert(payload.action_links.map((item) => ({
                    org_id: member.org_id,
                    nonconformity_id: id,
                    action_id: item.action_id,
                    relation_type: item.relation_type ?? "planned",
                })));
            if (insertError) return mapSgcDbError(insertError);
        }
    }

    const relations = await loadRelations(supabase, member.org_id, id);
    if (!relations.ok) return relations.response;

    const responsePayload = {
        ...updated,
        ...relations.data,
    };

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_nonconformities",
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: responsePayload,
        performed_by: user.id,
    });

    return NextResponse.json({ nonconformity: responsePayload });
}, { module: "sgc", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, member, user }, { params }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();
    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
        .from("sgc_nonconformities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (existingError || !existing) {
        return NextResponse.json({ error: "Nonconformity not found" }, { status: 404 });
    }

    const { data: updated, error } = await supabase
        .from("sgc_nonconformities")
        .update({
            status: "cancel",
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !updated) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_nonconformities",
        record_id: id,
        action: "UPDATE",
        old_data: existing,
        new_data: updated,
        performed_by: user.id,
    });

    return NextResponse.json({ ok: true, nonconformity: updated });
}, { module: "sgc", action: "edit" });
