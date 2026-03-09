"use client";

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface ExcelRow {
    CODIGO?: string;
    "SPEAKING PACK TEST"?: string;
    ESTATUS?: string;
    NOTAS?: string;
    [key: string]: unknown;
}

export function ExcelImportDialog({
    open,
    onOpenChange,
    onSuccess,
}: ExcelImportDialogProps) {
    const { t } = useI18n();
    const fileRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [preview, setPreview] = useState<ExcelRow[]>([]);
    const [fileName, setFileName] = useState("");

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

                // Show first 5 rows as preview
                setPreview(json.slice(0, 5));
                toast.info(`${json.length} ${t("excel.rowsProcessed")}`);
            } catch {
                toast.error(t("excel.importError"));
                setPreview([]);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    async function handleImport() {
        if (!fileRef.current?.files?.[0]) return;
        setIsImporting(true);

        try {
            const file = fileRef.current.files[0];
            const reader = new FileReader();

            const result: ExcelRow[] = await new Promise((resolve, reject) => {
                reader.onload = (evt) => {
                    try {
                        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: "array" });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        resolve(XLSX.utils.sheet_to_json<ExcelRow>(sheet));
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.readAsArrayBuffer(file);
            });

            // Process rows — create packs via API
            let created = 0;
            let skipped = 0;

            for (const row of result) {
                const codigo = String(row.CODIGO || "").trim();
                if (!codigo) {
                    skipped++;
                    continue;
                }

                const res = await fetch("/api/v1/packs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        codigo,
                        nombre: String(row["SPEAKING PACK TEST"] || "").trim(),
                        notes: String(row.NOTAS || "").trim() || undefined,
                    }),
                });

                if (res.ok) {
                    created++;
                } else {
                    skipped++;
                }
            }

            toast.success(
                `${t("excel.importSuccess")}: ${created} ${t("excel.rowsProcessed")}, ${skipped} omitidos`
            );
            onSuccess();
        } catch {
            toast.error(t("excel.importError"));
        } finally {
            setIsImporting(false);
            setPreview([]);
            setFileName("");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        {t("excel.import")}
                    </DialogTitle>
                    <DialogDescription>
                        Columnas esperadas: CODIGO, SPEAKING PACK TEST, ESTATUS, NOTAS
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File Upload */}
                    <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileRef.current?.click()}
                    >
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                            {fileName || "Click para seleccionar archivo .xlsx"}
                        </p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Preview Table */}
                    {preview.length > 0 && (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/50">
                                        {Object.keys(preview[0]).slice(0, 4).map((key) => (
                                            <th key={key} className="px-2 py-1.5 text-left font-medium">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, i) => (
                                        <tr key={i} className="border-t">
                                            {Object.values(row).slice(0, 4).map((val, j) => (
                                                <td key={j} className="px-2 py-1.5 truncate max-w-[150px]">
                                                    {String(val ?? "")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || preview.length === 0}
                        >
                            {isImporting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                            )}
                            {isImporting ? t("excel.importing") : t("excel.import")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
