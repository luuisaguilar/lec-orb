"use client";

import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PmKanbanBoard, type PmKanbanColumn, type PmKanbanTask } from "@/components/pm/pm-kanban-board";
import { PmTaskDialog, type PmTaskFormTask } from "@/components/pm/pm-task-dialog";
import { pmFetcher, type PmProject, type PmTask } from "../_lib/pm-types";

type ProjectWithBoards = PmProject & {
    boards?: Array<{
        id: string;
        name: string;
        columns: PmKanbanColumn[];
    }>;
};

export default function ProyectosGlobalTableroPage() {
    const { data: projectsData, mutate: mutateProjects } = useSWR<{ projects: PmProject[] }>(
        "/api/v1/pm/projects",
        pmFetcher
    );
    const { data: tasksData, mutate: mutateTasks } = useSWR<{ tasks: PmTask[] }>("/api/v1/pm/tasks", pmFetcher);

    const projects = projectsData?.projects ?? [];
    const tasks = tasksData?.tasks ?? [];

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<PmTaskFormTask | null>(null);
    const [createInColumnId, setCreateInColumnId] = useState<string | null>(null);

    const effectiveProjectId = selectedProjectId ?? projects[0]?.id ?? null;

    const { data: detailRes, mutate: mutateProjectDetail } = useSWR(
        effectiveProjectId ? `/api/v1/pm/projects/${effectiveProjectId}` : null,
        pmFetcher
    );

    const projectDetail = detailRes?.project as ProjectWithBoards | undefined;
    const boards = projectDetail?.boards ?? [];
    const firstBoard = boards[0];
    const columns = useMemo(() => {
        const cols = firstBoard?.columns ?? [];
        return [...cols].sort((a, b) => a.sort_order - b.sort_order);
    }, [firstBoard?.columns]);

    const boardTasks: PmKanbanTask[] = useMemo(() => {
        if (!effectiveProjectId || !firstBoard) return [];
        return tasks
            .filter((t) => t.project_id === effectiveProjectId && t.board_id === firstBoard.id)
            .map((t) => ({
                id: t.id,
                column_id: t.column_id,
                board_id: t.board_id,
                title: t.title,
                priority: t.priority,
                due_date: t.due_date,
                scope: t.scope,
                ref: t.ref,
            }));
    }, [tasks, effectiveProjectId, firstBoard]);

    const toFormTask = useCallback(
        (t: PmTask): PmTaskFormTask => ({
            id: t.id,
            project_id: t.project_id,
            board_id: t.board_id,
            column_id: t.column_id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            due_date: t.due_date,
            assignee_user_id: t.assignee_user_id,
            scope: t.scope,
            role_target: t.role_target,
            is_private: t.is_private,
        }),
        []
    );

    const openCreate = (columnId?: string | null) => {
        setEditingTask(null);
        setCreateInColumnId(columnId ?? columns[0]?.id ?? null);
        setDialogOpen(true);
    };

    const openEdit = (kt: PmKanbanTask) => {
        const full = tasks.find((x) => x.id === kt.id);
        if (!full) return;
        setEditingTask(toFormTask(full));
        setCreateInColumnId(null);
        setDialogOpen(true);
    };

    const onMoveTask = async (taskId: string, columnId: string) => {
        const res = await fetch(`/api/v1/pm/tasks/${taskId}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column_id: columnId }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "Error al mover");
        await Promise.all([mutateTasks(), mutateProjectDetail(), mutateProjects()]);
    };

    const onSaved = () => {
        void mutateTasks();
        void mutateProjectDetail();
        void mutateProjects();
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <CardTitle>Tablero Kanban</CardTitle>
                        <CardDescription>
                            Arrastra tarjetas entre columnas. Clic en una tarea para editar. Usa el tablero por defecto del
                            proyecto.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={effectiveProjectId ?? ""}
                            onValueChange={(v) => setSelectedProjectId(v)}
                            disabled={projects.length === 0}
                        >
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Proyecto" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.key ? `${p.key} · ` : ""}
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            className="gap-2"
                            onClick={() => openCreate()}
                            disabled={!effectiveProjectId || columns.length === 0}
                        >
                            <Plus className="h-4 w-4" />
                            Nueva tarea
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {!effectiveProjectId ? (
                        <p className="text-sm text-muted-foreground">Crea un proyecto primero en Portafolio o Institucional.</p>
                    ) : columns.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Este proyecto no tiene columnas en el tablero.</p>
                    ) : (
                        <PmKanbanBoard
                            columns={columns}
                            tasks={boardTasks}
                            onMoveTask={onMoveTask}
                            onEditTask={openEdit}
                        />
                    )}
                </CardContent>
            </Card>

            <PmTaskDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                projectId={effectiveProjectId}
                task={editingTask}
                defaultColumnId={createInColumnId}
                onSaved={onSaved}
            />
        </div>
    );
}
