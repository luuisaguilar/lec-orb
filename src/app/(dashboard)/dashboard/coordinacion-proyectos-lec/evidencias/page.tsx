"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CpDeniedState, CpLoadingState, CpPageBlurb, cpTableShellClass } from "../_components/cp-ui";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Flag({ ok }: { ok: boolean }) {
    return (
        <span
            className={cn(
                "inline-flex min-w-[2.25rem] justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                ok
                    ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200"
                    : "bg-amber-500/15 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100",
            )}
        >
            {ok ? "Sí" : "No"}
        </span>
    );
}

export default function EvidenciasCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const year = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/program-projects?year=${year}&limit=500`, fetcher);

    if (userLoading) return <CpLoadingState />;
    if (!hasPermission(CP_MODULE, "view")) return <CpDeniedState message="Sin acceso." />;

    const rows = (data?.projects ?? []).filter(
        (r: {
            evidence_office_url: string | null;
            evidence_satisfaction_url: string | null;
            evidence_survey_url: string | null;
            checklist_done: boolean;
        }) =>
            !r.checklist_done ||
            !r.evidence_office_url ||
            !r.evidence_satisfaction_url ||
            !r.evidence_survey_url,
    );

    return (
        <div className="space-y-4">
            <CpPageBlurb>
                Proyectos con evidencia incompleta (oficio, carta, encuesta o checklist). Completa enlaces vía API o edición
                futura en UI.
            </CpPageBlurb>
            <div className={cpTableShellClass}>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40 dark:bg-muted/25">
                            <TableHead className="text-foreground">Mes</TableHead>
                            <TableHead className="text-foreground">Descripción</TableHead>
                            <TableHead className="text-foreground">Oficio</TableHead>
                            <TableHead className="text-foreground">Carta</TableHead>
                            <TableHead className="text-foreground">Encuesta</TableHead>
                            <TableHead className="text-foreground">Checklist</TableHead>
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
                                    Todo completo o sin datos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map(
                                (r: {
                                    id: string;
                                    period_month: string;
                                    description: string;
                                    evidence_office_url: string | null;
                                    evidence_satisfaction_url: string | null;
                                    evidence_survey_url: string | null;
                                    checklist_done: boolean;
                                }) => (
                                    <TableRow
                                        key={r.id}
                                        className="border-border/60 transition-colors hover:bg-rose-500/[0.06] dark:hover:bg-rose-500/[0.09]"
                                    >
                                        <TableCell className="whitespace-nowrap font-medium text-foreground">{r.period_month}</TableCell>
                                        <TableCell className="max-w-xs truncate text-foreground/90">{r.description}</TableCell>
                                        <TableCell>
                                            <Flag ok={!!r.evidence_office_url} />
                                        </TableCell>
                                        <TableCell>
                                            <Flag ok={!!r.evidence_satisfaction_url} />
                                        </TableCell>
                                        <TableCell>
                                            <Flag ok={!!r.evidence_survey_url} />
                                        </TableCell>
                                        <TableCell>
                                            <Flag ok={r.checklist_done} />
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
