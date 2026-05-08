"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Project = {
    id: string;
    key: string | null;
    name: string;
    description: string | null;
    status: "active" | "archived";
    created_at: string;
};

type Task = {
    id: string;
    project_id: string;
    column_id: string;
    title: string;
    description?: string | null;
    scope: "team" | "role" | "personal";
    role_target: "admin" | "supervisor" | "operador" | "applicator" | null;
    is_private: boolean;
    due_date: string | null;
    priority: "low" | "normal" | "high" | "urgent";
    completed_at?: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProyectosPage() {
    const [q, setQ] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [key, setKey] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);

    const qs = useMemo(() => {
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        return p.toString();
    }, [q]);

    const { data, isLoading, mutate } = useSWR<{ projects: Project[] }>(
        `/api/v1/pm/projects${qs ? `?${qs}` : ""}`,
        fetcher
    );
    const { data: teamTasks } = useSWR<{ tasks: Task[] }>("/api/v1/pm/tasks?scope=team", fetcher);
    const { data: roleTasks } = useSWR<{ tasks: Task[] }>("/api/v1/pm/tasks?scope=role", fetcher);
    const { data: myTasks } = useSWR<{ tasks: Task[] }>("/api/v1/pm/tasks?scope=personal&mine=true", fetcher);
    const { data: allTasks } = useSWR<{ tasks: Task[] }>("/api/v1/pm/tasks", fetcher);

    const projects = data?.projects ?? [];
    const previewTeamTasks = (teamTasks?.tasks ?? []).slice(0, 8);
    const previewRoleTasks = (roleTasks?.tasks ?? []).slice(0, 8);
    const previewMyTasks = (myTasks?.tasks ?? []).slice(0, 8);
    const tasks = allTasks?.tasks ?? [];
    const projectNameById = useMemo(
        () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
        [projects]
    );
    const scopeBoard = useMemo(
        () => ({
            team: tasks.filter((task) => task.scope === "team"),
            role: tasks.filter((task) => task.scope === "role"),
            personal: tasks.filter((task) => task.scope === "personal"),
        }),
        [tasks]
    );
    const tasksWithDueDate = tasks
        .filter((task) => task.due_date)
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

    const createProject = async () => {
        if (!name.trim()) {
            toast.error("Nombre requerido.");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch("/api/v1/pm/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: key.trim() || null,
                    name: name.trim(),
                    description: description.trim() || null,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || "No se pudo crear el proyecto.");
            toast.success("Proyecto creado.");
            setCreateOpen(false);
            setKey("");
            setName("");
            setDescription("");
            await mutate();
        } catch (e: any) {
            toast.error(e?.message || "Error al crear.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
                <p className="text-muted-foreground max-w-2xl">
                    Gestión transversal de proyectos y tareas (MVP). Cada proyecto crea automáticamente un tablero y columnas
                    por defecto.
                </p>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <CardTitle>Listado</CardTitle>
                        <CardDescription>{isLoading ? "Cargando…" : `${projects.length} proyecto(s)`}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-64">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => mutate()} title="Refrescar">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Nuevo proyecto
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md" showCloseButton>
                                <DialogHeader>
                                    <DialogTitle>Nuevo proyecto</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>Key (opcional)</Label>
                                        <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="OPS" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Nombre</Label>
                                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Operación UNOi" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Descripción (opcional)</Label>
                                        <Input
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Notas del proyecto…"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                                            Cancelar
                                        </Button>
                                        <Button onClick={createProject} disabled={creating}>
                                            {creating ? "Creando…" : "Crear"}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {projects.length === 0 && !isLoading ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                            Sin proyectos. Crea el primero con <strong>Nuevo proyecto</strong>.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {projects.map((p) => (
                                <div key={p.id} className="rounded-xl border bg-card p-4">
                                    <p className="text-xs font-mono text-muted-foreground">{p.key ?? "—"}</p>
                                    <p className="mt-1 text-lg font-semibold">{p.name}</p>
                                    {p.description ? (
                                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                                    ) : null}
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Estado: <span className="font-medium text-foreground">{p.status}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Seguimiento de tareas</CardTitle>
                    <CardDescription>
                        Vista rápida por alcance: colaborativas, por puesto y registro personal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="team" className="w-full">
                        <TabsList>
                            <TabsTrigger value="team">Equipo</TabsTrigger>
                            <TabsTrigger value="role">Por puesto</TabsTrigger>
                            <TabsTrigger value="personal">Mi registro</TabsTrigger>
                        </TabsList>

                        <TabsContent value="team" className="mt-4">
                            <TaskPreviewList
                                title="Tareas de equipo"
                                tasks={previewTeamTasks}
                                emptyText="Sin tareas de equipo."
                            />
                        </TabsContent>

                        <TabsContent value="role" className="mt-4">
                            <TaskPreviewList
                                title="Tareas por rol"
                                tasks={previewRoleTasks}
                                emptyText="Sin tareas por rol para tu puesto."
                            />
                        </TabsContent>

                        <TabsContent value="personal" className="mt-4">
                            <TaskPreviewList
                                title="Pendientes y anotaciones personales"
                                tasks={previewMyTasks}
                                emptyText="Sin pendientes personales."
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Centro de proyecto</CardTitle>
                    <CardDescription>Submódulos de trabajo por vista, estilo workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="flex w-full justify-start overflow-x-auto">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="list">Lista</TabsTrigger>
                            <TabsTrigger value="board">Tablero</TabsTrigger>
                            <TabsTrigger value="calendar">Calendario</TabsTrigger>
                            <TabsTrigger value="gantt">Gantt</TabsTrigger>
                            <TabsTrigger value="table">Tabla</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <QuickMetric label="Proyectos activos" value={projects.filter((project) => project.status === "active").length} />
                                <QuickMetric label="Tareas abiertas" value={tasks.filter((task) => !task.completed_at).length} />
                                <QuickMetric label="Tareas vencidas" value={tasks.filter((task) => task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !task.completed_at).length} />
                            </div>
                        </TabsContent>

                        <TabsContent value="list" className="mt-4">
                            <TaskRows tasks={tasks} projectNameById={projectNameById} />
                        </TabsContent>

                        <TabsContent value="board" className="mt-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <ScopeColumn title="Equipo" tasks={scopeBoard.team} projectNameById={projectNameById} />
                                <ScopeColumn title="Por puesto" tasks={scopeBoard.role} projectNameById={projectNameById} />
                                <ScopeColumn title="Mi registro" tasks={scopeBoard.personal} projectNameById={projectNameById} />
                            </div>
                        </TabsContent>

                        <TabsContent value="calendar" className="mt-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Próximas tareas con fecha límite.</p>
                                <TaskRows tasks={tasksWithDueDate} projectNameById={projectNameById} />
                            </div>
                        </TabsContent>

                        <TabsContent value="gantt" className="mt-4">
                            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                Vista Gantt lista para siguiente iteración. Ya queda conectada al mismo modelo de datos (`pm_tasks`) para agregar dependencias y timeline.
                            </div>
                        </TabsContent>

                        <TabsContent value="table" className="mt-4">
                            <TaskRows tasks={tasks} projectNameById={projectNameById} compact />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

function QuickMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function TaskPreviewList({
    title,
    tasks,
    emptyText,
}: {
    title: string;
    tasks: Task[];
    emptyText: string;
}) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            {tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{emptyText}</div>
            ) : (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border bg-card px-3 py-2">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {task.scope}
                                {task.role_target ? ` · ${task.role_target}` : ""}
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

function ScopeColumn({
    title,
    tasks,
    projectNameById,
}: {
    title: string;
    tasks: Task[];
    projectNameById: Record<string, string>;
}) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mb-2 text-xs text-muted-foreground">{tasks.length} tarea(s)</p>
            <div className="space-y-2">
                {tasks.slice(0, 8).map((task) => (
                    <div key={task.id} className="rounded-md border bg-card px-2 py-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{projectNameById[task.project_id] ?? "Proyecto"}</p>
                    </div>
                ))}
                {tasks.length === 0 ? <p className="text-xs text-muted-foreground">Sin tareas.</p> : null}
            </div>
        </div>
    );
}

function TaskRows({
    tasks,
    projectNameById,
    compact,
}: {
    tasks: Task[];
    projectNameById: Record<string, string>;
    compact?: boolean;
}) {
    if (tasks.length === 0) {
        return <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Sin tareas.</div>;
    }

    return (
        <div className="space-y-2">
            {tasks.slice(0, 25).map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        {!compact ? (
                            <p className="truncate text-xs text-muted-foreground">
                                {projectNameById[task.project_id] ?? "Proyecto"} · {task.scope}
                                {task.role_target ? ` · ${task.role_target}` : ""}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{task.priority}</Badge>
                        {task.due_date ? <Badge variant="outline">{task.due_date}</Badge> : null}
                    </div>
                </div>
            ))}
        </div>
    );
}

