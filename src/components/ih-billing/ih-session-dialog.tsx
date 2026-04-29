"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EXAM_TYPES = ["STARTERS", "MOVERS", "FLYERS", "KEY", "PET", "FCE"];
const STATUS_OPTIONS = [
    { value: "PENDING",   label: "Pendiente" },
    { value: "PAID",      label: "Pagado" },
    { value: "PAID_DIFF", label: "Pagado (diferencia)" },
    { value: "FUTURE",    label: "Futuro" },
];

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: Region;
    session?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}

export function IhSessionDialog({ region, session, onClose, onSaved }: Props) {
    const isEdit = !!session;
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        school_name:      (session?.school_name as string) ?? "",
        exam_type:        (session?.exam_type as string) ?? "KEY",
        session_date:     (session?.session_date as string) ?? "",
        students_applied: String(session?.students_applied ?? ""),
        tariff:           String(session?.tariff ?? ""),
        students_paid_ih: String(session?.students_paid_ih ?? "0"),
        amount_paid_ih:   String(session?.amount_paid_ih ?? "0"),
        status:           (session?.status as string) ?? "PENDING",
        notes:            (session?.notes as string) ?? "",
    });

    function set(k: string, v: string) {
        setForm(prev => ({ ...prev, [k]: v }));
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...form,
                region,
                students_applied: Number(form.students_applied),
                tariff:           Number(form.tariff),
                students_paid_ih: Number(form.students_paid_ih),
                amount_paid_ih:   Number(form.amount_paid_ih),
            };

            const url    = isEdit ? `/api/v1/finance/ih/sessions/${session!.id}` : "/api/v1/finance/ih/sessions";
            const method = isEdit ? "PATCH" : "POST";
            const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data   = await res.json();
            if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
            onSaved();
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar sesión" : "Nueva sesión"}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex flex-col gap-1.5">
                        <Label>Escuela *</Label>
                        <Input value={form.school_name} onChange={e => set("school_name", e.target.value)} placeholder="Colegio Larrea" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Examen *</Label>
                        <Select value={form.exam_type} onValueChange={v => set("exam_type", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Fecha *</Label>
                        <Input type="date" value={form.session_date} onChange={e => set("session_date", e.target.value)} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Alumnos aplicados *</Label>
                        <Input type="number" min={0} value={form.students_applied} onChange={e => set("students_applied", e.target.value)} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Tarifa por alumno *</Label>
                        <Input type="number" min={0} step={0.01} value={form.tariff} onChange={e => set("tariff", e.target.value)} />
                    </div>

                    {isEdit && (
                        <>
                            <div className="flex flex-col gap-1.5">
                                <Label>Alumnos pagados IH</Label>
                                <Input type="number" min={0} value={form.students_paid_ih} onChange={e => set("students_paid_ih", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Monto pagado IH</Label>
                                <Input type="number" min={0} step={0.01} value={form.amount_paid_ih} onChange={e => set("amount_paid_ih", e.target.value)} />
                            </div>
                        </>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <Label>Estado</Label>
                        <Select value={form.status} onValueChange={v => set("status", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="col-span-2 flex flex-col gap-1.5">
                        <Label>Notas</Label>
                        <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Opcional" />
                    </div>
                </div>

                {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
