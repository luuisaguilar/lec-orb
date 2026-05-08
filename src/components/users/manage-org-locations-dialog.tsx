"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type OrgLocationRow = {
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
};

interface ManageOrgLocationsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ManageOrgLocationsDialog({ open, onOpenChange }: ManageOrgLocationsDialogProps) {
    const { data, isLoading, error } = useSWR(
        open ? "/api/v1/org-locations?includeInactive=1" : null,
        fetcher
    );
    const [newName, setNewName] = useState("");
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const locations: OrgLocationRow[] = data?.locations ?? [];

    async function handleAdd() {
        const name = newName.trim();
        if (!name) {
            toast.error("Escribe un nombre de sede");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/v1/org-locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || "No se pudo crear");
            toast.success("Sede agregada");
            setNewName("");
            await mutate("/api/v1/org-locations");
            await mutate("/api/v1/org-locations?includeInactive=1");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al crear sede");
        } finally {
            setSaving(false);
        }
    }

    async function patchRow(id: string, body: Partial<{ name: string; sort_order: number; is_active: boolean }>) {
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/org-locations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || "No se pudo actualizar");
            toast.success("Sede actualizada");
            await mutate("/api/v1/org-locations");
            await mutate("/api/v1/org-locations?includeInactive=1");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar esta sede del catalogo? Los miembros que ya la tengan asignada conservaran el texto hasta que lo cambies.")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/v1/org-locations/${id}`, { method: "DELETE" });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || "No se pudo eliminar");
            toast.success("Sede eliminada");
            await mutate("/api/v1/org-locations");
            await mutate("/api/v1/org-locations?includeInactive=1");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al eliminar");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Catalogo de sedes
                    </DialogTitle>
                    <DialogDescription>
                        Define las sedes disponibles para invitaciones y asignacion de usuarios. No pueden repetirse nombres en la misma organizacion.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <Label htmlFor="new-location">Nueva sede</Label>
                            <Input
                                id="new-location"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ej. Hermosillo"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void handleAdd();
                                }}
                            />
                        </div>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700 shrink-0"
                            disabled={saving}
                            onClick={() => void handleAdd()}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Agregar
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <p className="text-sm text-red-500">No se pudo cargar el catalogo.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="w-[100px]">Orden</TableHead>
                                    <TableHead className="w-[100px] text-center">Activa</TableHead>
                                    <TableHead className="w-[80px] text-right" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {locations.map((loc) => (
                                    <TableRow key={loc.id}>
                                        <TableCell>
                                            <Input
                                                defaultValue={loc.name}
                                                key={`${loc.id}-${loc.name}`}
                                                className="h-9"
                                                disabled={saving}
                                                onBlur={(e) => {
                                                    const v = e.target.value.trim();
                                                    if (v && v !== loc.name) void patchRow(loc.id, { name: v });
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                defaultValue={loc.sort_order}
                                                key={`${loc.id}-o-${loc.sort_order}`}
                                                disabled={saving}
                                                onBlur={(e) => {
                                                    const n = Number.parseInt(e.target.value, 10);
                                                    if (!Number.isNaN(n) && n !== loc.sort_order) {
                                                        void patchRow(loc.id, { sort_order: n });
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={loc.is_active}
                                                disabled={saving}
                                                onCheckedChange={(checked) => {
                                                    void patchRow(loc.id, { is_active: checked });
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600"
                                                disabled={deletingId === loc.id || saving}
                                                onClick={() => void handleDelete(loc.id)}
                                            >
                                                {deletingId === loc.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
