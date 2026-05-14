"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConcentradoPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const year = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/program-projects?year=${year}&limit=500`, fetcher);

    if (userLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!hasPermission(CP_MODULE, "view")) return <p className="text-destructive">Sin acceso.</p>;

    const rows = data?.projects ?? [];

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Proyectos registrados para {year}. CRUD vía API (próximo: formulario en UI).</p>
            <div className="rounded-md border border-slate-700/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Benef.</TableHead>
                            <TableHead className="text-right">Ingreso</TableHead>
                            <TableHead>Tamaño</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6}>Cargando…</TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-muted-foreground">
                                    Sin registros. Usa Importar o crea vía API.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((r: { id: string; period_month: string; description: string; client_type: string; beneficiaries_count: number; revenue_amount: number | null; size_code: string | null }) => (
                                <TableRow key={r.id}>
                                    <TableCell className="whitespace-nowrap">{r.period_month}</TableCell>
                                    <TableCell className="max-w-md truncate">{r.description}</TableCell>
                                    <TableCell>{r.client_type}</TableCell>
                                    <TableCell className="text-right">{r.beneficiaries_count}</TableCell>
                                    <TableCell className="text-right">
                                        {r.revenue_amount != null
                                            ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(r.revenue_amount))
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{r.size_code ?? "—"}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
