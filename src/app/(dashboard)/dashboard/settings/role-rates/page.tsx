"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLES = ["EVALUATOR", "INVIGILATOR", "SUPERVISOR", "ADMIN", "REMOTE"] as const;

type RateRow = {
    id: string;
    role: string;
    exam_type: string | null;
    rate_per_hour: number;
    effective_from: string;
    effective_to: string | null;
    notes: string | null;
};

export default function RoleRatesSettingsPage() {
    const { data, isLoading, mutate } = useSWR("/api/v1/settings/role-rates", fetcher);
    const rates: RateRow[] = data?.rates ?? [];

    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<string>("INVIGILATOR");
    const [examType, setExamType] = useState("");
    const [rate, setRate] = useState("");
    const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);

    const resetForm = () => {
        setRole("INVIGILATOR");
        setExamType("");
        setRate("");
        setEffectiveFrom(new Date().toISOString().slice(0, 10));
    };

    const handleCreate = async () => {
        const n = Number(rate);
        if (!Number.isFinite(n) || n < 0) {
            toast.error("Tarifa inválida");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/v1/settings/role-rates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role,
                    exam_type: examType.trim() || null,
                    rate_per_hour: n,
                    effective_from: effectiveFrom,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(typeof body?.error === "string" ? body.error : "Error al guardar");
                return;
            }
            toast.success("Tarifa creada");
            setOpen(false);
            resetForm();
            mutate();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta tarifa?")) return;
        const res = await fetch(`/api/v1/settings/role-rates/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            toast.error(typeof body?.error === "string" ? body.error : "Error al eliminar");
            return;
        }
        toast.success("Eliminada");
        mutate();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/nomina">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Nómina
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Tarifas por rol</h1>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => resetForm()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva tarifa
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar tarifa estándar</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <div>
                                <Label>Rol</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map((r) => (
                                            <SelectItem key={r} value={r}>
                                                {r}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Nivel / examen (opcional)</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="ej. FCE o vacío = todos"
                                    value={examType}
                                    onChange={(e) => setExamType(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Tarifa por hora</Label>
                                <Input
                                    className="mt-1"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={rate}
                                    onChange={(e) => setRate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Vigente desde</Label>
                                <Input
                                    className="mt-1"
                                    type="date"
                                    value={effectiveFrom}
                                    onChange={(e) => setEffectiveFrom(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleCreate} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Matriz rol × nivel</CardTitle>
                    <CardDescription>
                        Usada al calcular nómina (después de excepciones por aplicador, si existen).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : rates.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No hay tarifas configuradas.</p>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Examen</TableHead>
                                        <TableHead className="text-right">$/h</TableHead>
                                        <TableHead>Desde</TableHead>
                                        <TableHead>Hasta</TableHead>
                                        <TableHead className="w-[80px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rates.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">{row.role}</TableCell>
                                            <TableCell>{row.exam_type ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                ${Number(row.rate_per_hour).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{row.effective_from}</TableCell>
                                            <TableCell>{row.effective_to ?? "—"}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(row.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
