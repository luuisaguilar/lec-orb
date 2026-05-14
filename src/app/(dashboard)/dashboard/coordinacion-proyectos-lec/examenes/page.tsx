"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ExamenesCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const year = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/exam-lines?year=${year}&limit=500`, fetcher);

    if (userLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!hasPermission(CP_MODULE, "view")) return <p className="text-destructive">Sin acceso.</p>;

    const rows = data?.lines ?? [];

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Registro tipo Excel EXAMENES {year}.</p>
            <div className="rounded-md border border-slate-700/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead>Candidato / Institución</TableHead>
                            <TableHead>Examen</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
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
                                    Sin líneas. Importar o API.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map(
                                (r: {
                                    id: string;
                                    exam_month: string;
                                    candidate_or_institution: string;
                                    exam_type_label: string | null;
                                    quantity: number;
                                    amount: number | null;
                                }) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="whitespace-nowrap">{r.exam_month}</TableCell>
                                        <TableCell>{r.candidate_or_institution}</TableCell>
                                        <TableCell>{r.exam_type_label ?? "—"}</TableCell>
                                        <TableCell className="text-right">{r.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {r.amount != null
                                                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(r.amount))
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
