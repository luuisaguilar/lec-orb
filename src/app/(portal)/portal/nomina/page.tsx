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
import {
    mockPayrollEntries,
    mockPayrollPeriods,
} from "@/lib/demo/data";

const APPLICATOR_ID = "applicator-001"; // Hardcoded for demo

export default function PortalPayrollPage() {
    // 1. Get my payroll
    const myPayroll = mockPayrollEntries.filter((p) => p.applicator_id === APPLICATOR_ID);

    // 2. Enrich with Period Data
    const enrichedPayroll = myPayroll.map((entry) => {
        const period = mockPayrollPeriods.find((p) => p.id === entry.period_id);
        return {
            ...entry,
            period,
        };
    });

    // 3. Sort by created_at desc (newest first)
    enrichedPayroll.sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Stats
    const pendingBalance = enrichedPayroll
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + p.total, 0);

    const totalPaidHistoric = enrichedPayroll
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.total, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mi Nómina</h1>
                <p className="text-muted-foreground">
                    Desglose de tus pagos y balances por período.
                </p>
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
                        <p className="text-xs text-muted-foreground mt-1">
                            Siguiente ciclo de pago
                        </p>
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
                        <p className="text-xs text-muted-foreground mt-1">
                            Pagos recibidos acumulados
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Historial de Pagos
                    </CardTitle>
                    <CardDescription>
                        Todos los registros de nómina emitidos a tu nombre.
                    </CardDescription>
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
                                    {enrichedPayroll.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">
                                                <div>{entry.period?.name || "Desconocido"}</div>
                                                <div className="text-xs text-muted-foreground hidden sm:block">
                                                    Generado: {format(new Date(entry.created_at), "d MMM yyyy", { locale: es })}
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
                                            <TableCell className="text-right">{entry.hours_worked}h</TableCell>
                                            <TableCell className="text-right">${entry.rate_per_hour}</TableCell>
                                            <TableCell className="text-right hidden sm:table-cell">
                                                ${entry.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                                                {entry.adjustments > 0 ? "+" : ""}{entry.adjustments}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-base">
                                                ${entry.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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
