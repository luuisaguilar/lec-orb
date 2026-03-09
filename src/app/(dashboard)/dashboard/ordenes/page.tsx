"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    ShoppingBag,
    MoreHorizontal,
    Trash2,
    Link as LinkIcon,
    Clock,
    CheckCircle2,
    XCircle
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AddOrderDialog } from "@/components/finance/add-order-dialog";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Order {
    id: string;
    folio: string;
    provider: string;
    description: string;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    created_at: string;
    file_path: string | null;
    quote_id: string | null;
    quotes?: {
        folio: string;
    };
}

const statusConfig = {
    PENDING: { label: "Pendiente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
    COMPLETED: { label: "Completada", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
    CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

export default function OrdenesPage() {
    const { data, isLoading, mutate } = useSWR("/api/v1/purchase-orders", fetcher);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta orden de compra?")) return;

        try {
            const res = await fetch(`/api/v1/purchase-orders/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Orden eliminada");
            mutate();
        } catch {
            toast.error("Error al eliminar la orden");
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/v1/purchase-orders/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error();
            toast.success("Estatus actualizado");
            mutate();
        } catch {
            toast.error("Error al actualizar estatus");
        }
    };

    const orders: Order[] = data?.orders || [];

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h2>
                    <p className="text-muted-foreground">
                        Gestiona tus pedidos y compras institucionales.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <AddOrderDialog onSuccess={() => mutate()} />
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-medium">Listado de Órdenes</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center">
                            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center">
                            <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">No hay órdenes registradas aún.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Folio</TableHead>
                                        <TableHead>Cotización</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead>Estatus</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => {
                                        const StatusIcon = statusConfig[order.status].icon;
                                        return (
                                            <TableRow key={order.id}>
                                                <TableCell className="text-xs font-mono">
                                                    {format(new Date(order.created_at), "dd MMM yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="font-semibold">{order.folio}</TableCell>
                                                <TableCell>
                                                    {order.quotes?.folio ? (
                                                        <Badge variant="outline" className="font-mono text-[10px]">
                                                            <LinkIcon className="mr-1 h-3 w-3" />
                                                            {order.quotes.folio}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{order.provider}</TableCell>
                                                <TableCell>
                                                    <Badge className={`${statusConfig[order.status].color} border-none`}>
                                                        <StatusIcon className="mr-1 h-3 w-3" />
                                                        {statusConfig[order.status].label}
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
                                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "COMPLETED")}>
                                                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Marcar Completada
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "CANCELLED")}>
                                                                <XCircle className="mr-2 h-4 w-4 text-red-600" /> Cancelar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDelete(order.id)} className="text-red-600">
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
