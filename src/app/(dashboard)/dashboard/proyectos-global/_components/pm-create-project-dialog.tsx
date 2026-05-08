"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PmCreateProjectDialogProps = {
    onCreated?: () => void | Promise<void>;
    triggerClassName?: string;
};

export function PmCreateProjectDialog({ onCreated, triggerClassName }: PmCreateProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [key, setKey] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);

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
            setOpen(false);
            setKey("");
            setName("");
            setDescription("");
            await onCreated?.();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error al crear.";
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={`gap-2 ${triggerClassName ?? ""}`}>
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
                    <p className="text-xs text-muted-foreground">
                        Cada proyecto crea un tablero Kanban con columnas por defecto. No hay subproyectos anidados en el
                        modelo actual: usa varios proyectos o tareas para desglosar el trabajo.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
                            Cancelar
                        </Button>
                        <Button onClick={createProject} disabled={creating}>
                            {creating ? "Creando…" : "Crear"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
