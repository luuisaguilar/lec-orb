"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Briefcase } from "lucide-react";

type PayrollTableProps = {
    enrichedPayroll: any[];
    lineItems: any[];
};

export function PayrollTable({ enrichedPayroll, lineItems }: PayrollTableProps) {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    if (enrichedPayroll.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground">
                No hay registros de nómina disponibles.
            </div>
        );
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Estatus</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                        <TableHead className="text-right">Tarifa</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Subtotal</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Ajustes</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {enrichedPayroll.map((entry: any) => {
                        const isExpanded = expandedRows[entry.id];
                        const entryLineItems = lineItems.filter(
                            (li) => li.entry_id === entry.id
                        );

                        return (
                            <div key={entry.id} className="contents">
                                <TableRow 
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => toggleRow(entry.id)}
                                >
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div>{entry.period?.name || "Desconocido"}</div>
                                        <div className="text-xs text-muted-foreground hidden sm:block">
                                            Generado:{" "}
                                            {entry.created_at
                                                ? format(new Date(entry.created_at), "d MMM yyyy", { locale: es })
                                                : "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={entry.status === "paid" ? "secondary" : "outline"}
                                            className={
                                                entry.status === "paid"
                                                    ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-orange-100/50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900/50"
                                            }
                                        >
                                            {entry.status === "paid" ? "Pagado" : "Pendiente"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{Number(entry.hours_worked ?? 0)}h</TableCell>
                                    <TableCell className="text-right">${Number(entry.rate_per_hour ?? 0)}</TableCell>
                                    <TableCell className="text-right hidden sm:table-cell">
                                        $
                                        {Number(entry.subtotal ?? 0).toLocaleString("es-MX", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                                        {Number(entry.adjustments ?? 0) > 0 ? "+" : ""}
                                        {Number(entry.adjustments ?? 0)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-base">
                                        $
                                        {Number(entry.total ?? 0).toLocaleString("es-MX", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </TableCell>
                                </TableRow>
                                
                                {isExpanded && (
                                    <TableRow className="bg-muted/30">
                                        <TableCell colSpan={8} className="p-0 border-b">
                                            <div className="px-14 py-4 space-y-3">
                                                <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                                    <Briefcase className="w-4 h-4" />
                                                    Desglose de Eventos
                                                </h4>
                                                {entryLineItems.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">No hay eventos detallados para este pago.</p>
                                                ) : (
                                                    <div className="grid gap-2">
                                                        {entryLineItems.map((li) => (
                                                            <div key={li.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background border rounded-md shadow-sm">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="font-medium text-sm">{li.event_name || "Evento sin nombre"}</div>
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <Badge variant="outline" className="text-[10px] font-normal uppercase">
                                                                            {li.role || "N/A"}
                                                                        </Badge>
                                                                        {Number(li.actual_hours ?? 0) > 0 && (
                                                                            <span>• {Number(li.actual_hours)} horas</span>
                                                                        )}
                                                                        {li.line_type && (
                                                                            <span className="capitalize">• {li.line_type}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 sm:mt-0 text-right">
                                                                    <div className="font-semibold text-sm">
                                                                        ${Number(li.actual_amount ?? li.projected_amount ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Tarifa: ${Number(li.actual_rate ?? li.projected_rate ?? 0)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </div>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
