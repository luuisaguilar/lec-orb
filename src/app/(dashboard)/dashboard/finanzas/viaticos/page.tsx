"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ReceiptText, Plane, ClipboardList } from "lucide-react";
import { toast } from "sonner";

type TravelStatus = "pending" | "approved" | "rejected" | "reimbursed";

type TravelReceipt = {
    id: string;
    report_id: string;
    file_name: string;
    file_type: "pdf" | "xlsx" | "xls" | "csv" | "other";
    file_url: string;
    amount: number | null;
    notes: string | null;
    created_at: string;
};

type TravelReport = {
    id: string;
    payroll_period_id: string | null;
    payroll_period_name: string | null;
    employee_name: string;
    destination: string;
    trip_purpose: string;
    start_date: string;
    end_date: string;
    amount_requested: number;
    amount_approved: number | null;
    status: TravelStatus;
    approval_notes: string | null;
    created_at: string;
    receipts_total: number;
    receipts: TravelReceipt[];
    // Budget
    ppto_aereos: number;
    ppto_gasolina: number;
    ppto_taxis: number;
    ppto_casetas: number;
    ppto_hospedaje: number;
    ppto_alimentacion: number;
    ppto_otros: number;
    // Real
    real_aereos: number;
    real_gasolina: number;
    real_taxis: number;
    real_casetas: number;
    real_hospedaje: number;
    real_alimentacion: number;
    real_otros: number;
};

type TravelResponse = {
    reports: TravelReport[];
    summary: {
        total_reports: number;
        pending_count: number;
        approved_count: number;
        reimbursed_count: number;
        requested_total: number;
        approved_total: number;
        receipts_total: number;
    };
};

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar viaticos");
    return res.json();
};

const statusLabel: Record<TravelStatus, string> = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    reimbursed: "Reembolsado",
};

const statusClass: Record<TravelStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    reimbursed: "bg-emerald-100 text-emerald-800",
};

export default function ViaticosPage() {
    const [saving, setSaving] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [form, setForm] = useState({
        employee_name: "",
        destination: "",
        trip_purpose: "",
        start_date: "",
        end_date: "",
        amount_requested: "",
        payroll_period_id: "none",
        ppto_aereos: "0",
        ppto_gasolina: "0",
        ppto_taxis: "0",
        ppto_casetas: "0",
        ppto_hospedaje: "0",
        ppto_alimentacion: "0",
        ppto_otros: "0",
    });
    const [approvalDraft, setApprovalDraft] = useState({
        amount_approved: "",
        approval_notes: "",
        real_aereos: "0",
        real_gasolina: "0",
        real_taxis: "0",
        real_casetas: "0",
        real_hospedaje: "0",
        real_alimentacion: "0",
        real_otros: "0",
    });
    const [receiptDraft, setReceiptDraft] = useState({
        file_name: "",
        file_type: "pdf",
        file_url: "",
        amount: "",
        notes: "",
    });

    const { data, isLoading, mutate } = useSWR<TravelResponse>(
        `/api/v1/finance/travel-expenses?status=${filterStatus}`,
        fetcher
    );
    const { data: payrollData } = useSWR<{ periods: { id: string; name: string }[] }>("/api/v1/payroll", fetcher);

    const reports = useMemo(() => data?.reports ?? [], [data?.reports]);
    const summary = data?.summary;

    const selectedReport = useMemo(() => {
        if (!reports.length) return null;
        if (selectedId) {
            const found = reports.find((item) => item.id === selectedId);
            if (found) return found;
        }
        return reports[0];
    }, [reports, selectedId]);

    const submitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/v1/finance/travel-expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employee_name: form.employee_name,
                    destination: form.destination,
                    trip_purpose: form.trip_purpose,
                    start_date: form.start_date,
                    end_date: form.end_date,
                    amount_requested: Number(form.amount_requested),
                    payroll_period_id: form.payroll_period_id === "none" ? null : form.payroll_period_id,
                    ppto_aereos: Number(form.ppto_aereos || 0),
                    ppto_gasolina: Number(form.ppto_gasolina || 0),
                    ppto_taxis: Number(form.ppto_taxis || 0),
                    ppto_casetas: Number(form.ppto_casetas || 0),
                    ppto_hospedaje: Number(form.ppto_hospedaje || 0),
                    ppto_alimentacion: Number(form.ppto_alimentacion || 0),
                    ppto_otros: Number(form.ppto_otros || 0),
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error ?? "No se pudo crear la solicitud");

            toast.success("Solicitud de viaticos creada");
            setForm({
                employee_name: "",
                destination: "",
                trip_purpose: "",
                start_date: "",
                end_date: "",
                amount_requested: "",
                payroll_period_id: "none",
                ppto_aereos: "0",
                ppto_gasolina: "0",
                ppto_taxis: "0",
                ppto_casetas: "0",
                ppto_hospedaje: "0",
                ppto_alimentacion: "0",
                ppto_otros: "0",
            });
            await mutate();
            setSelectedId(payload.report.id);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al crear solicitud");
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (report: TravelReport, status: TravelStatus) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/finance/travel-expenses/${report.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status,
                    amount_approved: status === "approved"
                        ? Number(approvalDraft.amount_approved || report.amount_requested)
                        : undefined,
                    approval_notes: approvalDraft.approval_notes || null,
                    real_aereos: Number(approvalDraft.real_aereos || 0),
                    real_gasolina: Number(approvalDraft.real_gasolina || 0),
                    real_taxis: Number(approvalDraft.real_taxis || 0),
                    real_casetas: Number(approvalDraft.real_casetas || 0),
                    real_hospedaje: Number(approvalDraft.real_hospedaje || 0),
                    real_alimentacion: Number(approvalDraft.real_alimentacion || 0),
                    real_otros: Number(approvalDraft.real_otros || 0),
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error ?? "No se pudo actualizar el estatus");
            toast.success("Estatus actualizado");
            await mutate();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al actualizar estatus");
        } finally {
            setSaving(false);
        }
    };

    const addReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReport) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/v1/finance/travel-expenses/${selectedReport.id}/receipts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_name: receiptDraft.file_name,
                    file_type: receiptDraft.file_type,
                    file_url: receiptDraft.file_url,
                    amount: receiptDraft.amount ? Number(receiptDraft.amount) : null,
                    notes: receiptDraft.notes || null,
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error ?? "No se pudo registrar comprobante");

            toast.success("Comprobante agregado");
            setReceiptDraft({ file_name: "", file_type: "pdf", file_url: "", amount: "", notes: "" });
            await mutate();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al agregar comprobante");
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Modulo de Viaticos</h1>
                    <p className="text-sm text-muted-foreground">
                        Solicitudes, aprobaciones y comprobantes vinculados a nomina.
                    </p>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[190px]">
                        <SelectValue placeholder="Filtrar estatus" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendientes</SelectItem>
                        <SelectItem value="approved">Aprobados</SelectItem>
                        <SelectItem value="rejected">Rechazados</SelectItem>
                        <SelectItem value="reimbursed">Reembolsados</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Solicitudes</p>
                        <p className="text-2xl font-bold">{summary?.total_reports ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                        <p className="text-2xl font-bold text-amber-600">{summary?.pending_count ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Monto solicitado</p>
                        <p className="text-2xl font-bold">${(summary?.requested_total ?? 0).toLocaleString("es-MX")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Comprobado</p>
                        <p className="text-2xl font-bold text-emerald-600">${(summary?.receipts_total ?? 0).toLocaleString("es-MX")}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Plane className="h-4 w-4" /> Nueva solicitud
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitReport} className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="employee_name">Colaborador</Label>
                                <Input
                                    id="employee_name"
                                    value={form.employee_name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, employee_name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="destination">Destino</Label>
                                <Input
                                    id="destination"
                                    value={form.destination}
                                    onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label htmlFor="trip_purpose">Motivo</Label>
                                <Textarea
                                    id="trip_purpose"
                                    value={form.trip_purpose}
                                    onChange={(e) => setForm((prev) => ({ ...prev, trip_purpose: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="start_date">Inicio</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="end_date">Fin</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="amount_requested">Monto solicitado total</Label>
                                <Input
                                    id="amount_requested"
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={form.amount_requested}
                                    onChange={(e) => setForm((prev) => ({ ...prev, amount_requested: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2 mt-2">
                                <p className="text-sm font-medium mb-2">Desglose de presupuesto (estimado)</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Aéreos</Label>
                                        <Input type="number" value={form.ppto_aereos} onChange={(e) => setForm(p => ({...p, ppto_aereos: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Gasolina</Label>
                                        <Input type="number" value={form.ppto_gasolina} onChange={(e) => setForm(p => ({...p, ppto_gasolina: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Taxis</Label>
                                        <Input type="number" value={form.ppto_taxis} onChange={(e) => setForm(p => ({...p, ppto_taxis: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Casetas</Label>
                                        <Input type="number" value={form.ppto_casetas} onChange={(e) => setForm(p => ({...p, ppto_casetas: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Hospedaje</Label>
                                        <Input type="number" value={form.ppto_hospedaje} onChange={(e) => setForm(p => ({...p, ppto_hospedaje: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Alimentos</Label>
                                        <Input type="number" value={form.ppto_alimentacion} onChange={(e) => setForm(p => ({...p, ppto_alimentacion: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Otros</Label>
                                        <Input type="number" value={form.ppto_otros} onChange={(e) => setForm(p => ({...p, ppto_otros: e.target.value}))} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>Periodo de nomina</Label>
                                <Select
                                    value={form.payroll_period_id}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, payroll_period_id: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sin vincular" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin vincular</SelectItem>
                                        {(payrollData?.periods ?? []).map((period) => (
                                            <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <Button type="submit" disabled={saving}>
                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Crear solicitud
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ClipboardList className="h-4 w-4" /> Reporte basico
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {reports.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay solicitudes registradas.</p>
                        ) : (
                            reports.map((report) => (
                                <button
                                    key={report.id}
                                    className={`w-full rounded-lg border p-3 text-left transition ${selectedReport?.id === report.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                                    onClick={() => {
                                        setSelectedId(report.id);
                                        setApprovalDraft({
                                            amount_approved: report.amount_approved?.toString() ?? "",
                                            approval_notes: report.approval_notes ?? "",
                                            real_aereos: report.real_aereos?.toString() ?? "0",
                                            real_gasolina: report.real_gasolina?.toString() ?? "0",
                                            real_taxis: report.real_taxis?.toString() ?? "0",
                                            real_casetas: report.real_casetas?.toString() ?? "0",
                                            real_hospedaje: report.real_hospedaje?.toString() ?? "0",
                                            real_alimentacion: report.real_alimentacion?.toString() ?? "0",
                                            real_otros: report.real_otros?.toString() ?? "0",
                                        });
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium">{report.employee_name}</p>
                                        <Badge className={statusClass[report.status]}>{statusLabel[report.status]}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{report.destination} · {report.start_date} a {report.end_date}</p>
                                    <div className="mt-2 flex items-center justify-between text-xs">
                                        <span>Solicitado: ${Number(report.amount_requested).toLocaleString("es-MX")}</span>
                                        <span>Comprobado: ${Number(report.receipts_total ?? 0).toLocaleString("es-MX")}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedReport && (
                <div className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Aprobacion y estatus</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                    <Label htmlFor="amount_approved">Monto aprobado</Label>
                                    <Input
                                        id="amount_approved"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={approvalDraft.amount_approved}
                                        onChange={(e) => setApprovalDraft((prev) => ({ ...prev, amount_approved: e.target.value }))}
                                        placeholder={String(selectedReport.amount_requested)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Periodo nomina</Label>
                                    <Select
                                        value={selectedReport.payroll_period_id ?? "none"}
                                        onValueChange={async (value) => {
                                            await fetch(`/api/v1/finance/travel-expenses/${selectedReport.id}`, {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ payroll_period_id: value === "none" ? null : value }),
                                            });
                                            await mutate();
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sin vincular" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin vincular</SelectItem>
                                            {(payrollData?.periods ?? []).map((period) => (
                                                <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="approval_notes">Notas de aprobacion</Label>
                                <Textarea
                                    id="approval_notes"
                                    value={approvalDraft.approval_notes}
                                    onChange={(e) => setApprovalDraft((prev) => ({ ...prev, approval_notes: e.target.value }))}
                                />
                            </div>

                            <div className="pt-2 border-t mt-2">
                                <p className="text-sm font-medium mb-2">Desglose de Gasto Real (Con Factura)</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Aéreos</Label>
                                        <Input type="number" value={approvalDraft.real_aereos} onChange={(e) => setApprovalDraft(p => ({...p, real_aereos: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Gasolina</Label>
                                        <Input type="number" value={approvalDraft.real_gasolina} onChange={(e) => setApprovalDraft(p => ({...p, real_gasolina: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Taxis</Label>
                                        <Input type="number" value={approvalDraft.real_taxis} onChange={(e) => setApprovalDraft(p => ({...p, real_taxis: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Casetas</Label>
                                        <Input type="number" value={approvalDraft.real_casetas} onChange={(e) => setApprovalDraft(p => ({...p, real_casetas: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Hospedaje</Label>
                                        <Input type="number" value={approvalDraft.real_hospedaje} onChange={(e) => setApprovalDraft(p => ({...p, real_hospedaje: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Alimentos</Label>
                                        <Input type="number" value={approvalDraft.real_alimentacion} onChange={(e) => setApprovalDraft(p => ({...p, real_alimentacion: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Otros</Label>
                                        <Input type="number" value={approvalDraft.real_otros} onChange={(e) => setApprovalDraft(p => ({...p, real_otros: e.target.value}))} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button disabled={saving} onClick={() => updateStatus(selectedReport, "approved")}>Aprobar</Button>
                                <Button variant="outline" disabled={saving} onClick={() => updateStatus(selectedReport, "rejected")}>Rechazar</Button>
                                <Button variant="secondary" disabled={saving} onClick={() => updateStatus(selectedReport, "reimbursed")}>Marcar reembolsado</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Nomina vinculada: {selectedReport.payroll_period_name ?? "Sin vincular"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ReceiptText className="h-4 w-4" /> Comprobantes (Excel/PDF)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={addReceipt} className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1 md:col-span-2">
                                    <Label htmlFor="receipt_file_name">Nombre del archivo</Label>
                                    <Input
                                        id="receipt_file_name"
                                        value={receiptDraft.file_name}
                                        onChange={(e) => setReceiptDraft((prev) => ({ ...prev, file_name: e.target.value }))}
                                        placeholder="Ej. Viaticos_Hermosillo_Abril2026.xlsx"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Tipo</Label>
                                    <Select
                                        value={receiptDraft.file_type}
                                        onValueChange={(value) => setReceiptDraft((prev) => ({ ...prev, file_type: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="xlsx">XLSX</SelectItem>
                                            <SelectItem value="xls">XLS</SelectItem>
                                            <SelectItem value="csv">CSV</SelectItem>
                                            <SelectItem value="other">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="receipt_amount">Monto (opcional)</Label>
                                    <Input
                                        id="receipt_amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={receiptDraft.amount}
                                        onChange={(e) => setReceiptDraft((prev) => ({ ...prev, amount: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label htmlFor="receipt_file_url">URL del comprobante</Label>
                                    <Input
                                        id="receipt_file_url"
                                        type="url"
                                        value={receiptDraft.file_url}
                                        onChange={(e) => setReceiptDraft((prev) => ({ ...prev, file_url: e.target.value }))}
                                        placeholder="https://..."
                                        required
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Notas</Label>
                                    <Textarea
                                        value={receiptDraft.notes}
                                        onChange={(e) => setReceiptDraft((prev) => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={saving}>Agregar comprobante</Button>
                                </div>
                            </form>

                            <div className="space-y-2">
                                {(selectedReport.receipts ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Sin comprobantes cargados.</p>
                                ) : (
                                    selectedReport.receipts.map((receipt) => (
                                        <div key={receipt.id} className="rounded-lg border p-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium">{receipt.file_name}</p>
                                                <Badge variant="outline">{receipt.file_type.toUpperCase()}</Badge>
                                            </div>
                                            <a href={receipt.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                                                {receipt.file_url}
                                            </a>
                                            {receipt.amount ? (
                                                <p className="text-xs text-muted-foreground mt-1">Monto: ${Number(receipt.amount).toLocaleString("es-MX")}</p>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

