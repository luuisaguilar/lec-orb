"use client";

import { useMemo, useState } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    defaultDropAnimationSideEffects,
    closestCorners,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type PmKanbanColumn = { id: string; name: string; slug: string; sort_order: number; is_done: boolean };

export type PmKanbanTask = {
    id: string;
    column_id: string;
    board_id: string;
    title: string;
    priority: string;
    due_date: string | null;
    scope: string;
    ref: string | null;
};

type PmKanbanBoardProps = {
    columns: PmKanbanColumn[];
    tasks: PmKanbanTask[];
    onMoveTask: (taskId: string, columnId: string) => Promise<void>;
    onEditTask: (task: PmKanbanTask) => void;
};

function columnDroppableId(columnId: string) {
    return `pm-col:${columnId}` as const;
}

function taskDraggableId(taskId: string) {
    return `pm-task:${taskId}` as const;
}

function parseColumnId(overId: string | number): string | null {
    const s = String(overId);
    if (s.startsWith("pm-col:")) return s.slice(7);
    return null;
}

function parseTaskId(activeId: string | number): string | null {
    const s = String(activeId);
    if (s.startsWith("pm-task:")) return s.slice(8);
    return null;
}

function DroppableColumn({
    column,
    children,
}: {
    column: PmKanbanColumn;
    children: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(column.id) });
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex min-h-[280px] w-72 shrink-0 flex-col rounded-xl border bg-muted/20 p-2 transition-colors",
                isOver && "ring-2 ring-primary/40"
            )}
        >
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold">{column.name}</span>
                {column.is_done ? <Badge variant="secondary">Hecho</Badge> : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">{children}</div>
        </div>
    );
}

function DraggableTaskCard({
    task,
    onEdit,
}: {
    task: PmKanbanTask;
    onEdit: (t: PmKanbanTask) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: taskDraggableId(task.id),
        data: { task },
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "cursor-grab rounded-lg border bg-card p-2.5 shadow-sm active:cursor-grabbing",
                isDragging && "opacity-40"
            )}
        >
            <div className="flex gap-2">
                <button
                    type="button"
                    className="mt-0.5 shrink-0 touch-none text-muted-foreground hover:text-foreground"
                    {...listeners}
                    {...attributes}
                    aria-label="Arrastrar"
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(task)}>
                    {task.ref ? (
                        <p className="font-mono text-[10px] text-muted-foreground">{task.ref}</p>
                    ) : null}
                    <p className="text-sm font-medium leading-snug">{task.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                            {task.scope}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                            {task.priority}
                        </Badge>
                        {task.due_date ? (
                            <span className="text-[10px] text-muted-foreground">{task.due_date}</span>
                        ) : null}
                    </div>
                </button>
            </div>
        </div>
    );
}

const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: { active: { opacity: "0.5" } },
    }),
};

export function PmKanbanBoard({ columns, tasks, onMoveTask, onEditTask }: PmKanbanBoardProps) {
    const [activeTask, setActiveTask] = useState<PmKanbanTask | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor)
    );

    const sortedColumns = useMemo(
        () => [...columns].sort((a, b) => a.sort_order - b.sort_order),
        [columns]
    );

    const tasksByColumn = useMemo(() => {
        const map = new Map<string, PmKanbanTask[]>();
        for (const c of sortedColumns) map.set(c.id, []);
        for (const t of tasks) {
            const list = map.get(t.column_id);
            if (list) list.push(t);
        }
        for (const [, list] of map) {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }
        return map;
    }, [sortedColumns, tasks]);

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;

        const taskId = parseTaskId(active.id);
        if (!taskId) return;

        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        let targetColumnId: string | null = parseColumnId(over.id);
        if (!targetColumnId) {
            const overTaskId = parseTaskId(over.id);
            if (overTaskId) {
                const other = tasks.find((t) => t.id === overTaskId);
                targetColumnId = other?.column_id ?? null;
            }
        }

        if (!targetColumnId || targetColumnId === task.column_id) return;

        try {
            await onMoveTask(taskId, targetColumnId);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "No se pudo mover la tarea.");
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={({ active }) => {
                const id = parseTaskId(active.id);
                const t = id ? tasks.find((x) => x.id === id) ?? null : null;
                setActiveTask(t);
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveTask(null)}
        >
            <div className="flex gap-3 overflow-x-auto pb-2">
                {sortedColumns.map((col) => (
                    <DroppableColumn key={col.id} column={col}>
                        {(tasksByColumn.get(col.id) ?? []).map((t) => (
                            <DraggableTaskCard key={t.id} task={t} onEdit={onEditTask} />
                        ))}
                    </DroppableColumn>
                ))}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeTask ? (
                    <div className="w-72 cursor-grabbing rounded-lg border bg-card p-2.5 shadow-lg">
                        <p className="text-sm font-semibold">{activeTask.title}</p>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
