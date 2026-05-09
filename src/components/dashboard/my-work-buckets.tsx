"use client";

export function TaskBucket({
    title,
    count,
    tasks,
}: {
    title: string;
    count: number;
    tasks: { id: string; title: string }[];
}) {
    return (
        <div className="rounded-lg border bg-card p-3">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mb-2 text-xs text-muted-foreground">{count} tarea(s)</p>
            <div className="space-y-1">
                {tasks.slice(0, 4).map((task) => (
                    <p key={task.id} className="truncate text-xs text-foreground">
                        - {task.title}
                    </p>
                ))}
                {tasks.length === 0 ? <p className="text-xs text-muted-foreground">Sin tareas.</p> : null}
            </div>
        </div>
    );
}
