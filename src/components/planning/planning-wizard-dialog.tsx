"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { z } from "zod";
import { wizardCreateSchema } from "@/lib/planning/wizard";

type WizardPayload = z.infer<typeof wizardCreateSchema>;

function parseRowsFromText(raw: string, projectType: string): WizardPayload["rows"] {
    const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    return lines.map((line) => {
        const [date, school, exam, students, city = "", nivel = ""] = line.split("|").map((v) => v.trim());
        return {
            proposed_date: date,
            school_name: school,
            exam_type: exam,
            students_planned: students ? Number(students) : null,
            city: city || null,
            nivel: nivel || null,
            project: projectType.toUpperCase(),
        };
    });
}

export function PlanningWizardDialog({
    triggerLabel = "Nuevo evento (wizard)",
    defaultProjectType = "unoi",
    onDone,
}: {
    triggerLabel?: string;
    defaultProjectType?: "unoi" | "cambridge" | "custom";
    onDone?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [projectType, setProjectType] = useState<"unoi" | "cambridge" | "custom">(defaultProjectType);
    const [sourceType, setSourceType] = useState<"excel" | "byDate" | "planTable" | "examMatrix">("examMatrix");
    const [planningYear, setPlanningYear] = useState(new Date().getFullYear());
    const [planningCycle, setPlanningCycle] = useState("annual");
    const [rawRows, setRawRows] = useState("");
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const years = useMemo(() => [planningYear - 1, planningYear, planningYear + 1], [planningYear]);

    const submit = async () => {
        setBusy(true);
        try {
            if (sourceType === "excel") {
                if (!excelFile) throw new Error("Selecciona un archivo Excel");
                if (projectType !== "unoi") {
                    throw new Error("Por ahora Excel directo está habilitado para proyecto UNOi.");
                }
                const fd = new FormData();
                fd.append("file", excelFile);
                fd.append("replace", "false");
                fd.append("year", String(planningYear));
                fd.append("cycle", planningCycle);
                const res = await fetch("/api/v1/planning/unoi/import", { method: "POST", body: fd });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(payload.error ?? "No se pudo importar");
                toast.success(`Importadas ${payload.inserted ?? 0} filas.`);
            } else {
                const rows = parseRowsFromText(rawRows, projectType);
                const payload = {
                    projectType,
                    sourceType,
                    planningYear,
                    planningCycle,
                    rows,
                    createIfMissing: true,
                };
                const parsed = wizardCreateSchema.safeParse(payload);
                if (!parsed.success) throw new Error("Formato inválido. Revisa las filas.");
                const res = await fetch("/api/v1/planning/wizard/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(parsed.data),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error ?? "No se pudo crear");
                toast.success(`Creadas ${data.inserted ?? 0} filas. Vinculadas ${data.linked ?? 0}.`);
            }
            setOpen(false);
            setRawRows("");
            setExcelFile(null);
            onDone?.();
        } catch (e: any) {
            toast.error(e?.message ?? "Error");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">{triggerLabel}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl" showCloseButton>
                <DialogHeader>
                    <DialogTitle>Wizard de planeación / eventos</DialogTitle>
                    <DialogDescription>
                        Captura por Excel o formato manual (por fecha, tabla estilo plan, matriz por examen).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                        <Label>Proyecto</Label>
                        <Select value={projectType} onValueChange={(v: any) => setProjectType(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unoi">UNOi</SelectItem>
                                <SelectItem value="cambridge">Cambridge</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>Fuente</Label>
                        <Select value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="excel">Excel</SelectItem>
                                <SelectItem value="byDate">Por fecha</SelectItem>
                                <SelectItem value="planTable">Tabla estilo plan</SelectItem>
                                <SelectItem value="examMatrix">Matriz por examen</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>Año</Label>
                        <Select value={String(planningYear)} onValueChange={(v) => setPlanningYear(Number(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>Ciclo</Label>
                        <Select value={planningCycle} onValueChange={setPlanningCycle}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="annual">Anual</SelectItem>
                                <SelectItem value="spring">Primavera</SelectItem>
                                <SelectItem value="summer">Verano</SelectItem>
                                <SelectItem value="fall">Otoño</SelectItem>
                                <SelectItem value="winter">Invierno</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {sourceType === "excel" ? (
                    <div className="space-y-1">
                        <Label>Archivo Excel</Label>
                        <Input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)} />
                    </div>
                ) : (
                    <div className="space-y-1">
                        <Label>Filas (una por línea)</Label>
                        <p className="text-xs text-muted-foreground">Formato: `yyyy-mm-dd|colegio|exam|alumnos|city|nivel`</p>
                        <textarea
                            className="min-h-40 w-full rounded-md border bg-background p-2 text-sm"
                            value={rawRows}
                            onChange={(e) => setRawRows(e.target.value)}
                            placeholder="2027-05-12|COLEGIO DEMO|ket|24|HMO|SECUNDARIA"
                        />
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
                    <Button type="button" onClick={submit} disabled={busy}>{busy ? "Procesando..." : "Crear / Importar"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
