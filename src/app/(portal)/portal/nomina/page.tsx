import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { portalApiGet } from "@/lib/portal/server-fetch";

type NominaResponse = {
    periods: { id: string; name: string }[];
    entries: Record<string, unknown>[];
    line_items: unknown[];
};

export default async function PortalPayrollPage() {
    const res = await portalApiGet<NominaResponse>("/api/v1/portal/nomina");

    if (!res.ok) {
        if (res.status === 401) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Debes iniciar sesión para ver tu nómina.
                </div>
            );
        }
        if (res.status === 403) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Tu usuario no está vinculado a un aplicador.
                </div>
            );
        }
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No se pudo cargar la nómina: {res.message}
            </div>
        );
    }

    const periodById = new Map((res.data.periods ?? []).map((p) => [p.id, p]));
    const enrichedPayroll = (res.data.entries ?? []).map((entry: any) => ({
        ...entry,
        period: periodById.get(entry.period_id) ?? null,
    }));

    enrichedPayroll.sort((a: any, b: any) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );

    const pendingBalance = enrichedPayroll
        .filter((p: any) => p.status === "pending")
        .reduce((sum: number, p: any) => sum + Number(p.total ?? 0), 0);

    const totalPaidHistoric = enrichedPayroll
        .filter((p: any) => p.status === "paid")
        .reduce((sum: number, p: any) => sum + Number(p.total ?? 0), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mi Nómina</h1>
                <p className="text-muted-foreground">Desglose de tus pagos y balances por período.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Balance Pendiente</CardTitle>
                        <DollarSign className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${pendingBalance.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Siguiente ciclo de pago</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${totalPaidHistoric.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Pagos recibidos acumulados</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Historial de Pagos
                    </CardTitle>
                    <CardDescription>Todos los registros de nómina emitidos a tu nombre.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    {enrichedPayroll.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                            No hay registros de nómina disponibles.
                        </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
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
                                    {enrichedPayroll.map((entry: any) => (
                                        <TableRow key={entry.id}>
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
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
