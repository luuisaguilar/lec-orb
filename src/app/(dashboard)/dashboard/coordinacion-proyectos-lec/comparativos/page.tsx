"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type KpiRow = {
    id: string;
    bucket_key: string;
    count_2025: number;
    count_2026: number;
    projected_2026: number;
};

export default function ComparativosCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const { data, mutate, isLoading } = useSWR("/api/v1/coordinacion-proyectos/kpi-comparison", fetcher);
    const [draft, setDraft] = useState<KpiRow[]>([]);

    useEffect(() => {
        if (data?.rows) setDraft(data.rows as KpiRow[]);
    }, [data]);

    if (userLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!hasPermission(CP_MODULE, "view")) return <p className="text-destructive">Sin acceso.</p>;

    const save = async () => {
        if (!hasPermission(CP_MODULE, "edit")) {
            toast.error("Sin permiso de edición");
            return;
        }
        const res = await fetch("/api/v1/coordinacion-proyectos/kpi-comparison", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: draft.map((r) => ({ id: r.id, count_2025: r.count_2025, count_2026: r.count_2026, projected_2026: r.projected_2026 })) }),
        });
        if (!res.ok) {
            const b = await res.json();
            toast.error(b.error || "Error");
            return;
        }
        toast.success("Guardado");
        mutate();
    };

    const setVal = (id: string, field: keyof KpiRow, value: string) => {
        const n = parseInt(value, 10);
        setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: Number.isFinite(n) ? n : 0 } : r)));
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Totales por tamaño (hoja GRAFICA). Edita y guarda.</p>
            <div className="rounded-md border border-slate-700/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bucket</TableHead>
                            <TableHead>2025</TableHead>
                            <TableHead>2026</TableHead>
                            <TableHead>Proyectado 2026</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4}>Cargando…</TableCell>
                            </TableRow>
                        ) : (
                            draft.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">{r.bucket_key}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="w-24"
                                            value={r.count_2025}
                                            onChange={(e) => setVal(r.id, "count_2025", e.target.value)}
                                            disabled={!hasPermission(CP_MODULE, "edit")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="w-24"
                                            value={r.count_2026}
                                            onChange={(e) => setVal(r.id, "count_2026", e.target.value)}
                                            disabled={!hasPermission(CP_MODULE, "edit")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="w-24"
                                            value={r.projected_2026}
                                            onChange={(e) => setVal(r.id, "projected_2026", e.target.value)}
                                            disabled={!hasPermission(CP_MODULE, "edit")}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {hasPermission(CP_MODULE, "edit") && (
                <Button type="button" onClick={save}>
                    Guardar comparativos
                </Button>
            )}
        </div>
    );
}
