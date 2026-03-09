"use client";

import useSWR from "swr";
import { format } from "date-fns";
import {
    Key,
    MoreHorizontal,
    Trash2,
    Clock,
    CheckCircle2,
    Calendar,
    Award
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
import { AddExamCodeDialog } from "@/components/exams/add-exam-code-dialog";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ExamCode {
    id: string;
    exam_type: string;
    code: string;
    status: "AVAILABLE" | "USED" | "EXPIRED";
    registration_date: string | null;
    expiration_date: string | null;
    created_at: string;
}

const statusConfig = {
    AVAILABLE: { label: "Disponible", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
    USED: { label: "Usado", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400", icon: Award },
    EXPIRED: { label: "Vencido", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: Clock },
};

export default function ExamCodesPage() {
    const { data, isLoading, mutate } = useSWR("/api/v1/exam-codes", fetcher);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Deseas eliminar este código?")) return;
        try {
            await fetch(`/api/v1/exam-codes/${id}`, { method: "DELETE" });
            toast.success("Eliminado");
            mutate();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await fetch(`/api/v1/exam-codes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            toast.success("Estatus actualizado");
            mutate();
        } catch {
            toast.error("Error al actualizar");
        }
    };

    const codes: ExamCode[] = data?.codes || [];

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#002e5d]">Exámenes Generales</h2>
                    <p className="text-muted-foreground font-medium">
                        Gestión de códigos y vouchers para certificaciones Cambridge, IELTS, iTEP y más.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <AddExamCodeDialog onSuccess={() => mutate()} />
                </div>
            </div>

            <Card className="shadow-sm border-t-4 border-t-[#002e5d]">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <Key className="mr-2 h-5 w-5 text-[#002e5d]" /> Inventario de Certificaciones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center">
                            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center">
                            <Key className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No hay códigos registrados.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Examen</TableHead>
                                        <TableHead>Código / Voucher</TableHead>
                                        <TableHead>Registro</TableHead>
                                        <TableHead>Vencimiento</TableHead>
                                        <TableHead>Estatus</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {codes.map((code) => {
                                        const StatusIcon = statusConfig[code.status].icon;
                                        return (
                                            <TableRow key={code.id} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[#002e5d] border-[#002e5d]/30 font-bold">
                                                        {code.exam_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{code.code}</TableCell>
                                                <TableCell className="text-sm">
                                                    {code.registration_date ? format(new Date(code.registration_date), "dd/MM/yyyy") : "—"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {code.expiration_date ? (
                                                        <div className="flex items-center text-muted-foreground">
                                                            <Calendar className="mr-1 h-3 w-3" />
                                                            {format(new Date(code.expiration_date), "dd/MM/yyyy")}
                                                        </div>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${statusConfig[code.status].color} border-none`}>
                                                        <StatusIcon className="mr-1 h-3 w-3" />
                                                        {statusConfig[code.status].label}
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
                                                            <DropdownMenuItem onClick={() => handleStatusChange(code.id, "USED")}>
                                                                <Award className="mr-2 h-4 w-4" /> Marcar como Usado
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDelete(code.id)} className="text-red-100 bg-red-600 hover:bg-red-700">
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
