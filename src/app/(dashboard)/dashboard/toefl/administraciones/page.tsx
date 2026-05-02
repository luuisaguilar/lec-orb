"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Calendar,
    MoreHorizontal,
    Trash2,
    Clock,
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
import { AddToeflAdminDialog } from "@/components/exams/add-toefl-admin-dialog";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Administration {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
}

export default function ToeflAdminisPage() {
    const { data, isLoading, mutate } = useSWR("/api/v1/toefl/administrations", fetcher);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Deseas eliminar esta administración?")) return;
        try {
            const res = await fetch(`/api/v1/toefl/administrations/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Eliminado");
            mutate();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    const administrations: Administration[] = data?.administrations || [];

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary font-outfit">Administraciones TOEFL</h2>
                    <p className="text-muted-foreground font-medium">
                        Catálogo de administraciones (sesiones) master para vincular códigos TOEFL.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <AddToeflAdminDialog onSuccess={() => mutate()} />
                </div>
            </div>

            <Card className="shadow-lg border-t-4 border-t-primary/60 bg-slate-900/40 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center text-white tracking-tight">
                        <Calendar className="mr-2 h-5 w-5 text-primary" /> Lista de Administraciones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center">
                            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : administrations.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center">
                            <Calendar className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No hay administraciones programadas.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Fecha de Inicio</TableHead>
                                        <TableHead>Fecha de Finalización</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {administrations.map((admin) => {
                                        return (
                                            <TableRow key={admin.id} className="hover:bg-slate-800/40 border-slate-800/60 transition-colors">
                                                <TableCell className="font-bold text-slate-200">
                                                    {admin.name}
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(admin.start_date), "dd/MM/yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(admin.end_date), "dd/MM/yyyy", { locale: es })}
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
                                                            <DropdownMenuItem onClick={() => handleDelete(admin.id)} className="text-red-600">
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
