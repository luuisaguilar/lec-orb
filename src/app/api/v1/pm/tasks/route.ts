import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createTaskSchema = z.object({
    project_id: z.string().uuid().optional().nullable(),
    board_id: z.string().uuid().optional().nullable(),
    column_id: z.string().uuid().optional().nullable(),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(10000).optional().nullable(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    assignee_user_id: z.string().uuid().optional().nullable(),
    reporter_user_id: z.string().uuid().optional().nullable(),
    sort_order: z.number().int().optional(),
    scope: z.enum(["team", "role", "personal"]).optional().default("team"),
    role_target: z.enum(["admin", "supervisor", "operador", "applicator"]).optional().nullable(),
    is_private: z.boolean().optional().default(false),
});

const ROLE_INBOX_KEY = "ROLE-INBOX";
const ROLE_INBOX_NAME = "Bandeja por puesto";
const ROLE_INBOX_BOARD_NAME = "Bandeja por puesto Board";

async function ensureRoleInboxContext(
    supabase: any,
    orgId: string,
    userId: string
): Promise<{ project_id: string; board_id: string; column_id: string }> {
    const { data: existingProject, error: projectLookupError } = await supabase
        .from("pm_projects")
        .select("id")
        .eq("org_id", orgId)
        .eq("key", ROLE_INBOX_KEY)
        .maybeSingle();

    if (projectLookupError) throw projectLookupError;

    let projectId = existingProject?.id as string | undefined;

    if (!projectId) {
        const { data: createdProject, error: createProjectError } = await supabase
            .from("pm_projects")
            .insert({
                org_id: orgId,
                key: ROLE_INBOX_KEY,
                name: ROLE_INBOX_NAME,
                description: "Proyecto técnico para tareas asignadas por rol sin portafolio previo.",
                status: "active",
                created_by: userId,
                updated_by: userId,
            })
            .select("id")
            .single();
        if (createProjectError || !createdProject) throw createProjectError;
        projectId = createdProject.id;
    }
    if (!projectId) throw new Error("Unable to resolve role inbox project.");

    const { data: existingBoard, error: boardLookupError } = await supabase
        .from("pm_boards")
        .select("id")
        .eq("org_id", orgId)
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (boardLookupError) throw boardLookupError;

    let boardId = existingBoard?.id as string | undefined;
    if (!boardId) {
        const { data: createdBoard, error: createBoardError } = await supabase
            .from("pm_boards")
            .insert({
                org_id: orgId,
                project_id: projectId,
                name: ROLE_INBOX_BOARD_NAME,
                default_view: "kanban",
                created_by: userId,
                updated_by: userId,
            })
            .select("id")
            .single();
        if (createBoardError || !createdBoard) throw createBoardError;
        boardId = createdBoard.id;
    }
    if (!boardId) throw new Error("Unable to resolve role inbox board.");

    const { data: columns, error: columnsError } = await supabase
        .from("pm_columns")
        .select("id, slug, sort_order")
        .eq("org_id", orgId)
        .eq("board_id", boardId)
        .order("sort_order", { ascending: true });
    if (columnsError) throw columnsError;

    if (!columns || columns.length === 0) {
        const defaults = [
            { name: "To Do", slug: "todo", sort_order: 10, is_done: false },
            { name: "Doing", slug: "doing", sort_order: 20, is_done: false },
            { name: "Done", slug: "done", sort_order: 30, is_done: true },
        ];
        const { error: createColumnsError } = await supabase
            .from("pm_columns")
            .insert(defaults.map((c) => ({
                org_id: orgId,
                board_id: boardId,
                name: c.name,
                slug: c.slug,
                sort_order: c.sort_order,
                is_done: c.is_done,
            })));
        if (createColumnsError) throw createColumnsError;

        const { data: freshColumns, error: freshColumnsError } = await supabase
            .from("pm_columns")
            .select("id, slug, sort_order")
            .eq("org_id", orgId)
            .eq("board_id", boardId)
            .order("sort_order", { ascending: true });
        if (freshColumnsError || !freshColumns || freshColumns.length === 0) throw freshColumnsError;
        return { project_id: projectId, board_id: boardId, column_id: freshColumns[0].id };
    }

    return { project_id: projectId, board_id: boardId, column_id: columns[0].id };
}

export const GET = withAuth(async (req, { supabase, member, user }) => {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");
    const boardId = url.searchParams.get("board_id");
    const columnId = url.searchParams.get("column_id");
    const assigneeUserId = url.searchParams.get("assignee_user_id");
    const q = url.searchParams.get("q")?.trim();
    const due = url.searchParams.get("due");
    const scope = url.searchParams.get("scope");
    const roleTarget = url.searchParams.get("role_target");
    const mine = url.searchParams.get("mine");

    let query = supabase
        .from("pm_tasks")
        .select("*")
        .eq("org_id", member.org_id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);
    if (boardId) query = query.eq("board_id", boardId);
    if (columnId) query = query.eq("column_id", columnId);
    if (assigneeUserId) query = query.eq("assignee_user_id", assigneeUserId);
    if (scope) query = query.eq("scope", scope);
    if (roleTarget) query = query.eq("role_target", roleTarget);
    if (mine === "true") query = query.eq("assignee_user_id", user.id);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,ref.ilike.%${q}%`);

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    if (due === "overdue") query = query.lt("due_date", todayIso);
    if (due === "today") query = query.eq("due_date", todayIso);

    if (due === "week") {
        const end = new Date(today);
        end.setDate(end.getDate() + 7);
        const endIso = end.toISOString().slice(0, 10);
        query = query.gte("due_date", todayIso).lte("due_date", endIso);
    }

    const { data, error } = await query;
    if (error) throw error;

    const visible = (data ?? []).filter((task: any) => {
        const isOwner = task.assignee_user_id === user.id || task.reporter_user_id === user.id;
        if (task.is_private && !isOwner) return false;

        if (task.scope === "role") {
            if (task.role_target !== member.role) return false;
        }

        if (scope && task.scope !== scope) return false;
        if (roleTarget && task.role_target !== roleTarget) return false;
        if (mine === "true" && task.assignee_user_id !== user.id) return false;

        return true;
    });

    return NextResponse.json({ tasks: visible, total: visible.length });
}, { module: "project-management", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const payload = parsed.data;

    if (payload.scope === "role" && !payload.role_target) {
        return NextResponse.json({ error: "role_target is required when scope=role." }, { status: 400 });
    }
    if (payload.scope !== "role") {
        payload.role_target = null;
    }
    if (payload.scope === "personal") {
        payload.is_private = payload.is_private ?? true;
    }

    if (payload.scope !== "role" && (!payload.project_id || !payload.board_id || !payload.column_id)) {
        return NextResponse.json(
            { error: "project_id, board_id and column_id are required unless scope=role." },
            { status: 400 }
        );
    }

    if (payload.scope === "role" && (!payload.project_id || !payload.board_id || !payload.column_id)) {
        const roleContext = await ensureRoleInboxContext(supabase, member.org_id, user.id);
        payload.project_id = roleContext.project_id;
        payload.board_id = roleContext.board_id;
        payload.column_id = roleContext.column_id;
    }

    const { data: board, error: boardError } = await supabase
        .from("pm_boards")
        .select("id, project_id")
        .eq("id", payload.board_id!)
        .eq("org_id", member.org_id)
        .single();
    if (boardError || !board) {
        return NextResponse.json({ error: "Invalid board_id for this organization." }, { status: 400 });
    }

    if (board.project_id !== payload.project_id) {
        return NextResponse.json({ error: "board_id does not belong to project_id." }, { status: 400 });
    }

    const { data: column, error: columnError } = await supabase
        .from("pm_columns")
        .select("id, board_id, is_done")
        .eq("id", payload.column_id!)
        .eq("org_id", member.org_id)
        .single();
    if (columnError || !column) {
        return NextResponse.json({ error: "Invalid column_id for this organization." }, { status: 400 });
    }

    if (column.board_id !== payload.board_id) {
        return NextResponse.json({ error: "column_id does not belong to board_id." }, { status: 400 });
    }

    let sortOrder = payload.sort_order;
    if (typeof sortOrder !== "number") {
        const { data: maxRow } = await supabase
            .from("pm_tasks")
            .select("sort_order")
            .eq("org_id", member.org_id)
            .eq("column_id", payload.column_id)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();
        sortOrder = (maxRow?.sort_order ?? 0) + 1000;
    }

    const { data: project } = await supabase
        .from("pm_projects")
        .select("key")
        .eq("id", payload.project_id)
        .eq("org_id", member.org_id)
        .single();
    const ref = project?.key ? `${project.key}-${Math.floor(Date.now() / 1000)}` : null;

    const { data: task, error } = await supabase
        .from("pm_tasks")
        .insert({
            org_id: member.org_id,
            project_id: payload.project_id,
            board_id: payload.board_id,
            column_id: payload.column_id,
            ref,
            title: payload.title,
            description: payload.description ?? null,
            priority: payload.priority ?? "normal",
            due_date: payload.due_date ?? null,
            assignee_user_id: payload.assignee_user_id ?? null,
            reporter_user_id: payload.reporter_user_id ?? user.id,
            sort_order: sortOrder,
            scope: payload.scope ?? "team",
            role_target: payload.role_target ?? null,
            is_private: payload.is_private ?? false,
            completed_at: column.is_done ? new Date().toISOString() : null,
            created_by: user.id,
            updated_by: user.id,
        })
        .select("*")
        .single();

    if (error || !task) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "pm_tasks",
        record_id: task.id,
        action: "INSERT",
        new_data: task,
        performed_by: user.id,
    });

    return NextResponse.json({ task }, { status: 201 });
}, { module: "project-management", action: "edit" });

