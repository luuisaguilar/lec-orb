"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, Pencil, Trash2 } from "lucide-react";
import { IhInvoiceDialog } from "./ih-invoice-dialog";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT:   { label: "Borrador", variant: "outline" },
    SENT:    { label: "Enviada", variant: "secondary" },
    PAID:    { label: "Pagada", variant: "default" },
    PARTIAL: { label: "Parcial", variant: "secondary" },
};

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: Region;
    onMutate: () => void;
}

export function IhInvoicesTable({ region, onMutate }: Props) {
    const [showNew, setShowNew] = useState(false);
    const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

    const { data: invoices, isLoading, mutate } = useSWR(
        `/api/v1/finance/ih/invoices?region=${region}`,
        fetcher
    );

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar esta factura?")) return;
        await fetch(`/api/v1/finance/ih/invoices/${id}`, { method: "DELETE" });
        mutate();
        onMutate();
    }

    function handlePrint(id: string) {
        window.open(`/dashboard/finanzas/ih-billing/invoices/${id}/print`, "_blank");
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Facturas a IH</CardTitle>
                    <Button size="sm" onClick={() => setShowNew(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Nueva factura
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
                    ) : !invoices?.length ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Sin facturas registradas.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="text-left pb-2 pr-3 font-medium">Folio</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Periodo</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Fecha</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Alumnos</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Total</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Estado</th>
                                        <th className="pb-2 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(invoices ?? []).map((inv: Record<string, unknown>) => {
                                        const st = STATUS_LABELS[inv.status as string] ?? STATUS_LABELS.DRAFT;
                                        return (
                                            <tr key={inv.id as string} className="hover:bg-muted/30">
                                                <td className="py-2 pr-3 font-mono text-xs">{inv.invoice_number as string}</td>
                                                <td className="py-2 pr-3">{inv.period_label as string}</td>
                                                <td className="py-2 pr-3 tabular-nums">{inv.invoice_date as string ?? "—"}</td>
                                                <td className="py-2 pr-3 text-right tabular-nums">{inv.total_students as number}</td>
                                                <td className="py-2 pr-3 text-right tabular-nums font-medium">{fmt(Number(inv.total_amount ?? 0))}</td>
                                                <td className="py-2 pr-3">
                                                    <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex gap-1">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Imprimir PDF" onClick={() => handlePrint(inv.id as string)}>
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(inv)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(inv.id as string)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {(showNew || editing) && (
                <IhInvoiceDialog
                    region={region}
                    invoice={editing ?? undefined}
                    onClose={() => { setShowNew(false); setEditing(null); }}
                    onSaved={() => { mutate(); onMutate(); setShowNew(false); setEditing(null); }}
                />
            )}
        </>
    );
}
