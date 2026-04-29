"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip } from "lucide-react";

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: Region;
    payment?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}

export function IhPaymentDialog({ region, payment, onClose, onSaved }: Props) {
    const isEdit = !!payment;
    const fileRef = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proof, setProof] = useState<File | null>(null);

    const [form, setForm] = useState({
        payment_date: (payment?.payment_date as string) ?? "",
        amount:       String(payment?.amount ?? ""),
        reference:    (payment?.reference as string) ?? "",
        notes:        (payment?.notes as string) ?? "",
    });

    function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            let res: Response;

            if (isEdit) {
                res = await fetch(`/api/v1/finance/ih/payments/${payment!.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...form, amount: Number(form.amount) }),
                });
            } else {
                const fd = new FormData();
                fd.append("payment_date", form.payment_date);
                fd.append("amount", form.amount);
                fd.append("region", region);
                if (form.reference) fd.append("reference", form.reference);
                if (form.notes) fd.append("notes", form.notes);
                if (proof) fd.append("proof", proof);
                res = await fetch("/api/v1/finance/ih/payments", { method: "POST", body: fd });
            }

            const data = await res.json();
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
                    <DialogTitle>{isEdit ? "Editar pago" : "Registrar pago IH"}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>Fecha *</Label>
                            <Input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Monto *</Label>
                            <Input type="number" min={0} step={0.01} value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Referencia (No. transferencia)</Label>
                        <Input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="Opcional" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Notas</Label>
                        <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Opcional" />
                    </div>

                    {!isEdit && (
                        <div className="flex flex-col gap-1.5">
                            <Label>Comprobante (PDF, Excel, imagen)</Label>
                            <div
                                className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/30"
                                onClick={() => fileRef.current?.click()}
                            >
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{proof ? proof.name : "Adjuntar comprobante (opcional)"}</span>
                                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg" onChange={e => setProof(e.target.files?.[0] ?? null)} />
                            </div>
                        </div>
                    )}
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
