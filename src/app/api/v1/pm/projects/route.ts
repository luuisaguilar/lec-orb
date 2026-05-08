import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createProjectSchema = z.object({
    key: z.string().trim().min(2).max(20).optional().nullable(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional().nullable(),
    owner_user_id: z.string().uuid().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim();

    let query = supabase
        .from("pm_projects")
        .select("*")
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,key.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ projects: data ?? [], total: data?.length ?? 0 });
}, { module: "project-management", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const payload = parsed.data;
    const projectKey = payload.key?.toUpperCase().replace(/\s+/g, "-") ?? null;

    const { data: project, error } = await supabase
        .from("pm_projects")
        .insert({
            org_id: member.org_id,
            key: projectKey,
            name: payload.name,
            description: payload.description ?? null,
            owner_user_id: payload.owner_user_id ?? null,
            created_by: user.id,
            updated_by: user.id,
        })
        .select("*")
        .single();

    if (error || !project) throw error;

    const { data: board, error: boardError } = await supabase
        .from("pm_boards")
        .insert({
            org_id: member.org_id,
            project_id: project.id,
            name: `${project.name} Board`,
            default_view: "kanban",
            created_by: user.id,
            updated_by: user.id,
        })
        .select("*")
        .single();

    if (boardError || !board) throw boardError;

    const defaultColumns = [
        { name: "To Do", slug: "todo", sort_order: 10, is_done: false },
        { name: "Doing", slug: "doing", sort_order: 20, is_done: false },
        { name: "Done", slug: "done", sort_order: 30, is_done: true },
    ];

    const { error: colError } = await supabase
        .from("pm_columns")
        .insert(defaultColumns.map((c) => ({
            org_id: member.org_id,
            board_id: board.id,
            name: c.name,
            slug: c.slug,
            sort_order: c.sort_order,
            is_done: c.is_done,
        })));

    if (colError) throw colError;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "pm_projects",
        record_id: project.id,
        action: "INSERT",
        new_data: project,
        performed_by: user.id,
    });

    return NextResponse.json({ project, board }, { status: 201 });
}, { module: "project-management", action: "edit" });

