import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { buildSgcRef, canMutateSgc, forbiddenSgcMutation, mapSgcDbError, parsePagination } from "@/app/api/v1/sgc/_shared";

const idSchema = z.string().uuid();

const nonconformityCreateSchema = z.object({
    title: z.string().min(1).max(200).optional().nullable(),
    related_reference: z.string().max(120).optional().nullable(),
    partner_name: z.string().max(200).optional().nullable(),
    description: z.string().min(1),
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
    origin_ids: z.array(idSchema).optional().default([]),
    cause_ids: z.array(idSchema).optional().default([]),
    action_links: z.array(z.object({
        action_id: idSchema,
        relation_type: z.enum(["immediate", "planned"]).default("planned"),
    })).optional().default([]),
});

async function validateCatalogIdsBelongToOrg(
    supabase: any,
    orgId: string,
    table: string,
    column: string,
    ids: string[],
) {
    if (ids.length === 0) return { ok: true as const };

    const { data, error } = await supabase
        .from(table)
        .select("id")
        .eq("org_id", orgId)
        .in("id", ids);

    if (error) {
        return { ok: false as const, response: mapSgcDbError(error) };
    }

    if ((data ?? []).length !== new Set(ids).size) {
        return {
            ok: false as const,
            response: NextResponse.json(
                { error: `${column} contains IDs outside the current organization.` },
                { status: 400 },
            ),
        };
    }

    return { ok: true as const };
}

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams, limit, page, offset } = parsePagination(req.url);
    const status = searchParams.get("status");
    const stageId = searchParams.get("stage_id");
    const severityId = searchParams.get("severity_id");
    const q = searchParams.get("q")?.trim();

    let query = supabase
        .from("sgc_nonconformities")
        .select("*", { count: "exact" })
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (stageId) query = query.eq("stage_id", stageId);
    if (severityId) query = query.eq("severity_id", severityId);
    if (q) {
        query = query.or(
            `ref.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%,partner_name.ilike.%${q}%`,
        );
    }

    const { data, error, count } = await query;
    if (error) return mapSgcDbError(error);

    return NextResponse.json({
        nonconformities: data ?? [],
        pagination: {
            total: count ?? 0,
            page,
            limit,
            pages: Math.ceil((count ?? 0) / limit),
        },
    });
}, { module: "sgc", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();

    const body = await req.json();
    const parsed = nonconformityCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    const payload = parsed.data;
    const originIds = [...new Set(payload.origin_ids)];
    const causeIds = [...new Set(payload.cause_ids)];
    const actionIds = [...new Set(payload.action_links.map((it) => it.action_id))];

    const originCheck = await validateCatalogIdsBelongToOrg(
        supabase,
        member.org_id,
        "sgc_nc_origins",
        "origin_ids",
        originIds,
    );
    if (!originCheck.ok) return originCheck.response;

    const causeCheck = await validateCatalogIdsBelongToOrg(
        supabase,
        member.org_id,
        "sgc_nc_causes",
        "cause_ids",
        causeIds,
    );
    if (!causeCheck.ok) return causeCheck.response;

    const actionCheck = await validateCatalogIdsBelongToOrg(
        supabase,
        member.org_id,
        "sgc_actions",
        "action_links",
        actionIds,
    );
    if (!actionCheck.ok) return actionCheck.response;

    let created: any = null;
    let createError: any = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await supabase
            .from("sgc_nonconformities")
            .insert({
                org_id: member.org_id,
                ref: buildSgcRef("NC"),
                title: payload.title ?? null,
                related_reference: payload.related_reference ?? null,
                partner_name: payload.partner_name ?? null,
                description: payload.description,
                stage_id: payload.stage_id ?? null,
                status: payload.status ?? "draft",
                kanban_state: payload.kanban_state ?? "normal",
                responsible_user_id: payload.responsible_user_id ?? null,
                manager_user_id: payload.manager_user_id ?? null,
                reported_by: payload.reported_by ?? user.id,
                severity_id: payload.severity_id ?? null,
                analysis: payload.analysis ?? null,
                action_plan_comments: payload.action_plan_comments ?? null,
                evaluation_comments: payload.evaluation_comments ?? null,
                created_by: user.id,
                updated_by: user.id,
            })
            .select("*")
            .single();

        created = result.data;
        createError = result.error;

        const isDuplicateRef =
            Boolean(createError) &&
            createError.code === "23505" &&
            String(createError.message ?? "").includes("sgc_nonconformities_org_id_ref_key");

        if (!isDuplicateRef) break;
    }

    if (createError || !created) return mapSgcDbError(createError);

    if (originIds.length > 0) {
        const originRows = originIds.map((originId) => ({
            org_id: member.org_id,
            nonconformity_id: created.id,
            origin_id: originId,
        }));
        const { error } = await supabase.from("sgc_nonconformity_origins").insert(originRows);
        if (error) return mapSgcDbError(error);
    }

    if (causeIds.length > 0) {
        const causeRows = causeIds.map((causeId) => ({
            org_id: member.org_id,
            nonconformity_id: created.id,
            cause_id: causeId,
        }));
        const { error } = await supabase.from("sgc_nonconformity_causes").insert(causeRows);
        if (error) return mapSgcDbError(error);
    }

    if (payload.action_links.length > 0) {
        const actionRows = payload.action_links.map((item) => ({
            org_id: member.org_id,
            nonconformity_id: created.id,
            action_id: item.action_id,
            relation_type: item.relation_type ?? "planned",
        }));
        const { error } = await supabase.from("sgc_nonconformity_actions").insert(actionRows);
        if (error) return mapSgcDbError(error);
    }

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_nonconformities",
        record_id: created.id,
        action: "INSERT",
        new_data: {
            ...created,
            origin_ids: originIds,
            cause_ids: causeIds,
            action_links: payload.action_links,
        },
        performed_by: user.id,
    });

    return NextResponse.json({ nonconformity: created }, { status: 201 });
}, { module: "sgc", action: "edit" });
