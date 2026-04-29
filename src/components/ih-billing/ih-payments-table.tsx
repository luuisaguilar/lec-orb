"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GitMerge, Pencil, Trash2, Paperclip } from "lucide-react";
import { IhPaymentDialog } from "./ih-payment-dialog";
import { IhReconcileDialog } from "./ih-reconcile-dialog";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: Region;
    onMutate: () => void;
}

export function IhPaymentsTable({ region, onMutate }: Props) {
    const [showNew, setShowNew] = useState(false);
    const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
    const [reconciling, setReconciling] = useState<Record<string, unknown> | null>(null);

    const { data: payments, isLoading, mutate } = useSWR(
        `/api/v1/finance/ih/payments?region=${region}`,
        fetcher
    );

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar este pago? Se revertirán las conciliaciones asociadas.")) return;
        await fetch(`/api/v1/finance/ih/payments/${id}`, { method: "DELETE" });
        mutate();
        onMutate();
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Pagos recibidos de IH</CardTitle>
                    <Button size="sm" onClick={() => setShowNew(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Registrar pago
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
                    ) : !payments?.length ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Sin pagos registrados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="text-left pb-2 pr-3 font-medium">Fecha</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Monto</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Referencia</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Sesiones conciliadas</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Comprobante</th>
                                        <th className="pb-2 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(payments ?? []).map((p: Record<string, unknown>) => {
                                        const linked = (p.ih_payment_sessions as unknown[])?.length ?? 0;
                                        return (
                                            <tr key={p.id as string} className="hover:bg-muted/30">
                                                <td className="py-2 pr-3 tabular-nums">{p.payment_date as string}</td>
                                                <td className="py-2 pr-3 text-right tabular-nums font-medium text-green-700">{fmt(Number(p.amount ?? 0))}</td>
                                                <td className="py-2 pr-3 text-muted-foreground">{(p.reference as string) ?? "—"}</td>
                                                <td className="py-2 pr-3 text-right">{linked}</td>
                                                <td className="py-2 pr-3">
                                                    {p.proof_path ? (
                                                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex gap-1">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Conciliar" onClick={() => setReconciling(p)}>
                                                            <GitMerge className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(p)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id as string)}>
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
                <IhPaymentDialog
                    region={region}
                    payment={editing ?? undefined}
                    onClose={() => { setShowNew(false); setEditing(null); }}
                    onSaved={() => { mutate(); onMutate(); setShowNew(false); setEditing(null); }}
                />
            )}

            {reconciling && (
                <IhReconcileDialog
                    payment={reconciling}
                    region={region}
                    onClose={() => setReconciling(null)}
                    onSaved={() => { mutate(); onMutate(); setReconciling(null); }}
                />
            )}
        </>
    );
}
