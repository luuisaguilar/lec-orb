"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type PlanningRow = {
    id: string;
    city: string | null;
    project: string;
    school_name: string;
    nivel: string | null;
    exam_type: string;
    students_planned: number | null;
    proposed_date: string;
    propuesta: string | null;
    external_status: string | null;
    resultados: string | null;
    planning_status: "proposed" | "linked" | "confirmed" | "rescheduled" | "cancelled";
    event_id: string | null;
    event_session_id: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function statusBadgeVariant(status: PlanningRow["planning_status"]): "default" | "secondary" | "destructive" | "outline" {
    if (status === "linked" || status === "confirmed") return "default";
    if (status === "rescheduled") return "secondary";
    if (status === "cancelled") return "destructive";
    return "outline";
}

export default function UNOiPlanningPage() {
    const [city, setCity] = useState("");
    const [school, setSchool] = useState("");
    const [status, setStatus] = useState("");
    const [q, setQ] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [replaceByFileName, setReplaceByFileName] = useState(true);
    const [uploading, setUploading] = useState(false);

    const qs = useMemo(() => {
        const p = new URLSearchParams();
        if (city.trim()) p.set("city", city.trim());
        if (school.trim()) p.set("school", school.trim());
        if (status.trim()) p.set("status", status.trim());
        if (q.trim()) p.set("q", q.trim());
        return p.toString();
    }, [city, school, status, q]);

    const { data, isLoading, mutate } = useSWR<{ rows: PlanningRow[]; total: number }>(
        `/api/v1/planning/unoi${qs ? `?${qs}` : ""}`,
        fetcher
    );
    const rows = data?.rows ?? [];

    const groupedByDate = useMemo(() => {
        const g = new Map<string, PlanningRow[]>();
        for (const row of rows) {
            const k = row.proposed_date;
            const arr = g.get(k) ?? [];
            arr.push(row);
            g.set(k, arr);
        }
        return [...g.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [rows]);

    const linkRow = async (row: PlanningRow) => {
        setBusyId(row.id);
        try {
            const res = await fetch(`/api/v1/planning/unoi/${row.id}/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ createIfMissing: true }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || "No se pudo vincular el evento");
            }
            await mutate();
        } catch (e: any) {
            alert(e.message || "Error al vincular");
        } finally {
            setBusyId(null);
        }
    };

    const uploadPlanningFile = async () => {
        if (!uploadFile) {
            alert("Selecciona un archivo .xlsx");
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", uploadFile);
            fd.append("replace", replaceByFileName ? "true" : "false");
            const res = await fetch("/api/v1/planning/unoi/import", {
                method: "POST",
                body: fd,
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload.error || "No se pudo importar el archivo");
            }
            alert(`Importación completada. Insertadas: ${payload.inserted ?? 0}`);
            setUploadFile(null);
            await mutate();
        } catch (e: any) {
            alert(e.message || "Error al importar");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Planeación UNOi</h1>
                <p className="text-sm text-muted-foreground">
                    Planeación recibida de Sistema Uno (UNOi), separada de Eventos. Puedes vincular cada fila a un evento/sesión.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Importar Excel UNOi</CardTitle>
                    <CardDescription>
                        Sube el archivo de planeación (IH COLEGIOS SONORA). Se parsea y se guarda en este módulo sin usar consola.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-1">
                        <Label>Archivo .xlsx/.xls</Label>
                        <Input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={replaceByFileName}
                            onChange={(e) => setReplaceByFileName(e.target.checked)}
                        />
                        Reemplazar importaciones anteriores con el mismo nombre de archivo
                    </label>
                    <div className="flex items-center gap-2">
                        <Button onClick={uploadPlanningFile} disabled={!uploadFile || uploading}>
                            {uploading ? "Importando..." : "Importar Excel UNOi"}
                        </Button>
                        {uploadFile && <span className="text-xs text-muted-foreground">{uploadFile.name}</span>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <CardDescription>Filtra por ciudad, colegio, estatus o texto libre.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                        <Label>Ciudad</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="HMO, OBRE..." />
                    </div>
                    <div className="space-y-1">
                        <Label>Colegio</Label>
                        <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Nombre colegio" />
                    </div>
                    <div className="space-y-1">
                        <Label>Estatus</Label>
                        <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="proposed / linked..." />
                    </div>
                    <div className="space-y-1">
                        <Label>Búsqueda</Label>
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="exam, propuesta..." />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Calendario / Grid</CardTitle>
                    <CardDescription>{isLoading ? "Cargando..." : `${rows.length} filas`}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {groupedByDate.map(([date, dateRows]) => (
                        <div key={date} className="rounded-lg border p-3 space-y-2 bg-card/60">
                            <div className="flex items-center justify-between">
                                <p className="font-medium">{date}</p>
                                <Badge variant="outline">{dateRows.length} filas</Badge>
                            </div>
                            {dateRows.slice(0, 8).map((row) => (
                                <div key={row.id} className="rounded border p-2 space-y-1 bg-background/60">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium truncate">{row.school_name}</p>
                                        <Badge variant={statusBadgeVariant(row.planning_status)}>{row.planning_status}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                        <span>{row.city ?? "N/A"}</span>
                                        <span>·</span>
                                        <span>{row.exam_type.toUpperCase()}</span>
                                        <span>·</span>
                                        <span>{row.students_planned ?? 0} alumnos</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Detalle y vinculación</CardTitle>
                    <CardDescription>Vincula filas a eventos/sesiones existentes o crea automáticamente si falta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {rows.map((row) => (
                        <div key={row.id} className="rounded-lg border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="space-y-1">
                                <p className="font-medium">{row.school_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {row.proposed_date} · {row.exam_type.toUpperCase()} · {row.students_planned ?? 0} alumnos ·{" "}
                                    {row.city ?? "N/A"} · Proyecto: {row.project}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                    <Badge variant={statusBadgeVariant(row.planning_status)}>{row.planning_status}</Badge>
                                    {row.event_id ? <Badge variant="secondary">Evento vinculado</Badge> : <Badge variant="outline">Sin evento</Badge>}
                                    {row.event_session_id ? (
                                        <Badge variant="secondary">Sesión vinculada</Badge>
                                    ) : (
                                        <Badge variant="outline">Sin sesión</Badge>
                                    )}
                                </div>
                            </div>
                            <Button
                                onClick={() => linkRow(row)}
                                disabled={busyId === row.id}
                                variant={row.event_session_id ? "outline" : "default"}
                            >
                                {busyId === row.id ? "Vinculando..." : row.event_session_id ? "Re-vincular" : "Vincular a evento"}
                            </Button>
                        </div>
                    ))}
                    {!isLoading && rows.length === 0 && (
                        <p className="text-sm text-muted-foreground">No hay filas de planeación para los filtros seleccionados.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

