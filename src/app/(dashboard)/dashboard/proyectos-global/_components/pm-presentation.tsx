import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PmProject, PmTask } from "../_lib/pm-types";

export function MetricCard({
    title,
    value,
    description,
    icon,
}: {
    title: string;
    value: number;
    description: string;
    icon: ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

export function ProjectList({ projects, emptyText }: { projects: PmProject[]; emptyText: string }) {
    if (projects.length === 0) {
        return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{emptyText}</div>;
    }

    return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
                <div key={project.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-mono text-muted-foreground">{project.key ?? "-"}</p>
                        <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
                    </div>
                    <p className="mt-2 text-base font-semibold">{project.name}</p>
                    {project.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

export function TaskList({
    title,
    tasks,
    projectsById,
}: {
    title: string;
    tasks: PmTask[];
    projectsById: Record<string, PmProject>;
}) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            {tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Sin tareas en esta vista.
                </div>
            ) : (
                <div className="space-y-2">
                    {tasks.slice(0, 50).map((task) => (
                        <div key={task.id} className="rounded-lg border bg-card px-3 py-2">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                                Proyecto: {projectsById[task.project_id]?.name ?? "Sin nombre"}
                                {task.role_target ? ` · rol ${task.role_target}` : ""}
                                {task.is_private ? " · privada" : ""}
                                {task.due_date ? ` · vence ${task.due_date}` : ""}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ScopeColumns({
    teamTasks,
    roleTasks,
    personalTasks,
    projectsById,
}: {
    teamTasks: PmTask[];
    roleTasks: PmTask[];
    personalTasks: PmTask[];
    projectsById: Record<string, PmProject>;
}) {
    return (
        <div className="grid gap-3 md:grid-cols-3">
            <TaskList title="Equipo (team)" tasks={teamTasks} projectsById={projectsById} />
            <TaskList title="Por puesto (role)" tasks={roleTasks} projectsById={projectsById} />
            <TaskList title="Mi registro (personal)" tasks={personalTasks} projectsById={projectsById} />
        </div>
    );
}

export function TaskTableRows({ tasks, projectsById }: { tasks: PmTask[]; projectsById: Record<string, PmProject> }) {
    if (tasks.length === 0) {
        return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Sin tareas.</div>;
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40">
                    <tr>
                        <th className="px-3 py-2 font-medium">Tarea</th>
                        <th className="px-3 py-2 font-medium">Proyecto</th>
                        <th className="px-3 py-2 font-medium">Alcance</th>
                        <th className="px-3 py-2 font-medium">Prioridad</th>
                        <th className="px-3 py-2 font-medium">Vence</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.slice(0, 100).map((task) => (
                        <tr key={task.id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-medium">{task.title}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                                {projectsById[task.project_id]?.name ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                                <Badge variant="outline">{task.scope}</Badge>
                            </td>
                            <td className="px-3 py-2">{task.priority}</td>
                            <td className="px-3 py-2 text-muted-foreground">{task.due_date ?? "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
