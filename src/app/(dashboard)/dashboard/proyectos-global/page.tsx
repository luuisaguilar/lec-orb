"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo } from "react";
import { Building2, CalendarDays, FolderKanban, Kanban, ListTodo, ListTree, User, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "./_components/pm-presentation";
import { PmCreateProjectDialog } from "./_components/pm-create-project-dialog";
import { pmFetcher } from "./_lib/pm-types";
import type { PmProject, PmTask } from "./_lib/pm-types";

export default function ProyectosGlobalOverviewPage() {
    const { data: projectsData, mutate: mutateProjects } = useSWR<{ projects: PmProject[] }>(
        "/api/v1/pm/projects",
        pmFetcher
    );
    const { data: tasksData } = useSWR<{ tasks: PmTask[] }>("/api/v1/pm/tasks", pmFetcher);

    const projects = projectsData?.projects ?? [];
    const tasks = tasksData?.tasks ?? [];

    const teamTasks = useMemo(() => tasks.filter((t) => t.scope === "team"), [tasks]);
    const roleTasks = useMemo(() => tasks.filter((t) => t.scope === "role"), [tasks]);
    const personalTasks = useMemo(() => tasks.filter((t) => t.scope === "personal"), [tasks]);
    const openTasks = useMemo(() => tasks.filter((t) => !t.completed_at), [tasks]);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Total proyectos"
                    value={projects.length}
                    description="Portafolio actual"
                    icon={<FolderKanban className="h-4 w-4 text-primary" />}
                />
                <MetricCard
                    title="Tareas abiertas"
                    value={openTasks.length}
                    description="Pendientes de cierre"
                    icon={<ListTodo className="h-4 w-4 text-primary" />}
                />
                <MetricCard
                    title="Tareas por puesto"
                    value={roleTasks.length}
                    description="Alcance role"
                    icon={<UserCheck className="h-4 w-4 text-primary" />}
                />
                <MetricCard
                    title="Tareas equipo"
                    value={teamTasks.length}
                    description="Alcance team"
                    icon={<Building2 className="h-4 w-4 text-primary" />}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Acciones y seguimiento</CardTitle>
                    <CardDescription>
                        Overview es solo un resumen. Crea proyectos aquí o en Portafolio; las tareas se crean y mueven en el
                        Tablero (Kanban). Lista y Calendario ayudan al seguimiento diario; la pestaña Por puesto agrupa por
                        alcance <span className="font-medium text-foreground">role</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        <PmCreateProjectDialog
                            onCreated={() => {
                                void mutateProjects();
                            }}
                        />
                        <Button asChild variant="secondary" className="gap-2">
                            <Link href="/dashboard/proyectos-global/tablero">
                                <Kanban className="h-4 w-4" />
                                Tablero — nueva tarea
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/dashboard/proyectos-global/tareas?tab=team">
                                <ListTodo className="h-4 w-4" />
                                Tareas equipo
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/dashboard/proyectos-global/tareas?tab=role">
                                <UserCheck className="h-4 w-4" />
                                Tareas por puesto
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/dashboard/proyectos-global/tareas?tab=personal">
                                <User className="h-4 w-4" />
                                Mi registro
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/dashboard/proyectos-global/lista">
                                <ListTree className="h-4 w-4" />
                                Lista plana
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/dashboard/proyectos-global/calendario">
                                <CalendarDays className="h-4 w-4" />
                                Calendario
                            </Link>
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Subproyectos: el modelo PM actual no anida proyectos; usa varios proyectos (clave/nombre) o divide con
                        tareas. Coordinación institucional de exámenes sigue en Institucional.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Registro personal (scope personal): {personalTasks.length} tarea(s).
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
