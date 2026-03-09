"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ImportToeflCodesDialogProps {
    onSuccess?: () => void;
}

export function ImportToeflCodesDialog({ onSuccess }: ImportToeflCodesDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            toast.error("Por favor selecciona un archivo Excel o CSV.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Expected to return array of JSON objects based on headers
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (jsonData.length === 0) {
                toast.error("El archivo está vacío o no se pudo procesar.");
                setIsSubmitting(false);
                return;
            }

            // Post to backend API
            const response = await fetch("/api/v1/toefl/codes/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(jsonData),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Error al procesar el archivo en el servidor");
            }

            const result = await response.json();
            toast.success(`Importación finalizada. ${result.successCount} folios actualizados. ${result.errorCount} omitidos.`);

            setOpen(false);
            setSelectedFile(null);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Error al leer el archivo. Verifica el formato.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-xl text-lec-blue">
                        <FileSpreadsheet className="mr-2 h-5 w-5" /> Importar Códigos / Vouchers
                    </DialogTitle>
                    <DialogDescription>
                        Sube el archivo Excel proporcionado por ETS. El sistema conectará los datos con los espacios reservados usando el campo <strong>UNIQ-ID</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="file-upload" className="font-semibold text-sm cursor-pointer border-2 border-dashed border-muted-foreground/30 p-6 rounded-md hover:bg-muted/20 transition-colors text-center">
                            {selectedFile ? (
                                <span className="text-emerald-600 font-bold">{selectedFile.name}</span>
                            ) : (
                                <span className="text-muted-foreground">Clic para buscar archivo Excel (.xlsx, .csv)</span>
                            )}
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={!selectedFile || isSubmitting} className="font-semibold bg-[#0034a1] hover:bg-[#0034a1]/90">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Procesar Excel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
