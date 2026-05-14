"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CursosCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const { data, isLoading } = useSWR("/api/v1/coordinacion-proyectos/course-offerings?limit=200", fetcher);

    if (userLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!hasPermission(CP_MODULE, "view")) return <p className="text-destructive">Sin acceso.</p>;

    const rows = data?.offerings ?? [];

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Cursos operativos (cohortes), distinto del simulador en Académico.</p>
            <div className="rounded-md border border-slate-700/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Curso</TableHead>
                            <TableHead>Inicio</TableHead>
                            <TableHead>Fin</TableHead>
                            <TableHead className="text-right">Participantes</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5}>Cargando…</TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-muted-foreground">
                                    Sin cursos registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map(
                                (r: {
                                    id: string;
                                    name: string;
                                    starts_on: string | null;
                                    ends_on: string | null;
                                    participants_count: number;
                                    price_amount: number | null;
                                }) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>{r.starts_on ?? "—"}</TableCell>
                                        <TableCell>{r.ends_on ?? "—"}</TableCell>
                                        <TableCell className="text-right">{r.participants_count}</TableCell>
                                        <TableCell className="text-right">
                                            {r.price_amount != null
                                                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(r.price_amount))
                                                : "—"}
                                        </TableCell>
                                    </TableRow>
                                ),
                            )
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
