"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskTableRows } from "../_components/pm-presentation";
import { pmFetcher, type PmProject, type PmTask } from "../_lib/pm-types";

export default function ProyectosGlobalTablaPage() {
    const { data: projectsData } = useSWR<{ projects: PmProject[] }>("/api/v1/pm/projects", pmFetcher);
    const { data: tasksData } = useSWR<{ tasks: PmTask[] }>("/api/v1/pm/tasks", pmFetcher);

    const projects = projectsData?.projects ?? [];
    const tasks = tasksData?.tasks ?? [];

    const projectsById = useMemo(
        () => Object.fromEntries(projects.map((p) => [p.id, p])) as Record<string, PmProject>,
        [projects]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tabla</CardTitle>
                <CardDescription>Formato tabular compacto para análisis y export futuro.</CardDescription>
            </CardHeader>
            <CardContent>
                <TaskTableRows tasks={tasks} projectsById={projectsById} />
            </CardContent>
        </Card>
    );
}
