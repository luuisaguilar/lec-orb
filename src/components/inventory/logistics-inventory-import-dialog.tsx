"use client";

import { useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import * as XLSX from "xlsx";

export interface LogisticsInventoryImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

function normKey(k: string): string {
    return k
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");
}

function pickName(row: Record<string, unknown>): string {
    const keys = Object.keys(row);
    for (const k of keys) {
        const n = normKey(k);
        if (["nombre", "name", "producto", "descripcion_producto", "item"].includes(n)) {
            const v = row[k];
            if (v != null && String(v).trim()) return String(v).trim();
        }
    }
    return "";
}

function pickSku(row: Record<string, unknown>): string | undefined {
    for (const k of Object.keys(row)) {
        const n = normKey(k);
        if (["sku", "codigo", "code"].includes(n)) {
            const v = row[k];
            const s = v != null ? String(v).trim() : "";
            return s || undefined;
        }
    }
    return undefined;
}

function pickCategory(row: Record<string, unknown>): string | undefined {
    for (const k of Object.keys(row)) {
        const n = normKey(k);
        if (["categoria", "category", "tipo"].includes(n)) {
            const v = row[k];
            const s = v != null ? String(v).trim() : "";
            return s || undefined;
        }
    }
    return undefined;
}

function pickMinStock(row: Record<string, unknown>): number | undefined {
    for (const k of Object.keys(row)) {
        const n = normKey(k);
        if (
            ["min", "minimo", "min_stock", "min_stock_level", "stock_minimo", "minimo_stock"].includes(
                n
            )
        ) {
            const v = row[k];
            if (v == null || v === "") return undefined;
            const num = Number(v);
            return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : undefined;
        }
    }
    return undefined;
}

export function LogisticsInventoryImportDialog({
    open,
    onOpenChange,
    onSuccess,
}: LogisticsInventoryImportDialogProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
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
                const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
                setPreview(json.slice(0, 5));
                toast.info(`${json.length} filas detectadas`);
            } catch {
                toast.error("No se pudo leer el Excel");
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

            const rows: Record<string, unknown>[] = await new Promise((resolve, reject) => {
                reader.onload = (evt) => {
                    try {
                        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: "array" });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet));
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.readAsArrayBuffer(file);
            });

            let created = 0;
            let skipped = 0;

            for (const row of rows) {
                const name = pickName(row);
                if (!name) {
                    skipped++;
                    continue;
                }

                const res = await fetch("/api/v1/inventory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        sku: pickSku(row),
                        category: pickCategory(row),
                        min_stock_level: pickMinStock(row) ?? 5,
                    }),
                });

                if (res.ok) created++;
                else skipped++;
            }

            toast.success(`Importación: ${created} creados, ${skipped} omitidos o error`);
            onSuccess();
        } catch {
            toast.error("Error al importar");
        } finally {
            setIsImporting(false);
            setPreview([]);
            setFileName("");
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Importar inventario (Excel)
                    </DialogTitle>
                    <DialogDescription>
                        Columnas reconocidas: nombre / producto / name, sku / codigo, categoria, min /
                        minimo / min_stock (opcional; por defecto 5).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div
                        className="cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:bg-muted/50"
                        onClick={() => fileRef.current?.click()}
                    >
                        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            {fileName || "Selecciona un archivo .xlsx"}
                        </p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {preview.length > 0 && (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/50">
                                        {Object.keys(preview[0])
                                            .slice(0, 5)
                                            .map((key) => (
                                                <th
                                                    key={key}
                                                    className="px-2 py-1.5 text-left font-medium"
                                                >
                                                    {key}
                                                </th>
                                            ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, i) => (
                                        <tr key={i} className="border-t">
                                            {Object.values(row)
                                                .slice(0, 5)
                                                .map((val, j) => (
                                                    <td
                                                        key={j}
                                                        className="max-w-[150px] truncate px-2 py-1.5"
                                                    >
                                                        {String(val ?? "")}
                                                    </td>
                                                ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
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
                            {isImporting ? "Importando…" : "Importar"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
