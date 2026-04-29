"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
    Ticket,
    MoreHorizontal,
    Trash2,
    User,
    Clock,
    CheckCircle2,
    ShieldCheck,
    Download,
    Edit,
    Link as LinkIcon
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
import { AddToeflCodeDialog } from "@/components/exams/add-toefl-code-dialog";
import { ImportToeflCodesDialog } from "@/components/exams/import-toefl-codes-dialog";
import { EditToeflCodeDialog } from "@/components/exams/edit-toefl-code-dialog";
import { LinkToeflSessionDialog } from "@/components/exams/link-toefl-session-dialog";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ToeflCode {
    id: string;
    folio: string;
    system_uniq_id: string;
    test_type: string;
    voucher_code: string | null;
    status: "AVAILABLE" | "ASSIGNED" | "USED" | "EXPIRED";
    assigned_to: string | null;
    candidate_details: Record<string, any>;
    expiration_date: string | null;
    created_at: string;
}

const statusConfig = {
    AVAILABLE: { label: "Disponible", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
    ASSIGNED: { label: "Asignado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: User },
    USED: { label: "Usado", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400", icon: ShieldCheck },
    EXPIRED: { label: "Vencido", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: Clock },
};

export default function ToeflCodigosPage() {
    const { data, isLoading, mutate } = useSWR("/api/v1/toefl/codes", fetcher);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este folio?")) return;
        try {
            await fetch(`/api/v1/toefl/codes/${id}`, { method: "DELETE" });
            toast.success("Folio eliminado");
            mutate();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await fetch(`/api/v1/toefl/codes/${id}`, {
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

    const codes: ToeflCode[] = data?.codes || [];

    const availableCount = codes.filter(c => c.status === "AVAILABLE").length;
    const assignedCount = codes.filter(c => c.status === "ASSIGNED").length;

    const toggleSelectAll = () => {
        if (selectedIds.length === codes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(codes.map(c => c.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${selectedIds.length} folios?  Esta acción es irreversible.`)) return;

        setIsDeleting(true);
        toast.loading(`Eliminando ${selectedIds.length} folios...`, { id: "bulk-delete" });
        try {
            await Promise.all(selectedIds.map(id => fetch(`/api/v1/toefl/codes/${id}`, { method: "DELETE" })));
            toast.success(`${selectedIds.length} folios eliminados correctamente`, { id: "bulk-delete" });
            setSelectedIds([]);
            mutate();
        } catch {
            toast.error("Hubo un error al eliminar algunos folios", { id: "bulk-delete" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExport = () => {
        if (codes.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        const exportData = codes.map((c) => {
            const cDetails = c.candidate_details || {};
            return {
                "# Folio Local": c.folio,
                "UNIQ-ID": c.system_uniq_id || "",
                "EXAMEN": c.test_type,
                "VOUCHER CODE": c.voucher_code || "PENDIENTE",
                "Estatus": statusConfig[c.status].label,
                "Asignado A / Histórico": c.assigned_to || "",
                "FAMILY NAME": cDetails["FAMILY NAME"] || "",
                "GIVEN NAME": cDetails["GIVEN NAME"] || "",
                "RES. COUNTRY": cDetails["RES. COUNTRY"] || "",
                "NATIVE LANG": cDetails["NATIVE LANG."] || "",
                "Vencimiento": c.expiration_date ? format(new Date(c.expiration_date), "yyyy-MM-dd") : ""
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario_TOEFL");
        XLSX.writeFile(workbook, `Inventario_TOEFL_${format(new Date(), "yyyyMMdd")}.xlsx`);
        toast.success("Archivo Excel exportado con éxito");
    };

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#0034a1]">Códigos TOEFL</h2>
                    <p className="text-muted-foreground font-medium">
                        Administración y control masivo de folios, vouchers e importaciones.
                    </p>
                    {!isLoading && (
                        <div className="mt-2 text-sm font-semibold flex items-center space-x-4">
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                {availableCount} folios disponibles
                            </span>
                            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                {assignedCount} asignados
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {selectedIds.length > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selectedIds.length})
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                    <ImportToeflCodesDialog onSuccess={() => mutate()} />
                    <AddToeflCodeDialog onSuccess={() => mutate()} />
                </div>
            </div>

            <Card className="shadow-sm border-t-4 border-t-[#0034a1]">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <Ticket className="mr-2 h-5 w-5 text-[#0034a1]" /> Inventario de Folios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center">
                            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center">
                            <Ticket className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No hay códigos registrados.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 whitespace-nowrap">
                                        <TableHead className="w-[50px]">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 cursor-pointer accent-lec-blue"
                                                checked={codes.length > 0 && selectedIds.length === codes.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Folio Interno</TableHead>
                                        <TableHead>UNIQ-ID</TableHead>
                                        <TableHead>Examen</TableHead>
                                        <TableHead>PIN / Voucher</TableHead>
                                        <TableHead>Candidato</TableHead>
                                        <TableHead>Estatus</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {codes.map((code) => {
                                        const StatusIcon = statusConfig[code.status].icon;
                                        const cDetails = code.candidate_details || {};
                                        // Legacy excel headers map directly
                                        const candidateName = cDetails["FAMILY NAME"]
                                            ? `${cDetails["GIVEN NAME"] || ''} ${cDetails["FAMILY NAME"]}`.trim()
                                            : code.assigned_to; // Fallback for manual legacy logic

                                        return (
                                            <TableRow key={code.id} className="hover:bg-muted/30 whitespace-nowrap">
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 cursor-pointer accent-lec-blue"
                                                        checked={selectedIds.includes(code.id)}
                                                        onChange={() => toggleSelect(code.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-bold">{code.folio}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {code.system_uniq_id || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs max-w-[150px] truncate block font-medium text-slate-700 dark:text-slate-300" title={code.test_type}>
                                                        {code.test_type.split(' | ').pop()?.trim()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {code.voucher_code ? (
                                                        <span className="text-foreground">{code.voucher_code}</span>
                                                    ) : (
                                                        <span className="italic text-muted-foreground/60 text-xs">Pendiente...</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm max-w-[150px] truncate" title={candidateName || ''}>
                                                    {candidateName ? (
                                                        <span className="font-medium text-blue-700 dark:text-blue-400">{candidateName}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-xs">Sin asignar</span>
                                                    )}
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
                                                            <EditToeflCodeDialog code={code} onSuccess={() => mutate()}>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Editar Datos
                                                                </DropdownMenuItem>
                                                            </EditToeflCodeDialog>
                                                            <LinkToeflSessionDialog code={code} onSuccess={() => mutate()}>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                    <LinkIcon className="mr-2 h-4 w-4" /> Vincular a Sesión
                                                                </DropdownMenuItem>
                                                            </LinkToeflSessionDialog>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleStatusChange(code.id, "USED")}>
                                                                <ShieldCheck className="mr-2 h-4 w-4" /> Marcar como Usado
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(code.id)} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Folio
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
