"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PmColumn = { id: string; name: string; slug: string; sort_order: number; is_done: boolean };
type PmBoard = { id: string; name: string; columns: PmColumn[] };

export type PmTaskFormTask = {
    id: string;
    project_id: string;
    board_id: string;
    column_id: string;
    title: string;
    description: string | null;
    priority: "low" | "normal" | "high" | "urgent";
    due_date: string | null;
    assignee_user_id: string | null;
    scope: "team" | "role" | "personal";
    role_target: "admin" | "supervisor" | "operador" | "applicator" | null;
    is_private: boolean;
};

type PmTaskDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string | null;
    task: PmTaskFormTask | null;
    defaultColumnId?: string | null;
    onSaved: () => void;
};

export function PmTaskDialog({
    open,
    onOpenChange,
    projectId,
    task,
    defaultColumnId,
    onSaved,
}: PmTaskDialogProps) {
    const isEdit = Boolean(task);

    const { data: projectRes } = useSWR(
        open && projectId ? `/api/v1/pm/projects/${projectId}` : null,
        fetcher
    );
    const { data: usersRes } = useSWR(open ? "/api/v1/users" : null, fetcher);

    const boards: PmBoard[] = useMemo(() => {
        const raw = projectRes?.project?.boards;
        return Array.isArray(raw) ? raw : [];
    }, [projectRes?.project?.boards]);

    const flatColumns = useMemo(() => {
        const list: (PmColumn & { board_id: string })[] = [];
        for (const b of boards) {
            const cols = [...(b.columns ?? [])].sort((a, c) => a.sort_order - c.sort_order);
            for (const c of cols) list.push({ ...c, board_id: b.id });
        }
        return list;
    }, [boards]);

    const members = usersRes?.members ?? [];

    const [boardId, setBoardId] = useState("");
    const [columnId, setColumnId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
    const [dueDate, setDueDate] = useState<string>("");
    const [assigneeUserId, setAssigneeUserId] = useState<string>("none");
    const [scope, setScope] = useState<"team" | "role" | "personal">("team");
    const [roleTarget, setRoleTarget] = useState<string>("none");
    const [isPrivate, setIsPrivate] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (task) {
            setBoardId(task.board_id);
            setColumnId(task.column_id);
            setTitle(task.title);
            setDescription(task.description ?? "");
            setPriority(task.priority);
            setDueDate(task.due_date ?? "");
            setAssigneeUserId(task.assignee_user_id ?? "none");
            setScope(task.scope);
            setRoleTarget(task.role_target ?? "none");
            setIsPrivate(task.is_private);
        } else {
            const firstBoard = boards[0];
            const firstCol = firstBoard?.columns?.length
                ? [...firstBoard.columns].sort((a, b) => a.sort_order - b.sort_order)[0]
                : null;
            setBoardId(firstBoard?.id ?? "");
            setColumnId(defaultColumnId ?? firstCol?.id ?? "");
            setTitle("");
            setDescription("");
            setPriority("normal");
            setDueDate("");
            setAssigneeUserId("none");
            setScope("team");
            setRoleTarget("none");
            setIsPrivate(false);
        }
    }, [open, task, boards, defaultColumnId]);

    const columnsForBoard = useMemo(() => {
        const b = boards.find((x) => x.id === boardId);
        if (!b?.columns) return [];
        return [...b.columns].sort((a, c) => a.sort_order - c.sort_order);
    }, [boards, boardId]);

    useEffect(() => {
        if (!open) return;
        const valid = columnsForBoard.some((c) => c.id === columnId);
        if (!valid && columnsForBoard[0]) setColumnId(columnsForBoard[0].id);
    }, [open, boardId, columnsForBoard, columnId, task]);

    async function submit() {
        if (!projectId) {
            toast.error("Selecciona un proyecto.");
            return;
        }
        if (!title.trim()) {
            toast.error("El título es obligatorio.");
            return;
        }
        if (!boardId || !columnId) {
            toast.error("Tablero y columna requeridos.");
            return;
        }
        if (scope === "role" && (!roleTarget || roleTarget === "none")) {
            toast.error("Elige el rol destino para tareas por puesto.");
            return;
        }

        setSaving(true);
        try {
            const duePayload = dueDate.trim() ? dueDate.trim() : null;

            if (isEdit && task) {
                if (columnId !== task.column_id) {
                    const moveRes = await fetch(`/api/v1/pm/tasks/${task.id}/move`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ column_id: columnId }),
                    });
                    const movePayload = await moveRes.json().catch(() => ({}));
                    if (!moveRes.ok) throw new Error(movePayload.error || "No se pudo mover la tarea de columna.");
                }

                const patchRes = await fetch(`/api/v1/pm/tasks/${task.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: title.trim(),
                        description: description.trim() ? description.trim() : null,
                        priority,
                        due_date: duePayload,
                        assignee_user_id: assigneeUserId === "none" ? null : assigneeUserId,
                        scope,
                        role_target: scope === "role" && roleTarget !== "none" ? roleTarget : null,
                        is_private: scope === "personal" ? isPrivate : false,
                    }),
                });
                const patchPayload = await patchRes.json().catch(() => ({}));
                if (!patchRes.ok) throw new Error(patchPayload.error || "No se pudo actualizar la tarea.");
            } else {
                const body: Record<string, unknown> = {
                    project_id: projectId,
                    board_id: boardId,
                    column_id: columnId,
                    title: title.trim(),
                    description: description.trim() ? description.trim() : null,
                    priority,
                    due_date: duePayload,
                    assignee_user_id: assigneeUserId === "none" ? null : assigneeUserId,
                    scope,
                    role_target: scope === "role" && roleTarget !== "none" ? roleTarget : null,
                    is_private: scope === "personal" ? isPrivate : false,
                };

                const res = await fetch("/api/v1/pm/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(payload.error || "No se pudo crear la tarea.");
            }

            toast.success(isEdit ? "Tarea actualizada." : "Tarea creada.");
            onSaved();
            onOpenChange(false);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al guardar.");
        } finally {
            setSaving(false);
        }
    }

    if (!projectId && open) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label>Título</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descripción breve" />
                    </div>
                    <div className="space-y-1">
                        <Label>Descripción (opcional)</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Detalle o criterios de hecho"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label>Tablero</Label>
                            <Select value={boardId} onValueChange={setBoardId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Tablero" />
                                </SelectTrigger>
                                <SelectContent>
                                    {boards.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Columna</Label>
                            <Select value={columnId} onValueChange={setColumnId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Columna" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columnsForBoard.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label>Prioridad</Label>
                            <Select
                                value={priority}
                                onValueChange={(v) => setPriority(v as typeof priority)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Baja</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">Alta</SelectItem>
                                    <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Vence</Label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Alcance</Label>
                        <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="team">Equipo</SelectItem>
                                <SelectItem value="role">Por puesto</SelectItem>
                                <SelectItem value="personal">Personal / registro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {scope === "role" ? (
                        <div className="space-y-1">
                            <Label>Rol destino</Label>
                            <Select value={roleTarget} onValueChange={setRoleTarget}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="operador">Operador</SelectItem>
                                    <SelectItem value="applicator">Aplicador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}

                    {scope === "personal" ? (
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="pm-private"
                                checked={isPrivate}
                                onCheckedChange={(c) => setIsPrivate(c === true)}
                            />
                            <Label htmlFor="pm-private" className="font-normal">
                                Privada (solo tú como asignado o creador)
                            </Label>
                        </div>
                    ) : null}

                    <div className="space-y-1">
                        <Label>Asignar a (opcional)</Label>
                        <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Miembro" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin asignar</SelectItem>
                                {members.map((m: { user_id: string; full_name: string }) => (
                                    <SelectItem key={m.user_id} value={m.user_id}>
                                        {m.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
