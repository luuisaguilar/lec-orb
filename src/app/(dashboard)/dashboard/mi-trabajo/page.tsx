"use client";

import { useEffect, useState } from "react";
import { ListTodo } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskBucket } from "@/components/dashboard/my-work-buckets";

export default function MiTrabajoPage() {
    const [tasks, setTasks] = useState<{ id: string; title: string; due_date: string | null; completed_at: string | null }[]>(
        []
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/v1/pm/tasks?mine=true");
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setTasks(data.tasks ?? []);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const todayIso = new Date().toISOString().slice(0, 10);
    const myPending = tasks.filter((task) => !task.completed_at);
    const myToday = myPending.filter((task) => task.due_date === todayIso);
    const myOverdue = myPending.filter((task) => task.due_date && task.due_date < todayIso);
    const myNext = myPending.filter((task) => task.due_date && task.due_date > todayIso).slice(0, 8);
    const myUnscheduled = myPending.filter((task) => !task.due_date);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[40vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <ListTodo className="h-8 w-8 text-primary" />
                    Mi trabajo
                </h2>
                <p className="text-muted-foreground mt-1 text-lg">Vista rápida de tareas asignadas a ti.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Resumen</CardTitle>
                    <CardDescription>Hoy, atrasadas, próximas y sin fecha.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <TaskBucket title="Hoy" count={myToday.length} tasks={myToday} />
                        <TaskBucket title="Con atraso" count={myOverdue.length} tasks={myOverdue} />
                        <TaskBucket title="Siguiente" count={myNext.length} tasks={myNext} />
                        <TaskBucket title="Sin programar" count={myUnscheduled.length} tasks={myUnscheduled} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
