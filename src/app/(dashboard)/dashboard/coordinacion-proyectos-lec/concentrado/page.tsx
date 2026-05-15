"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CpDeniedState, CpLoadingState, CpPageBlurb, cpTableShellClass } from "../_components/cp-ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConcentradoPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const year = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/program-projects?year=${year}&limit=500`, fetcher);

    if (userLoading) return <CpLoadingState />;
    if (!hasPermission(CP_MODULE, "view")) return <CpDeniedState message="Sin acceso." />;

    const rows = data?.projects ?? [];

    return (
        <div className="space-y-4">
            <CpPageBlurb>
                Proyectos registrados para {year}. CRUD vía API (formulario en UI pendiente de ampliar).
            </CpPageBlurb>
            <div className={cpTableShellClass}>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40 dark:bg-muted/25">
                            <TableHead className="text-foreground">Mes</TableHead>
                            <TableHead className="text-foreground">Descripción</TableHead>
                            <TableHead className="text-foreground">Cliente</TableHead>
                            <TableHead className="text-right text-foreground">Benef.</TableHead>
                            <TableHead className="text-right text-foreground">Ingreso</TableHead>
                            <TableHead className="text-foreground">Tamaño</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-muted-foreground">
                                    Cargando…
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-muted-foreground">
                                    Sin registros. Usa Importar o crea vía API.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map(
                                (r: {
                                    id: string;
                                    period_month: string;
                                    description: string;
                                    client_type: string;
                                    beneficiaries_count: number;
                                    revenue_amount: number | null;
                                    size_code: string | null;
                                }) => (
                                    <TableRow
                                        key={r.id}
                                        className="border-border/60 transition-colors hover:bg-primary/[0.04] dark:hover:bg-primary/[0.07]"
                                    >
                                        <TableCell className="whitespace-nowrap font-medium text-foreground">{r.period_month}</TableCell>
                                        <TableCell className="max-w-md truncate text-foreground/90">{r.description}</TableCell>
                                        <TableCell className="text-muted-foreground">{r.client_type}</TableCell>
                                        <TableCell className="text-right tabular-nums text-foreground">{r.beneficiaries_count}</TableCell>
                                        <TableCell className="text-right tabular-nums text-foreground">
                                            {r.revenue_amount != null
                                                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                                                      Number(r.revenue_amount),
                                                  )
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{r.size_code ?? "—"}</TableCell>
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
