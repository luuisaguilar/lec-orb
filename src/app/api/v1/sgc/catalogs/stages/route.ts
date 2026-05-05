import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { canMutateSgc, forbiddenSgcMutation, mapSgcDbError } from "@/app/api/v1/sgc/_shared";

const stageKindSchema = z.enum(["nc", "action"]);

const createNcStageSchema = z.object({
    name: z.string().min(1).max(120),
    state: z.enum(["draft", "analysis", "pending", "open", "done", "cancel"]),
    sequence: z.number().int().min(0).optional().default(100),
    is_starting: z.boolean().optional().default(false),
    is_terminal: z.boolean().optional().default(false),
});

const createActionStageSchema = z.object({
    name: z.string().min(1).max(120),
    state: z.enum(["draft", "open", "in_progress", "done", "cancel"]),
    sequence: z.number().int().min(0).optional().default(100),
    is_starting: z.boolean().optional().default(false),
    is_ending: z.boolean().optional().default(false),
});

function getKind(reqUrl: string) {
    const { searchParams } = new URL(reqUrl);
    const parsed = stageKindSchema.safeParse(searchParams.get("kind") ?? "nc");
    return parsed.success ? parsed.data : "nc";
}

export const GET = withAuth(async (req, { supabase, member }) => {
    const kind = getKind(req.url);
    const table = kind === "action" ? "sgc_action_stages" : "sgc_nc_stages";

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("org_id", member.org_id)
        .order("sequence", { ascending: true })
        .order("name", { ascending: true });

    if (error) return mapSgcDbError(error);
    return NextResponse.json({ kind, stages: data ?? [] });
}, { module: "sgc", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    if (!canMutateSgc(member.role)) return forbiddenSgcMutation();

    const kind = getKind(req.url);
    const body = await req.json();
    const parsed = kind === "action"
        ? createActionStageSchema.safeParse(body)
        : createNcStageSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 },
        );
    }

    const table = kind === "action" ? "sgc_action_stages" : "sgc_nc_stages";
    const { data, error } = await supabase
        .from(table)
        .insert({
            org_id: member.org_id,
            ...parsed.data,
        })
        .select("*")
        .single();

    if (error || !data) return mapSgcDbError(error);

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: table,
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ kind, stage: data }, { status: 201 });
}, { module: "sgc", action: "edit" });
