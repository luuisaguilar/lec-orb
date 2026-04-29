"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Pencil, Trash2 } from "lucide-react";
import { IhSessionDialog } from "./ih-session-dialog";
import { IhImportDialog } from "./ih-import-dialog";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PAID:     { label: "Pagado", variant: "default" },
    PAID_DIFF:{ label: "Pagado (dif.)", variant: "secondary" },
    PENDING:  { label: "Pendiente", variant: "destructive" },
    FUTURE:   { label: "Futuro", variant: "outline" },
};

type Region = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: Region;
    year: string;
    onMutate: () => void;
}

export function IhSessionsTable({ region, year, onMutate }: Props) {
    const [search, setSearch] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

    const { data: sessions, isLoading, mutate } = useSWR(
        `/api/v1/finance/ih/sessions?region=${region}&year=${year}`,
        fetcher
    );

    const filtered = (sessions ?? []).filter((s: Record<string, unknown>) =>
        !search || String(s.school_name).toLowerCase().includes(search.toLowerCase())
    );

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar esta sesión?")) return;
        await fetch(`/api/v1/finance/ih/sessions/${id}`, { method: "DELETE" });
        mutate();
        onMutate();
    }

    const totals = filtered.reduce(
        (acc: { subtotal: number; paid: number; balance: number }, s: Record<string, unknown>) => ({
            subtotal: acc.subtotal + Number(s.subtotal_lec ?? 0),
            paid:     acc.paid + Number(s.amount_paid_ih ?? 0),
            balance:  acc.balance + Number(s.balance ?? 0),
        }),
        { subtotal: 0, paid: 0, balance: 0 }
    );

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Sesiones aplicadas</CardTitle>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                            <Upload className="h-4 w-4 mr-1" /> Importar Excel
                        </Button>
                        <Button size="sm" onClick={() => setShowNew(true)}>
                            <Plus className="h-4 w-4 mr-1" /> Nueva sesión
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Input
                        placeholder="Buscar escuela..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="mb-3 max-w-xs"
                    />

                    {isLoading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            Sin sesiones registradas para {region === "SONORA" ? "Sonora" : "Baja California"} {year}.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="text-left pb-2 pr-3 font-medium">Escuela</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Examen</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Fecha</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Alumnos</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Subtotal LEC</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Pagado IH</th>
                                        <th className="text-right pb-2 pr-3 font-medium">Saldo</th>
                                        <th className="text-left pb-2 pr-3 font-medium">Estado</th>
                                        <th className="pb-2 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.map((s: Record<string, unknown>) => {
                                        const st = STATUS_LABELS[s.status as string] ?? STATUS_LABELS.PENDING;
                                        return (
                                            <tr key={s.id as string} className="hover:bg-muted/30">
                                                <td className="py-2 pr-3 font-medium max-w-[160px] truncate">{s.school_name as string}</td>
                                                <td className="py-2 pr-3">{s.exam_type as string}</td>
                                                <td className="py-2 pr-3 tabular-nums">{s.session_date as string}</td>
                                                <td className="py-2 pr-3 text-right tabular-nums">{s.students_applied as number}</td>
                                                <td className="py-2 pr-3 text-right tabular-nums">{fmt(Number(s.subtotal_lec ?? 0))}</td>
                                                <td className="py-2 pr-3 text-right tabular-nums text-green-700">{fmt(Number(s.amount_paid_ih ?? 0))}</td>
                                                <td className={`py-2 pr-3 text-right tabular-nums font-medium ${Number(s.balance) > 0 ? "text-red-700" : "text-green-700"}`}>
                                                    {fmt(Number(s.balance ?? 0))}
                                                </td>
                                                <td className="py-2 pr-3">
                                                    <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex gap-1">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(s)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id as string)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t font-semibold text-sm">
                                        <td colSpan={4} className="py-2 pr-3 text-right text-muted-foreground">Totales ({filtered.length})</td>
                                        <td className="py-2 pr-3 text-right tabular-nums">{fmt(totals.subtotal)}</td>
                                        <td className="py-2 pr-3 text-right tabular-nums text-green-700">{fmt(totals.paid)}</td>
                                        <td className={`py-2 pr-3 text-right tabular-nums ${totals.balance > 0 ? "text-red-700" : "text-green-700"}`}>{fmt(totals.balance)}</td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {(showNew || editing) && (
                <IhSessionDialog
                    region={region}
                    session={editing ?? undefined}
                    onClose={() => { setShowNew(false); setEditing(null); }}
                    onSaved={() => { mutate(); onMutate(); setShowNew(false); setEditing(null); }}
                />
            )}

            {showImport && (
                <IhImportDialog
                    region={region}
                    onClose={() => setShowImport(false)}
                    onImported={() => { mutate(); onMutate(); setShowImport(false); }}
                />
            )}
        </>
    );
}
