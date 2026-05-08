"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmFetcher, type PmProject, type PmTask } from "../_lib/pm-types";

export default function ProyectosGlobalListaPage() {
    const { data: projectsData } = useSWR<{ projects: PmProject[] }>("/api/v1/pm/projects", pmFetcher);
    const { data: tasksData } = useSWR<{ tasks: PmTask[] }>("/api/v1/pm/tasks", pmFetcher);

    const projects = projectsData?.projects ?? [];
    const tasks = tasksData?.tasks ?? [];

    const projectsById = useMemo(
        () => Object.fromEntries(projects.map((p) => [p.id, p])),
        [projects]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lista</CardTitle>
                <CardDescription>Vista plana de todas las tareas visibles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Sin tareas.</div>
                ) : (
                    tasks.map((task) => (
                        <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {projectsById[task.project_id]?.name ?? "Proyecto"}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="outline">{task.scope}</Badge>
                                <Badge variant="secondary">{task.priority}</Badge>
                                {task.due_date ? <span className="text-xs text-muted-foreground">{task.due_date}</span> : null}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
