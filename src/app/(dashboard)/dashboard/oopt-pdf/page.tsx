"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import JSZip from "jszip";
import { FileText, FolderOpen, Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { normalizePdfInputBytes } from "@/lib/oopt-pdf-validate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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

type SplitResultRow = {
    page: number;
    original_name: string;
    final_name: string;
    level: string;
    score: string;
    date: string;
    filename: string;
    source: string;
    status: string;
    pdfBase64: string;
    ue_score?: string;
    ue_cef?: string;
    li_score?: string;
    li_cef?: string;
};

type SplitResponse = {
    total_pages: number;
    processed: number;
    errors: number;
    results: SplitResultRow[];
    error_details: { page: number; name: string; error: string }[];
};

type EventOption = { id: string; title: string; date?: string | null };

async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
}

export default function OoptPdfPage() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [xlsFile, setXlsFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SplitResponse | null>(null);

    const [saveOpen, setSaveOpen] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveTitle, setSaveTitle] = useState("");
    const [eventId, setEventId] = useState<string>("");
    const [logisticsNotes, setLogisticsNotes] = useState("");
    const [analysisNotes, setAnalysisNotes] = useState("");
    const [generalNotes, setGeneralNotes] = useState("");
    const [includeSourcePdf, setIncludeSourcePdf] = useState(true);
    const [events, setEvents] = useState<EventOption[]>([]);

    useEffect(() => {
        if (!saveOpen) return;
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
                /* optional */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [saveOpen]);

    const onProcess = useCallback(async () => {
        if (!pdfFile) {
            toast.error("Selecciona el PDF consolidado de Oxford.");
            return;
        }
        setLoading(true);
        setData(null);
        try {
            const headBytes = new Uint8Array(
                await pdfFile.slice(0, Math.min(pdfFile.size, 256 * 1024)).arrayBuffer()
            );
            normalizePdfInputBytes(headBytes, pdfFile.name);

            const fd = new FormData();
            fd.append("pdf", pdfFile);
            if (xlsFile) fd.append("xls", xlsFile);

            const res = await fetch("/api/v1/oopt/split", {
                method: "POST",
                body: fd,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json.error || `Error ${res.status}`);
            }
            setData(json as SplitResponse);
            toast.success(`Listo: ${(json as SplitResponse).processed} PDF generados.`);
        } catch (e: any) {
            toast.error(e?.message || "No se pudo procesar.");
        } finally {
            setLoading(false);
        }
    }, [pdfFile, xlsFile]);

    const onDownloadZip = useCallback(async () => {
        if (!data?.results?.length) return;
        try {
            const zip = new JSZip();
            for (const row of data.results) {
                const bin = Uint8Array.from(atob(row.pdfBase64), (c) => c.charCodeAt(0));
                zip.file(row.filename, bin);
            }
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `OOPT_resultados_${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("ZIP descargado.");
        } catch {
            toast.error("No se pudo generar el ZIP.");
        }
    }, [data]);

    const openSaveDialog = () => {
        if (!data?.results?.length) return;
        const base =
            pdfFile?.name?.replace(/\.pdf$/i, "") ||
            `OOPT ${new Date().toLocaleDateString("es-MX", { dateStyle: "medium" })}`;
        setSaveTitle(base.slice(0, 200));
        setEventId("");
        setLogisticsNotes("");
        setAnalysisNotes("");
        setGeneralNotes("");
        setIncludeSourcePdf(!!pdfFile);
        setSaveOpen(true);
    };

    const onSaveProject = async () => {
        if (!data?.results?.length) return;
        const title = saveTitle.trim();
        if (!title) {
            toast.error("Escribe un título para el proyecto.");
            return;
        }
        setSaveLoading(true);
        try {
            let source_pdf_base64: string | null = null;
            if (includeSourcePdf && pdfFile) {
                source_pdf_base64 = await fileToBase64(pdfFile);
            }
            const body = {
                title,
                event_id: eventId || null,
                logistics_notes: logisticsNotes.trim() || null,
                analysis_notes: analysisNotes.trim() || null,
                general_notes: generalNotes.trim() || null,
                source_pdf_filename: includeSourcePdf && pdfFile ? pdfFile.name : null,
                source_pdf_base64,
                split: {
                    total_pages: data.total_pages,
                    processed: data.processed,
                    errors: data.errors,
                    results: data.results.map((r) => ({
                        page: r.page,
                        original_name: r.original_name,
                        final_name: r.final_name,
                        level: r.level,
                        score: r.score,
                        date: r.date,
                        filename: r.filename,
                        source: r.source,
                        status: r.status,
                        ue_score: r.ue_score ?? "",
                        ue_cef: r.ue_cef ?? "",
                        li_score: r.li_score ?? "",
                        li_cef: r.li_cef ?? "",
                        pdfBase64: r.pdfBase64,
                    })),
                    error_details: data.error_details,
                },
            };
            const res = await fetch("/api/v1/oopt/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
            toast.success("Proyecto guardado.");
            setSaveOpen(false);
            if (json.id) {
                window.location.href = `/dashboard/oopt-pdf/proyectos/${json.id}`;
            }
        } catch (e: any) {
            toast.error(e?.message || "No se pudo guardar.");
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <FileText className="h-7 w-7" />
                        OOPT — PDF por alumno
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Sube el PDF consolidado de Oxford y, opcionalmente, el{" "}
                        <code className="text-xs bg-muted px-1 rounded">TableData.xls</code> exportado desde el portal
                        para nombres y niveles más limpios.
                    </p>
                </div>
                <Button variant="outline" asChild className="shrink-0">
                    <Link href="/dashboard/oopt-pdf/proyectos">
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Proyectos guardados
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Archivos</CardTitle>
                    <CardDescription>
                        El procesamiento ocurre en el servidor de LEC Orb; no necesitas correr el agente Flask aparte.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="oopt-pdf">PDF consolidado (obligatorio)</Label>
                            <InputFile
                                id="oopt-pdf"
                                accept=".pdf,application/pdf"
                                onFile={setPdfFile}
                                file={pdfFile}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="oopt-xls">TableData.xls (recomendado)</Label>
                            <InputFile
                                id="oopt-xls"
                                accept=".xls,.html,text/html"
                                onFile={setXlsFile}
                                file={xlsFile}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={onProcess} disabled={loading || !pdfFile}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando…
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Procesar
                                </>
                            )}
                        </Button>
                        <Button variant="secondary" onClick={onDownloadZip} disabled={!data?.results?.length}>
                            Descargar ZIP
                        </Button>
                        <Button variant="secondary" onClick={openSaveDialog} disabled={!data?.results?.length}>
                            <Save className="mr-2 h-4 w-4" />
                            Guardar proyecto
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {data && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                        <CardDescription>
                            {data.total_pages} página(s) · {data.processed} correctos
                            {data.errors > 0 ? ` · ${data.errors} error(es)` : ""}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.error_details.length > 0 && (
                            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                                <p className="font-medium text-destructive">Errores por página</p>
                                <ul className="mt-1 list-disc pl-5">
                                    {data.error_details.map((e) => (
                                        <li key={e.page}>
                                            Página {e.page} ({e.name}): {e.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-14">#</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Nivel</TableHead>
                                        <TableHead>Score</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Origen</TableHead>
                                        <TableHead className="min-w-[200px]">Archivo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.results.map((r) => (
                                        <TableRow key={r.page}>
                                            <TableCell>{r.page}</TableCell>
                                            <TableCell>{r.final_name}</TableCell>
                                            <TableCell>{r.level}</TableCell>
                                            <TableCell>{r.score}</TableCell>
                                            <TableCell>{r.date}</TableCell>
                                            <TableCell>{r.source === "table" ? "Tabla" : "PDF"}</TableCell>
                                            <TableCell className="font-mono text-xs">{r.filename}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Guardar proyecto OOPT</DialogTitle>
                        <DialogDescription>
                            Los PDFs por alumno y las notas quedan en tu organización. Opcionalmente vincula un
                            evento de LEC Orb para cruzar con logística.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="save-title">Título</Label>
                            <Input
                                id="save-title"
                                value={saveTitle}
                                onChange={(e) => setSaveTitle(e.target.value)}
                                placeholder="Ej. OOPT Colegio Larrea — abril 2026"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Evento (opcional)</Label>
                            <Select value={eventId || "__none__"} onValueChange={(v) => setEventId(v === "__none__" ? "" : v)}>
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
                            <Label htmlFor="save-log">Logística</Label>
                            <Textarea
                                id="save-log"
                                rows={3}
                                value={logisticsNotes}
                                onChange={(e) => setLogisticsNotes(e.target.value)}
                                placeholder="Sede, contactos, materiales…"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="save-an">Análisis</Label>
                            <Textarea
                                id="save-an"
                                rows={3}
                                value={analysisNotes}
                                onChange={(e) => setAnalysisNotes(e.target.value)}
                                placeholder="Lectura de resultados, niveles, seguimiento…"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="save-gen">Información general</Label>
                            <Textarea
                                id="save-gen"
                                rows={2}
                                value={generalNotes}
                                onChange={(e) => setGeneralNotes(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="save-src"
                                checked={includeSourcePdf}
                                onCheckedChange={(v) => setIncludeSourcePdf(v === true)}
                                disabled={!pdfFile}
                            />
                            <Label htmlFor="save-src" className="text-sm font-normal leading-snug cursor-pointer">
                                Incluir PDF consolidado original (aumenta el tamaño del guardado)
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" type="button" onClick={() => setSaveOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={onSaveProject} disabled={saveLoading}>
                            {saveLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando…
                                </>
                            ) : (
                                "Guardar"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InputFile({
    id,
    accept,
    file,
    onFile,
}: {
    id: string;
    accept: string;
    file: File | null;
    onFile: (f: File | null) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <input
                id={id}
                type="file"
                accept={accept}
                className="text-sm file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            {file && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{file.name}</span>}
        </div>
    );
}
