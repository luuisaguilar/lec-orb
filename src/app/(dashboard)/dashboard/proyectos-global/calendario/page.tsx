"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmFetcher, type PmProject, type PmTask } from "../_lib/pm-types";

export default function ProyectosGlobalCalendarioPage() {
    const { data: projectsData } = useSWR<{ projects: PmProject[] }>("/api/v1/pm/projects", pmFetcher);
    const { data: tasksData } = useSWR<{ tasks: PmTask[] }>("/api/v1/pm/tasks", pmFetcher);

    const projects = projectsData?.projects ?? [];
    const tasks = tasksData?.tasks ?? [];

    const projectsById = useMemo(
        () => Object.fromEntries(projects.map((p) => [p.id, p])),
        [projects]
    );

    const withDue = useMemo(
        () =>
            tasks
                .filter((t) => t.due_date)
                .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))),
        [tasks]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Calendario</CardTitle>
                <CardDescription>Tareas ordenadas por fecha límite.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {withDue.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        Sin tareas con fecha límite.
                    </div>
                ) : (
                    withDue.map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{task.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {projectsById[task.project_id]?.name ?? "Proyecto"}
                                </p>
                            </div>
                            <Badge variant="outline">{task.due_date}</Badge>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
