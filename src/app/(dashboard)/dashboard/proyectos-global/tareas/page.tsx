"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PmRoleTaskQuickDialog } from "../_components/pm-role-task-quick-dialog";
import { TaskList } from "../_components/pm-presentation";
import { pmFetcher, type PmProject, type PmTask } from "../_lib/pm-types";

type TaskTab = "team" | "role" | "personal";

function tabFromSearch(raw: string | null): TaskTab {
    if (raw === "role" || raw === "personal") return raw;
    return "team";
}

export default function ProyectosGlobalTareasPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTab = tabFromSearch(searchParams.get("tab"));

    const onTabChange = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", value);
        router.replace(`${pathname}?${next.toString()}`);
    };
    const { data: projectsData } = useSWR<{ projects: PmProject[] }>("/api/v1/pm/projects", pmFetcher);
    const { data: tasksData, mutate: mutateTasks } = useSWR<{ tasks: PmTask[] }>("/api/v1/pm/tasks", pmFetcher);

    const projects = projectsData?.projects ?? [];
    const tasks = tasksData?.tasks ?? [];

    const projectsById = useMemo(
        () => Object.fromEntries(projects.map((p) => [p.id, p])),
        [projects]
    );

    const teamTasks = tasks.filter((t) => t.scope === "team");
    const roleTasks = tasks.filter((t) => t.scope === "role");
    const personalTasks = tasks.filter((t) => t.scope === "personal");

    return (
        <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle>Tareas por alcance</CardTitle>
                    <CardDescription>
                        Puedes asignar tareas por puesto sin proyecto previo o usar el tablero Kanban para flujos completos.
                    </CardDescription>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PmRoleTaskQuickDialog onCreated={() => void mutateTasks()} />
                    <Button asChild className="gap-2">
                        <Link href="/dashboard/proyectos-global/tablero">
                            <Plus className="h-4 w-4" />
                            Nueva tarea (tablero)
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <TabsList>
                        <TabsTrigger value="team">Equipo</TabsTrigger>
                        <TabsTrigger value="role">Por puesto</TabsTrigger>
                        <TabsTrigger value="personal">Mi registro</TabsTrigger>
                    </TabsList>

                    <TabsContent value="team" className="mt-4">
                        <TaskList title="Tareas de equipo" tasks={teamTasks} projectsById={projectsById} />
                    </TabsContent>
                    <TabsContent value="role" className="mt-4">
                        <TaskList title="Tareas por rol" tasks={roleTasks} projectsById={projectsById} />
                    </TabsContent>
                    <TabsContent value="personal" className="mt-4">
                        <TaskList title="Pendientes personales" tasks={personalTasks} projectsById={projectsById} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
