"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Download,
    FileStack,
    Loader2,
    Save,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ProjectDetail = {
    id: string;
    title: string;
    event_id: string | null;
    logistics_notes: string | null;
    analysis_notes: string | null;
    general_notes: string | null;
    source_pdf_filename: string | null;
    source_pdf_storage_path: string | null;
    total_pages: number;
    processed_count: number;
    errors_count: number;
    split_errors: unknown;
    created_at: string;
    updated_at: string;
};

type LinkedEvent = {
    id: string;
    title: string;
    date: string | null;
    status: string | null;
} | null;

type ResultRow = {
    id: string;
    page_number: number;
    final_name: string;
    level: string;
    score: string;
    result_date: string;
    source: string;
    filename: string;
};

export default function OoptProyectoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [linkedEvent, setLinkedEvent] = useState<LinkedEvent>(null);
    const [results, setResults] = useState<ResultRow[]>([]);

    const [title, setTitle] = useState("");
    const [eventId, setEventId] = useState("");
    const [events, setEvents] = useState<{ id: string; title: string; date?: string | null }[]>([]);
    const [logistics, setLogistics] = useState("");
    const [analysis, setAnalysis] = useState("");
    const [general, setGeneral] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/oopt/projects/${id}`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
            setProject(json.project);
            setLinkedEvent(json.linked_event ?? null);
            setResults(json.results ?? []);
            setTitle(json.project?.title ?? "");
            setEventId((json.project?.event_id as string) || "");
            setLogistics(json.project?.logistics_notes ?? "");
            setAnalysis(json.project?.analysis_notes ?? "");
            setGeneral(json.project?.general_notes ?? "");
        } catch (e: any) {
            toast.error(e?.message ?? "No se pudo cargar.");
            setProject(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/v1/events");
                const json = await res.json().catch(() => ({}));
                if (!res.ok) return;
                const list = (json.events ?? []) as { id: string; title?: string; date?: string }[];
                if (!cancelled) {
                    setEvents(
                        list.map((e) => ({
                            id: e.id,
                            title: e.title || "Sin título",
                            date: e.date,
                        }))
                    );
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const onSaveNotes = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/oopt/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    event_id: eventId || null,
                    logistics_notes: logistics || null,
                    analysis_notes: analysis || null,
                    general_notes: general || null,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
            toast.success("Cambios guardados.");
            await load();
        } catch (e: any) {
            toast.error(e?.message ?? "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    const downloadOne = async (resultId: string) => {
        try {
            const res = await fetch(`/api/v1/oopt/projects/${id}/downloads/${resultId}`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
            window.open(json.url as string, "_blank", "noopener,noreferrer");
        } catch (e: any) {
            toast.error(e?.message ?? "No se pudo descargar.");
        }
    };

    const downloadSource = async () => {
        try {
            const res = await fetch(`/api/v1/oopt/projects/${id}/source`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
            window.open(json.url as string, "_blank", "noopener,noreferrer");
        } catch (e: any) {
            toast.error(e?.message ?? "No hay consolidado o no se pudo generar el enlace.");
        }
    };

    const onDelete = async () => {
        try {
            const res = await fetch(`/api/v1/oopt/projects/${id}`, { method: "DELETE" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
            toast.success("Proyecto eliminado.");
            router.push("/dashboard/oopt-pdf/proyectos");
        } catch (e: any) {
            toast.error(e?.message ?? "No se pudo eliminar.");
        }
    };

    if (loading && !project) {
        return (
            <div className="flex items-center gap-2 p-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando…
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-6 max-w-3xl mx-auto space-y-4">
                <Button variant="ghost" asChild>
                    <Link href="/dashboard/oopt-pdf/proyectos">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Volver a proyectos
                    </Link>
                </Button>
                <p className="text-destructive">No se encontró el proyecto.</p>
            </div>
        );
    }

    const splitErr = Array.isArray(project.split_errors) ? project.split_errors : [];

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/oopt-pdf/proyectos">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Proyectos
                    </Link>
                </Button>
                <div className="flex flex-wrap gap-2">
                    {project.source_pdf_storage_path && (
                        <Button variant="outline" size="sm" onClick={downloadSource}>
                            <Download className="h-4 w-4 mr-1" />
                            PDF consolidado
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar este proyecto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Se borrarán los PDFs guardados en almacenamiento y el registro. Esta acción no se
                                    puede deshacer.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <FileStack className="h-7 w-7" />
                    {project.title}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {project.processed_count} alumno(s) · {project.total_pages} página(s)
                    {project.errors_count > 0 ? ` · ${project.errors_count} aviso(s) en procesamiento` : ""}
                </p>
                {linkedEvent && (
                    <p className="text-sm mt-2">
                        <span className="text-muted-foreground">Evento vinculado:</span>{" "}
                        <Link
                            href={`/dashboard/eventos/${linkedEvent.id}`}
                            className="underline font-medium"
                        >
                            {linkedEvent.title}
                        </Link>
                        {linkedEvent.date ? (
                            <span className="text-muted-foreground">
                                {" "}
                                · {new Date(linkedEvent.date).toLocaleDateString("es-MX")}
                            </span>
                        ) : null}
                    </p>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Logística, análisis y contexto</CardTitle>
                    <CardDescription>
                        Usa estas notas para coordinación con la escuela, lectura de resultados y cualquier dato del
                        evento OOPT.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="proj-title">Título del proyecto</Label>
                        <Input id="proj-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Evento vinculado</Label>
                        <Select
                            value={eventId || "__none__"}
                            onValueChange={(v) => setEventId(v === "__none__" ? "" : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sin vínculo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Sin vínculo</SelectItem>
                                {events.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.title}
                                        {e.date
                                            ? ` · ${new Date(e.date).toLocaleDateString("es-MX")}`
                                            : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="proj-log">Logística</Label>
                        <Textarea
                            id="proj-log"
                            rows={4}
                            value={logistics}
                            onChange={(e) => setLogistics(e.target.value)}
                            placeholder="Contactos, horarios, sede, materiales…"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="proj-an">Análisis</Label>
                        <Textarea
                            id="proj-an"
                            rows={4}
                            value={analysis}
                            onChange={(e) => setAnalysis(e.target.value)}
                            placeholder="Lectura por niveles, alumnos en riesgo, comparativas…"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="proj-gen">Información general</Label>
                        <Textarea
                            id="proj-gen"
                            rows={3}
                            value={general}
                            onChange={(e) => setGeneral(e.target.value)}
                            placeholder="Notas libres, enlaces internos, recordatorios…"
                        />
                    </div>
                    <Button onClick={onSaveNotes} disabled={saving || !title.trim()}>
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Guardando…
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar cambios
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {splitErr.length > 0 && (
                <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardHeader>
                        <CardTitle className="text-base">Avisos al procesar (histórico)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            {splitErr.map((e: any, i: number) => (
                                <li key={i}>
                                    Página {e.page}: {e.error}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Resultados y descargas</CardTitle>
                    <CardDescription>Enlaces firmados (2 min) para cada PDF por alumno.</CardDescription>
                </CardHeader>
                <CardContent className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Nivel</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="w-28" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.page_number}</TableCell>
                                    <TableCell>{r.final_name}</TableCell>
                                    <TableCell>{r.level}</TableCell>
                                    <TableCell>{r.score}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{r.result_date}</TableCell>
                                    <TableCell>
                                        <Button variant="secondary" size="sm" onClick={() => downloadOne(r.id)}>
                                            <Download className="h-4 w-4 mr-1" />
                                            PDF
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
