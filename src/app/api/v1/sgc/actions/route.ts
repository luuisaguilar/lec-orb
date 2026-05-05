import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { buildSgcRef, canMutateSgc, forbiddenSgcMutation, mapSgcDbError, parsePagination } from "@/app/api/v1/sgc/_shared";

const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createActionSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional().nullable(),
    type_action: z.enum(["immediate", "correction", "prevention", "improvement"]),
    priority: z.enum(["low", "normal"]).optional().default("low"),
    stage_id: idSchema.optional().nullable(),
    status: z.enum(["draft", "open", "in_progress", "done", "cancel"]).optional(),
    deadline_at: dateSchema.optional().nullable(),
    responsible_user_id: idSchema.optional().nullable(),
    manager_user_id: idSchema.optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams, limit, page, offset } = parsePagination(req.url);
    const status = searchParams.get("status");
    const stageId = searchParams.get("stage_id");
    const typeAction = searchParams.get("type_action");
    const responsibleUserId = searchParams.get("responsible_user_id");
    const q = searchParams.get("q")?.trim();

    let query = supabase
        .from("sgc_actions")
        .select("*", { count: "exact" })
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (stageId) query = query.eq("stage_id", stageId);
    if (typeAction) query = query.eq("type_action", typeAction);
    if (responsibleUserId) query = query.eq("responsible_user_id", responsibleUserId);
    if (q) {
        query = query.or(`ref.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) return mapSgcDbError(error);

    return NextResponse.json({
        actions: data ?? [],
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
    const parsed = createActionSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    const payload = parsed.data;

    if (payload.stage_id) {
        const { data: stageData, error: stageError } = await supabase
            .from("sgc_action_stages")
            .select("id")
            .eq("id", payload.stage_id)
            .eq("org_id", member.org_id)
            .single();

        if (stageError || !stageData) {
            return NextResponse.json({ error: "Invalid stage_id for this organization." }, { status: 400 });
        }
    }

    let created: any = null;
    let error: any = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await supabase
            .from("sgc_actions")
            .insert({
                org_id: member.org_id,
                ref: buildSgcRef("ACT"),
                title: payload.title,
                description: payload.description ?? null,
                type_action: payload.type_action,
                priority: payload.priority ?? "low",
                stage_id: payload.stage_id ?? null,
                status: payload.status ?? "draft",
                deadline_at: payload.deadline_at ?? null,
                responsible_user_id: payload.responsible_user_id ?? null,
                manager_user_id: payload.manager_user_id ?? null,
                created_by: user.id,
                updated_by: user.id,
            })
            .select("*")
            .single();

        created = result.data;
        error = result.error;

        const isDuplicateRef =
            Boolean(error) &&
            error.code === "23505" &&
            String(error.message ?? "").includes("sgc_actions_org_id_ref_key");

        if (!isDuplicateRef) break;
    }

    if (error || !created) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "sgc_actions",
        record_id: created.id,
        action: "INSERT",
        new_data: created,
        performed_by: user.id,
    });

    return NextResponse.json({ action: created }, { status: 201 });
}, { module: "sgc", action: "edit" });
