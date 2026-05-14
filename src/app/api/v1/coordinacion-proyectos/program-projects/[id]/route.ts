import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE, programProjectUpdateSchema } from "@/lib/coordinacion-proyectos/schemas";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, { supabase, member }, ctx: RouteCtx) => {
        const { id } = await ctx.params;
        const { data, error } = await supabase
            .from("lec_program_projects")
            .select("*")
            .eq("org_id", member.org_id)
            .eq("id", id)
            .single();
        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ project: data });
}, { module: CP_MODULE, action: "view" });

export const PATCH = withAuth(async (req, { supabase, user, member }, ctx: RouteCtx) => {
        const { id } = await ctx.params;
        const body = await req.json();
        const parsed = programProjectUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { data: existing, error: fe } = await supabase
            .from("lec_program_projects")
            .select("*")
            .eq("org_id", member.org_id)
            .eq("id", id)
            .single();
        if (fe || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const patch = { ...parsed.data, updated_by: user.id };
        for (const k of Object.keys(patch)) {
            if ((patch as any)[k] === "") (patch as any)[k] = null;
        }

        const { data, error } = await supabase
            .from("lec_program_projects")
            .update(patch)
            .eq("org_id", member.org_id)
            .eq("id", id)
            .select("id")
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logAudit(supabase, {
            org_id: member.org_id,
            table_name: "lec_program_projects",
            record_id: id,
            action: "UPDATE",
            old_data: existing as Record<string, unknown>,
            new_data: patch as Record<string, unknown>,
            performed_by: user.id,
        });

        return NextResponse.json({ id: data.id });
}, { module: CP_MODULE, action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, user, member }, ctx: RouteCtx) => {
        const { id } = await ctx.params;
        const { data: existing, error: fe } = await supabase
            .from("lec_program_projects")
            .select("*")
            .eq("org_id", member.org_id)
            .eq("id", id)
            .single();
        if (fe || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const { error } = await supabase.from("lec_program_projects").delete().eq("org_id", member.org_id).eq("id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logAudit(supabase, {
            org_id: member.org_id,
            table_name: "lec_program_projects",
            record_id: id,
            action: "DELETE",
            old_data: existing as Record<string, unknown>,
            performed_by: user.id,
        });

        return NextResponse.json({ ok: true });
}, { module: CP_MODULE, action: "delete" });
