"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: Region;
    onClose: () => void;
    onImported: () => void;
}

export function IhImportDialog({ region, onClose, onImported }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [sessionDate, setSessionDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ imported: number; skipped: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleImport() {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);

        const form = new FormData();
        form.append("file", file);
        form.append("region", region);
        if (sessionDate) form.append("session_date", sessionDate);

        try {
            const res  = await fetch("/api/v1/finance/ih/sessions/import", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Error al importar"); return; }
            setResult(data);
        } catch {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Importar sesiones desde Excel</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Acepta el formato del Excel <strong>DESGLOSE</strong> con columnas: COLEGIO, EXAMEN, No. EXAM, TARIFA.
                        Región: <strong>{region === "SONORA" ? "Sonora" : "Baja California"}</strong>.
                    </p>

                    <div className="flex flex-col gap-1.5">
                        <Label>Archivo Excel / CSV *</Label>
                        <div
                            className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/30"
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={e => setFile(e.target.files?.[0] ?? null)}
                            />
                            {file ? (
                                <p className="text-sm font-medium">{file.name}</p>
                            ) : (
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                    <Upload className="h-6 w-6" />
                                    <p className="text-sm">Haz clic para seleccionar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Fecha de sesión (si no está en el Excel)</Label>
                        <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                    </div>

                    {result && (
                        <div className="flex items-start gap-2 rounded-md bg-green-50 border border-green-200 p-3">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium text-green-800">{result.imported} sesiones importadas</p>
                                {result.skipped.length > 0 && (
                                    <p className="text-green-700">{result.skipped.length} filas omitidas: {result.skipped.slice(0, 3).join(", ")}{result.skipped.length > 3 ? "..." : ""}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    {result ? (
                        <Button onClick={onImported}>Listo</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button onClick={handleImport} disabled={!file || loading}>
                                {loading ? "Importando..." : "Importar"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
