"use client";

import { useState } from "react";
import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DollarSign,
    Calendar,
    Users,
    ChevronRight,
    ChevronLeft,
    Loader2,
    CheckCircle,
    Clock,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    calculated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const statusLabels: Record<string, string> = {
    open: "Abierto",
    calculated: "Calculado",
    paid: "Pagado",
    closed: "Cerrado",
    pending: "Pendiente",
    approved: "Aprobado",
};

export default function PayrollPage() {
    const { t } = useI18n();
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    const { data: periodsData, isLoading: loadingPeriods, mutate: mutatePeriods } = useSWR(
        "/api/v1/payroll",
        fetcher
    );
    const { data: detailData, isLoading: loadingDetail, mutate: mutateDetail } = useSWR(
        selectedPeriod ? `/api/v1/payroll?periodId=${selectedPeriod}` : null,
        fetcher
    );

    const periods = periodsData?.periods || [];
    const entries = detailData?.entries || [];
    const currentPeriod = detailData?.period;

    if (selectedPeriod && currentPeriod) {
        return (
            <PayrollDetail
                period={currentPeriod}
                entries={entries}
                loading={loadingDetail}
                onBack={() => setSelectedPeriod(null)}
                onRefresh={() => {
                    mutateDetail();
                    mutatePeriods();
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">
                {t("payroll.title")}
            </h2>

            {loadingPeriods ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : periods.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                        <p>No hay períodos de nómina</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {periods.map(
                        (period: {
                            id: string;
                            name: string;
                            start_date: string;
                            end_date: string;
                            status: string;
                            total_amount: number;
                            entry_count: number;
                            notes: string | null;
                        }) => (
                            <Card
                                key={period.id}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedPeriod(period.id)}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-lg">
                                                    {period.name}
                                                </h3>
                                                <Badge className={statusColors[period.status] || statusColors.open}>
                                                    {statusLabels[period.status] || period.status}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {period.start_date} — {period.end_date}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="h-3.5 w-3.5" />
                                                    {period.entry_count} aplicadores
                                                </div>
                                            </div>
                                            {period.notes && (
                                                <p className="text-xs text-muted-foreground italic">
                                                    {period.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">
                                                    ${period.total_amount.toLocaleString("es-MX")}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t("payroll.total")}
                                                </p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

// Payroll Detail (entries for a period)
function PayrollDetail({
    period,
    entries,
    loading,
    onBack,
    onRefresh,
}: {
    period: {
        id: string;
        name: string;
        status: string;
        total_amount: number;
    };
    entries: any[];
    loading: boolean;
    onBack: () => void;
    onRefresh: () => void;
}) {
    const { t } = useI18n();
    const [isCalculating, setIsCalculating] = useState(false);

    const handleRecalculate = async () => {
        try {
            setIsCalculating(true);
            const res = await fetch("/api/v1/payroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ periodId: period.id }),
            });

            if (!res.ok) throw new Error("Failed to recalculate");

            toast.success("Nómina recalculada exitosamente");
            onRefresh();
        } catch (err) {
            console.error(err);
            toast.error("Error al calcular la nómina");
        } finally {
            setIsCalculating(false);
        }
    };

    const totalAmount = entries.reduce((sum, e) => sum + e.total, 0);
    const totalHours = entries.reduce((sum, e) => sum + e.hours_worked, 0);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {t("payroll.title")}
                </Button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {period.name}
                        </h2>
                        <Badge className={statusColors[period.status] || statusColors.open}>
                            {statusLabels[period.status] || period.status}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleRecalculate}
                            disabled={isCalculating}
                            className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                        >
                            {isCalculating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <DollarSign className="mr-2 h-4 w-4" />
                            )}
                            Recalcular Nómina
                        </Button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            {t("payroll.total")}
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                            ${totalAmount.toLocaleString("es-MX")}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            {t("payroll.hours")}
                        </div>
                        <p className="text-2xl font-bold">{totalHours}h</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Users className="h-4 w-4" />
                            Aplicadores
                        </div>
                        <p className="text-2xl font-bold">{entries.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <CheckCircle className="h-4 w-4" />
                            {t("common.status")}
                        </div>
                        <Badge className={`text-sm ${statusColors[period.status]}`}>
                            {statusLabels[period.status]}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Entries Table */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Desglose por Aplicador</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium">Aplicador</th>
                                        <th className="px-4 py-3 text-left font-medium">Roles</th>
                                        <th className="px-4 py-3 text-center font-medium">Eventos</th>
                                        <th className="px-4 py-3 text-center font-medium">Turnos</th>
                                        <th className="px-4 py-3 text-center font-medium">Horas</th>
                                        <th className="px-4 py-3 text-right font-medium">Tarifa/h</th>
                                        <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                                        <th className="px-4 py-3 text-right font-medium">Ajustes</th>
                                        <th className="px-4 py-3 text-right font-medium font-bold">Total</th>
                                        <th className="px-4 py-3 text-center font-medium">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className="border-b transition-colors hover:bg-muted/50"
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                {entry.applicator_name}
                                                {entry.notes && (
                                                    <span className="block text-xs text-muted-foreground italic">
                                                        {entry.notes}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {entry.roles?.map((role: string) => (
                                                        <Badge key={role} variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                                                            {role}
                                                        </Badge>
                                                    )) || <span className="text-muted-foreground text-xs">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">{entry.events_count}</td>
                                            <td className="px-4 py-3 text-center">{entry.slots_count}</td>
                                            <td className="px-4 py-3 text-center">{entry.hours_worked}h</td>
                                            <td className="px-4 py-3 text-right">${entry.rate_per_hour}</td>
                                            <td className="px-4 py-3 text-right">
                                                ${entry.subtotal.toLocaleString("es-MX")}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {entry.adjustments !== 0 ? (
                                                    <span className={entry.adjustments > 0 ? "text-green-600" : "text-red-600"}>
                                                        {entry.adjustments > 0 ? "+" : ""}${entry.adjustments.toLocaleString("es-MX")}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">
                                                ${entry.total.toLocaleString("es-MX")}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge className={statusColors[entry.status] || statusColors.pending}>
                                                    {statusLabels[entry.status] || entry.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/50 font-bold">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-center">
                                            {entries.reduce((s, e) => s + e.events_count, 0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {entries.reduce((s, e) => s + e.slots_count, 0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">{totalHours}h</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-right">
                                            ${entries.reduce((s, e) => s + e.subtotal, 0).toLocaleString("es-MX")}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            ${entries.reduce((s, e) => s + e.adjustments, 0).toLocaleString("es-MX")}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600">
                                            ${totalAmount.toLocaleString("es-MX")}
                                        </td>
                                        <td className="px-4 py-3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
