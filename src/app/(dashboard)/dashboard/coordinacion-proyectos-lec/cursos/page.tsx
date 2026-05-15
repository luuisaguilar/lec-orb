"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CpDeniedState, CpLoadingState, CpPageBlurb, cpTableShellClass } from "../_components/cp-ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CursosCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const { data, isLoading } = useSWR("/api/v1/coordinacion-proyectos/course-offerings?limit=200", fetcher);

    if (userLoading) return <CpLoadingState />;
    if (!hasPermission(CP_MODULE, "view")) return <CpDeniedState message="Sin acceso." />;

    const rows = data?.offerings ?? [];

    return (
        <div className="space-y-4">
            <CpPageBlurb>Cursos operativos (cohortes), distinto del simulador en Académico.</CpPageBlurb>
            <div className={cpTableShellClass}>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40 dark:bg-muted/25">
                            <TableHead className="text-foreground">Curso</TableHead>
                            <TableHead className="text-foreground">Inicio</TableHead>
                            <TableHead className="text-foreground">Fin</TableHead>
                            <TableHead className="text-right text-foreground">Participantes</TableHead>
                            <TableHead className="text-right text-foreground">Precio</TableHead>
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
                                    <TableRow
                                        key={r.id}
                                        className="border-border/60 transition-colors hover:bg-emerald-500/[0.06] dark:hover:bg-emerald-500/[0.09]"
                                    >
                                        <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{r.starts_on ?? "—"}</TableCell>
                                        <TableCell className="text-muted-foreground">{r.ends_on ?? "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums text-foreground">{r.participants_count}</TableCell>
                                        <TableCell className="text-right tabular-nums text-foreground">
                                            {r.price_amount != null
                                                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                                                      Number(r.price_amount),
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
