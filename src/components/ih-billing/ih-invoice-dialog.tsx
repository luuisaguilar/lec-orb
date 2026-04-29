"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: Region;
    invoice?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}

export function IhInvoiceDialog({ region, invoice, onClose, onSaved }: Props) {
    const isEdit = !!invoice;
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        invoice_number: (invoice?.invoice_number as string) ?? "",
        period_label:   (invoice?.period_label as string) ?? "",
        invoice_date:   (invoice?.invoice_date as string) ?? "",
        total_students: String(invoice?.total_students ?? "0"),
        total_amount:   String(invoice?.total_amount ?? "0"),
        status:         (invoice?.status as string) ?? "DRAFT",
        notes:          (invoice?.notes as string) ?? "",
    });

    function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...form,
                region,
                total_students: Number(form.total_students),
                total_amount:   Number(form.total_amount),
                invoice_date:   form.invoice_date || null,
            };
            const url    = isEdit ? `/api/v1/finance/ih/invoices/${invoice!.id}` : "/api/v1/finance/ih/invoices";
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
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar factura" : "Nueva factura"}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Número de factura *</Label>
                        <Input value={form.invoice_number} onChange={e => set("invoice_number", e.target.value)} placeholder="SON_FACTURA_1_ABRIL_2026" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>Periodo *</Label>
                            <Input value={form.period_label} onChange={e => set("period_label", e.target.value)} placeholder="Abril 2026" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Fecha de factura</Label>
                            <Input type="date" value={form.invoice_date} onChange={e => set("invoice_date", e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Total alumnos</Label>
                            <Input type="number" min={0} value={form.total_students} onChange={e => set("total_students", e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Total facturado</Label>
                            <Input type="number" min={0} step={0.01} value={form.total_amount} onChange={e => set("total_amount", e.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Estado</Label>
                        <Select value={form.status} onValueChange={v => set("status", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DRAFT">Borrador</SelectItem>
                                <SelectItem value="SENT">Enviada</SelectItem>
                                <SelectItem value="PAID">Pagada</SelectItem>
                                <SelectItem value="PARTIAL">Parcial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Notas</Label>
                        <Input value={form.notes} onChange={e => set("notes", e.target.value)} />
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
