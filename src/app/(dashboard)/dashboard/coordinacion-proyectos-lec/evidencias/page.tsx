"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EvidenciasCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const year = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/program-projects?year=${year}&limit=500`, fetcher);

    if (userLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!hasPermission(CP_MODULE, "view")) return <p className="text-destructive">Sin acceso.</p>;

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
            <p className="text-sm text-muted-foreground">
                Proyectos con evidencia incompleta (oficio, carta, encuesta o checklist). Sube enlaces en el registro vía API o edición futura.
            </p>
            <div className="rounded-md border border-slate-700/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Oficio</TableHead>
                            <TableHead>Carta</TableHead>
                            <TableHead>Encuesta</TableHead>
                            <TableHead>Checklist</TableHead>
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
                                    <TableRow key={r.id}>
                                        <TableCell>{r.period_month}</TableCell>
                                        <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                                        <TableCell>{r.evidence_office_url ? "Sí" : "—"}</TableCell>
                                        <TableCell>{r.evidence_satisfaction_url ? "Sí" : "—"}</TableCell>
                                        <TableCell>{r.evidence_survey_url ? "Sí" : "—"}</TableCell>
                                        <TableCell>{r.checklist_done ? "Sí" : "No"}</TableCell>
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
