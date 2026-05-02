"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    CreditCard,
    MoreHorizontal,
    Trash2,
    Clock,
    CheckCircle2,
    XCircle,
    User,
    Mail,
    Building2,
    Download,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { RegisterPaymentDialog } from "@/components/finance/register-payment-dialog";
import { ImportPaymentsDialog } from "@/components/finance/import-payments-dialog";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Payment {
    id: string;
    folio: string;
    amount: number;
    person_name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string | null;
    institution?: string | null;
    currency?: string | null;
    payment_method?: string | null;
    status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
    created_at: string;
    custom_concept?: string | null;
    location?: string | null;
    payment_concepts?: {
        concept_key: string;
        description: string;
    } | null;
}

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    PAID: { label: "Pagado", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
    PENDING: { label: "Pendiente", className: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
    CANCELLED: { label: "Cancelado", className: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: XCircle },
    EXPIRED: { label: "Vencido", className: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

export default function PagosPage() {
    const { data: serverResult, isLoading, mutate: mutatePayments } = useSWR("/api/v1/payments", fetcher);
    const payments: Payment[] = serverResult?.payments || [];

    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este registro de pago?")) return;

        try {
            const res = await fetch(`/api/v1/payments/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Registro eliminado");
            mutatePayments();
        } catch {
            toast.error("Error al eliminar el registro");
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedKeys.size} registros de pago seleccionados?`)) return;

        setIsDeleting(true);
        try {
            const res = await fetch("/api/v1/payments/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedKeys) }),
            });
            if (!res.ok) throw new Error();
            toast.success(`${selectedKeys.size} registros eliminados`);
            setSelectedKeys(new Set());
            mutatePayments();
        } catch {
            toast.error("Error al eliminar los registros seleccionados");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/v1/payments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error();
            toast.success("Estatus actualizado");
            mutatePayments();
        } catch {
            toast.error("Error al actualizar estatus");
        }
    };

    const handleExportExcel = async () => {
        try {
            toast.info("Generando Excel, por favor espera...");
            const res = await fetch("/api/v1/payments/export");
            if (!res.ok) throw new Error("Error al general el reporte");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Pagos_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Excel descargado correctamente");
        } catch {
            toast.error("Hubo un problema descargando el reporte");
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedKeys((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleAll = () => {
        if (selectedKeys.size === payments.length) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(payments.map((p) => p.id)));
        }
    };

    return (
        <div className="flex-1 space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-white font-outfit">
                        Pagos <span className="text-primary italic">Financieros</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg">
                        Control de ingresos, conciliación de referencias y seguimiento de certificaciones.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {selectedKeys.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="shadow-lg shadow-red-500/20"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Borrar ({selectedKeys.size})
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-slate-900/50 border-slate-700 text-slate-300 hover:text-white">
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                    <ImportPaymentsDialog onSuccess={() => mutatePayments()} />
                    <RegisterPaymentDialog mode="exam" onSuccess={() => mutatePayments()} />
                    <RegisterPaymentDialog mode="other" onSuccess={() => mutatePayments()} />
                </div>
            </div>

            <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-md shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-800/50 bg-slate-950/30 p-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary" /> Historial de Transacciones
                        </CardTitle>
                        <div className="text-xs text-slate-500 font-mono">
                            {payments.length} registros encontrados
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                            <p className="font-medium">Sincronizando con Ledger...</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center space-y-4 text-center">
                            <div className="p-4 rounded-full bg-slate-800/50 text-slate-600">
                                <CreditCard className="h-12 w-12" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-300">Sin movimientos</p>
                                <p className="text-sm text-slate-500 max-w-xs">No hay pagos registrados para el periodo actual.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-950/50">
                                    <TableRow className="hover:bg-transparent border-slate-800">
                                        <TableHead className="w-[50px] px-4">
                                            <Checkbox
                                                checked={payments.length > 0 && selectedKeys.size === payments.length}
                                                onCheckedChange={toggleAll}
                                                className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </TableHead>
                                        <TableHead className="min-w-[100px] font-bold text-slate-400 uppercase tracking-widest text-[10px]">Fecha</TableHead>
                                        <TableHead className="min-w-[120px] font-bold text-slate-400 uppercase tracking-widest text-[10px]">Folio</TableHead>
                                        <TableHead className="min-w-[200px] font-bold text-slate-400 uppercase tracking-widest text-[10px]">Concepto</TableHead>
                                        <TableHead className="min-w-[180px] font-bold text-slate-400 uppercase tracking-widest text-[10px]">Cliente / Alumno</TableHead>
                                        <TableHead className="min-w-[150px] font-bold text-slate-400 uppercase tracking-widest text-[10px]">Institución</TableHead>
                                        <TableHead className="min-w-[120px] font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Monto</TableHead>
                                        <TableHead className="min-w-[120px] font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center">Estatus</TableHead>
                                        <TableHead className="w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => {
                                        const config = statusConfig[payment.status] || statusConfig.PENDING;
                                        const StatusIcon = config.icon;
                                        return (
                                            <TableRow key={payment.id} className="hover:bg-slate-800/30 border-slate-800/60 transition-colors group">
                                                <TableCell className="px-4">
                                                    <Checkbox
                                                        checked={selectedKeys.has(payment.id)}
                                                        onCheckedChange={() => toggleSelection(payment.id)}
                                                        className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-[11px] font-bold text-slate-400 uppercase whitespace-nowrap">
                                                    {format(new Date(payment.created_at), "dd MMM yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="font-mono text-[11px] font-bold text-primary tracking-tighter">
                                                    {payment.folio}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col max-w-[250px]">
                                                        <span className="text-sm font-bold text-slate-100 line-clamp-1">
                                                            {payment.payment_concepts ? payment.payment_concepts.description : payment.custom_concept || "Otro concepto"}
                                                        </span>
                                                        {payment.payment_concepts && (
                                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                                                REF: {payment.payment_concepts.concept_key}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                                                            <User className="w-3 h-3 text-slate-500" />
                                                            {payment.first_name ? `${payment.first_name} ${payment.last_name || ''}` : payment.person_name}
                                                        </span>
                                                        {payment.email && payment.email !== 'n/a' && (
                                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 lowercase font-medium">
                                                                <Mail className="w-2.5 h-2.5" /> {payment.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-tight">
                                                            <Building2 className="w-3 h-3 text-slate-500" /> 
                                                            {payment.institution || "Personal"}
                                                        </span>
                                                        <span className="text-[9px] text-slate-500 font-black uppercase">
                                                            Sede: {payment.location || "N/A"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-black text-white whitespace-nowrap">
                                                            ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">{payment.currency || 'MXN'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={cn(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                                                        config.className
                                                    )}>
                                                        <StatusIcon className="mr-1.5 h-3 w-3" />
                                                        {config.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="bg-slate-800" />
                                                            <DropdownMenuItem onClick={() => handleStatusChange(payment.id, "PAID")} className="focus:bg-emerald-500/10 focus:text-emerald-500">
                                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como Pagado
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(payment.id, "EXPIRED")} className="focus:bg-amber-500/10 focus:text-amber-500">
                                                                <Clock className="mr-2 h-4 w-4" /> Marcar Vencido
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(payment.id, "CANCELLED")} className="focus:bg-red-500/10 focus:text-red-500">
                                                                <XCircle className="mr-2 h-4 w-4" /> Cancelar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-800" />
                                                            <DropdownMenuItem onClick={() => handleDelete(payment.id)} className="text-red-500 focus:bg-red-500/10 focus:text-red-500 font-bold">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Registro
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
