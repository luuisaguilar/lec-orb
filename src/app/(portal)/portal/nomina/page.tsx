import { PayrollTable } from "./payroll-table";
import {
    Table, // Keeping these in case they are used elsewhere, though they aren't anymore here
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
                    <PayrollTable 
                        enrichedPayroll={enrichedPayroll} 
                        lineItems={res.data.line_items ?? []} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}
