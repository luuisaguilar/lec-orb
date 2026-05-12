"use client";

import { useCallback, useState } from "react";
import JSZip from "jszip";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
};

type SplitResponse = {
    total_pages: number;
    processed: number;
    errors: number;
    results: SplitResultRow[];
    error_details: { page: number; name: string; error: string }[];
};

export default function OoptPdfPage() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [xlsFile, setXlsFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SplitResponse | null>(null);

    const onProcess = useCallback(async () => {
        if (!pdfFile) {
            toast.error("Selecciona el PDF consolidado de Oxford.");
            return;
        }
        setLoading(true);
        setData(null);
        try {
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

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <FileText className="h-7 w-7" />
                    OOPT — PDF por alumno
                </h1>
                <p className="text-muted-foreground mt-1">
                    Sube el PDF consolidado de Oxford y, opcionalmente, el <code className="text-xs bg-muted px-1 rounded">TableData.xls</code>{" "}
                    exportado desde el portal para nombres y niveles más limpios.
                </p>
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
