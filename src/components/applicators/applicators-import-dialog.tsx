"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { normalizeExamName } from "@/lib/exam-utils";
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

interface ApplicatorImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface ParsedApplicator {
    external_id: string | null;
    name: string;
    birth_date: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
    authorized_exams: string[];
    [key: string]: any;
}

export function ApplicatorImportDialog({ open, onOpenChange, onSuccess }: ApplicatorImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ParsedApplicator[]>([]);
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

    const processFile = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON, treating first row as headers
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (json.length === 0) {
                    throw new Error("El archivo está vacío.");
                }

                // Parse and map columns
                const parsed: ParsedApplicator[] = json.map((row, index) => {
                    const name = row["NOMBRE"]?.toString().trim();
                    if (!name) {
                        throw new Error(`Fila ${index + 2}: El campo 'NOMBRE' es obligatorio.`);
                    }

                    // Handle potentially raw Excel dates (numbers) or strings
                    let birth_date = null;
                    const fdn = row["FDN"] || row["FDN (fecha de nacimiento)"];
                    if (fdn) {
                        if (typeof fdn === 'number') {
                            // Excel date serial number to YYYY-MM-DD
                            const date = new Date(Math.round((fdn - 25569) * 86400 * 1000));
                            if (!isNaN(date.getTime())) {
                                birth_date = date.toISOString().split('T')[0];
                            }
                        } else if (typeof fdn === 'string') {
                            // Try to parse string date (e.g. DD/MM/YYYY)
                            const parts = fdn.split(/[-/]/);
                            if (parts.length === 3) {
                                // Assume DD/MM/YYYY for Mexico locale, convert to YYYY-MM-DD
                                birth_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            } else {
                                birth_date = fdn; // Fallback to raw string, might fail DB constraints
                            }
                        }
                    }

                    // Handle authorized exams (split by comma/newline, normalize each value)
                    const rawExams = row["EXÁMENES AUTORIZADOS"]?.toString() || "";
                    const authorized_exams = rawExams
                        .split(/[,\n]/)
                        .map((e: string) => normalizeExamName(e.trim()))
                        .filter(Boolean);

                    return {
                        external_id: row["ID"]?.toString().trim() || null,
                        name,
                        birth_date,
                        city: row["CIUDAD DE ORIGEN"]?.toString().trim() || null,
                        authorized_exams,
                        email: row["CORREO ELECTRÓNICO"]?.toString().trim() || row["CORREO"]?.toString().trim() || null,
                        phone: row["CELULAR"]?.toString().trim() || null,
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
            const response = await fetch("/api/v1/applicators/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ applicators: previewData }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Hubo un problema al subir los datos.");
            }

            toast.success(`Se han importado ${result.count} aplicadores exitosamente.`);
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
                "ID": "APP-100",
                "NOMBRE": "Juan Perez Ramos",
                "FDN (fecha de nacimiento)": "15/08/1990",
                "CIUDAD DE ORIGEN": "Guadalajara",
                "EXÁMENES AUTORIZADOS": "TOEFL, YLE",
                "CORREO ELECTRÓNICO": "juan@ejemplo.com",
                "CELULAR": "3312345678"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Aplicadores");
        XLSX.writeFile(wb, "Plantilla_Aplicadores_LEC.xlsx");
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        Importar Aplicadores desde Excel
                    </DialogTitle>
                    <DialogDescription>
                        Sube tu base de datos de aplicadores en formato .xlsx o .csv.
                        Asegúrate de que los encabezados de las columnas coincidan con la plantilla.
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
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Archivo Válido
                                    </Badge>
                                    <span className="text-sm text-muted-foreground font-medium">
                                        Se encontraron {previewData.length} aplicadores.
                                    </span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={resetState}>Cambiar Archivo</Button>
                            </div>

                            <ScrollArea className="flex-1 border rounded-md">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">ID</th>
                                            <th className="px-4 py-3 font-medium">Nombre</th>
                                            <th className="px-4 py-3 font-medium">FDN</th>
                                            <th className="px-4 py-3 font-medium">Ciudad</th>
                                            <th className="px-4 py-3 font-medium">Email</th>
                                            <th className="px-4 py-3 font-medium">Celular</th>
                                            <th className="px-4 py-3 font-medium">Exámenes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y relative">
                                        {previewData.slice(0, 50).map((app, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30">
                                                <td className="px-4 py-2 font-mono text-xs">{app.external_id || '-'}</td>
                                                <td className="px-4 py-2 font-medium">{app.name}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{app.birth_date || '-'}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{app.city || '-'}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{app.email || '-'}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{app.phone || '-'}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {app.authorized_exams.length > 0 ? app.authorized_exams.map((ex, i) => (
                                                            <Badge key={i} variant="outline" className="text-[10px]">{ex}</Badge>
                                                        )) : <span className="text-muted-foreground">-</span>}
                                                    </div>
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
