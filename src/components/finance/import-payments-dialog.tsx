"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function ImportPaymentsDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stats, setStats] = useState<{ imported: number, failed: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStats(null); // Reset stats on new file pick
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setIsSubmitting(true);
        setStats(null);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/v1/payments/import", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al procesar el archivo");
            }

            setStats({
                imported: data.successCount,
                failed: data.errorCount
            });

            if (data.errorCount > 0) {
                toast.warning(`Completado con errores: ${data.successCount} creados, ${data.errorCount} ignorados/fallidos.`);
                // If there are specific errors we could console.log them or show in a details pane:
                console.warn("Import Errors:", data.errors);
            } else {
                toast.success(`Importación exitosa: ${data.successCount} registros insertados.`);
            }

            onSuccess?.();

        } catch (error: any) {
            toast.error(error.message || "La importación falló.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setFile(null);
                setStats(null);
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-dashed bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                    <Upload className="mr-2 h-4 w-4" /> Importar Histórico
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        Importar Pagos Históricos (Excel)
                    </DialogTitle>
                    <DialogDescription>
                        Sube un archivo `.xlsx` o `.csv` conteniendo el concentrado histórico de pagos. El sistema leerá e inyectará los folios ignorando duplicados.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/30">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 cursor-pointer"
                        />
                        {file && (
                            <p className="mt-4 text-sm font-medium text-emerald-600 flex items-center">
                                Archivo Seleccionado: {file.name}
                            </p>
                        )}
                    </div>

                    {stats && (
                        <div className={`p-4 rounded-md flex items-start gap-3 ${stats.failed > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-green-50 text-green-800 border-green-200"} border`}>
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold">Resultados de importación:</p>
                                <ul className="list-disc list-inside mt-1">
                                    <li>Nuevos creados: {stats.imported}</li>
                                    <li>Ignorados / Duplicados: {stats.failed}</li>
                                </ul>
                            </div>
                        </div>
                    )}

                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cerrar
                    </Button>
                    <Button onClick={handleImport} disabled={!file || isSubmitting} className="bg-green-600 hover:bg-green-700">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Procesar Importación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
