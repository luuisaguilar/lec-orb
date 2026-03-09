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
    Wallet,
    Plus,
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

const statusConfig = {
    PENDING: { label: "Pendiente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
    PAID: { label: "Pagado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
    EXPIRED: { label: "Vencido", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
    CANCELLED: { label: "Cancelado", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400", icon: XCircle },
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

            // Trigger download via Blob
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
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Pagos con Referencia</h2>
                    <p className="text-muted-foreground">
                        Seguimiento de pagos por concepto de exámenes y otras certificaciones/libros.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2">
                        {selectedKeys.size > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Eliminar Selección ({selectedKeys.size})
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="hidden sm:flex" title="Exportar Vista a Excel">
                            <Download className="mr-2 h-4 w-4" /> Exportar a Excel
                        </Button>
                        <ImportPaymentsDialog onSuccess={() => mutatePayments()} />
                        <RegisterPaymentDialog mode="exam" onSuccess={() => mutatePayments()} />
                        <RegisterPaymentDialog mode="other" onSuccess={() => mutatePayments()} />
                    </div>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-medium">Relación de Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center">
                            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center">
                            <CreditCard className="h-10 w-10 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">No hay pagos registrados aún.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[40px]">
                                            <Checkbox
                                                checked={payments.length > 0 && selectedKeys.size === payments.length}
                                                onCheckedChange={toggleAll}
                                            />
                                        </TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Folio / Ref</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Institución / Sede</TableHead>
                                        <TableHead>Sede LEC</TableHead>
                                        <TableHead>Total a Pagar</TableHead>
                                        <TableHead>Método de Pago</TableHead>
                                        <TableHead>Estatus</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => {
                                        const StatusIcon = statusConfig[payment.status].icon;
                                        return (
                                            <TableRow key={payment.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedKeys.has(payment.id)}
                                                        onCheckedChange={() => toggleSelection(payment.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">
                                                    {format(new Date(payment.created_at), "dd MMM yy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="font-semibold text-xs tracking-tight">{payment.folio}</TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            {payment.payment_concepts ? payment.payment_concepts.description : payment.custom_concept || "Otro concepto"}
                                                        </span>
                                                        {payment.payment_concepts && (
                                                            <span className="text-[10px] text-muted-foreground font-mono bg-muted inline-flex w-fit px-1 rounded mt-1">
                                                                {payment.payment_concepts.concept_key}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm flex items-center font-medium">
                                                            <User className="mr-1 h-3 w-3 text-muted-foreground" />
                                                            {payment.first_name ? `${payment.first_name} ${payment.last_name || ''}` : payment.person_name}
                                                        </span>
                                                        {payment.email && payment.email !== 'n/a' && (
                                                            <span className="text-[11px] text-muted-foreground flex items-center mt-0.5">
                                                                <Mail className="mr-1 h-3 w-3" /> {payment.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {payment.institution ? (
                                                        <span className="text-xs flex items-center text-slate-600 dark:text-slate-300">
                                                            <Building2 className="mr-1 h-3 w-3" /> {payment.institution}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-medium text-[#002e5d]">{payment.location || "N/A"}</span>
                                                </TableCell>
                                                <TableCell className="font-bold text-emerald-600">
                                                    ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {payment.currency || 'MXN'}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.payment_method && payment.payment_method !== 'N/A' ? (
                                                        <span className="text-xs flex items-center">
                                                            <Wallet className="mr-1 h-3 w-3 text-slate-500" /> {payment.payment_method}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No definido</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${statusConfig[payment.status].color} border-none`}>
                                                        <StatusIcon className="mr-1 h-3 w-3" />
                                                        {statusConfig[payment.status].label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleStatusChange(payment.id, "PAID")}>
                                                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Marcar como Pagado
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(payment.id, "EXPIRED")}>
                                                                <Clock className="mr-2 h-4 w-4 text-amber-600" /> Marcar Vencido
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(payment.id, "CANCELLED")}>
                                                                <XCircle className="mr-2 h-4 w-4 text-red-600" /> Cancelar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDelete(payment.id)} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
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
