"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { CpDeniedState, CpLoadingState, CpPageBlurb, cpTableShellClass } from "../_components/cp-ui";

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
    const [overrides, setOverrides] = useState<Record<string, Partial<KpiRow>>>({});

    const draft = useMemo(
        () => (data?.rows as KpiRow[] ?? []).map((r) => ({ ...r, ...overrides[r.id] })),
        [data, overrides],
    );

    if (userLoading) return <CpLoadingState />;
    if (!hasPermission(CP_MODULE, "view")) return <CpDeniedState message="Sin acceso." />;

    const save = async () => {
        if (!hasPermission(CP_MODULE, "edit")) {
            toast.error("Sin permiso de edición");
            return;
        }
        const res = await fetch("/api/v1/coordinacion-proyectos/kpi-comparison", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                rows: draft.map((r) => ({
                    id: r.id,
                    count_2025: r.count_2025,
                    count_2026: r.count_2026,
                    projected_2026: r.projected_2026,
                })),
            }),
        });
        if (!res.ok) {
            const b = await res.json();
            toast.error(b.error || "Error");
            return;
        }
        toast.success("Guardado");
        setOverrides({});
        mutate();
    };

    const setVal = (id: string, field: keyof KpiRow, value: string) => {
        const n = parseInt(value, 10);
        setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], [field]: Number.isFinite(n) ? n : 0 } }));
    };

    return (
        <div className="space-y-4">
            <CpPageBlurb>Totales por tamaño (hoja GRAFICA). Edita y guarda.</CpPageBlurb>
            <div className={cpTableShellClass}>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40 dark:bg-muted/25">
                            <TableHead className="text-foreground">Bucket</TableHead>
                            <TableHead className="text-foreground">2025</TableHead>
                            <TableHead className="text-foreground">2026</TableHead>
                            <TableHead className="text-foreground">Proyectado 2026</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-muted-foreground">
                                    Cargando…
                                </TableCell>
                            </TableRow>
                        ) : (
                            draft.map((r) => (
                                <TableRow
                                    key={r.id}
                                    className="border-border/60 transition-colors hover:bg-cyan-500/[0.06] dark:hover:bg-cyan-500/[0.09]"
                                >
                                    <TableCell className="font-medium capitalize text-foreground">{r.bucket_key}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="w-28 border-border/80 bg-background dark:bg-background/70"
                                            value={r.count_2025}
                                            onChange={(e) => setVal(r.id, "count_2025", e.target.value)}
                                            disabled={!hasPermission(CP_MODULE, "edit")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="w-28 border-border/80 bg-background dark:bg-background/70"
                                            value={r.count_2026}
                                            onChange={(e) => setVal(r.id, "count_2026", e.target.value)}
                                            disabled={!hasPermission(CP_MODULE, "edit")}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="w-28 border-border/80 bg-background dark:bg-background/70"
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
                <Button type="button" onClick={save} className="shadow-sm">
                    Guardar comparativos
                </Button>
            )}
        </div>
    );
}
