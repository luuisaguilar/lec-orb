"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CpDeniedState, CpLoadingState, CpPageBlurb, cpTableShellClass } from "../_components/cp-ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ExamenesCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const year = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/exam-lines?year=${year}&limit=500`, fetcher);

    if (userLoading) return <CpLoadingState />;
    if (!hasPermission(CP_MODULE, "view")) return <CpDeniedState message="Sin acceso." />;

    const rows = data?.lines ?? [];

    return (
        <div className="space-y-4">
            <CpPageBlurb>Registro tipo Excel EXAMENES {year}.</CpPageBlurb>
            <div className={cpTableShellClass}>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40 dark:bg-muted/25">
                            <TableHead className="text-foreground">Mes</TableHead>
                            <TableHead className="text-foreground">Candidato / Institución</TableHead>
                            <TableHead className="text-foreground">Examen</TableHead>
                            <TableHead className="text-right text-foreground">Cant.</TableHead>
                            <TableHead className="text-right text-foreground">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-muted-foreground">
                                    Cargando…
                                </TableCell>
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
                                    <TableRow
                                        key={r.id}
                                        className="border-border/60 transition-colors hover:bg-violet-500/[0.06] dark:hover:bg-violet-500/[0.09]"
                                    >
                                        <TableCell className="whitespace-nowrap font-medium text-foreground">{r.exam_month}</TableCell>
                                        <TableCell className="text-foreground/90">{r.candidate_or_institution}</TableCell>
                                        <TableCell className="text-muted-foreground">{r.exam_type_label ?? "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums text-foreground">{r.quantity}</TableCell>
                                        <TableCell className="text-right tabular-nums text-foreground">
                                            {r.amount != null
                                                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                                                      Number(r.amount),
                                                  )
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
