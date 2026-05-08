"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProyectosGlobalGanttPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gantt</CardTitle>
                <CardDescription>
                    Próxima iteración: barras por tarea con dependencias y ventanas de tiempo. Los datos ya provienen de{" "}
                    <code className="rounded bg-muted px-1 text-xs">pm_tasks</code>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Vista Gantt en construcción.
                </div>
            </CardContent>
        </Card>
    );
}
