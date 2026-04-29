"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wand2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    payment: Record<string, unknown>;
    region: Region;
    onClose: () => void;
    onSaved: () => void;
}

interface Allocation {
    session_id: string;
    school_name: string;
    exam_type: string;
    session_date: string;
    subtotal_lec: number;
    balance: number;
    students_applied: number;
    students_paid: number;
    amount: string;
    selected: boolean;
}

export function IhReconcileDialog({ payment, region, onClose, onSaved }: Props) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoLoading, setAutoLoading] = useState(false);
    const [allocations, setAllocations] = useState<Allocation[]>([]);

    const { data: pending } = useSWR(
        `/api/v1/finance/ih/sessions?region=${region}&status=PENDING`,
        fetcher
    );

    useEffect(() => {
        if (pending) {
            setAllocations(
                (pending as Record<string, unknown>[]).map(s => ({
                    session_id:       s.id as string,
                    school_name:      s.school_name as string,
                    exam_type:        s.exam_type as string,
                    session_date:     s.session_date as string,
                    subtotal_lec:     Number(s.subtotal_lec ?? 0),
                    balance:          Number(s.balance ?? 0),
                    students_applied: Number(s.students_applied ?? 0),
                    students_paid:    Number(s.students_applied ?? 0),
                    amount:           "",
                    selected:         false,
                }))
            );
        }
    }, [pending]);

    async function handleAuto() {
        setAutoLoading(true);
        try {
            const res  = await fetch(`/api/v1/finance/ih/payments/${payment.id}/reconcile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "auto" }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }

            const suggestions = data.suggestions as { session_id: string; amount: number; students_paid: number }[];
            setAllocations(prev => prev.map(a => {
                const s = suggestions.find(sg => sg.session_id === a.session_id);
                if (s) return { ...a, selected: true, amount: String(s.amount), students_paid: s.students_paid };
                return a;
            }));
        } finally {
            setAutoLoading(false);
        }
    }

    async function handleSave() {
        const selected = allocations.filter(a => a.selected && Number(a.amount) > 0);
        if (selected.length === 0) { setError("Selecciona al menos una sesión"); return; }

        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/finance/ih/payments/${payment.id}/reconcile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "manual",
                    allocations: selected.map(a => ({
                        session_id:    a.session_id,
                        students_paid: a.students_paid,
                        amount:        Number(a.amount),
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            onSaved();
        } finally {
            setSaving(false);
        }
    }

    const totalAllocated = allocations.filter(a => a.selected).reduce((s, a) => s + Number(a.amount || 0), 0);
    const paymentAmount  = Number(payment.amount ?? 0);

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Conciliar pago — {fmt(paymentAmount)} ({payment.payment_date as string})</DialogTitle>
                </DialogHeader>

                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">
                        Asignado: <strong className={totalAllocated > paymentAmount ? "text-red-600" : "text-green-700"}>{fmt(totalAllocated)}</strong>
                        {" / Pago: "}<strong>{fmt(paymentAmount)}</strong>
                        {" — Sin asignar: "}<strong>{fmt(Math.max(0, paymentAmount - totalAllocated))}</strong>
                    </p>
                    <Button size="sm" variant="outline" onClick={handleAuto} disabled={autoLoading}>
                        <Wand2 className="h-4 w-4 mr-1" /> {autoLoading ? "Calculando..." : "Sugerencia auto"}
                    </Button>
                </div>

                <div className="overflow-y-auto max-h-[50vh]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                            <tr className="border-b text-xs text-muted-foreground">
                                <th className="text-left pb-2 pr-2 font-medium">✓</th>
                                <th className="text-left pb-2 pr-2 font-medium">Escuela</th>
                                <th className="text-left pb-2 pr-2 font-medium">Examen</th>
                                <th className="text-right pb-2 pr-2 font-medium">Saldo</th>
                                <th className="text-right pb-2 pr-2 font-medium">Alumnos pagados</th>
                                <th className="text-right pb-2 font-medium">Monto a aplicar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {allocations.map((a, i) => (
                                <tr key={a.session_id} className={a.selected ? "bg-green-50/50" : ""}>
                                    <td className="py-2 pr-2">
                                        <input
                                            type="checkbox"
                                            checked={a.selected}
                                            onChange={e => setAllocations(prev => prev.map((x, j) =>
                                                j === i ? { ...x, selected: e.target.checked, amount: e.target.checked ? String(x.balance) : "" } : x
                                            ))}
                                        />
                                    </td>
                                    <td className="py-2 pr-2 max-w-[140px] truncate">{a.school_name}</td>
                                    <td className="py-2 pr-2">
                                        <Badge variant="outline" className="text-xs">{a.exam_type}</Badge>
                                    </td>
                                    <td className="py-2 pr-2 text-right tabular-nums text-red-700">{fmt(a.balance)}</td>
                                    <td className="py-2 pr-2">
                                        <Input
                                            type="number" min={0} max={a.students_applied}
                                            value={a.students_paid}
                                            disabled={!a.selected}
                                            className="h-7 w-20 text-right"
                                            onChange={e => setAllocations(prev => prev.map((x, j) =>
                                                j === i ? { ...x, students_paid: Number(e.target.value) } : x
                                            ))}
                                        />
                                    </td>
                                    <td className="py-2">
                                        <Input
                                            type="number" min={0} step={0.01}
                                            value={a.amount}
                                            disabled={!a.selected}
                                            className="h-7 w-28 text-right"
                                            onChange={e => setAllocations(prev => prev.map((x, j) =>
                                                j === i ? { ...x, amount: e.target.value } : x
                                            ))}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {allocations.length === 0 && (
                                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">Sin sesiones pendientes en esta región.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || totalAllocated === 0}>
                        {saving ? "Guardando..." : "Aplicar conciliación"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
