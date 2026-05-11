"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { isFinanceAdminRole } from "@/lib/finance/finance-access";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FondosCajaChicaPage() {
    const { data: userData, isLoading: userLoading } = useSWR("/api/v1/users/me", fetcher);
    const orgId = userData?.organization?.id as string | undefined;
    const role = userData?.role as string | undefined;
    const canAdmin = isFinanceAdminRole(role);

    const [funds, setFunds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [initial, setInitial] = useState("");

    const load = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/finance/petty-cash/funds?org_id=${orgId}`);
            if (!res.ok) throw new Error("load");
            const { funds: rows } = await res.json();
            setFunds(rows ?? []);
        } catch {
            toast.error("No se pudieron cargar los fondos");
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        load();
    }, [load]);

    if (userLoading || !orgId) {
        return (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
        );
    }

    if (!canAdmin) {
        return (
            <div className="p-8 space-y-4">
                <p className="text-muted-foreground">No tienes permisos para administrar fondos.</p>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/finanzas/caja-chica">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Caja Chica
                    </Link>
                </Button>
            </div>
        );
    }

    const createFund = async () => {
        const y = parseInt(year, 10);
        const amt = parseFloat(initial);
        if (!name.trim() || !Number.isFinite(y) || !(amt >= 0)) {
            toast.error("Completa nombre, año y saldo inicial");
            return;
        }
        const res = await fetch("/api/v1/finance/petty-cash/funds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.trim(),
                fiscal_year: y,
                initial_amount: amt,
            }),
        });
        if (res.ok) {
            toast.success("Fondo creado");
            setOpen(false);
            setName("");
            setInitial("");
            load();
        } else {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Error al crear");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
                        <Link href="/dashboard/finanzas/caja-chica">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Caja Chica
                        </Link>
                    </Button>
                    <h2 className="text-2xl font-bold tracking-tight">Fondos de caja chica</h2>
                    <p className="text-muted-foreground text-sm">Alta de fondos y custodio (administración).</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo fondo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear fondo</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="text-sm font-medium">Nombre</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Año fiscal</label>
                                <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Saldo inicial</label>
                                <Input value={initial} onChange={(e) => setInitial(e.target.value)} type="number" step="0.01" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                El custodio por defecto eres tú; puedes reasignar en base de datos si hace falta.
                            </p>
                            <Button onClick={createFund}>Crear</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado</CardTitle>
                    <CardDescription>Todos los fondos de tu organización.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Año</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Inicial</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {funds.map((f) => (
                                    <TableRow key={f.id}>
                                        <TableCell className="font-medium">{f.name}</TableCell>
                                        <TableCell>{f.fiscal_year}</TableCell>
                                        <TableCell>{f.status}</TableCell>
                                        <TableCell className="text-right">
                                            ${Number(f.initial_amount).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            ${Number(f.current_balance).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
