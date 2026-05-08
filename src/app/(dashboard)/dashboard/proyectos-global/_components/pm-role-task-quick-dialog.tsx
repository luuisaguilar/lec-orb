"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type RoleTarget = "admin" | "supervisor" | "operador" | "applicator";
type Priority = "low" | "normal" | "high" | "urgent";

type PmRoleTaskQuickDialogProps = {
    onCreated?: () => void;
};

export function PmRoleTaskQuickDialog({ onCreated }: PmRoleTaskQuickDialogProps) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [roleTarget, setRoleTarget] = useState<RoleTarget>("operador");
    const [priority, setPriority] = useState<Priority>("normal");
    const [dueDate, setDueDate] = useState("");
    const [assigneeUserId, setAssigneeUserId] = useState("none");
    const [saving, setSaving] = useState(false);

    const { data: usersRes } = useSWR(open ? "/api/v1/users" : null, fetcher);
    const members = usersRes?.members ?? [];

    const reset = () => {
        setTitle("");
        setDescription("");
        setRoleTarget("operador");
        setPriority("normal");
        setDueDate("");
        setAssigneeUserId("none");
    };

    const submit = async () => {
        if (!title.trim()) {
            toast.error("El título es obligatorio.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/v1/pm/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() ? description.trim() : null,
                    scope: "role",
                    role_target: roleTarget,
                    priority,
                    due_date: dueDate.trim() ? dueDate : null,
                    assignee_user_id: assigneeUserId === "none" ? null : assigneeUserId,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || "No se pudo crear la tarea por puesto.");
            toast.success("Tarea por puesto creada.");
            setOpen(false);
            reset();
            onCreated?.();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al crear tarea.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset();
            }}
        >
            <DialogTrigger asChild>
                <Button className="shrink-0 gap-2" variant="secondary">
                    <Plus className="h-4 w-4" />
                    Nueva tarea por puesto
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg" showCloseButton>
                <DialogHeader>
                    <DialogTitle>Asignar tarea por rol</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label>Título</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Revisar evidencias del evento"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Descripción (opcional)</Label>
                        <Textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Instrucciones del jefe o criterios de entrega"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label>Rol destino</Label>
                            <Select value={roleTarget} onValueChange={(v) => setRoleTarget(v as RoleTarget)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="operador">Operador</SelectItem>
                                    <SelectItem value="applicator">Aplicador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Prioridad</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
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
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label>Vence (opcional)</Label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Asignar a (opcional)</Label>
                            <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                                <SelectTrigger>
                                    <SelectValue />
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
                    <p className="text-xs text-muted-foreground">
                        Esta acción no requiere proyecto previo. El sistema usa una bandeja interna para tareas por puesto.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? "Guardando…" : "Crear tarea"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
