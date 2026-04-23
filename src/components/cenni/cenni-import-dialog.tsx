"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
// I18n removed
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CenniImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface ParsedCenni {
    folio_cenni: string;
    cliente_estudiante: string;
    celular: string | null;
    correo: string | null;
    solicitud_cenni: boolean;
    acta_o_curp: boolean;
    id_documento: boolean;
    certificado: string | null;
    datos_curp: string | null;
    cliente: string | null;
    estatus: string;
    estatus_certificado: string | null;
    [key: string]: any;
}

export function CenniImportDialog({ open, onOpenChange, onSuccess }: CenniImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ParsedCenni[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
            setError("Por favor, sube un archivo Excel (.xlsx, .xls) o CSV.");
            return;
        }

        setFile(selectedFile);
        setError(null);
        processFile(selectedFile);
    };

    const parseBoolean = (val: any) => {
        if (!val) return false;
        const s = String(val).trim().toUpperCase();
        return s === "SI" || s === "SÍ" || s === "YES" || s === "TRUE" || s === "1" || s === "X";
    };

    const processFile = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const normalizeKeys = (obj: any) => {
                    const newObj: any = {};
                    for (const key of Object.keys(obj)) {
                        const cleanKey = key.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
                        newObj[cleanKey] = obj[key];
                    }
                    return newObj;
                };

                const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                const json = rawJson.map(normalizeKeys);

                if (json.length === 0) {
                    throw new Error("El archivo está vacío.");
                }

                // Parse and map columns
                const parsed: ParsedCenni[] = json.map((row, index) => {
                    const cliente_estudiante = row["CLIENTE/ESTUDIANTE"]?.toString().trim() || row["CLIENTE ESTUDIANTE"]?.toString().trim();
                    const folio_cenni = row["FOLIO CENNI"]?.toString().trim() || row["FOLIO"]?.toString().trim();

                    if (!cliente_estudiante) {
                        throw new Error(`Fila ${index + 2}: El campo 'CLIENTE/ESTUDIANTE' es obligatorio.`);
                    }
                    if (!folio_cenni) {
                        throw new Error(`Fila ${index + 2}: El campo 'FOLIO CENNI' es obligatorio.`);
                    }

                    let estatus = row["ESTATUS"]?.toString().trim().toUpperCase() || "EN OFICINA";
                    // Normalize legacy values to the canonical 5-value enum
                    if (estatus === "PENDIENTE" || estatus === "EN OFICINA/POR ENVIAR") estatus = "EN OFICINA";
                    if (estatus === "EN TRAMITE" || estatus === "REVISION" || estatus === "EN TRAMITE" || estatus === "TRÁMITE") estatus = "EN TRAMITE/REVISION";
                    let estatus_certificado = row["ESTATUS CERTIFICADO"]?.toString().trim().toUpperCase() || null;
                    if (estatus_certificado === "PENDIENTE") estatus_certificado = "EN PROCESO DE DICTAMINACION";

                    return {
                        cliente_estudiante,
                        folio_cenni,
                        celular: row["CELULAR"]?.toString().trim() || null,
                        correo: row["CORREO"]?.toString().trim() || row["CORREO ELECTRÓNICO"]?.toString().trim() || null,
                        solicitud_cenni: parseBoolean(row["SOLICITUD CENNI"]),
                        acta_o_curp: parseBoolean(row["ACTA O CURP"] || row["ACTA/CURP"]),
                        id_documento: parseBoolean(row["ID"] || row["ID DOCUMENTO"]),
                        certificado: row["CERTIFICADO"]?.toString().trim() || row["CERTIFICAD O"]?.toString().trim() || null,
                        datos_curp: row["DATOS CURP"]?.toString().trim() || null,
                        cliente: row["CLIENTE"]?.toString().trim() || null,
                        estatus,
                        estatus_certificado,
                        fecha_recepcion: row["FECHA RECEPCION"]?.toString().trim() || null,
                        fecha_revision: row["FECHA REVISION"]?.toString().trim() || null,
                        motivo_rechazo: row["MOTIVO RECHAZO"]?.toString().trim() || null,
                    };
                });

                setPreviewData(parsed);
                setError(null);
            } catch (err: any) {
                console.error("Error al procesar Excel:", err);
                setError(err.message || "Error al leer el archivo. Verifica que el formato sea correcto.");
                setPreviewData([]);
                setFile(null);
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            setError("Error al leer el archivo desde el navegador.");
            setIsProcessing(false);
        };

        reader.readAsArrayBuffer(file);
    };

    const handleUpload = async () => {
        if (previewData.length === 0) return;
        setIsUploading(true);
        setError(null);

        try {
            const response = await fetch("/api/v1/cenni/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cases: previewData }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Hubo un problema al subir los datos.");
            }

            toast.success(`Se han importado ${result.count} trámites de CENNI exitosamente.`);
            onSuccess();
        } catch (err: any) {
            console.error("Bulk upload error:", err);
            setError(err.message || "Error de conexión al subir.");
        } finally {
            setIsUploading(false);
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            {
                "CLIENTE/ESTUDIANTE": "Juan Perez Ramos",
                "FOLIO CENNI": "CENN-12345",
                "CELULAR": "3312345678",
                "CORREO": "juan@ejemplo.com",
                "SOLICITUD CENNI": "SI",
                "ACTA O CURP": "SI",
                "ID": "SI",
                "CERTIFICADO": "COPIA OOPT",
                "DATOS CURP": "PERJ900815HJC",
                "CLIENTE": "EXTERNO",
                "ESTATUS": "EN OFICINA",
                "FECHA RECEPCION": "",
                "FECHA REVISION": "",
                "MOTIVO RECHAZO": "",
                "ESTATUS CERTIFICADO": ""
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "CENNI");
        XLSX.writeFile(wb, "Plantilla_CENNI_LEC.xlsx");
    };

    const resetState = () => {
        setFile(null);
        setPreviewData([]);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                if (!val) resetState();
                onOpenChange(val);
            }}
        >
            <DialogContent className="max-w-[70vw] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        Importar CENNI desde Excel
                    </DialogTitle>
                    <DialogDescription>
                        Sube tu base de datos de trámites CENNI en formato .xlsx o .csv.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
                    {error && (
                        <Alert variant="destructive" className="mb-4 shrink-0">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error de Formato</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!file ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 p-12 text-center">
                            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                            <h3 className="font-medium text-lg mb-1">Selecciona un archivo</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                                Arrastra y suelta tu archivo Excel aquí, o haz clic para explorar tus archivos locales.
                            </p>
                            <div className="flex gap-4">
                                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                                    <FileSpreadsheet className="h-4 w-4" /> Buscar Archivo
                                </Button>
                                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                                    <Download className="h-4 w-4" /> Descargar Plantilla
                                </Button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                            />
                        </div>
                    ) : isProcessing ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p>Procesando archivo...</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-2 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Archivo Válido
                                    </Badge>
                                    <span className="text-sm text-muted-foreground font-medium">
                                        Se encontraron {previewData.length} registros.
                                    </span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={resetState}>Cambiar Archivo</Button>
                            </div>

                            <ScrollArea className="flex-1 border rounded-md">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Estudiante</th>
                                            <th className="px-4 py-3 font-medium">Folio</th>
                                            <th className="px-4 py-3 font-medium">Contacto</th>
                                            <th className="px-4 py-3 font-medium text-center">Docs (Sol/CURP/ID)</th>
                                            <th className="px-4 py-3 font-medium">Estatus</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y relative">
                                        {previewData.slice(0, 50).map((app, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30">
                                                <td className="px-4 py-2 font-medium">{app.cliente_estudiante}</td>
                                                <td className="px-4 py-2 font-mono text-xs">{app.folio_cenni}</td>
                                                <td className="px-4 py-2 text-muted-foreground text-xs">
                                                    <div>{app.celular || '-'}</div>
                                                    <div>{app.correo || '-'}</div>
                                                </td>
                                                <td className="px-4 py-2 text-center text-xs">
                                                    <span className={app.solicitud_cenni ? "text-emerald-500 font-bold" : "text-muted-foreground"}>{app.solicitud_cenni ? "S" : "-"}</span> /
                                                    <span className={app.acta_o_curp ? "text-emerald-500 font-bold ml-1" : "text-muted-foreground ml-1"}>{app.acta_o_curp ? "C" : "-"}</span> /
                                                    <span className={app.id_documento ? "text-emerald-500 font-bold ml-1" : "text-muted-foreground ml-1"}>{app.id_documento ? "I" : "-"}</span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Badge variant="outline" className="text-[10px]">{app.estatus}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 50 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground italic border-t">
                                        Mostrando solo los primeros 50 registros de {previewData.length}.
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-6 shrink-0 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || previewData.length === 0 || isUploading}
                        className="gap-2"
                    >
                        {isUploading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                        ) : (
                            <><Upload className="h-4 w-4" /> Importar {previewData.length > 0 ? previewData.length : ""} Registros</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
