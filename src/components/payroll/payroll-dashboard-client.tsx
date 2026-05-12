"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DollarSign,
    Calendar,
    Users,
    ChevronRight,
    ChevronLeft,
    Loader2,
    CheckCircle,
    Clock,
    AlertTriangle,
    FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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

export function PayrollDashboardClient({ variant = "default" }: { variant?: "default" | "coordination" }) {
    const { t } = useI18n();
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [coordListTab, setCoordListTab] = useState<"period" | "applicator" | "event">("period");
    const [batchBusy, setBatchBusy] = useState(false);
    const [suggestBusy, setSuggestBusy] = useState(false);

    const { data: periodsData, isLoading: loadingPeriods, mutate: mutatePeriods } = useSWR(
        "/api/v1/payroll",
        fetcher
    );
    const { data: detailData, isLoading: loadingDetail, mutate: mutateDetail } = useSWR(
        selectedPeriod ? `/api/v1/payroll?periodId=${selectedPeriod}` : null,
        fetcher
    );
    const { data: coordSummary, isLoading: loadingCoordSummary } = useSWR(
        variant === "coordination" && coordListTab !== "period"
            ? `/api/v1/payroll/coordination-summary?view=${coordListTab === "applicator" ? "applicator" : "event"}`
            : null,
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
                variant={variant}
                onBack={() => setSelectedPeriod(null)}
                onRefresh={() => {
                    mutateDetail();
                    mutatePeriods();
                }}
            />
        );
    }

    const handleSuggestPeriods = async () => {
        try {
            setSuggestBusy(true);
            const res = await fetch("/api/v1/payroll/periods/generate-suggested", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cadence: "biweekly" }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j?.error ?? "Error");
            toast.success(`Períodos sugeridos: ${j.created ?? 0} nuevos`);
            mutatePeriods();
        } catch {
            toast.error("No se pudieron generar períodos sugeridos");
        } finally {
            setSuggestBusy(false);
        }
    };

    const handleBatchOpen = async () => {
        const openIds = (periods as { id: string; status: string }[])
            .filter((p) => p.status === "open")
            .map((p) => p.id);
        if (openIds.length === 0) {
            toast.message("No hay períodos en estatus abierto");
            return;
        }
        try {
            setBatchBusy(true);
            const res = await fetch("/api/v1/payroll/batch-calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ periodIds: openIds }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j?.error ?? "Error");
            const ok = (j.results ?? []).filter((r: { ok: boolean }) => r.ok).length;
            toast.success(`Cálculo en lote: ${ok}/${openIds.length} períodos`);
            mutatePeriods();
        } catch {
            toast.error("Error en cálculo en lote");
        } finally {
            setBatchBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {variant === "coordination" ? (
                <p className="text-sm text-muted-foreground">
                    Coordinación de exámenes · Nómina por eventos y aplicadores
                </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold tracking-tight">
                    {t("payroll.title")}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" disabled={suggestBusy} onClick={handleSuggestPeriods}>
                        {suggestBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Generar períodos sugeridos
                    </Button>
                    <Button variant="secondary" size="sm" disabled={batchBusy} onClick={handleBatchOpen}>
                        {batchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Calcular períodos abiertos
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/settings/role-rates">Tarifas por rol</Link>
                    </Button>
                </div>
            </div>

            {loadingPeriods ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : variant === "coordination" ? (
                <Tabs
                    value={coordListTab}
                    onValueChange={(v) => setCoordListTab(v as "period" | "applicator" | "event")}
                    className="space-y-4"
                >
                    <TabsList className="flex h-auto flex-wrap gap-1">
                        <TabsTrigger value="period">Por período</TabsTrigger>
                        <TabsTrigger value="applicator">Por aplicador</TabsTrigger>
                        <TabsTrigger value="event">Por evento</TabsTrigger>
                    </TabsList>
                    <TabsContent value="period" className="space-y-4">
                        {periods.length === 0 ? (
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
                                                            <Badge
                                                                className={
                                                                    statusColors[period.status] || statusColors.open
                                                                }
                                                            >
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
                    </TabsContent>
                    <TabsContent value="applicator">
                        {loadingCoordSummary ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Totales por aplicador (todos los períodos)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-4 py-2 text-left">Aplicador</th>
                                                <th className="px-4 py-2 text-center">Períodos</th>
                                                <th className="px-4 py-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(coordSummary?.rows ?? []).length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-4 py-6 text-center text-muted-foreground"
                                                    >
                                                        Sin datos agregados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                (coordSummary?.rows ?? []).map(
                                                    (r: {
                                                        applicator_id: string;
                                                        applicator_name: string;
                                                        periods_count: number;
                                                        total_amount: number;
                                                    }) => (
                                                        <tr key={r.applicator_id} className="border-b">
                                                            <td className="px-4 py-2 font-medium">{r.applicator_name}</td>
                                                            <td className="px-4 py-2 text-center">{r.periods_count}</td>
                                                            <td className="px-4 py-2 text-right font-semibold">
                                                                ${r.total_amount.toLocaleString("es-MX")}
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                    <TabsContent value="event">
                        {loadingCoordSummary ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Totales por evento (todos los períodos)</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Clic en el nombre del evento para el planificador, o usa{" "}
                                        <strong>Documentos</strong> para el expediente en coordinación.
                                    </p>
                                </CardHeader>
                                <CardContent className="p-0 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-4 py-2 text-left">Evento</th>
                                                <th className="px-4 py-2 text-center">Líneas</th>
                                                <th className="px-4 py-2 text-right">Total</th>
                                                <th className="px-4 py-2 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(coordSummary?.rows ?? []).length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={4}
                                                        className="px-4 py-6 text-center text-muted-foreground"
                                                    >
                                                        Sin líneas con evento vinculado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                (coordSummary?.rows ?? []).map(
                                                    (r: {
                                                        event_id: string;
                                                        event_name: string;
                                                        line_count: number;
                                                        total_amount: number;
                                                    }) => (
                                                        <tr key={r.event_id} className="border-b">
                                                            <td className="px-4 py-2">
                                                                <Link
                                                                    href={`/dashboard/eventos/planner/${r.event_id}`}
                                                                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                                                                >
                                                                    {r.event_name}
                                                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-2 text-center">{r.line_count}</td>
                                                            <td className="px-4 py-2 text-right font-semibold">
                                                                ${r.total_amount.toLocaleString("es-MX")}
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <div className="flex flex-wrap justify-end gap-1">
                                                                    <Button variant="ghost" size="sm" className="h-8" asChild>
                                                                        <Link href={`/dashboard/eventos/planner/${r.event_id}`}>
                                                                            Planificador
                                                                        </Link>
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" className="h-8" asChild>
                                                                        <Link
                                                                            href={`/dashboard/coordinacion-examenes/documentos-eventos/${r.event_id}`}
                                                                        >
                                                                            Documentos
                                                                        </Link>
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
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
    variant = "default",
    onBack,
    onRefresh,
}: {
    period: {
        id: string;
        name: string;
        status: string;
        total_amount: number;
    };
    entries: Array<
        any & {
            roles?: string[];
            sources?: string[];
            manual_lines_count?: number;
            auto_lines_count?: number;
        }
    >;
    loading: boolean;
    variant?: "default" | "coordination";
    onBack: () => void;
    onRefresh: () => void;
}) {
    const { t } = useI18n();
    const [isCalculating, setIsCalculating] = useState(false);
    const [view, setView] = useState<"all" | "manual" | "auto">("all");
    const [adjDraft, setAdjDraft] = useState<Record<string, string>>({});
    const [excelBusy, setExcelBusy] = useState(false);
    const [excelResult, setExcelResult] = useState<{ mismatchCount: number; mismatches: unknown[] } | null>(null);
    const [breakdownEntry, setBreakdownEntry] = useState<(typeof entries)[0] | null>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);

    const { data: analytics, isLoading: loadingAnalytics, mutate: mutAnalytics } = useSWR(
        `/api/v1/payroll/analytics?periodId=${period.id}`,
        fetcher
    );
    const { data: auditData, isLoading: loadingAudit } = useSWR(
        `/api/v1/payroll/audit?periodId=${period.id}`,
        fetcher
    );

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
            mutAnalytics();
        } catch (err) {
            console.error(err);
            toast.error("Error al calcular la nómina");
        } finally {
            setIsCalculating(false);
        }
    };

    const isManual = (e: any) =>
        (e.manual_lines_count ?? 0) > 0 || (e.sources ?? []).includes("manual");
    const isAuto = (e: any) =>
        (e.auto_lines_count ?? 0) > 0 || (e.sources ?? []).includes("auto_event_staff");

    const filteredEntries =
        view === "manual" ? entries.filter(isManual) : view === "auto" ? entries.filter(isAuto) : entries;

    const totalAmount = filteredEntries.reduce((sum, e) => sum + (e.total ?? 0), 0);
    const totalHours = filteredEntries.reduce((sum, e) => sum + (e.hours_worked ?? 0), 0);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {t("payroll.title")}
                </Button>
                {variant === "coordination" ? (
                    <p className="text-xs text-muted-foreground pl-1">Coordinación de exámenes</p>
                ) : null}
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
                        <div className="flex items-center gap-2 mr-2 flex-wrap">
                            <Button
                                variant={view === "all" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setView("all")}
                            >
                                Todo
                            </Button>
                            <Button
                                variant={view === "manual" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setView("manual")}
                            >
                                Solo manual
                            </Button>
                            <Button
                                variant={view === "auto" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setView("auto")}
                            >
                                Solo auto
                            </Button>
                        </div>
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

            <Tabs defaultValue="resumen" className="space-y-4">
                <TabsList className="flex h-auto flex-wrap gap-1">
                    <TabsTrigger value="resumen">Resumen</TabsTrigger>
                    <TabsTrigger value="eventos">Por evento</TabsTrigger>
                    <TabsTrigger value="sedes">Por sede</TabsTrigger>
                    <TabsTrigger value="varianza">Proyectado vs real</TabsTrigger>
                    <TabsTrigger value="calidad">Calidad</TabsTrigger>
                    <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                    <TabsTrigger value="excel">Excel</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="space-y-6">
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
                        <CardTitle className="text-lg">
                            Desglose por aplicador
                            <span className="block text-xs font-normal text-muted-foreground mt-1">
                                Clic en una fila para ver el desglose completo (evento, rol, montos)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            {filteredEntries.length === 0 ? (
                                <div className="p-6 text-sm text-muted-foreground">
                                    No hay datos para este filtro. Prueba con <strong>Todo</strong>.
                                </div>
                            ) : null}
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
                                    {filteredEntries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                            onClick={() => setBreakdownEntry(entry)}
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
                                            <td className="px-4 py-3 text-right w-28" onClick={(e) => e.stopPropagation()}>
                                                <Input
                                                    className="h-8 text-right text-xs"
                                                    value={
                                                        adjDraft[entry.id] ??
                                                        String(entry.adjustments ?? 0)
                                                    }
                                                    onChange={(e) =>
                                                        setAdjDraft((d) => ({
                                                            ...d,
                                                            [entry.id]: e.target.value,
                                                        }))
                                                    }
                                                    onBlur={async () => {
                                                        const raw =
                                                            adjDraft[entry.id] ?? String(entry.adjustments ?? 0);
                                                        const n = Number(String(raw).replace(",", "."));
                                                        if (!Number.isFinite(n)) return;
                                                        try {
                                                            const res = await fetch(
                                                                `/api/v1/payroll/entries/${entry.id}`,
                                                                {
                                                                    method: "PATCH",
                                                                    headers: {
                                                                        "Content-Type": "application/json",
                                                                    },
                                                                    body: JSON.stringify({ adjustments: n }),
                                                                }
                                                            );
                                                            if (!res.ok) throw new Error("patch");
                                                            toast.success("Ajustes guardados");
                                                            setAdjDraft((d) => {
                                                                const c = { ...d };
                                                                delete c[entry.id];
                                                                return c;
                                                            });
                                                            onRefresh();
                                                            mutAnalytics();
                                                        } catch {
                                                            toast.error("No se pudo guardar el ajuste");
                                                        }
                                                    }}
                                                />
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
                                            {filteredEntries.reduce((s, e) => s + (e.events_count ?? 0), 0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {filteredEntries.reduce((s, e) => s + (e.slots_count ?? 0), 0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">{totalHours}h</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-right">
                                            ${filteredEntries.reduce((s, e) => s + (e.subtotal ?? 0), 0).toLocaleString("es-MX")}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            ${filteredEntries.reduce((s, e) => s + (e.adjustments ?? 0), 0).toLocaleString("es-MX")}
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
                </TabsContent>

                <TabsContent value="eventos">
                    {loadingAnalytics ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Totales por evento</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-2 text-left">Evento</th>
                                            <th className="px-4 py-2 text-left">Sede</th>
                                            <th className="px-4 py-2 text-right">Proyectado</th>
                                            <th className="px-4 py-2 text-right">Real</th>
                                            <th className="px-4 py-2 text-right">Δ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(analytics?.byEvent ?? []).map(
                                            (r: {
                                                event_id: string;
                                                title: string | null;
                                                date: string | null;
                                                school_name: string | null;
                                                projectedTotal: number;
                                                actualTotal: number;
                                                variance: number;
                                            }) => (
                                                <tr key={r.event_id} className="border-b">
                                                    <td className="px-4 py-2">
                                                        <div className="font-medium">{r.title ?? "—"}</div>
                                                        <div className="text-xs text-muted-foreground">{r.date ?? ""}</div>
                                                    </td>
                                                    <td className="px-4 py-2">{r.school_name ?? "—"}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        ${r.projectedTotal.toLocaleString("es-MX")}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        ${r.actualTotal.toLocaleString("es-MX")}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">{r.variance.toLocaleString("es-MX")}</td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="sedes">
                    {loadingAnalytics ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Totales por sede</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-2 text-left">Sede</th>
                                            <th className="px-4 py-2 text-right">Proyectado</th>
                                            <th className="px-4 py-2 text-right">Real</th>
                                            <th className="px-4 py-2 text-right">Δ</th>
                                            <th className="px-4 py-2 text-center">Líneas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(analytics?.bySchool ?? []).map(
                                            (r: {
                                                school_id: string;
                                                school_name: string;
                                                projectedTotal: number;
                                                actualTotal: number;
                                                variance: number;
                                                lineCount: number;
                                            }) => (
                                                <tr key={r.school_id} className="border-b">
                                                    <td className="px-4 py-2 font-medium">{r.school_name}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        ${r.projectedTotal.toLocaleString("es-MX")}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        ${r.actualTotal.toLocaleString("es-MX")}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">{r.variance.toLocaleString("es-MX")}</td>
                                                    <td className="px-4 py-2 text-center">{r.lineCount}</td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="varianza">
                    {loadingAnalytics ? (
                        <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Proyectado vs real por aplicador</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-2 text-left">Aplicador</th>
                                            <th className="px-4 py-2 text-right">Proyectado</th>
                                            <th className="px-4 py-2 text-right">Real</th>
                                            <th className="px-4 py-2 text-right">Δ</th>
                                            <th className="px-4 py-2 text-center">H.proy</th>
                                            <th className="px-4 py-2 text-center">H.real</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(analytics?.byApplicator ?? []).map(
                                            (r: {
                                                applicator_id: string;
                                                applicator_name: string;
                                                projectedTotal: number;
                                                actualTotal: number;
                                                variance: number;
                                                projectedHours: number;
                                                actualHours: number;
                                            }) => (
                                                <tr key={r.applicator_id} className="border-b">
                                                    <td className="px-4 py-2 font-medium">{r.applicator_name}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        ${r.projectedTotal.toLocaleString("es-MX")}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        ${r.actualTotal.toLocaleString("es-MX")}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">{r.variance.toLocaleString("es-MX")}</td>
                                                    <td className="px-4 py-2 text-center">{r.projectedHours}h</td>
                                                    <td className="px-4 py-2 text-center">{r.actualHours}h</td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                                <div className="p-4 text-sm text-muted-foreground border-t">
                                    Total proyectado: ${(analytics?.totals?.projected ?? 0).toLocaleString("es-MX")} · Total
                                    real: ${(analytics?.totals?.actual ?? 0).toLocaleString("es-MX")} · Varianza: $
                                    {(analytics?.totals?.variance ?? 0).toLocaleString("es-MX")}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="calidad">
                    {loadingAnalytics ? (
                        <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Conteos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2">
                                    <p>Sin evento (líneas trabajo): {analytics?.quality?.missingEventId ?? 0}</p>
                                    <p>Sin monto real: {analytics?.quality?.missingActual ?? 0}</p>
                                    <p>Líneas no confirmadas: {analytics?.quality?.unconfirmedLines ?? 0}</p>
                                    <p>Horas proyectadas en cero: {analytics?.quality?.zeroProjectedHours ?? 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Alertas</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2">
                                    {(analytics?.alerts ?? []).length === 0 ? (
                                        <p className="text-muted-foreground">Sin alertas.</p>
                                    ) : (
                                        (analytics?.alerts ?? []).map((a: string, i: number) => <p key={i}>{a}</p>)
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="pipeline">
                    {loadingAudit ? (
                        <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Estado del período</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2">
                                    <p>Estatus: {auditData?.period?.status}</p>
                                    <p>Entradas (aplicadores): {auditData?.pipeline?.entries_total ?? 0}</p>
                                    <p>Líneas totales: {auditData?.pipeline?.lines_total ?? 0}</p>
                                    <p>Líneas auto: {auditData?.pipeline?.auto_lines ?? 0}</p>
                                    <p>Líneas manuales: {auditData?.pipeline?.manual_lines ?? 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Ventana de fechas</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2">
                                    <p>Eventos en rango: {auditData?.pipeline?.events_in_window ?? 0}</p>
                                    <p className="text-muted-foreground text-xs">
                                        Ventanas de pago sugeridas (viernes +14 días desde evento), cadencia{" "}
                                        {auditData?.cadence ?? "biweekly"}.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="excel" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Comparar con Excel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p className="text-muted-foreground">
                                Sube una hoja con columnas que contengan &quot;nombre&quot; o &quot;aplicador&quot; y
                                &quot;total&quot; o &quot;importe&quot;. Se compara contra los totales por aplicador de
                                este período.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Input
                                    ref={excelInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="max-w-xs"
                                    onChange={async (e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        try {
                                            setExcelBusy(true);
                                            setExcelResult(null);
                                            const fd = new FormData();
                                            fd.append("file", f);
                                            fd.append("periodId", period.id);
                                            const res = await fetch("/api/v1/payroll/compare-excel", {
                                                method: "POST",
                                                body: fd,
                                            });
                                            const j = await res.json().catch(() => ({}));
                                            if (!res.ok) throw new Error(j?.error ?? "Error");
                                            setExcelResult({
                                                mismatchCount: j.mismatchCount ?? 0,
                                                mismatches: j.mismatches ?? [],
                                            });
                                            toast.success("Comparación lista");
                                        } catch {
                                            toast.error("No se pudo comparar el archivo");
                                        } finally {
                                            setExcelBusy(false);
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={excelBusy}
                                    onClick={async () => {
                                        const f = excelInputRef.current?.files?.[0];
                                        if (!f) {
                                            toast.message("Selecciona un archivo primero");
                                            return;
                                        }
                                        try {
                                            setExcelBusy(true);
                                            const fd = new FormData();
                                            fd.append("file", f);
                                            fd.append("periodId", period.id);
                                            fd.append("download", "1");
                                            const res = await fetch("/api/v1/payroll/compare-excel", {
                                                method: "POST",
                                                body: fd,
                                            });
                                            if (!res.ok) throw new Error("download");
                                            const blob = await res.blob();
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `nomina-comparacion-${period.id.slice(0, 8)}.xlsx`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                            toast.success("Reporte descargado");
                                        } catch {
                                            toast.error("No se pudo descargar el reporte");
                                        } finally {
                                            setExcelBusy(false);
                                        }
                                    }}
                                >
                                    {excelBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Descargar .xlsx de diferencias
                                </Button>
                            </div>
                            {excelResult ? (
                                <p>
                                    Diferencias encontradas: <strong>{excelResult.mismatchCount}</strong>
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={breakdownEntry != null} onOpenChange={(open) => !open && setBreakdownEntry(null)}>
                <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Desglose completo · {breakdownEntry?.applicator_name}</DialogTitle>
                        <DialogDescription>
                            Cada línea corresponde a un evento, sesión o ajuste manual incluido en este período.
                        </DialogDescription>
                    </DialogHeader>
                    {breakdownEntry ? (
                        <div className="overflow-x-auto border rounded-md">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-3 py-2 text-left">Evento</th>
                                        <th className="px-3 py-2 text-left">Rol</th>
                                        <th className="px-3 py-2 text-left">Origen</th>
                                        <th className="px-3 py-2 text-right">Horas</th>
                                        <th className="px-3 py-2 text-right">Tarifa</th>
                                        <th className="px-3 py-2 text-right">Proyectado</th>
                                        <th className="px-3 py-2 text-right">Real</th>
                                        <th className="px-3 py-2 text-right">Total línea</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(breakdownEntry.line_items ?? []).length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                                                No hay líneas detalladas (solo totales agregados).
                                            </td>
                                        </tr>
                                    ) : (
                                        (breakdownEntry.line_items as Record<string, unknown>[]).map((li) => (
                                            <tr key={String(li.id)} className="border-b">
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">
                                                        {(li.event_name as string) || "—"}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">
                                                        {li.event_id ? String(li.event_id).slice(0, 8) + "…" : ""}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">{(li.role as string) || "—"}</td>
                                                <td className="px-3 py-2">{(li.source as string) || "—"}</td>
                                                <td className="px-3 py-2 text-right">{Number(li.hours ?? 0)}</td>
                                                <td className="px-3 py-2 text-right">${Number(li.rate ?? 0)}</td>
                                                <td className="px-3 py-2 text-right">
                                                    ${Number(li.projected_amount ?? 0).toLocaleString("es-MX")}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    ${Number(li.actual_amount ?? li.total_amount ?? 0).toLocaleString("es-MX")}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold">
                                                    ${Number(li.total_amount ?? 0).toLocaleString("es-MX")}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
